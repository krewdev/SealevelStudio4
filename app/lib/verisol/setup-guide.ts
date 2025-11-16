/**
 * Setup guide and utilities for VeriSol merkle tree configuration
 * Provides helper functions to check and validate setup
 */

import { Connection, PublicKey } from '@solana/web3.js';
import {
  getBetaTesterMerkleTree,
  getBetaTesterCollectionId,
  getMerkleTree,
  getTreeAuthority,
  deriveTreeAuthority,
} from './config';

export interface SetupStatus {
  betaTesterTree: {
    configured: boolean;
    address: string | null;
    onChain: boolean;
    error?: string;
  };
  generalTree: {
    configured: boolean;
    address: string | null;
    onChain: boolean;
    error?: string;
  };
  collection: {
    configured: boolean;
    id: string | null;
  };
  ready: boolean;
  recommendations: string[];
}

/**
 * Check if merkle tree exists on-chain
 */
async function checkTreeOnChain(
  connection: Connection,
  treeAddress: PublicKey
): Promise<boolean> {
  try {
    const accountInfo = await connection.getAccountInfo(treeAddress);
    return accountInfo !== null;
  } catch {
    return false;
  }
}

/**
 * Get comprehensive setup status
 */
export async function getSetupStatus(connection: Connection): Promise<SetupStatus> {
  const status: SetupStatus = {
    betaTesterTree: {
      configured: false,
      address: null,
      onChain: false,
    },
    generalTree: {
      configured: false,
      address: null,
      onChain: false,
    },
    collection: {
      configured: false,
      id: null,
    },
    ready: false,
    recommendations: [],
  };

  // Check beta tester tree
  const betaTesterTree = getBetaTesterMerkleTree();
  if (betaTesterTree) {
    status.betaTesterTree.configured = true;
    status.betaTesterTree.address = betaTesterTree.toString();
    
    try {
      status.betaTesterTree.onChain = await checkTreeOnChain(connection, betaTesterTree);
      if (!status.betaTesterTree.onChain) {
        status.recommendations.push('Beta tester merkle tree is configured but not found on-chain. Create the tree first.');
      }
    } catch (error) {
      status.betaTesterTree.error = error instanceof Error ? error.message : 'Unknown error';
      status.recommendations.push('Error checking beta tester tree on-chain. Verify RPC connection.');
    }
  } else {
    status.recommendations.push('Configure NEXT_PUBLIC_BETA_TESTER_MERKLE_TREE environment variable.');
  }

  // Check general tree
  const generalTree = getMerkleTree();
  if (generalTree) {
    status.generalTree.configured = true;
    status.generalTree.address = generalTree.toString();
    
    try {
      status.generalTree.onChain = await checkTreeOnChain(connection, generalTree);
    } catch (error) {
      status.generalTree.error = error instanceof Error ? error.message : 'Unknown error';
    }
  }

  // Check collection
  const collectionId = getBetaTesterCollectionId();
  if (collectionId) {
    status.collection.configured = true;
    status.collection.id = collectionId;
  }

  // Determine if ready
  status.ready = status.betaTesterTree.configured && status.betaTesterTree.onChain;

  // Add recommendations
  if (!status.betaTesterTree.configured && !status.generalTree.configured) {
    status.recommendations.push('No merkle tree configured. Set up a tree using Metaplex Bubblegum.');
  }

  if (status.betaTesterTree.configured && !status.collection.configured) {
    status.recommendations.push('Consider setting NEXT_PUBLIC_BETA_TESTER_COLLECTION_ID for better organization.');
  }

  return status;
}

/**
 * Generate setup instructions based on current status
 */
export function generateSetupInstructions(status: SetupStatus): string[] {
  const instructions: string[] = [];

  if (!status.betaTesterTree.configured) {
    instructions.push('1. Create a merkle tree using Metaplex Bubblegum:');
    instructions.push('   metaplex create-tree --keypair <keypair> --rpc-url <rpc> --max-depth 14');
    instructions.push('');
    instructions.push('2. Add to .env.local:');
    instructions.push('   NEXT_PUBLIC_BETA_TESTER_MERKLE_TREE=<tree_address>');
    instructions.push('');
  } else if (!status.betaTesterTree.onChain) {
    instructions.push('1. The merkle tree address is configured but not found on-chain.');
    instructions.push('2. Create the tree on-chain using Metaplex Bubblegum.');
    instructions.push('3. Verify the address matches your configuration.');
    instructions.push('');
  }

  if (!status.collection.configured) {
    instructions.push('Optional: Create a Metaplex collection for beta tester cNFTs:');
    instructions.push('1. Create collection using Metaplex');
    instructions.push('2. Add to .env.local:');
    instructions.push('   NEXT_PUBLIC_BETA_TESTER_COLLECTION_ID=<collection_id>');
    instructions.push('');
  }

  if (status.ready) {
    instructions.push('✅ Setup is complete! You can now mint beta tester attestations.');
  }

  return instructions;
}

/**
 * Validate environment variables
 */
export function validateEnvironmentVariables(): {
  valid: boolean;
  missing: string[];
  warnings: string[];
} {
  const missing: string[] = [];
  const warnings: string[] = [];

  // Required for beta tester
  if (!process.env.NEXT_PUBLIC_BETA_TESTER_MERKLE_TREE) {
    missing.push('NEXT_PUBLIC_BETA_TESTER_MERKLE_TREE');
  }

  // Optional but recommended
  if (!process.env.NEXT_PUBLIC_BETA_TESTER_COLLECTION_ID) {
    warnings.push('NEXT_PUBLIC_BETA_TESTER_COLLECTION_ID (optional but recommended)');
  }

  // Check if general tree is set (fallback)
  if (!process.env.NEXT_PUBLIC_BETA_TESTER_MERKLE_TREE && !process.env.NEXT_PUBLIC_VERISOL_MERKLE_TREE) {
    warnings.push('No merkle tree configured. Beta tester attestations will not work.');
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings,
  };
}

