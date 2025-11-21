// Custom Attestation Program Minting Functions
// Replaces VeriSol with custom Anchor program
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
} from '@solana/web3.js';
import { createAttestationClient, checkAttestationProgramDeployed, TIER_CONFIG, TierInfo, getTierForUsage, getTierInfo } from '../attestation/client';
import {
  BUBBLEGUM_PROGRAM_ID,
  COMPRESSION_PROGRAM_ID,
  LOG_WRAPPER,
  getMerkleTree,
  getTreeAuthority,
  deriveTreeAuthority,
} from './config';
import type { WalletContextState } from '@solana/wallet-adapter-react';

export interface MintAttestationParams {
  connection: Connection;
  wallet: WalletContextState;
  usageCount: number; // Usage count for simple verification (replaces ZK proof)
  proofBytes?: Buffer; // Optional: kept for backward compatibility
  publicInputBytes?: Buffer; // Optional: kept for backward compatibility
  metadata?: {
    name?: string;
    symbol?: string;
    uri?: string;
  };
}

/**
 * Mint a compressed NFT attestation using custom attestation program
 * Replaces VeriSol with custom Anchor program
 */
export async function mintVeriSolAttestation(
  params: MintAttestationParams
): Promise<string> {
  const { connection, wallet, usageCount, proofBytes, publicInputBytes, metadata } = params;

  if (!wallet.publicKey || !wallet.signTransaction || !wallet.sendTransaction) {
    throw new Error('Wallet not connected or missing required methods');
  }

  // Check if custom attestation program is deployed
  const isDeployed = await checkAttestationProgramDeployed(connection);
  if (!isDeployed) {
    throw new Error(
      'Custom attestation program not deployed. ' +
      'Please build and deploy the program first. ' +
      'See docs/ATTESTATION_PROGRAM_SETUP.md for instructions.'
    );
  }

  // Get merkle tree and tree authority
  // For beta tester attestations, use beta tester tree if available
  const { getBetaTesterMerkleTree } = await import('./config');
  const merkleTree = getBetaTesterMerkleTree() || getMerkleTree();
  if (!merkleTree) {
    throw new Error('Merkle tree not configured. Please set NEXT_PUBLIC_BETA_TESTER_MERKLE_TREE or NEXT_PUBLIC_VERISOL_MERKLE_TREE environment variable.');
  }

  // Create attestation client
  const client = createAttestationClient(connection, wallet);

  // Use provided usage count, or default to 10 if not provided
  const finalUsageCount = usageCount || 10;

  // Determine tier and get tier-specific metadata
  const tier = getTierForUsage(finalUsageCount);
  if (tier === 0) {
    throw new Error(`Insufficient usage: ${finalUsageCount} (minimum 10 required)`);
  }

  const tierInfo = getTierInfo(tier);
  const tierMetadata = {
    name: metadata?.name || `Sealevel Studio Beta Tester - ${tierInfo.name}`,
    symbol: metadata?.symbol || `BETA-${tierInfo.name.toUpperCase().slice(0, 1)}`,
    uri: metadata?.uri || `https://sealevel.studio/metadata/beta-tester-${tierInfo.name.toLowerCase()}.json`,
    attributes: [
      { trait_type: 'Type', value: 'Beta Tester' },
      { trait_type: 'Tier', value: tierInfo.name },
      { trait_type: 'Rarity', value: tierInfo.rarity },
      { trait_type: 'Platform', value: 'Sealevel Studio' },
      { trait_type: 'Usage Count', value: finalUsageCount.toString() },
    ],
  };

  try {
    // Mint attestation with simple verification (usage count instead of ZK proof)
    const result = await client.mintAttestation(
      finalUsageCount,
      tierMetadata
    );

    // Airdrop SEAL tokens to beta tester if eligible
    try {
      const { airdropSealToBetaTester, checkAirdropEligibility } = await import('../seal-token/airdrop');
      const eligibility = await checkAirdropEligibility(connection, wallet.publicKey);
      
      if (eligibility.eligible) {
        // Note: In production, this would be done server-side with treasury wallet
        // For now, log that airdrop should be processed
        console.log('Beta tester eligible for SEAL airdrop. Processing...');
        // await airdropSealToBetaTester(connection, treasuryWallet, wallet.publicKey);
      }
    } catch (airdropError) {
      console.error('Airdrop processing failed (non-critical):', airdropError);
      // Don't fail the mint if airdrop fails
    }

    return result.txSignature;
  } catch (mintError: any) {
    console.error('Attestation minting failed:', mintError);
    
    // Fallback: Try eligibility check to see if user qualifies
    try {
      console.warn('Checking eligibility as fallback...');
      const eligibleTier = await client.verifyEligibility(finalUsageCount);
      if (eligibleTier === 0) {
        throw new Error(
          `Insufficient usage: ${finalUsageCount} (minimum 10 required). ${mintError.message || ''}`
        );
      }
      // If eligible but minting failed, throw original error
      throw new Error(
        `Failed to mint attestation: ${mintError.message || 'Unknown error'}`
      );
    } catch (fallbackError: any) {
      console.error('Eligibility check also failed:', fallbackError);
      throw new Error(
        `Failed to mint attestation: ${mintError.message || 'Unknown error'}`
      );
    }
  }
}

/**
 * Check if custom attestation program infrastructure is set up
 * Replaces VeriSol setup check
 */
export async function checkVeriSolSetup(connection: Connection): Promise<{
  programExists: boolean;
  merkleTreeExists: boolean;
  treeAuthorityExists: boolean;
  registryExists: boolean;
  ready: boolean;
  errors: string[];
}> {
  const errors: string[] = [];
  let programExists = false;
  let merkleTreeExists = false;
  let treeAuthorityExists = false;
  let registryExists = false;

  // Check custom attestation program
  try {
    programExists = await checkAttestationProgramDeployed(connection);
    if (!programExists) {
      errors.push('Custom attestation program not found on blockchain. Please deploy it first.');
    }
  } catch (error) {
    errors.push(`Error checking program: ${error instanceof Error ? error.message : 'Unknown'}`);
  }

  // Check merkle tree
  const merkleTree = getMerkleTree();
  if (merkleTree) {
    try {
      const treeInfo = await connection.getAccountInfo(merkleTree);
      merkleTreeExists = !!treeInfo;
      if (!merkleTreeExists) {
        errors.push('Merkle tree account not found');
      }
    } catch (error) {
      errors.push(`Error checking merkle tree: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  } else {
    errors.push('Merkle tree not configured (NEXT_PUBLIC_VERISOL_MERKLE_TREE or NEXT_PUBLIC_ATTESTATION_MERKLE_TREE not set)');
  }

  // Check tree authority
  const treeAuthority = getTreeAuthority() || (merkleTree ? deriveTreeAuthority(merkleTree) : null);
  if (treeAuthority) {
    try {
      const authInfo = await connection.getAccountInfo(treeAuthority);
      treeAuthorityExists = !!authInfo;
      if (!treeAuthorityExists) {
        errors.push('Tree authority account not found');
      }
    } catch (error) {
      errors.push(`Error checking tree authority: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }

  // Check registry (custom program feature)
  if (programExists) {
    try {
      const { ATTESTATION_PROGRAM_ID } = await import('../attestation/client');
      const [registry] = PublicKey.findProgramAddressSync(
        [Buffer.from('attestation_registry')],
        ATTESTATION_PROGRAM_ID
      );
      const registryInfo = await connection.getAccountInfo(registry);
      registryExists = !!registryInfo;
      if (!registryExists) {
        errors.push('Attestation registry not initialized. Call initialize() first.');
      }
    } catch (error) {
      errors.push(`Error checking registry: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }

  const ready = programExists && merkleTreeExists && treeAuthorityExists && registryExists;

  return {
    programExists,
    merkleTreeExists,
    treeAuthorityExists,
    registryExists,
    ready,
    errors,
  };
}

