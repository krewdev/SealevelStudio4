/**
 * Intent Parser
 * Converts natural language commands into structured intents
 */

export type IntentType =
  | 'stake'
  | 'send'
  | 'airdrop'
  | 'build_transaction'
  | 'arbitrage'
  | 'social_bot'
  | 'contact'
  | 'help'
  | 'unknown';

export interface ParsedIntent {
  type: IntentType;
  confidence: number;
  parameters: {
    amount?: number;
    token?: string;
    recipient?: string;
    provider?: string;
    network?: string;
    operation?: string;
    contactName?: string;
    walletAddress?: string;
    email?: string;
    action?: string;
    [key: string]: any;
  };
  rawText: string;
}

/**
 * Parse natural language into structured intent
 */
export function parseIntent(userMessage: string): ParsedIntent {
  const lowerMessage = userMessage.toLowerCase().trim();
  const words = lowerMessage.split(/\s+/);

  // STAKE intent
  if (
    lowerMessage.includes('stake') ||
    lowerMessage.includes('staking') ||
    lowerMessage.includes('deposit') ||
    lowerMessage.includes('delegate')
  ) {
    const amount = extractAmount(lowerMessage);
    const provider = extractStakingProvider(lowerMessage);
    
    return {
      type: 'stake',
      confidence: 0.9,
      parameters: {
        amount,
        provider,
      },
      rawText: userMessage,
    };
  }

  // SEND intent
  if (
    lowerMessage.includes('send') ||
    lowerMessage.includes('transfer') ||
    lowerMessage.includes('pay') ||
    lowerMessage.includes('give')
  ) {
    const amount = extractAmount(lowerMessage);
    const recipient = extractRecipient(lowerMessage, words);
    const token = extractToken(lowerMessage);
    
    return {
      type: 'send',
      confidence: 0.9,
      parameters: {
        amount,
        recipient,
        token: token || 'SOL',
      },
      rawText: userMessage,
    };
  }

  // AIRDROP intent
  if (
    lowerMessage.includes('airdrop') ||
    lowerMessage.includes('faucet') ||
    lowerMessage.includes('test sol') ||
    lowerMessage.includes('devnet')
  ) {
    const amount = extractAmount(lowerMessage);
    const network = extractNetwork(lowerMessage);
    
    return {
      type: 'airdrop',
      confidence: 0.85,
      parameters: {
        amount: amount || 1, // Default 1 SOL
        network: network || 'devnet',
      },
      rawText: userMessage,
    };
  }

  // BUILD_TRANSACTION intent
  if (
    lowerMessage.includes('build') ||
    lowerMessage.includes('create') ||
    lowerMessage.includes('transaction') ||
    lowerMessage.includes('tx')
  ) {
    const operation = extractOperation(lowerMessage);
    
    return {
      type: 'build_transaction',
      confidence: 0.8,
      parameters: {
        operation,
      },
      rawText: userMessage,
    };
  }

  // ARBITRAGE intent
  if (
    lowerMessage.includes('arbitrage') ||
    lowerMessage.includes('arb') ||
    lowerMessage.includes('profit') ||
    lowerMessage.includes('opportunity')
  ) {
    return {
      type: 'arbitrage',
      confidence: 0.85,
      parameters: {},
      rawText: userMessage,
    };
  }

  // SOCIAL_BOT intent
  if (
    lowerMessage.includes('telegram') ||
    lowerMessage.includes('twitter') ||
    lowerMessage.includes('bot') ||
    lowerMessage.includes('promote') ||
    lowerMessage.includes('social')
  ) {
    const platform = extractPlatform(lowerMessage);
    const action = extractAction(lowerMessage);
    
    return {
      type: 'social_bot',
      confidence: 0.8,
      parameters: {
        platform,
        action,
      },
      rawText: userMessage,
    };
  }

  // CONTACT intent
  if (
    lowerMessage.includes('contact') ||
    lowerMessage.includes('save') ||
    lowerMessage.includes('add contact') ||
    lowerMessage.includes('delete contact') ||
    lowerMessage.includes('show contacts')
  ) {
    const contactName = extractContactName(lowerMessage, words);
    const walletAddress = extractWalletAddress(lowerMessage);
    const email = extractEmail(lowerMessage);
    const action = extractContactAction(lowerMessage);
    
    return {
      type: 'contact',
      confidence: 0.8,
      parameters: {
        contactName,
        walletAddress,
        email,
        action,
      },
      rawText: userMessage,
    };
  }

  // HELP intent
  if (
    lowerMessage.includes('help') ||
    lowerMessage.includes('how') ||
    lowerMessage.includes('what') ||
    lowerMessage.includes('explain') ||
    lowerMessage.includes('?')
  ) {
    return {
      type: 'help',
      confidence: 0.9,
      parameters: {},
      rawText: userMessage,
    };
  }

  // Unknown intent
  return {
    type: 'unknown',
    confidence: 0.1,
    parameters: {},
    rawText: userMessage,
  };
}

/**
 * Extract amount from message (e.g., "5 SOL", "100", "10.5 sol")
 */
function extractAmount(message: string): number | undefined {
  // Match patterns like "5 SOL", "100", "10.5 sol", "200 sol"
  const patterns = [
    /(\d+\.?\d*)\s*sol/i,
    /(\d+\.?\d*)\s*usdc/i,
    /(\d+\.?\d*)\s*usdt/i,
    /(\d+\.?\d*)\s*token/i,
    /(\d+\.?\d*)(?:\s|$)/,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) {
      const amount = parseFloat(match[1]);
      if (!isNaN(amount) && amount > 0) {
        return amount;
      }
    }
  }

  return undefined;
}

/**
 * Extract recipient from message
 */
function extractRecipient(message: string, words: string[]): string | undefined {
  // Look for "to [name/address]" pattern
  const toIndex = words.indexOf('to');
  if (toIndex >= 0 && toIndex < words.length - 1) {
    const recipient = words.slice(toIndex + 1).join(' ');
    
    // Check if it's a wallet address (base58, 32-44 chars)
    if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(recipient)) {
      return recipient;
    }
    
    // Check if it's an email
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
      return recipient;
    }
    
    // Otherwise, treat as contact name
    return recipient;
  }

  return undefined;
}

/**
 * Extract token symbol from message
 */
function extractToken(message: string): string | undefined {
  const tokens = ['sol', 'usdc', 'usdt', 'bonk', 'jito', 'msol', 'stsol'];
  for (const token of tokens) {
    if (message.includes(token)) {
      return token.toUpperCase();
    }
  }
  return undefined;
}

/**
 * Extract staking provider from message
 */
function extractStakingProvider(message: string): string | undefined {
  if (message.includes('marinade') || message.includes('msol')) {
    return 'marinade';
  }
  if (message.includes('jito') || message.includes('jitosol')) {
    return 'jito';
  }
  if (message.includes('lido') || message.includes('stsol')) {
    return 'lido';
  }
  if (message.includes('native') || message.includes('validator')) {
    return 'native';
  }
  return undefined;
}

/**
 * Extract network from message
 */
function extractNetwork(message: string): string | undefined {
  if (message.includes('devnet')) {
    return 'devnet';
  }
  if (message.includes('mainnet')) {
    return 'mainnet';
  }
  if (message.includes('testnet')) {
    return 'testnet';
  }
  return undefined;
}

/**
 * Extract operation type from message
 */
function extractOperation(message: string): string | undefined {
  if (message.includes('transfer') || message.includes('send')) {
    return 'transfer';
  }
  if (message.includes('swap') || message.includes('trade')) {
    return 'swap';
  }
  if (message.includes('mint')) {
    return 'mint';
  }
  if (message.includes('stake')) {
    return 'stake';
  }
  return undefined;
}

/**
 * Extract platform from message
 */
function extractPlatform(message: string): string | undefined {
  if (message.includes('telegram')) {
    return 'telegram';
  }
  if (message.includes('twitter') || message.includes('x')) {
    return 'twitter';
  }
  return undefined;
}

/**
 * Extract action from message
 */
function extractAction(message: string): string | undefined {
  if (message.includes('setup') || message.includes('configure') || message.includes('create')) {
    return 'setup';
  }
  if (message.includes('start')) {
    return 'start';
  }
  if (message.includes('stop')) {
    return 'stop';
  }
  return undefined;
}

/**
 * Extract contact name from message
 */
function extractContactName(message: string, words: string[]): string | undefined {
  // Look for patterns like "add contact [name]", "save [name]", etc.
  const addIndex = words.indexOf('add');
  const saveIndex = words.indexOf('save');
  const contactIndex = words.indexOf('contact');
  
  if (addIndex >= 0 && contactIndex >= 0 && contactIndex < words.length - 1) {
    return words.slice(contactIndex + 1).join(' ').split(/\s+(?:with|wallet|email)/i)[0];
  }
  
  if (saveIndex >= 0 && saveIndex < words.length - 1) {
    return words.slice(saveIndex + 1).join(' ').split(/\s+(?:with|wallet|email)/i)[0];
  }
  
  return undefined;
}

/**
 * Extract wallet address from message
 */
function extractWalletAddress(message: string): string | undefined {
  // Match Solana wallet address (base58, 32-44 chars)
  const match = message.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/);
  return match ? match[0] : undefined;
}

/**
 * Extract email from message
 */
function extractEmail(message: string): string | undefined {
  const match = message.match(/[^\s@]+@[^\s@]+\.[^\s@]+/);
  return match ? match[0] : undefined;
}

/**
 * Extract contact action from message
 */
function extractContactAction(message: string): string | undefined {
  if (message.includes('add') || message.includes('save') || message.includes('create')) {
    return 'add';
  }
  if (message.includes('delete') || message.includes('remove')) {
    return 'delete';
  }
  if (message.includes('show') || message.includes('list') || message.includes('view')) {
    return 'list';
  }
  if (message.includes('search') || message.includes('find')) {
    return 'search';
  }
  return undefined;
}

