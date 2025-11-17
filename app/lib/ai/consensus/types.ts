/**
 * Consensus System Types
 * Type definitions for the plug-and-play consensus architecture
 */

export interface ConsensusProvider {
  id: string;
  name: string;
  enabled: boolean;
  query(prompt: string, options?: ConsensusQueryOptions): Promise<ProviderResponse>;
  normalize(response: any): ProviderResponse;
  validate(response: any): boolean;
  getConfig(): ProviderConfig;
  getHealth(): Promise<ProviderHealth>;
}

export interface ProviderConfig {
  apiKey?: string;
  endpoint?: string;
  model?: string;
  timeout?: number;
  maxRetries?: number;
  weight?: number; // For weighted voting
}

export interface ProviderHealth {
  status: 'healthy' | 'degraded' | 'down';
  latency?: number;
  lastSuccess?: Date;
  lastError?: string;
  errorCount?: number;
}

export interface ConsensusQueryOptions {
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
  retries?: number;
}

export interface ProviderResponse {
  provider: string;
  response: string;
  model?: string;
  tokensUsed?: number;
  latency?: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface ConsensusResult {
  id: string;
  consensus: boolean;
  confidence: number; // 0-1
  agreement: number; // Percentage of providers in agreement
  responses: ProviderResponse[];
  majority: string;
  minority: string[];
  metadata: {
    providersQueried: number;
    providersResponded: number;
    responseTime: number;
    cacheHit: boolean;
    prompt: string;
    timestamp: Date;
  };
}

export interface ConsensusConfig {
  providers: ProviderConfig[];
  threshold: number; // Minimum agreement percentage (0-1)
  minProviders: number; // Minimum number of providers that must respond
  timeout: number; // Overall timeout in ms
  cacheEnabled: boolean;
  cacheTTL: number; // Cache TTL in seconds
  retryConfig: {
    maxRetries: number;
    backoffMultiplier: number;
    initialDelay: number;
  };
}

export interface ConsensusRequest {
  id: string;
  prompt: string;
  options?: ConsensusQueryOptions;
  config?: Partial<ConsensusConfig>;
  timestamp: Date;
}

