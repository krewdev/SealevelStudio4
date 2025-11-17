/**
 * OpenAI Consensus Provider
 */

import { BaseConsensusProvider } from './base';
import {
  ProviderResponse,
  ProviderConfig,
  ConsensusQueryOptions,
} from '../types';

export class OpenAIProvider extends BaseConsensusProvider {
  get id(): string {
    return 'openai';
  }

  get name(): string {
    return 'OpenAI';
  }

  async query(
    prompt: string,
    options?: ConsensusQueryOptions
  ): Promise<ProviderResponse> {
    const startTime = Date.now();

    if (!this.config.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model || 'gpt-4o-mini',
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens ?? 1000,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        this.updateHealth('degraded', error);
        throw new Error(`OpenAI API error: ${response.status} - ${error}`);
      }

      const data = await response.json();
      const latency = Date.now() - startTime;
      this.recordSuccess(latency);

      return this.normalize(data);
    } catch (error: any) {
      this.updateHealth('down', error.message);
      throw error;
    }
  }

  normalize(response: any): ProviderResponse {
    return {
      provider: this.id,
      response: response.choices?.[0]?.message?.content || '',
      model: response.model,
      tokensUsed: response.usage?.total_tokens,
      timestamp: new Date(),
      metadata: {
        finishReason: response.choices?.[0]?.finish_reason,
      },
    };
  }

  validate(response: any): boolean {
    return (
      response &&
      response.choices &&
      Array.isArray(response.choices) &&
      response.choices.length > 0 &&
      response.choices[0].message?.content
    );
  }
}

