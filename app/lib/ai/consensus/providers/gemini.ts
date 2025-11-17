/**
 * Google Gemini Consensus Provider
 */

import { BaseConsensusProvider } from './base';
import {
  ProviderResponse,
  ProviderConfig,
  ConsensusQueryOptions,
} from '../types';

export class GeminiProvider extends BaseConsensusProvider {
  get id(): string {
    return 'gemini';
  }

  get name(): string {
    return 'Google Gemini';
  }

  async query(
    prompt: string,
    options?: ConsensusQueryOptions
  ): Promise<ProviderResponse> {
    const startTime = Date.now();

    if (!this.config.apiKey) {
      throw new Error('Gemini API key not configured');
    }

    try {
      const model = this.config.model || 'gemini-pro';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.config.apiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: options?.temperature ?? 0.7,
            maxOutputTokens: options?.maxTokens ?? 1000,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        this.updateHealth('degraded', error);
        throw new Error(`Gemini API error: ${response.status} - ${error}`);
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
      response: response.candidates?.[0]?.content?.parts?.[0]?.text || '',
      model: this.config.model || 'gemini-pro',
      timestamp: new Date(),
      metadata: {
        finishReason: response.candidates?.[0]?.finishReason,
      },
    };
  }

  validate(response: any): boolean {
    return (
      response &&
      response.candidates &&
      Array.isArray(response.candidates) &&
      response.candidates.length > 0 &&
      response.candidates[0].content?.parts?.[0]?.text
    );
  }
}

