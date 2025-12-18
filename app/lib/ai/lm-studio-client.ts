/**
 * LM Studio Client
 * Client for interacting with LM Studio local AI server
 */

// Support both localhost and network IP addresses
const getLMStudioEndpoint = () => {
  if (typeof window !== 'undefined') {
    // Client-side: check for environment variable or try to detect
    return process.env.NEXT_PUBLIC_LM_STUDIO_ENDPOINT || 'http://localhost:1234/v1';
  }
  // Server-side: use environment variable or default
  return process.env.LOCAL_AI_ENDPOINT || process.env.NEXT_PUBLIC_LM_STUDIO_ENDPOINT || 'http://localhost:1234/v1';
};

const LM_STUDIO_ENDPOINT = getLMStudioEndpoint();

export interface LMStudioMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LMStudioResponse {
  content: string;
  error?: string;
}

/**
 * Check if LM Studio is available
 */
export async function checkLMStudioAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${LM_STUDIO_ENDPOINT}/models`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Send chat completion request to LM Studio
 */
export async function queryLMStudio(
  messages: LMStudioMessage[],
  options?: {
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
  }
): Promise<LMStudioResponse> {
  try {
    const requestMessages = options?.systemPrompt
      ? [{ role: 'system' as const, content: options.systemPrompt }, ...messages]
      : messages;

    const response = await fetch(`${LM_STUDIO_ENDPOINT}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'local-model', // LM Studio uses whatever model is loaded
        messages: requestMessages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 1000,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        content: '',
        error: `LM Studio API error: ${response.status} - ${errorText}`,
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    if (!content) {
      return {
        content: '',
        error: 'Empty response from LM Studio',
      };
    }

    return { content };
  } catch (error) {
    return {
      content: '',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get AI response with context about available operations
 */
export async function getAIResponseWithContext(
  userMessage: string,
  context?: {
    availableOperations?: string[];
    userWallet?: string;
    network?: string;
  }
): Promise<string> {
  const systemPrompt = `You are an AI assistant for Sealevel Studio, a Solana DeFi platform. You can help users execute Solana operations through natural language.

Available operations:
- Staking: "stake 200 sol" (Marinade, Jito, Lido, native)
- Sending: "send 5 sol to jimmy" (uses contacts)
- Airdrops: "airdrop 10 sol on devnet" (devnet only)
- Transaction building: "build transaction to swap SOL for USDC"
- Arbitrage: "find arbitrage opportunities"
- Social bots: "setup telegram bot"
- Contacts: "add contact", "show contacts"

When users ask to execute operations, acknowledge their request and guide them through the process. Be helpful, concise, and friendly.`;

  const messages: LMStudioMessage[] = [
    {
      role: 'user',
      content: userMessage,
    },
  ];

  const result = await queryLMStudio(messages, {
    systemPrompt,
    temperature: 0.7,
    maxTokens: 500,
  });

  if (result.error) {
    throw new Error(result.error);
  }

  return result.content;
}

