/**
 * Market Maker Trading Execution
 * Execute buy/sell trades via Jupiter
 */

import { Connection, Keypair, Transaction, PublicKey } from '@solana/web3.js';
import { MarketMakerTrade } from './types';

/**
 * Execute a trade (buy or sell)
 */
export async function executeTrade(
  connection: Connection,
  agentKeypair: Keypair,
  trade: MarketMakerTrade
): Promise<string> {
  try {
    // Get quote from Jupiter
    const inputMint = trade.type === 'buy'
      ? 'So11111111111111111111111111111111111111112' // SOL
      : trade.tokenMint;
    const outputMint = trade.type === 'buy'
      ? trade.tokenMint
      : 'So11111111111111111111111111111111111111112'; // SOL
    
    const amount = trade.amount * 1e9; // Convert to lamports
    const slippageBps = trade.slippage * 100;
    
    // Get quote
    const quoteResponse = await fetch(
      `https://quote-api.jup.ag/v6/quote?` +
      `inputMint=${inputMint}&` +
      `outputMint=${outputMint}&` +
      `amount=${amount}&` +
      `slippageBps=${slippageBps}`
    );
    
    if (!quoteResponse.ok) {
      throw new Error('Failed to get quote from Jupiter');
    }
    
    const quote = await quoteResponse.json();
    
    // Get swap transaction
    const swapResponse = await fetch('https://quote-api.jup.ag/v6/swap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quoteResponse: quote,
        userPublicKey: agentKeypair.publicKey.toString(),
        wrapAndUnwrapSol: true,
        slippageBps,
        priorityLevelWithMaxLamports: {
          maxLamports: trade.priorityFee,
        },
      }),
    });
    
    if (!swapResponse.ok) {
      throw new Error('Failed to get swap transaction from Jupiter');
    }
    
    const swapData = await swapResponse.json();
    
    // Deserialize and sign transaction
    const transaction = Transaction.from(Buffer.from(swapData.swapTransaction, 'base64'));
    transaction.sign(agentKeypair);
    
    // Send transaction
    const signature = await connection.sendRawTransaction(transaction.serialize(), {
      skipPreflight: false,
      maxRetries: 3,
    });
    
    // Wait for confirmation
    await connection.confirmTransaction(signature, 'confirmed');
    
    return signature;
  } catch (error) {
    console.error(`Trade execution failed (${trade.type}):`, error);
    throw error;
  }
}

