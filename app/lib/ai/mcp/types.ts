/**
 * MCP Types
 * Type definitions for Model Context Protocol
 */

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties?: Record<string, any>;
    required?: string[];
  };
  handler: (params: any) => Promise<any> | any;
}

export interface MCPResource {
  uri: string;
  name: string;
  description: string;
  mimeType?: string;
  handler?: (uri: string) => Promise<any> | any;
}

export interface MCPClientConfig {
  serverUrl: string;
  apiKey?: string;
  timeout?: number;
}

export interface MCPToolCall {
  tool: string;
  params: Record<string, any>;
}

export interface MCPToolResult {
  result: any;
  error?: string;
}

export interface MCPResourceRequest {
  uri: string;
}

export interface MCPResourceResponse {
  resource: any;
  error?: string;
}

