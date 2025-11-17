/**
 * Consensus Configuration
 * Loads and manages consensus system configuration
 */

import { ConsensusConfig, ProviderConfig } from './types';

const DEFAULT_CONFIG: ConsensusConfig = {
  providers: [],
  threshold: 0.75, // 75% agreement required
  minProviders: 2, // At least 2 providers must respond
  timeout: 30000, // 30 seconds
  cacheEnabled: true,
  cacheTTL: 300, // 5 minutes
  retryConfig: {
    maxRetries: 3,
    backoffMultiplier: 2,
    initialDelay: 1000,
  },
};

/**
 * Load configuration from environment variables
 */
export function loadConsensusConfig(): ConsensusConfig {
  const config: ConsensusConfig = { ...DEFAULT_CONFIG };

  // Load provider configs from environment
  const providers: ProviderConfig[] = [];

  if (process.env.OPENAI_API_KEY) {
    providers.push({
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      timeout: parseInt(process.env.OPENAI_TIMEOUT || '30000'),
      weight: parseFloat(process.env.OPENAI_WEIGHT || '1.0'),
    });
  }

  if (process.env.ANTHROPIC_API_KEY) {
    providers.push({
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
      timeout: parseInt(process.env.ANTHROPIC_TIMEOUT || '30000'),
      weight: parseFloat(process.env.ANTHROPIC_WEIGHT || '1.0'),
    });
  }

  if (process.env.GEMINI_API_KEY) {
    providers.push({
      apiKey: process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_MODEL || 'gemini-pro',
      timeout: parseInt(process.env.GEMINI_TIMEOUT || '30000'),
      weight: parseFloat(process.env.GEMINI_WEIGHT || '1.0'),
    });
  }

  if (process.env.DEEPSEEK_API_KEY) {
    providers.push({
      apiKey: process.env.DEEPSEEK_API_KEY,
      model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
      timeout: parseInt(process.env.DEEPSEEK_TIMEOUT || '30000'),
      weight: parseFloat(process.env.DEEPSEEK_WEIGHT || '1.0'),
    });
  }

  // Local AI (Core Model) - if enabled, it's automatically registered by registry
  // But we can add it to config here for reference
  if (process.env.LOCAL_AI_ENABLED === 'true' || process.env.LOCAL_AI_ENDPOINT) {
    // Note: Local AI is registered separately in registry.ts
    // This is just for documentation
  }

  config.providers = providers;

  // Override with environment variables if provided
  if (process.env.CONSENSUS_THRESHOLD) {
    config.threshold = parseFloat(process.env.CONSENSUS_THRESHOLD);
  }
  if (process.env.CONSENSUS_MIN_PROVIDERS) {
    config.minProviders = parseInt(process.env.CONSENSUS_MIN_PROVIDERS);
  }
  if (process.env.CONSENSUS_TIMEOUT) {
    config.timeout = parseInt(process.env.CONSENSUS_TIMEOUT);
  }
  if (process.env.CONSENSUS_CACHE_ENABLED !== undefined) {
    config.cacheEnabled = process.env.CONSENSUS_CACHE_ENABLED === 'true';
  }
  if (process.env.CONSENSUS_CACHE_TTL) {
    config.cacheTTL = parseInt(process.env.CONSENSUS_CACHE_TTL);
  }

  return config;
}

// Global config instance
export const consensusConfig = loadConsensusConfig();

