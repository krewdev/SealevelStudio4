/**
 * MCP Client
 * Client for connecting to MCP server
 */

import type {
  MCPClientConfig,
  MCPTool,
  MCPToolCall,
  MCPToolResult,
  MCPResource,
  MCPResourceRequest,
  MCPResourceResponse,
} from './types';

export class MCPClient {
  private config: MCPClientConfig;

  constructor(config: MCPClientConfig) {
    this.config = {
      timeout: 30000,
      ...config,
    };
  }

  /**
   * Make authenticated request to MCP server
   */
  private async request(
    path: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const url = `${this.config.serverUrl}${path}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.config.timeout
    );

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }

  /**
   * Check MCP server health
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.request('/health');
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * List available tools
   */
  async listTools(): Promise<MCPTool[]> {
    const response = await this.request('/tools');
    if (!response.ok) {
      throw new Error(`Failed to list tools: ${response.statusText}`);
    }
    const data = await response.json();
    return data.tools || [];
  }

  /**
   * Call a tool
   */
  async callTool(toolCall: MCPToolCall): Promise<MCPToolResult> {
    const response = await this.request(`/tools/${toolCall.tool}`, {
      method: 'POST',
      body: JSON.stringify({ params: toolCall.params }),
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        result: null,
        error: error.error || response.statusText,
      };
    }

    const data = await response.json();
    return { result: data.result };
  }

  /**
   * List available resources
   */
  async listResources(): Promise<MCPResource[]> {
    const response = await this.request('/resources');
    if (!response.ok) {
      throw new Error(`Failed to list resources: ${response.statusText}`);
    }
    const data = await response.json();
    return data.resources || [];
  }

  /**
   * Get a resource
   */
  async getResource(request: MCPResourceRequest): Promise<MCPResourceResponse> {
    const encodedUri = encodeURIComponent(request.uri);
    const response = await this.request(`/resources/${encodedUri}`);

    if (!response.ok) {
      const error = await response.json();
      return {
        resource: null,
        error: error.error || response.statusText,
      };
    }

    const data = await response.json();
    return { resource: data.resource };
  }
}

/**
 * Create MCP client from environment variables
 */
export function createMCPClient(): MCPClient | null {
  const enabled = process.env.MCP_ENABLED === 'true';
  const serverUrl = process.env.MCP_SERVER_URL;

  if (!enabled || !serverUrl) {
    return null;
  }

  return new MCPClient({
    serverUrl,
    apiKey: process.env.MCP_API_KEY,
    timeout: parseInt(process.env.MCP_TIMEOUT || '30000', 10),
  });
}

