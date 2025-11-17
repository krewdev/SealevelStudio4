/**
 * Provider Registry
 * Manages registration and discovery of consensus providers
 */

import { ConsensusProvider } from '../types';
import { OpenAIProvider } from './openai';
import { AnthropicProvider } from './anthropic';
import { GeminiProvider } from './gemini';
import { DeepSeekProvider } from './deepseek';
import { LocalAIProvider, LocalModelConfig } from './local';

export class ProviderRegistry {
  private providers: Map<string, ConsensusProvider> = new Map();

  constructor() {
    // Register built-in providers
    this.registerBuiltInProviders();
  }

  private registerBuiltInProviders(): void {
    // OpenAI
    if (process.env.OPENAI_API_KEY) {
      this.register(
        new OpenAIProvider({
          apiKey: process.env.OPENAI_API_KEY,
          model: 'gpt-4o-mini',
          weight: 1.0,
        })
      );
    }

    // Anthropic
    if (process.env.ANTHROPIC_API_KEY) {
      this.register(
        new AnthropicProvider({
          apiKey: process.env.ANTHROPIC_API_KEY,
          model: 'claude-3-5-sonnet-20241022',
          weight: 1.0,
        })
      );
    }

    // Gemini
    if (process.env.GEMINI_API_KEY) {
      this.register(
        new GeminiProvider({
          apiKey: process.env.GEMINI_API_KEY,
          model: 'gemini-pro',
          weight: 1.0,
        })
      );
    }

    // DeepSeek
    if (process.env.DEEPSEEK_API_KEY) {
      this.register(
        new DeepSeekProvider({
          apiKey: process.env.DEEPSEEK_API_KEY,
          model: 'deepseek-chat',
          weight: 1.0,
        })
      );
    }

    // Local AI (Core Model)
    if (process.env.LOCAL_AI_ENABLED === 'true' || process.env.LOCAL_AI_ENDPOINT) {
      const localConfig: LocalModelConfig = {
        endpoint: process.env.LOCAL_AI_ENDPOINT || 'http://localhost:11434',
        model: process.env.LOCAL_AI_MODEL || 'llama2',
        apiType: (process.env.LOCAL_AI_TYPE as 'ollama' | 'lmstudio' | 'openai-compatible' | 'custom') || 'ollama',
        timeout: parseInt(process.env.LOCAL_AI_TIMEOUT || '30000'),
        weight: parseFloat(process.env.LOCAL_AI_WEIGHT || '1.5'), // Higher weight for core model
      };
      
      this.register(new LocalAIProvider(localConfig));
    }
  }

  /**
   * Register a custom provider
   * This is the plug-and-play API for users
   */
  register(provider: ConsensusProvider): void {
    if (!provider.enabled) {
      console.warn(`Provider ${provider.id} is not enabled, skipping registration`);
      return;
    }
    this.providers.set(provider.id, provider);
    console.log(`Registered consensus provider: ${provider.name} (${provider.id})`);
  }

  /**
   * Unregister a provider
   */
  unregister(providerId: string): void {
    this.providers.delete(providerId);
  }

  /**
   * Get a provider by ID
   */
  get(providerId: string): ConsensusProvider | undefined {
    return this.providers.get(providerId);
  }

  /**
   * Get all enabled providers
   */
  getAll(): ConsensusProvider[] {
    return Array.from(this.providers.values()).filter(p => p.enabled);
  }

  /**
   * Get provider IDs
   */
  getIds(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Get provider count
   */
  getCount(): number {
    return this.providers.size;
  }

  /**
   * Check if a provider is registered
   */
  has(providerId: string): boolean {
    return this.providers.has(providerId);
  }
}

// Global registry instance
export const providerRegistry = new ProviderRegistry();

