/**
 * Market Maker Trading Execution
 * Execute buy/sell trades via Jupiter
 */

import { Connection, Keypair, Transaction, PublicKey } from '@solana/web3.js';
import { MarketMakerTrade } from './types';

/**
 * Execute a trade (buy or sell)
 * @param useUltraAPI - If true, uses Jupiter Ultra API for simplified execution
 */
export async function executeTrade(
  connection: Connection,
  agentKeypair: Keypair,
  trade: MarketMakerTrade,
  useUltraAPI: boolean = false
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

    // Use Ultra API for simplified execution (quote + execute in one call)
    if (useUltraAPI) {
      const ultraResponse = await fetch('/api/jupiter/ultra', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputMint,
          outputMint,
          amount: amount.toString(),
          taker: agentKeypair.publicKey.toString(),
          slippageBps,
          priorityFee: trade.priorityFee,
          wrapAndUnwrapSol: true,
        }),
      });

      if (!ultraResponse.ok) {
        const errorData = await ultraResponse.json();
        throw new Error(`Jupiter Ultra API error: ${errorData.error || ultraResponse.statusText}`);
      }

      const ultraData = await ultraResponse.json();
      
      // Ultra API returns the transaction signature directly if successful
      if (ultraData.status === 'Success' && ultraData.signature) {
        // Wait for confirmation
        await connection.confirmTransaction(ultraData.signature, 'confirmed');
        return ultraData.signature;
      } else if (ultraData.status === 'Failed') {
        throw new Error(`Swap failed: ${ultraData.error || ultraData.code || 'Unknown error'}`);
      } else {
        throw new Error('Unexpected response from Ultra API');
      }
    }
    
    // Standard flow: Get quote, then swap transaction
    // Get quote (using lite API for better performance)
    const quoteResponse = await fetch(
      `https://lite-api.jup.ag/v6/quote?` +
      `inputMint=${inputMint}&` +
      `outputMint=${outputMint}&` +
      `amount=${amount}&` +
      `slippageBps=${slippageBps}`
    );
    
    if (!quoteResponse.ok) {
      throw new Error('Failed to get quote from Jupiter');
    }
    
    const quote = await quoteResponse.json();
    
    // Get swap transaction (using API route to handle API key securely)
    const swapResponse = await fetch('/api/jupiter/swap', {
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

