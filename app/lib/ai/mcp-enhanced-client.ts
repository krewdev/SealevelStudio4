/**
 * MCP-Enhanced AI Client
 * Enhances local AI queries with MCP resources (dataset + transaction examples)
 */

import { createMCPClient } from './mcp/client';
import type { LMStudioMessage } from './lm-studio-client';

const MCP_RESOURCE_CACHE: Map<string, { data: any; timestamp: number }> = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get cached MCP resource or fetch it
 */
async function getCachedResource(key: string, fetcher: () => Promise<any>): Promise<any> {
  const cached = MCP_RESOURCE_CACHE.get(key);
  const now = Date.now();
  
  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    return cached.data;
  }
  
  const data = await fetcher();
  MCP_RESOURCE_CACHE.set(key, { data, timestamp: now });
  return data;
}

/**
 * Extract relevant keywords from user query for MCP resource search
 */
function extractKeywords(query: string): string[] {
  const lowerQuery = query.toLowerCase();
  const keywords: string[] = [];
  
  // Solana-specific keywords
  const solanaTerms = [
    'anchor', 'rust', 'transaction', 'instruction', 'account', 'pda', 'cpi',
    'arbitrage', 'swap', 'defi', 'nft', 'token', 'spl', 'jupiter', 'raydium',
    'flash loan', 'priority fee', 'compute unit', 'rent', 'lamports', 'sol',
    'web3', 'typescript', 'metaplex', 'serum', 'orca', 'phantom', 'solflare'
  ];
  
  solanaTerms.forEach(term => {
    if (lowerQuery.includes(term)) {
      keywords.push(term);
    }
  });
  
  // Extract transaction-related terms
  if (lowerQuery.includes('transfer') || lowerQuery.includes('send')) {
    keywords.push('system-transfer');
  }
  if (lowerQuery.includes('mint') || lowerQuery.includes('token')) {
    keywords.push('create-token');
  }
  if (lowerQuery.includes('arbitrage')) {
    keywords.push('arbitrage');
  }
  if (lowerQuery.includes('flash') || lowerQuery.includes('loan')) {
    keywords.push('flash-loan');
  }
  
  return keywords;
}

/**
 * Get relevant MCP resources for a query
 */
async function getRelevantMCPResources(query: string): Promise<{
  datasetQuestions?: any[];
  transactionExamples?: any[];
}> {
  const mcpClient = createMCPClient();
  if (!mcpClient) {
    return {};
  }
  
  // Check if MCP server is available
  const isHealthy = await mcpClient.healthCheck();
  if (!isHealthy) {
    console.warn('MCP server not available, skipping resource enrichment');
    return {};
  }
  
  const keywords = extractKeywords(query);
  const results: any = {};
  
  try {
    // Get relevant dataset questions
    if (keywords.length > 0) {
      const searchTerm = keywords[0]; // Use first keyword
      const datasetResource = await getCachedResource(
        `dataset:${searchTerm}`,
        async () => {
          try {
            const response = await mcpClient.getResource({
              uri: `dataset://solana-vanguard/questions?search=${encodeURIComponent(searchTerm)}&limit=3`
            });
            return response.resource || [];
          } catch {
            return [];
          }
        }
      );
      
      if (Array.isArray(datasetResource) && datasetResource.length > 0) {
        results.datasetQuestions = datasetResource;
      }
    }
    
    // Get relevant transaction examples
    if (keywords.some(k => ['transfer', 'mint', 'arbitrage', 'flash-loan', 'multi-send'].includes(k))) {
      const txResource = await getCachedResource(
        `tx:${keywords.join(',')}`,
        async () => {
          try {
            // Try to find specific example
            for (const keyword of keywords) {
              if (['system-transfer', 'create-token-and-mint', 'simple-arbitrage', 'flash-loan-stack', 'multi-send'].includes(keyword)) {
                const response = await mcpClient.getResource({
                  uri: `tx://examples/${keyword}`
                });
                if (response.resource) {
                  return [response.resource];
                }
              }
            }
            
            // Fallback: search by keyword
            const searchTerm = keywords.find(k => !k.includes('-')) || keywords[0];
            if (searchTerm) {
              const response = await mcpClient.getResource({
                uri: `tx://examples/search?keyword=${encodeURIComponent(searchTerm)}`
              });
              return response.resource || [];
            }
            
            return [];
          } catch {
            return [];
          }
        }
      );
      
      if (Array.isArray(txResource) && txResource.length > 0) {
        results.transactionExamples = txResource.slice(0, 2); // Limit to 2 examples
      }
    }
  } catch (error) {
    console.error('Error fetching MCP resources:', error);
  }
  
  return results;
}

/**
 * Build enhanced system prompt with MCP context
 */
function buildEnhancedSystemPrompt(
  basePrompt: string,
  resources: { datasetQuestions?: any[]; transactionExamples?: any[] }
): string {
  let enhancedPrompt = basePrompt;
  
  // Add dataset context
  if (resources.datasetQuestions && resources.datasetQuestions.length > 0) {
    enhancedPrompt += '\n\n## Relevant Educational Context:\n';
    resources.datasetQuestions.forEach((q, i) => {
      enhancedPrompt += `${i + 1}. Question: ${q.Instruction}\n   Answer: ${q.Output}\n\n`;
    });
  }
  
  // Add transaction example context
  if (resources.transactionExamples && resources.transactionExamples.length > 0) {
    enhancedPrompt += '\n\n## Relevant Transaction Examples from Codebase:\n';
    resources.transactionExamples.forEach((ex, i) => {
      enhancedPrompt += `${i + 1}. ${ex.name}: ${ex.description}\n`;
      if (ex.codeSnippet) {
        enhancedPrompt += `   Code:\n${ex.codeSnippet.split('\n').map((line: string) => `   ${line}`).join('\n')}\n`;
      }
      if (ex.explanation) {
        enhancedPrompt += `   Explanation: ${ex.explanation}\n`;
      }
      enhancedPrompt += '\n';
    });
  }
  
  enhancedPrompt += '\nUse this context to provide accurate, codebase-specific answers. Reference transaction examples when helping users build similar transactions.';
  
  return enhancedPrompt;
}

/**
 * Enhanced query function that automatically enriches with MCP resources
 */
export async function queryLMStudioWithMCP(
  messages: LMStudioMessage[],
  options?: {
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
    enableMCP?: boolean;
  }
): Promise<{
  content: string;
  error?: string;
  mcpResourcesUsed?: boolean;
}> {
  const enableMCP = options?.enableMCP !== false; // Default to true
  const userMessage = messages[messages.length - 1]?.content || '';
  
  let enhancedMessages = messages;
  let mcpResourcesUsed = false;
  
  // Enrich with MCP resources if enabled
  if (enableMCP && userMessage) {
    try {
      const resources = await getRelevantMCPResources(userMessage);
      
      if (resources.datasetQuestions || resources.transactionExamples) {
        mcpResourcesUsed = true;
        
        // Enhance system prompt with MCP context
        const baseSystemPrompt = options?.systemPrompt || 
          'You are an AI assistant for Sealevel Studio, a Solana DeFi platform.';
        
        const enhancedSystemPrompt = buildEnhancedSystemPrompt(baseSystemPrompt, resources);
        
        // Update system message
        enhancedMessages = messages.map((msg, i) => {
          if (i === 0 && msg.role === 'system') {
            return { ...msg, content: enhancedSystemPrompt };
          }
          return msg;
        });
        
        // If no system message exists, prepend one
        if (enhancedMessages[0]?.role !== 'system') {
          enhancedMessages = [
            { role: 'system', content: enhancedSystemPrompt },
            ...enhancedMessages
          ];
        }
      }
    } catch (error) {
      console.warn('Failed to enrich with MCP resources, proceeding without:', error);
    }
  }
  
  // Use original LM Studio client for the actual query
  const { queryLMStudio } = await import('./lm-studio-client');
  
  return {
    ...await queryLMStudio(enhancedMessages, {
      temperature: options?.temperature,
      maxTokens: options?.maxTokens,
      systemPrompt: enhancedMessages.find(m => m.role === 'system')?.content
    }),
    mcpResourcesUsed
  };
}

/**
 * Enhanced context-aware query with automatic MCP enrichment
 */
export async function getAIResponseWithMCPContext(
  userMessage: string,
  context?: {
    availableOperations?: string[];
    userWallet?: string;
    network?: string;
  }
): Promise<{
  content: string;
  mcpResourcesUsed: boolean;
  error?: string;
}> {
  const baseSystemPrompt = `You are an AI assistant for Sealevel Studio, a Solana DeFi platform. You can help users execute Solana operations through natural language.

Available operations:
- Staking: "stake 200 sol" (Marinade, Jito, Lido, native)
- Sending: "send 5 sol to jimmy" (uses contacts)
- Airdrops: "airdrop 10 sol on devnet" (devnet only)
- Transaction building: "build transaction to swap SOL for USDC"
- Arbitrage: "find arbitrage opportunities"
- Social bots: "setup telegram bot"
- Contacts: "add contact", "show contacts"

You have access to:
1. Educational content from the Solana Vanguard Challenge dataset (1000+ Q&A)
2. Real transaction examples from the Sealevel Studio codebase
3. Codebase-specific patterns and implementations

When users ask to execute operations, acknowledge their request and guide them through the process. Be helpful, concise, and friendly.`;

  const result = await queryLMStudioWithMCP(
    [{ role: 'user', content: userMessage }],
    {
      systemPrompt: baseSystemPrompt,
      temperature: 0.7,
      maxTokens: 500,
      enableMCP: true,
    }
  );

  if (result.error) {
    throw new Error(result.error);
  }

  return {
    content: result.content,
    mcpResourcesUsed: result.mcpResourcesUsed || false,
  };
}
