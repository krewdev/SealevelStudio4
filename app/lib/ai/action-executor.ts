/**
 * Action Executor
 * Unified executor that routes intents to specific executors
 */

import { Connection } from '@solana/web3.js';
import { WalletContextState } from '@solana/wallet-adapter-react';
import { ParsedIntent, IntentType } from './intent-parser';
import { executeStake, getStakingOptions, validateStakingAmount } from '../staking/stake-executor';
import { executeSendSOL, saveContact, validateSendAmount } from '../send/send-executor';
import { executeAirdrop, validateAirdropAmount } from '../airdrop/airdrop-executor';
import { getContactManager } from '../contacts/contact-manager';
import { getAllStakingProviders, getStakingProvider } from '../staking/staking-providers';

export interface ExecutionResult {
  success: boolean;
  message: string;
  data?: any;
  requiresUserAction?: boolean;
  actionType?: 'select_provider' | 'confirm_transaction' | 'provide_contact_info' | 'navigate';
  actionData?: any;
}

/**
 * Execute parsed intent
 */
export async function executeIntent(
  intent: ParsedIntent,
  connection: Connection,
  wallet: WalletContextState
): Promise<ExecutionResult> {
  switch (intent.type) {
    case 'stake':
      return await executeStakeIntent(intent, connection, wallet);
    
    case 'send':
      return await executeSendIntent(intent, connection, wallet);
    
    case 'airdrop':
      return await executeAirdropIntent(intent, connection, wallet);
    
    case 'contact':
      return await executeContactIntent(intent);
    
    case 'arbitrage':
      return {
        success: true,
        message: 'Navigate to Arbitrage Scanner to find opportunities.',
        requiresUserAction: true,
        actionType: 'navigate',
        actionData: { path: '/arbitrage' },
      };
    
    case 'build_transaction':
      return {
        success: true,
        message: 'Navigate to Transaction Builder to create your transaction.',
        requiresUserAction: true,
        actionType: 'navigate',
        actionData: { path: '/transaction-builder' },
      };
    
    case 'social_bot':
      return {
        success: true,
        message: 'Navigate to Advertising Bots to configure social media automation.',
        requiresUserAction: true,
        actionType: 'navigate',
        actionData: { path: '/premium/advertising' },
      };
    
    case 'help':
      return {
        success: true,
        message: getHelpMessage(),
      };
    
    default:
      return {
        success: false,
        message: "I didn't understand that command. Try: 'stake 200 sol', 'send 5 sol to jimmy', or 'airdrop 10 sol on devnet'",
      };
  }
}

/**
 * Execute staking intent
 */
async function executeStakeIntent(
  intent: ParsedIntent,
  connection: Connection,
  wallet: WalletContextState
): Promise<ExecutionResult> {
  const { amount, provider } = intent.parameters;

  if (!amount) {
    return {
      success: false,
      message: 'Please specify an amount to stake (e.g., "stake 200 sol")',
    };
  }

  // Validate amount
  const validation = validateStakingAmount(amount);
  if (!validation.valid) {
    return {
      success: false,
      message: validation.error || 'Invalid staking amount',
    };
  }

  // If provider not specified, show options
  if (!provider) {
    const options = getStakingOptions(amount);
    const allProviders = getAllStakingProviders();
    return {
      success: true,
      message: `I found ${options.length} staking options for ${amount} SOL:\n\n${options.map((opt, i) => `${i + 1}. ${opt.displayText}`).join('\n')}\n\nWhich provider would you like to use?`,
      requiresUserAction: true,
      actionType: 'select_provider',
      actionData: {
        amount,
        providers: allProviders.map(p => ({
          ...p,
          displayText: `${p.name} - ${p.apy} APY - Stake ${amount} SOL to receive ${p.tokenSymbol}`,
        })),
      },
    };
  }

  // Execute staking
  const result = await executeStake(connection, wallet, amount, provider);
  
  if (result.success) {
    return {
      success: true,
      message: `Successfully staked ${amount} SOL with ${result.provider?.name || provider}!\nTransaction: ${result.signature}`,
      data: result,
    };
  } else {
    return {
      success: false,
      message: result.error || 'Staking failed',
      data: result,
    };
  }
}

/**
 * Execute send intent
 */
async function executeSendIntent(
  intent: ParsedIntent,
  connection: Connection,
  wallet: WalletContextState
): Promise<ExecutionResult> {
  const { amount, recipient, token } = intent.parameters;

  if (!amount) {
    return {
      success: false,
      message: 'Please specify an amount to send (e.g., "send 5 sol to jimmy")',
    };
  }

  if (!recipient) {
    return {
      success: false,
      message: 'Please specify a recipient (e.g., "send 5 sol to jimmy" or "send 5 sol to 7xKXtg2...")',
    };
  }

  // Validate amount
  const validation = validateSendAmount(amount);
  if (!validation.valid) {
    return {
      success: false,
      message: validation.error || 'Invalid send amount',
    };
  }

  // For now, only SOL transfers are fully implemented
  if (token && token !== 'SOL') {
    return {
      success: false,
      message: `Token transfers (${token}) are not yet fully implemented. Please use the Transaction Builder for token transfers.`,
    };
  }

  // Check if recipient is in contacts
  const contactManager = getContactManager();
  const contact = contactManager.findContactByName(recipient);
  
  if (!contact || !contact.walletAddress) {
    // Recipient not found - need to prompt for wallet/email
    return {
      success: false,
      message: `Contact "${recipient}" not found. Please provide their wallet address or email to save them as a contact.`,
      requiresUserAction: true,
      actionType: 'provide_contact_info',
      actionData: {
        contactName: recipient,
        amount,
        token: token || 'SOL',
      },
    };
  }

  // Execute send
  const result = await executeSendSOL(connection, wallet, amount, contact.walletAddress);
  
  if (result.success) {
    return {
      success: true,
      message: `Successfully sent ${amount} SOL to ${recipient}!\nTransaction: ${result.signature}`,
      data: result,
    };
  } else {
    return {
      success: false,
      message: result.error || 'Send failed',
      data: result,
    };
  }
}

/**
 * Execute airdrop intent
 */
async function executeAirdropIntent(
  intent: ParsedIntent,
  connection: Connection,
  wallet: WalletContextState
): Promise<ExecutionResult> {
  const { amount, network, recipient } = intent.parameters;

  const airdropAmount = amount || 1; // Default 1 SOL

  // Validate amount
  const validation = validateAirdropAmount(airdropAmount);
  if (!validation.valid) {
    return {
      success: false,
      message: validation.error || 'Invalid airdrop amount',
    };
  }

  // Check network
  const endpoint = connection.rpcEndpoint;
  const isDevnet = endpoint.includes('devnet') || endpoint.includes('localhost');

  if (!isDevnet && network !== 'devnet') {
    return {
      success: false,
      message: 'Airdrops are only available on devnet. Please switch to devnet network first.',
    };
  }

  // Execute airdrop
  const result = await executeAirdrop(connection, wallet, airdropAmount, recipient);
  
  if (result.success) {
    return {
      success: true,
      message: `Successfully airdropped ${airdropAmount} SOL!\nTransaction: ${result.signature}`,
      data: result,
    };
  } else {
    return {
      success: false,
      message: result.error || 'Airdrop failed',
      data: result,
    };
  }
}

/**
 * Execute contact intent
 */
async function executeContactIntent(intent: ParsedIntent): Promise<ExecutionResult> {
  const { action, contactName, walletAddress, email } = intent.parameters;
  const contactManager = getContactManager();

  if (action === 'add' || action === 'save') {
    if (!contactName) {
      return {
        success: false,
        message: 'Please provide a contact name (e.g., "add contact jimmy with wallet 7xKXtg2...")',
      };
    }

    if (!walletAddress && !email) {
      return {
        success: false,
        message: 'Please provide either a wallet address or email for the contact.',
      };
    }

    const result = await saveContact(contactName, walletAddress, email);
    
    if (result.success) {
      return {
        success: true,
        message: `Successfully saved contact "${contactName}"`,
        data: result.contact,
      };
    } else {
      return {
        success: false,
        message: result.error || 'Failed to save contact',
      };
    }
  }

  if (action === 'list' || action === 'show') {
    const contacts = contactManager.getAllContacts();
    if (contacts.length === 0) {
      return {
        success: true,
        message: 'No contacts saved yet.',
      };
    }

    const contactList = contacts.map(c => 
      `• ${c.name}${c.walletAddress ? ` - ${c.walletAddress.slice(0, 8)}...${c.walletAddress.slice(-8)}` : ''}${c.email ? ` - ${c.email}` : ''}`
    ).join('\n');

    return {
      success: true,
      message: `Your contacts:\n\n${contactList}`,
      data: contacts,
    };
  }

  if (action === 'search' && contactName) {
    const results = contactManager.searchContacts(contactName);
    if (results.length === 0) {
      return {
        success: true,
        message: `No contacts found matching "${contactName}"`,
      };
    }

    const resultList = results.map(r => 
      `• ${r.contact.name}${r.contact.walletAddress ? ` - ${r.contact.walletAddress.slice(0, 8)}...${r.contact.walletAddress.slice(-8)}` : ''}${r.contact.email ? ` - ${r.contact.email}` : ''}`
    ).join('\n');

    return {
      success: true,
      message: `Found contacts:\n\n${resultList}`,
      data: results.map(r => r.contact),
    };
  }

  return {
    success: false,
    message: 'Unknown contact action. Try: "add contact", "show contacts", or "search contacts"',
  };
}

/**
 * Get help message
 */
function getHelpMessage(): string {
  return `🤖 **Sealevel AI Assistant - Available Commands**

**Staking:**
• "stake 200 sol" - Show staking options
• "stake 200 sol on marinade" - Stake with specific provider

**Sending:**
• "send 5 sol to jimmy" - Send to contact
• "send 10 sol to 7xKXtg2..." - Send to wallet address

**Airdrops (Devnet Only):**
• "airdrop 10 sol on devnet" - Request airdrop
• "airdrop to my wallet" - Airdrop to connected wallet

**Contacts:**
• "add contact jimmy with wallet 7xKXtg2..."
• "show contacts" - List all contacts
• "search contacts for jimmy"

**Other:**
• "find arbitrage opportunities" - Open arbitrage scanner
• "build transaction" - Open transaction builder
• "setup telegram bot" - Configure social bots

What would you like to do?`;
}

