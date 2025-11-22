/**
 * Consensus Engine
 * Core algorithm for multi-model consensus
 */

import {
  ConsensusRequest,
  ConsensusResult,
  ConsensusConfig,
  ProviderResponse,
  ConsensusQueryOptions,
} from './types';
import { providerRegistry } from './providers/registry';
import { consensusCache } from './cache';
import { consensusConfig } from './config';

// Timeout limits in ms
const MIN_TIMEOUT = 100;    // Do not allow less than 100ms
const MAX_TIMEOUT = 30000;  // Do not allow more than 30 seconds

/**
 * Calculate similarity between two responses
 * Uses simple string similarity (can be enhanced with semantic similarity)
 */
function calculateSimilarity(response1: string, response2: string): number {
  // Simple lexical similarity (Jaccard similarity on words)
  const words1 = new Set(response1.toLowerCase().split(/\s+/));
  const words2 = new Set(response2.toLowerCase().split(/\s+/));

  const intersection = new Set(Array.from(words1).filter(x => words2.has(x)));
  const union = new Set([...Array.from(words1), ...Array.from(words2)]);

  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

/**
 * Find majority response using weighted voting
 */
function findMajority(
  responses: ProviderResponse[],
  weights: Map<string, number>
): { majority: string; minority: string[]; agreement: number } {
  // Group responses by similarity
  const groups: Array<{ response: string; responses: ProviderResponse[]; weight: number }> = [];

  for (const response of responses) {
    let added = false;
    for (const group of groups) {
      // Check if similar to existing group
      const similarity = calculateSimilarity(response.response, group.response);
      if (similarity > 0.7) {
        // Similar enough - add to group
        group.responses.push(response);
        group.weight += weights.get(response.provider) || 1.0;
        added = true;
        break;
      }
    }
    if (!added) {
      // Create new group
      groups.push({
        response: response.response,
        responses: [response],
        weight: weights.get(response.provider) || 1.0,
      });
    }
  }

  // Find group with highest weight
  groups.sort((a, b) => b.weight - a.weight);
  const majorityGroup = groups[0];
  const minorityGroups = groups.slice(1);

  // Calculate agreement percentage
  const totalWeight = responses.reduce(
    (sum, r) => sum + (weights.get(r.provider) || 1.0),
    0
  );
  const agreement = totalWeight > 0 ? (majorityGroup.weight / totalWeight) * 100 : 0;

  return {
    majority: majorityGroup.response,
    minority: minorityGroups.map(g => g.response),
    agreement,
  };
}

/**
 * Execute consensus query
 */
export async function executeConsensus(
  prompt: string,
  options?: ConsensusQueryOptions,
  config?: Partial<ConsensusConfig>
): Promise<ConsensusResult> {
  const requestId = `consensus-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const request: ConsensusRequest = {
    id: requestId,
    prompt,
    options,
    timestamp: new Date(),
  };

  // Build config and validate timeout
  const safeConfig = { ...config };
  if (typeof safeConfig.timeout === 'number') {
    if (safeConfig.timeout < MIN_TIMEOUT) safeConfig.timeout = MIN_TIMEOUT;
    if (safeConfig.timeout > MAX_TIMEOUT) safeConfig.timeout = MAX_TIMEOUT;
  } else {
    // Not a number, fallback to default
    safeConfig.timeout = consensusConfig.timeout;
  }
  const finalConfig = { ...consensusConfig, ...safeConfig };
  // Check cache first
  if (finalConfig.cacheEnabled) {
    const cached = consensusCache.get(request);
    if (cached) {
      return {
        ...cached,
        metadata: {
          ...cached.metadata,
          cacheHit: true,
        },
      };
    }
  }

  const startTime = Date.now();
  const providers = providerRegistry.getAll();

  if (providers.length < finalConfig.minProviders) {
    throw new Error(
      `Not enough providers available. Required: ${finalConfig.minProviders}, Available: ${providers.length}`
    );
  }

  // Execute queries in parallel with timeout
  const queryPromises = providers.map(async (provider) => {
    try {
      const response = await Promise.race([
        provider.query(prompt, options),
        new Promise<ProviderResponse>((_, reject) =>
          setTimeout(
            () => reject(new Error(`Provider ${provider.id} timeout`)),
            finalConfig.timeout
          )
        ),
      ]);
      return { success: true, response, provider: provider.id };
    } catch (error: any) {
      console.error(`Provider ${provider.id} error:`, error);
      return { success: false, error: error.message, provider: provider.id };
    }
  });

  const results = await Promise.allSettled(queryPromises);
  const successfulResponses: ProviderResponse[] = [];
  const failedProviders: string[] = [];

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value.success && result.value.response) {
      successfulResponses.push(result.value.response);
    } else {
      failedProviders.push(
        result.status === 'fulfilled' && result.value.provider ? result.value.provider : 'unknown'
      );
    }
  }

  // Check if we have enough responses
  if (successfulResponses.length < finalConfig.minProviders) {
    throw new Error(
      `Not enough providers responded. Required: ${finalConfig.minProviders}, Responded: ${successfulResponses.length}`
    );
  }

  // Calculate consensus
  const weights = new Map<string, number>();
  providers.forEach(p => {
    weights.set(p.id, p.getConfig().weight || 1.0);
  });

  const { majority, minority, agreement } = findMajority(successfulResponses, weights);
  const consensus = agreement >= finalConfig.threshold * 100;

  // Calculate confidence (based on agreement and number of providers)
  const confidence = Math.min(
    agreement / 100,
    successfulResponses.length / providers.length
  );

  const consensusResult: ConsensusResult = {
    id: requestId,
    consensus,
    confidence,
    agreement,
    responses: successfulResponses,
    majority,
    minority,
    metadata: {
      providersQueried: providers.length,
      providersResponded: successfulResponses.length,
      responseTime: Date.now() - startTime,
      cacheHit: false,
      prompt,
      timestamp: new Date(),
    },
  };

  // Cache result
  if (finalConfig.cacheEnabled) {
    consensusCache.set(request, consensusResult, finalConfig.cacheTTL);
  }

  return consensusResult;
}

/**
 * Retry with exponential backoff
 */
export async function executeConsensusWithRetry(
  prompt: string,
  options?: ConsensusQueryOptions,
  config?: Partial<ConsensusConfig>
): Promise<ConsensusResult> {
  const finalConfig = { ...consensusConfig, ...config };
  const retryConfig = finalConfig.retryConfig;

  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      return await executeConsensus(prompt, options, config);
    } catch (error: any) {
      lastError = error;
      if (attempt < retryConfig.maxRetries) {
        const delay = retryConfig.initialDelay * Math.pow(retryConfig.backoffMultiplier, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Consensus execution failed after retries');
}

