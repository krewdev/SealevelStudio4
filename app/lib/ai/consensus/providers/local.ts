/**
 * Local AI Model Provider
 * Supports downloaded models via Ollama, LM Studio, or direct inference
 */

import { BaseConsensusProvider } from './base';
import {
  ProviderResponse,
  ProviderConfig,
  ConsensusQueryOptions,
} from '../types';

export interface LocalModelConfig extends ProviderConfig {
  endpoint: string; // e.g., 'http://localhost:11434' for Ollama
  model: string; // e.g., 'llama2', 'mistral', 'codellama'
  apiType: 'ollama' | 'lmstudio' | 'openai-compatible' | 'custom';
  timeout?: number;
}

export class LocalAIProvider extends BaseConsensusProvider {
  private localConfig: LocalModelConfig;

  constructor(config: LocalModelConfig) {
    super(config);
    this.localConfig = config;
  }

  get id(): string {
    return 'local-ai';
  }

  get name(): string {
    return `Local AI (${this.localConfig.model})`;
  }

  get enabled(): boolean {
    return !!this.localConfig.endpoint && !!this.localConfig.model;
  }

  async query(
    prompt: string,
    options?: ConsensusQueryOptions
  ): Promise<ProviderResponse> {
    const startTime = Date.now();

    if (!this.enabled) {
      throw new Error('Local AI not configured. Please set endpoint and model.');
    }

    try {
      let response: Response;
      let responseData: any;

      switch (this.localConfig.apiType) {
        case 'ollama':
          response = await this.queryOllama(prompt, options);
          responseData = await response.json();
          break;

        case 'lmstudio':
        case 'openai-compatible':
          response = await this.queryOpenAICompatible(prompt, options);
          responseData = await response.json();
          break;

        case 'custom':
          response = await this.queryCustom(prompt, options);
          responseData = await response.json();
          break;

        default:
          throw new Error(`Unsupported API type: ${this.localConfig.apiType}`);
      }

      if (!response.ok) {
        const error = await response.text();
        this.updateHealth('degraded', error);
        throw new Error(`Local AI API error: ${response.status} - ${error}`);
      }

      const latency = Date.now() - startTime;
      this.recordSuccess(latency);

      return this.normalize(responseData);
    } catch (error: any) {
      this.updateHealth('down', error.message);
      throw error;
    }
  }

  /**
   * Query Ollama API
   * Format: POST http://localhost:11434/api/generate
   */
  private async queryOllama(
    prompt: string,
    options?: ConsensusQueryOptions
  ): Promise<Response> {
    const endpoint = `${this.localConfig.endpoint}/api/generate`;
    
    return fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.localConfig.model,
        prompt,
        stream: false,
        options: {
          temperature: options?.temperature ?? 0.7,
          num_predict: options?.maxTokens ?? 1000,
        },
      }),
      signal: AbortSignal.timeout(this.localConfig.timeout || 30000),
    });
  }

  /**
   * Query OpenAI-compatible API (LM Studio, vLLM, etc.)
   * Format: POST http://localhost:1234/v1/chat/completions
   */
  private async queryOpenAICompatible(
    prompt: string,
    options?: ConsensusQueryOptions
  ): Promise<Response> {
    const endpoint = `${this.localConfig.endpoint}/v1/chat/completions`;
    
    return fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.localConfig.model,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 1000,
      }),
      signal: AbortSignal.timeout(this.localConfig.timeout || 30000),
    });
  }

  /**
   * Query custom API endpoint
   * Expects a simple POST with { prompt } and returns { response }
   */
  private async queryCustom(
    prompt: string,
    options?: ConsensusQueryOptions
  ): Promise<Response> {
    return fetch(this.localConfig.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.localConfig.apiKey ? { Authorization: `Bearer ${this.localConfig.apiKey}` } : {}),
      },
      body: JSON.stringify({
        prompt,
        temperature: options?.temperature,
        max_tokens: options?.maxTokens,
      }),
      signal: AbortSignal.timeout(this.localConfig.timeout || 30000),
    });
  }

  normalize(response: any): ProviderResponse {
    switch (this.localConfig.apiType) {
      case 'ollama':
        return {
          provider: this.id,
          response: response.response || '',
          model: this.localConfig.model,
          timestamp: new Date(),
          metadata: {
            done: response.done,
            context: response.context,
          },
        };

      case 'lmstudio':
      case 'openai-compatible':
        return {
          provider: this.id,
          response: response.choices?.[0]?.message?.content || '',
          model: response.model || this.localConfig.model,
          tokensUsed: response.usage?.total_tokens,
          timestamp: new Date(),
          metadata: {
            finishReason: response.choices?.[0]?.finish_reason,
          },
        };

      case 'custom':
        return {
          provider: this.id,
          response: response.response || response.text || response.content || '',
          model: this.localConfig.model,
          timestamp: new Date(),
          metadata: response.metadata || {},
        };

      default:
        throw new Error(`Cannot normalize response for API type: ${this.localConfig.apiType}`);
    }
  }

  validate(response: any): boolean {
    switch (this.localConfig.apiType) {
      case 'ollama':
        return response && (response.response !== undefined || response.text !== undefined);
      
      case 'lmstudio':
      case 'openai-compatible':
        return (
          response &&
          response.choices &&
          Array.isArray(response.choices) &&
          response.choices.length > 0 &&
          response.choices[0].message?.content
        );
      
      case 'custom':
        return response && (response.response || response.text || response.content);
      
      default:
        return false;
    }
  }

  /**
   * Test connection to local AI
   */
  async testConnection(): Promise<boolean> {
    try {
      const testPrompt = 'Say "OK" if you can read this.';
      const response = await this.query(testPrompt, { maxTokens: 10 });
      return response.response.length > 0;
    } catch (error) {
      console.error('Local AI connection test failed:', error);
      return false;
    }
  }

  /**
   * Get available models from Ollama
   */
  async getAvailableModels(): Promise<string[]> {
    if (this.localConfig.apiType !== 'ollama') {
      return [this.localConfig.model];
    }

    try {
      const response = await fetch(`${this.localConfig.endpoint}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        return [this.localConfig.model];
      }

      const data = await response.json();
      return data.models?.map((m: any) => m.name) || [this.localConfig.model];
    } catch (error) {
      console.error('Failed to fetch available models:', error);
      return [this.localConfig.model];
    }
  }
}

