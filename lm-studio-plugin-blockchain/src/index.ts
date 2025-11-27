/**
 * LM Studio Plugin: Blockchain Access
 * 
 * Provides Solana blockchain functionality to LM Studio models
 * through function calling capabilities.
 */

import { Connection, PublicKey, LAMPORTS_PER_SOL, Transaction, SystemProgram } from '@solana/web3.js';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';

// Plugin configuration
interface PluginConfig {
  rpcUrl?: string;
  network?: 'mainnet' | 'devnet' | 'testnet';
}

// Default RPC endpoints
const DEFAULT_RPC_ENDPOINTS = {
  mainnet: 'https://api.mainnet-beta.solana.com',
  devnet: 'https://api.devnet.solana.com',
  testnet: 'https://api.testnet.solana.com',
};

// Get connection based on network
function getConnection(network: 'mainnet' | 'devnet' | 'testnet' = 'mainnet', customRpcUrl?: string): Connection {
  const rpcUrl = customRpcUrl || DEFAULT_RPC_ENDPOINTS[network];
  return new Connection(rpcUrl, 'confirmed');
}

/**
 * Get SOL balance for a wallet address
 */
export async function getBalance(params: { address: string; network?: 'mainnet' | 'devnet' | 'testnet' }): Promise<{ balance: number; balanceSOL: number; address: string }> {
  try {
    const { address, network = 'mainnet' } = params;
    const publicKey = new PublicKey(address);
    const connection = getConnection(network);
    
    const balance = await connection.getBalance(publicKey);
    const balanceSOL = balance / LAMPORTS_PER_SOL;
    
    return {
      balance,
      balanceSOL: Number(balanceSOL.toFixed(9)),
      address: address,
    };
  } catch (error) {
    throw new Error(`Failed to get balance: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get account information
 */
export async function getAccountInfo(params: { address: string; network?: 'mainnet' | 'devnet' | 'testnet' }): Promise<{
  address: string;
  exists: boolean;
  executable: boolean;
  owner?: string;
  lamports: number;
  dataLength: number;
}> {
  try {
    const { address, network = 'mainnet' } = params;
    const publicKey = new PublicKey(address);
    const connection = getConnection(network);
    
    const accountInfo = await connection.getAccountInfo(publicKey);
    
    if (!accountInfo) {
      return {
        address,
        exists: false,
        executable: false,
        lamports: 0,
        dataLength: 0,
      };
    }
    
    return {
      address,
      exists: true,
      executable: accountInfo.executable,
      owner: accountInfo.owner.toString(),
      lamports: accountInfo.lamports,
      dataLength: accountInfo.data.length,
    };
  } catch (error) {
    throw new Error(`Failed to get account info: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get token account balance
 */
export async function getTokenBalance(params: {
  walletAddress: string;
  mintAddress: string;
  network?: 'mainnet' | 'devnet' | 'testnet';
}): Promise<{
  walletAddress: string;
  mintAddress: string;
  balance: string;
  decimals: number;
  uiAmount: number;
}> {
  try {
    const { walletAddress, mintAddress, network = 'mainnet' } = params;
    const walletPubkey = new PublicKey(walletAddress);
    const mintPubkey = new PublicKey(mintAddress);
    const connection = getConnection(network);
    
    // Get associated token account address
    const tokenAccount = await getAssociatedTokenAddress(mintPubkey, walletPubkey);
    
    // Get token account info
    const tokenAccountInfo = await connection.getTokenAccountBalance(tokenAccount);
    
    return {
      walletAddress,
      mintAddress,
      balance: tokenAccountInfo.value.amount,
      decimals: tokenAccountInfo.value.decimals,
      uiAmount: Number(tokenAccountInfo.value.uiAmount || 0),
    };
  } catch (error) {
    throw new Error(`Failed to get token balance: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get transaction details
 */
export async function getTransaction(params: {
  signature: string;
  network?: 'mainnet' | 'devnet' | 'testnet';
}): Promise<{
  signature: string;
  slot: number;
  blockTime: number | null;
  success: boolean;
  fee: number;
  instructions: number;
}> {
  try {
    const { signature, network = 'mainnet' } = params;
    const connection = getConnection(network);
    
    const tx = await connection.getTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });
    
    if (!tx) {
      throw new Error('Transaction not found');
    }
    
    // Handle both legacy and versioned transactions
    let instructionCount = 0;
    // Check if it's a legacy transaction by checking for 'instructions' property
    if ('instructions' in tx.transaction.message) {
      // Legacy transaction - instructions are directly accessible
      instructionCount = (tx.transaction.message as any).instructions.length;
    } else {
      // Versioned transaction (v0) - use compiledInstructions
      const compiledInstructions = (tx.transaction.message as any).compiledInstructions;
      if (compiledInstructions && Array.isArray(compiledInstructions)) {
        instructionCount = compiledInstructions.length;
      } else {
        // Fallback: count from inner instructions in meta if available
        if (tx.meta?.innerInstructions && tx.meta.innerInstructions.length > 0) {
          instructionCount = tx.meta.innerInstructions.reduce((sum, inner) => sum + inner.instructions.length, 0);
        } else {
          // Last resort: default to 1
          instructionCount = 1;
        }
      }
    }
    
    return {
      signature,
      slot: tx.slot,
      blockTime: tx.blockTime ?? null,
      success: tx.meta?.err === null,
      fee: tx.meta?.fee || 0,
      instructions: instructionCount,
    };
  } catch (error) {
    throw new Error(`Failed to get transaction: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Build a transfer transaction (returns transaction details, not signed)
 */
export async function buildTransferTransaction(params: {
  fromAddress: string;
  toAddress: string;
  amountSOL: number;
  network?: 'mainnet' | 'devnet' | 'testnet';
}): Promise<{
  fromAddress: string;
  toAddress: string;
  amountSOL: number;
  amountLamports: number;
  transactionSize: number;
  estimatedFee: number;
  instructions: string[];
}> {
  try {
    const { fromAddress, toAddress, amountSOL, network = 'mainnet' } = params;
    const fromPubkey = new PublicKey(fromAddress);
    const toPubkey = new PublicKey(toAddress);
    const connection = getConnection(network);
    
    const amountLamports = Math.floor(amountSOL * LAMPORTS_PER_SOL);
    
    // Build transaction
    const transaction = new Transaction();
    transaction.add(
      SystemProgram.transfer({
        fromPubkey,
        toPubkey,
        lamports: amountLamports,
      })
    );
    
    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = fromPubkey;
    
    // Serialize to get size
    const serialized = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });
    
    // Estimate fee (base fee + priority fee if any)
    const feeCalculator = await connection.getFeeForMessage(transaction.compileMessage());
    const estimatedFee = feeCalculator?.value || 5000; // Default 5000 lamports
    
    return {
      fromAddress,
      toAddress,
      amountSOL,
      amountLamports,
      transactionSize: serialized.length,
      estimatedFee,
      instructions: ['SystemProgram.transfer'],
    };
  } catch (error) {
    throw new Error(`Failed to build transaction: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get recent blockhash and slot information
 */
export async function getBlockchainInfo(params: {
  network?: 'mainnet' | 'devnet' | 'testnet';
}): Promise<{
  network: string;
  slot: number;
  blockhash: string;
  blockHeight: number;
}> {
  try {
    const { network = 'mainnet' } = params;
    const connection = getConnection(network);
    
    const slot = await connection.getSlot();
    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    const blockHeight = await connection.getBlockHeight('confirmed');
    
    return {
      network,
      slot,
      blockhash,
      blockHeight,
    };
  } catch (error) {
    throw new Error(`Failed to get blockchain info: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Validate a Solana address
 */
export async function validateAddress(params: { address: string }): Promise<{
  address: string;
  valid: boolean;
  error?: string;
}> {
  const { address } = params;
  try {
    new PublicKey(address);
    return {
      address: address,
      valid: true,
    };
  } catch (error) {
    return {
      address: address,
      valid: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Export all functions for LM Studio
export const tools = {
  getBalance: {
    name: 'getBalance',
    description: 'Get SOL balance for a Solana wallet address',
    parameters: {
      type: 'object',
      properties: {
        address: {
          type: 'string',
          description: 'Solana wallet address (public key)',
        },
        network: {
          type: 'string',
          enum: ['mainnet', 'devnet', 'testnet'],
          description: 'Network to query (default: mainnet)',
        },
      },
      required: ['address'],
    },
  },
  getAccountInfo: {
    name: 'getAccountInfo',
    description: 'Get account information for a Solana address',
    parameters: {
      type: 'object',
      properties: {
        address: {
          type: 'string',
          description: 'Solana account address',
        },
        network: {
          type: 'string',
          enum: ['mainnet', 'devnet', 'testnet'],
          description: 'Network to query (default: mainnet)',
        },
      },
      required: ['address'],
    },
  },
  getTokenBalance: {
    name: 'getTokenBalance',
    description: 'Get SPL token balance for a wallet and token mint',
    parameters: {
      type: 'object',
      properties: {
        walletAddress: {
          type: 'string',
          description: 'Wallet address to check',
        },
        mintAddress: {
          type: 'string',
          description: 'Token mint address',
        },
        network: {
          type: 'string',
          enum: ['mainnet', 'devnet', 'testnet'],
          description: 'Network to query (default: mainnet)',
        },
      },
      required: ['walletAddress', 'mintAddress'],
    },
  },
  getTransaction: {
    name: 'getTransaction',
    description: 'Get transaction details by signature',
    parameters: {
      type: 'object',
      properties: {
        signature: {
          type: 'string',
          description: 'Transaction signature',
        },
        network: {
          type: 'string',
          enum: ['mainnet', 'devnet', 'testnet'],
          description: 'Network to query (default: mainnet)',
        },
      },
      required: ['signature'],
    },
  },
  buildTransferTransaction: {
    name: 'buildTransferTransaction',
    description: 'Build a SOL transfer transaction (returns transaction details, not signed)',
    parameters: {
      type: 'object',
      properties: {
        fromAddress: {
          type: 'string',
          description: 'Sender wallet address',
        },
        toAddress: {
          type: 'string',
          description: 'Recipient wallet address',
        },
        amountSOL: {
          type: 'number',
          description: 'Amount to send in SOL',
        },
        network: {
          type: 'string',
          enum: ['mainnet', 'devnet', 'testnet'],
          description: 'Network to use (default: mainnet)',
        },
      },
      required: ['fromAddress', 'toAddress', 'amountSOL'],
    },
  },
  getBlockchainInfo: {
    name: 'getBlockchainInfo',
    description: 'Get current blockchain information (slot, blockhash, block height)',
    parameters: {
      type: 'object',
      properties: {
        network: {
          type: 'string',
          enum: ['mainnet', 'devnet', 'testnet'],
          description: 'Network to query (default: mainnet)',
        },
      },
    },
  },
  validateAddress: {
    name: 'validateAddress',
    description: 'Validate if a string is a valid Solana address',
    parameters: {
      type: 'object',
      properties: {
        address: {
          type: 'string',
          description: 'Address to validate',
        },
      },
      required: ['address'],
    },
  },
};

// Function handler map
export const functionHandlers: Record<string, (params: any) => Promise<any>> = {
  getBalance,
  getAccountInfo,
  getTokenBalance,
  getTransaction,
  buildTransferTransaction,
  getBlockchainInfo,
  validateAddress,
};

// Plugin entry point
export default {
  tools,
  functionHandlers,
};

