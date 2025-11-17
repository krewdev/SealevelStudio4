/**
 * Base Consensus Provider
 * Abstract class that all providers must extend
 */

import {
  ConsensusProvider,
  ProviderResponse,
  ProviderConfig,
  ProviderHealth,
  ConsensusQueryOptions,
} from '../types';

export abstract class BaseConsensusProvider implements ConsensusProvider {
  protected config: ProviderConfig;
  protected health: ProviderHealth = {
    status: 'healthy',
  };

  constructor(config: ProviderConfig) {
    this.config = config;
  }

  abstract get id(): string;
  abstract get name(): string;
  abstract query(
    prompt: string,
    options?: ConsensusQueryOptions
  ): Promise<ProviderResponse>;
  abstract normalize(response: any): ProviderResponse;
  abstract validate(response: any): boolean;

  get enabled(): boolean {
    return this.config.apiKey !== undefined && this.config.apiKey !== '';
  }

  getConfig(): ProviderConfig {
    return { ...this.config };
  }

  async getHealth(): Promise<ProviderHealth> {
    // Default health check - can be overridden
    return { ...this.health };
  }

  protected updateHealth(status: ProviderHealth['status'], error?: string): void {
    this.health = {
      ...this.health,
      status,
      lastError: error,
      errorCount: error ? (this.health.errorCount || 0) + 1 : 0,
    };
  }

  protected recordSuccess(latency: number): void {
    this.health = {
      ...this.health,
      status: 'healthy',
      latency,
      lastSuccess: new Date(),
      errorCount: 0,
    };
  }
}

