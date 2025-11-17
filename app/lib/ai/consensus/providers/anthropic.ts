/**
 * Anthropic (Claude) Consensus Provider
 */

import { BaseConsensusProvider } from './base';
import {
  ProviderResponse,
  ProviderConfig,
  ConsensusQueryOptions,
} from '../types';

export class AnthropicProvider extends BaseConsensusProvider {
  get id(): string {
    return 'anthropic';
  }

  get name(): string {
    return 'Anthropic Claude';
  }

  async query(
    prompt: string,
    options?: ConsensusQueryOptions
  ): Promise<ProviderResponse> {
    const startTime = Date.now();

    if (!this.config.apiKey) {
      throw new Error('Anthropic API key not configured');
    }

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.config.model || 'claude-3-5-sonnet-20241022',
          max_tokens: options?.maxTokens ?? 1000,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        this.updateHealth('degraded', error);
        throw new Error(`Anthropic API error: ${response.status} - ${error}`);
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
      response: response.content?.[0]?.text || '',
      model: response.model,
      tokensUsed: response.usage?.input_tokens + response.usage?.output_tokens,
      timestamp: new Date(),
      metadata: {
        stopReason: response.stop_reason,
      },
    };
  }

  validate(response: any): boolean {
    return (
      response &&
      response.content &&
      Array.isArray(response.content) &&
      response.content.length > 0 &&
      response.content[0].text
    );
  }
}

