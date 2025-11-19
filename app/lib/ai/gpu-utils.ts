/**
 * GPU Detection and Utilities
 * Detects GPU type and provides performance information
 */

export type GPUType = 'nvidia' | 'apple-silicon' | 'intel' | 'cpu' | 'unknown';

export interface GPUInfo {
  type: GPUType;
  available: boolean;
  memory?: number; // MB
  name?: string;
  driverVersion?: string;
  recommendations?: string[];
}

/**
 * Detect GPU type from environment or system
 * This runs on the server side only
 */
export async function detectGPU(): Promise<GPUInfo> {
  // Check environment variable first
  const envGPUType = process.env.GPU_TYPE;
  if (envGPUType && envGPUType !== 'auto') {
    return {
      type: envGPUType as GPUType,
      available: envGPUType !== 'cpu',
    };
  }

  // Try to detect GPU type
  // Note: This is limited on the server side without direct hardware access
  // In practice, GPU detection should be done via Docker or system commands
  
  // Check if running in Docker with GPU support
  const dockerEnabled = process.env.DOCKER_AI_ENABLED === 'true';
  if (dockerEnabled) {
    // Docker with GPU is typically configured via docker-compose
    // Assume GPU is available if Docker is enabled
    return {
      type: 'unknown', // Will be determined by Docker runtime
      available: true,
    };
  }

  // Default to CPU if no GPU detected
  return {
    type: 'cpu',
    available: false,
    recommendations: [
      'Use smaller models (phi, mistral:7b)',
      'Reduce maxTokens in queries',
      'Consider cloud models for heavy tasks',
    ],
  };
}

/**
 * Get GPU memory limit from environment
 */
export function getGPUMemoryLimit(): number | undefined {
  const limit = process.env.GPU_MEMORY_LIMIT;
  if (limit) {
    const parsed = parseInt(limit, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return undefined;
}

/**
 * Check if GPU is enabled
 */
export function isGPUEnabled(): boolean {
  return process.env.GPU_ENABLED !== 'false';
}

/**
 * Get recommended models based on GPU type
 */
export function getRecommendedModels(gpuType: GPUType): string[] {
  switch (gpuType) {
    case 'nvidia':
      return [
        'llama2:7b',      // 4GB VRAM
        'codellama:7b',   // 4GB VRAM
        'llama2:13b',     // 8GB VRAM
        'llama2:70b',     // 40GB VRAM
      ];
    case 'apple-silicon':
      return [
        'phi',            // 2GB unified memory
        'mistral:7b',     // 4GB unified memory
        'llama2:7b',     // 4GB unified memory
        'codellama:7b',  // 4GB unified memory
      ];
    case 'cpu':
    default:
      return [
        'phi',            // 2.7B parameters, ~2GB RAM
        'mistral:7b',     // 7B parameters, ~4GB RAM
      ];
  }
}

/**
 * Check if Docker endpoint is available
 */
export async function checkDockerEndpoint(endpoint: string): Promise<boolean> {
  try {
    // Check if endpoint is a Docker container
    if (endpoint.includes('localhost') || endpoint.includes('127.0.0.1')) {
      // Try to ping the endpoint
      const response = await fetch(`${endpoint}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Get performance metrics for GPU
 */
export interface PerformanceMetrics {
  gpuType: GPUType;
  memoryLimit?: number;
  recommendedModel?: string;
  estimatedTokensPerSecond?: number;
}

export function getPerformanceMetrics(gpuInfo: GPUInfo): PerformanceMetrics {
  const memoryLimit = getGPUMemoryLimit();
  const recommendedModels = getRecommendedModels(gpuInfo.type);
  
  // Estimate tokens per second based on GPU type
  let estimatedTPS: number | undefined;
  switch (gpuInfo.type) {
    case 'nvidia':
      estimatedTPS = 20; // Tokens per second (varies by model and GPU)
      break;
    case 'apple-silicon':
      estimatedTPS = 15;
      break;
    case 'cpu':
      estimatedTPS = 2;
      break;
    default:
      estimatedTPS = undefined;
  }

  return {
    gpuType: gpuInfo.type,
    memoryLimit,
    recommendedModel: recommendedModels[0],
    estimatedTokensPerSecond: estimatedTPS,
  };
}

