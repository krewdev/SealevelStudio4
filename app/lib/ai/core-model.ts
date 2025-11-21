/**
 * Core AI Model Manager
 * Manages the downloaded/local AI model as the central intelligence
 */

import { LocalAIProvider, LocalModelConfig } from './consensus/providers/local';
import { providerRegistry } from './consensus/providers/registry';
import { executeConsensus } from './consensus/engine';
import { ExpressionFactory, expressionStore } from './expressions';

export interface CoreModelConfig {
  enabled: boolean;
  endpoint: string;
  model: string;
  apiType: 'ollama' | 'lmstudio' | 'openai-compatible' | 'custom';
  isPrimary: boolean; // If true, this is the core model that other models defer to
  weight: number;
  timeout?: number;
}

export class CoreAIModel {
  private provider: LocalAIProvider | null = null;
  private config: CoreModelConfig;

  constructor(config: CoreModelConfig) {
    this.config = config;
    if (config.enabled) {
      this.initialize();
    }
  }

  /**
   * Initialize the core model provider
   */
  private initialize(): void {
    const localConfig: LocalModelConfig = {
      endpoint: this.config.endpoint,
      model: this.config.model,
      apiType: this.config.apiType,
      timeout: this.config.timeout || 30000,
      weight: this.config.weight,
      dockerEnabled: process.env.DOCKER_AI_ENABLED === 'true',
    };

    this.provider = new LocalAIProvider(localConfig);
    
    // Register with consensus system
    if (this.provider.enabled) {
      providerRegistry.register(this.provider);
      console.log(`✅ Core AI Model initialized: ${this.provider.name}`);
    }
  }

  /**
   * Query the core model directly
   */
  async query(prompt: string, options?: {
    temperature?: number;
    maxTokens?: number;
  }): Promise<string> {
    if (!this.provider) {
      throw new Error('Core AI model not initialized');
    }

    const response = await this.provider.query(prompt, options);
    return response.response;
  }

  /**
   * Get consensus with core model as primary
   * The core model's response is weighted more heavily
   */
  async getConsensus(
    prompt: string,
    options?: {
      includeCloudModels?: boolean;
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<{
    coreResponse: string;
    consensus?: any;
    confidence: number;
  }> {
    // First, get core model response
    const coreResponse = await this.query(prompt, {
      temperature: options?.temperature,
      maxTokens: options?.maxTokens,
    });

    // If only using core model, return early
    if (!options?.includeCloudModels) {
      return {
        coreResponse,
        confidence: 1.0,
      };
    }

    // Otherwise, get consensus with cloud models
    try {
      const consensus = await executeConsensus(prompt, {
        temperature: options?.temperature,
        maxTokens: options?.maxTokens,
      });

      // Calculate confidence based on how well core model aligns with consensus
      const coreInConsensus = consensus.responses.some(
        r => r.provider === 'local-ai'
      );

      return {
        coreResponse,
        consensus,
        confidence: coreInConsensus && consensus.consensus ? consensus.confidence : 0.7,
      };
    } catch (error) {
      // If consensus fails, still return core response
      console.warn('Consensus failed, using core model only:', error);
      return {
        coreResponse,
        confidence: 0.8, // Slightly lower confidence without consensus
      };
    }
  }

  /**
   * Test if core model is available
   */
  async testConnection(): Promise<boolean> {
    if (!this.provider) {
      return false;
    }

    try {
      return await this.provider.testConnection();
    } catch (error) {
      console.error('Core model connection test failed:', error);
      return false;
    }
  }

  /**
   * Get available models (for Ollama)
   */
  async getAvailableModels(): Promise<string[]> {
    if (!this.provider) {
      return [];
    }

    try {
      return await this.provider.getAvailableModels();
    } catch (error) {
      console.error('Failed to get available models:', error);
      return [this.config.model];
    }
  }

  /**
   * Switch to a different model
   */
  async switchModel(modelName: string): Promise<boolean> {
    if (!this.provider) {
      return false;
    }

    // Check if model is available
    const available = await this.getAvailableModels();
    if (!available.includes(modelName)) {
      throw new Error(`Model ${modelName} is not available. Available: ${available.join(', ')}`);
    }

    // Update config and reinitialize
    this.config.model = modelName;
    this.initialize();

    // Create expression for model switch
    const expression = ExpressionFactory.createAgentState('core-ai', {
      status: 'active',
      health: 100,
      contextCount: 0,
      lastActivity: new Date(),
    }, {
      tags: ['model-switch', modelName],
    });
    expressionStore.add(expression);

    return true;
  }

  /**
   * Get current model info
   */
  getModelInfo(): {
    name: string;
    endpoint: string;
    apiType: string;
    enabled: boolean;
    isPrimary: boolean;
  } {
    return {
      name: this.config.model,
      endpoint: this.config.endpoint,
      apiType: this.config.apiType,
      enabled: this.config.enabled && this.provider !== null,
      isPrimary: this.config.isPrimary,
    };
  }
}

// Global core model instance
let coreModelInstance: CoreAIModel | null = null;

/**
 * Initialize core AI model from environment
 */
export function initializeCoreModel(): CoreAIModel {
  if (coreModelInstance) {
    return coreModelInstance;
  }

  const config: CoreModelConfig = {
    enabled: process.env.LOCAL_AI_ENABLED === 'true' || !!process.env.LOCAL_AI_ENDPOINT,
    endpoint: process.env.LOCAL_AI_ENDPOINT || 'http://localhost:11434',
    model: process.env.LOCAL_AI_MODEL || 'llama2',
    apiType: (process.env.LOCAL_AI_TYPE as any) || 'ollama',
    isPrimary: process.env.LOCAL_AI_PRIMARY !== 'false', // Default to true
    weight: parseFloat(process.env.LOCAL_AI_WEIGHT || '1.5'),
    timeout: parseInt(process.env.LOCAL_AI_TIMEOUT || '30000'),
  };

  coreModelInstance = new CoreAIModel(config);
  
  // Log initialization status
  if (config.enabled) {
    console.log(`✅ Core AI Model initialized: ${config.model} at ${config.endpoint}`);
  } else {
    console.log('⚠️  Core AI Model disabled (LOCAL_AI_ENABLED=false or no endpoint)');
  }
  
  return coreModelInstance;
}

/**
 * Get the core model instance
 */
export function getCoreModel(): CoreAIModel | null {
  return coreModelInstance;
}

/**
 * Auto-initialize on module load if enabled
 */
if (typeof window === 'undefined' && (process.env.LOCAL_AI_ENABLED === 'true' || process.env.LOCAL_AI_ENDPOINT)) {
  // Server-side only - initialize on module load
  initializeCoreModel();
}

