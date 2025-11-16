/**
 * Protocols AI Agent Types
 * AI agent to assist with new protocols (bundler, market maker, advertising)
 */

export interface ProtocolAgentContext {
  userWallet: string;
  isBetaTester: boolean;
  sealBalance: number;
  availableServices: string[];
}

export interface ProtocolAgentSuggestion {
  type: 'bundler' | 'market_maker' | 'advertising' | 'general';
  title: string;
  description: string;
  action?: {
    type: 'configure' | 'execute' | 'optimize';
    parameters?: Record<string, any>;
  };
  confidence: number; // 0-1
}

export interface ProtocolAgentResponse {
  suggestions: ProtocolAgentSuggestion[];
  analysis: string;
  costEstimate?: {
    service: string;
    sealCost: number;
    discount?: number;
    finalCost: number;
  };
  warnings?: string[];
}

