// API Route to check if a wallet has a beta tester attestation cNFT
// Queries the beta tester merkle tree directly
import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';
import { validateSolanaAddress } from '@/app/lib/security/validation';
import { getBetaTesterMerkleTree, getBetaTesterCollectionId, BUBBLEGUM_PROGRAM_ID } from '@/app/lib/verisol/config';

export const dynamic = 'force-dynamic';

// Custom Attestation Program ID (replaces VeriSol)
const ATTESTATION_PROGRAM_ID_VALUE = process.env.NEXT_PUBLIC_ATTESTATION_PROGRAM_ID 
  ? new PublicKey(process.env.NEXT_PUBLIC_ATTESTATION_PROGRAM_ID)
  : null;

/**
 * Check if a wallet has a beta tester attestation cNFT in the beta tester merkle tree
 * GET /api/verisol/beta-tester/check?wallet=<address>
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
    const betaTesterTree = getBetaTesterMerkleTree();
    const collectionId = getBetaTesterCollectionId();

    if (!betaTesterTree) {
      return NextResponse.json(
        { error: 'Beta tester merkle tree not configured. Set NEXT_PUBLIC_BETA_TESTER_MERKLE_TREE environment variable.' },
        { status: 500 }
      );
    }

    // Get RPC endpoint
    const heliusApiKey = process.env.HELIUS_API_KEY || process.env.NEXT_PUBLIC_HELIUS_API_KEY;
    const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'mainnet-beta';
    
    let hasAttestation = false;
    let cNFTAddress: string | null = null;
    let cNFTMetadata: any = null;
    let attestationTxSignature: string | null = null;
    let attestationTimestamp: number | null = null;

    // Method 1: Use Helius DAS API to query tree directly (most efficient)
    if (heliusApiKey) {
      try {
        const heliusUrl = network === 'devnet' 
          ? `https://devnet.helius-rpc.com/?api-key=${heliusApiKey}`
          : `https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`;

        // Query assets by owner, filtered by tree or collection
        const dasResponse = await fetch(heliusUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 'beta-tester-check',
            method: 'getAssetsByOwner',
            params: {
              ownerAddress: walletAddress,
              page: 1,
              limit: 100,
              ...(collectionId ? {
                grouping: [{
                  group_key: 'collection',
                  group_value: collectionId,
                }],
              } : {}),
            },
          }),
        });

        if (dasResponse.ok) {
          const dasData = await dasResponse.json();
          
          if (dasData.result && dasData.result.items) {
            // Filter for compressed NFTs in the beta tester tree
            const betaTesterCNFTs = dasData.result.items.filter((asset: any) => {
              // Check if it's a compressed NFT
              const isCompressed = asset.compression?.compressed === true;
              
              if (!isCompressed) return false;
              
              // Check if it's in the beta tester tree
              const assetTree = asset.compression?.tree || asset.compression?.merkle_tree;
              const matchesTree = assetTree === betaTesterTree.toString();
              
              // Check metadata for beta tester indicators
              const name = asset.content?.metadata?.name?.toLowerCase() || '';
              const symbol = asset.content?.metadata?.symbol?.toLowerCase() || '';
              const uri = asset.content?.metadata?.uri || '';
              
              const matchesMetadata = (
                name.includes('beta tester') ||
                name.includes('sealevel') ||
                symbol === 'beta' ||
                uri.includes('sealevel') ||
                uri.includes('beta-tester')
              );
              
              // Must be compressed and (in tree OR matches metadata)
              return isCompressed && (matchesTree || matchesMetadata);
            });

            if (betaTesterCNFTs.length > 0) {
              hasAttestation = true;
              const cNFT = betaTesterCNFTs[0]; // Get the first one
              cNFTAddress = cNFT.id;
              cNFTMetadata = {
                name: cNFT.content?.metadata?.name,
                symbol: cNFT.content?.metadata?.symbol,
                uri: cNFT.content?.metadata?.uri,
                description: cNFT.content?.metadata?.description,
                compression: {
                  tree: cNFT.compression?.tree,
                  leaf_id: cNFT.compression?.leaf_id,
                },
              };
            }
          }
        }
      } catch (dasError) {
        console.warn('DAS API query failed:', dasError);
      }
    }

    // Method 2: Query tree directly using RPC (if DAS API not available)
    if (!hasAttestation) {
      try {
        const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 
                       heliusApiKey 
                         ? `https://rpc.helius.xyz/?api-key=${heliusApiKey}`
                         : 'https://api.mainnet-beta.solana.com';

        const connection = new Connection(rpcUrl, 'confirmed');

        // Check transaction history for VeriSol program interactions with this tree
        const signatures = await connection.getSignaturesForAddress(walletPubkey, {
          limit: 100,
        });

        for (const sigInfo of signatures) {
          try {
            const tx = await connection.getTransaction(sigInfo.signature, {
              maxSupportedTransactionVersion: 0,
            });

            if (!tx) continue;

            const accountKeys = tx.transaction.message.getAccountKeys();
            
            // Check if this transaction involved custom attestation program and the beta tester tree
            if (!ATTESTATION_PROGRAM_ID_VALUE) continue;
            
            const hasAttestationProgram = accountKeys.staticAccountKeys.some(
              (key) => key.toString() === ATTESTATION_PROGRAM_ID_VALUE!.toString()
            );
            const hasTree = accountKeys.staticAccountKeys.some(
              (key) => key.toString() === betaTesterTree.toString()
            );
            const hasBubblegum = accountKeys.staticAccountKeys.some(
              (key) => key.toString() === BUBBLEGUM_PROGRAM_ID.toString()
            );

            if (hasAttestationProgram && hasTree && hasBubblegum) {
              hasAttestation = true;
              attestationTxSignature = sigInfo.signature;
              attestationTimestamp = sigInfo.blockTime ? sigInfo.blockTime * 1000 : null;
              break;
            }
          } catch (txError) {
            continue;
          }
        }
      } catch (rpcError) {
        console.warn('RPC query failed:', rpcError);
      }
    }

    return NextResponse.json({
      wallet: walletAddress,
      hasAttestation,
      attestationTxSignature,
      attestationTimestamp,
      cNFTAddress,
      metadata: cNFTMetadata,
      merkleTree: betaTesterTree.toString(),
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error checking beta tester attestation:', error);
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

