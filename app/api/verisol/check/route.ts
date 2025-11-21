// API Route to check if a wallet has a VeriSol attestation cNFT
import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';
import { validateSolanaAddress } from '@/app/lib/security/validation';

export const dynamic = 'force-dynamic';

// Custom Attestation Program ID (replaces VeriSol)
const ATTESTATION_PROGRAM_ID_VALUE = process.env.NEXT_PUBLIC_ATTESTATION_PROGRAM_ID 
  ? new PublicKey(process.env.NEXT_PUBLIC_ATTESTATION_PROGRAM_ID)
  : null;

// Bubblegum Program ID
const BUBBLEGUM_PROGRAM_ID = new PublicKey('BGUMAp9Gq7iTEuizy4pqaxsTyUCbk68f37Gc5o4tBzLb');

/**
 * Check if a wallet has a VeriSol attestation cNFT
 * GET /api/verisol/check?wallet=<address>
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const walletAddress = searchParams.get('wallet');

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required. Use ?wallet=<address>' },
        { status: 400 }
      );
    }

    // Validate wallet address
    const addressValidation = validateSolanaAddress(walletAddress);
    if (!addressValidation.valid) {
      return NextResponse.json(
        { error: addressValidation.error || 'Invalid wallet address format' },
        { status: 400 }
      );
    }

    const walletPubkey = new PublicKey(walletAddress);

    // Get RPC endpoint from environment or use default
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 
                   process.env.NEXT_PUBLIC_HELIUS_API_KEY 
                     ? `https://rpc.helius.xyz/?api-key=${process.env.NEXT_PUBLIC_HELIUS_API_KEY}`
                     : 'https://api.mainnet-beta.solana.com';

    const connection = new Connection(rpcUrl, 'confirmed');

    // Method 1: Check transaction history for VeriSol program interactions
    // Look for transactions where the wallet interacted with VeriSol program
    const signatures = await connection.getSignaturesForAddress(walletPubkey, {
      limit: 100,
    });

    let hasAttestation = false;
    let attestationTxSignature: string | null = null;
    let attestationTimestamp: number | null = null;

    // Check each transaction to see if it interacted with VeriSol program
    for (const sigInfo of signatures) {
      try {
        const tx = await connection.getTransaction(sigInfo.signature, {
          maxSupportedTransactionVersion: 0,
        });

        if (!tx) continue;

        // Check if this transaction involved the custom attestation program
        const accountKeys = tx.transaction.message.getAccountKeys();
        
        // Use custom program ID if available, otherwise skip
        if (!ATTESTATION_PROGRAM_ID_VALUE) continue;
        
        const programIndex = accountKeys.staticAccountKeys.findIndex(
          (key) => key.toString() === ATTESTATION_PROGRAM_ID_VALUE!.toString()
        );

        if (programIndex !== -1) {
          // Check if this transaction was a mint_attestation or verify_proof_only
          // by checking the instruction data
          const instructions = tx.transaction.message.compiledInstructions || [];
          for (const ix of instructions) {
            const programIdIndex = ix.programIdIndex;
            const programId = accountKeys.get(programIdIndex);
            
            // If this instruction is from attestation program, check if it's a mint
            if (programId && programId.toString() === ATTESTATION_PROGRAM_ID_VALUE!.toString()) {
              // Check if Bubblegum program was also involved (indicates cNFT mint)
              const hasBubblegum = accountKeys.staticAccountKeys.some(
                (key) => key.toString() === BUBBLEGUM_PROGRAM_ID.toString()
              );

              if (hasBubblegum) {
                hasAttestation = true;
                attestationTxSignature = sigInfo.signature;
                attestationTimestamp = sigInfo.blockTime ? sigInfo.blockTime * 1000 : null;
                break;
              }
            }
          }
        }

        if (hasAttestation) break;
      } catch (txError) {
        // Skip transactions that can't be fetched
        continue;
      }
    }

    // Method 2: Try to query cNFTs directly using Helius DAS API (if available)
    // This is more reliable and accurate than transaction scanning
    let cNFTAddress: string | null = null;
    let cNFTMetadata: any = null;

    // Try Helius DAS API for more accurate cNFT detection
    if (process.env.NEXT_PUBLIC_HELIUS_API_KEY || process.env.HELIUS_API_KEY) {
      try {
        const heliusApiKey = process.env.HELIUS_API_KEY || process.env.NEXT_PUBLIC_HELIUS_API_KEY;
        const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'mainnet-beta';
        const heliusUrl = network === 'devnet' 
          ? `https://devnet.helius-rpc.com/?api-key=${heliusApiKey}`
          : `https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`;

        // Use Helius DAS API to get assets by owner
        const dasResponse = await fetch(heliusUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 'verisol-check',
            method: 'getAssetsByOwner',
            params: {
              ownerAddress: walletAddress,
              page: 1,
              limit: 100,
            },
          }),
        });

        if (dasResponse.ok) {
          const dasData = await dasResponse.json();
          
          if (dasData.result && dasData.result.items) {
            // Look for compressed NFTs (cNFTs) that might be VeriSol attestations
            const compressedNFTs = dasData.result.items.filter((asset: any) => {
              // Check if it's a compressed NFT
              return asset.compression?.compressed === true;
            });

            // If we found compressed NFTs and we also found VeriSol transactions,
            // or if we can identify them by metadata/collection
            if (compressedNFTs.length > 0) {
              // Check if any of these cNFTs are VeriSol attestations
              // We can identify them by checking if they were minted around the time
              // of VeriSol transactions, or by metadata patterns
              const veriSolCNFT = compressedNFTs.find((cNFT: any) => {
                // Check metadata for VeriSol indicators
                const name = cNFT.content?.metadata?.name?.toLowerCase() || '';
                const symbol = cNFT.content?.metadata?.symbol?.toLowerCase() || '';
                const uri = cNFT.content?.metadata?.uri || '';
                
                return (
                  name.includes('beta tester') ||
                  name.includes('verisol') ||
                  name.includes('sealevel') ||
                  symbol === 'beta' ||
                  symbol === 'beta' ||
                  uri.includes('sealevel') ||
                  uri.includes('verisol')
                );
              });

              if (veriSolCNFT) {
                hasAttestation = true;
                cNFTAddress = veriSolCNFT.id;
                cNFTMetadata = {
                  name: veriSolCNFT.content?.metadata?.name,
                  symbol: veriSolCNFT.content?.metadata?.symbol,
                  uri: veriSolCNFT.content?.metadata?.uri,
                  description: veriSolCNFT.content?.metadata?.description,
                };
              } else if (hasAttestation && compressedNFTs.length > 0) {
                // If we found VeriSol transaction but can't identify specific cNFT,
                // use the first compressed NFT as a potential match
                const firstCNFT = compressedNFTs[0];
                cNFTAddress = firstCNFT.id;
                cNFTMetadata = {
                  name: firstCNFT.content?.metadata?.name,
                  symbol: firstCNFT.content?.metadata?.symbol,
                  uri: firstCNFT.content?.metadata?.uri,
                  description: firstCNFT.content?.metadata?.description,
                };
              }
            }
          }
        }
      } catch (dasError) {
        // DAS API not available or failed, continue with transaction-based method
        console.warn('DAS API query failed, using transaction-based method:', dasError);
      }
    }

    return NextResponse.json({
      wallet: walletAddress,
      hasAttestation,
      attestationTxSignature,
      attestationTimestamp,
      cNFTAddress,
      metadata: cNFTMetadata,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error checking VeriSol attestation:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
        wallet: request.nextUrl.searchParams.get('wallet') || null,
        hasAttestation: false,
      },
      { status: 500 }
    );
  }
}

