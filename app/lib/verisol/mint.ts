// VeriSol cNFT Minting Functions
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
} from '@solana/web3.js';
import { Program, AnchorProvider, web3 } from '@coral-xyz/anchor';
import { IDL as VeriSolIDL, AletheiaProtocol as VeriSolProgram } from './aletheia_protocol';
import {
  VERISOL_PROGRAM_ID,
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
  proofBytes: Buffer;
  publicInputBytes: Buffer;
  metadata?: {
    name?: string;
    symbol?: string;
    uri?: string;
  };
}

/**
 * Mint a compressed NFT attestation using VeriSol protocol
 */
export async function mintVeriSolAttestation(
  params: MintAttestationParams
): Promise<string> {
  const { connection, wallet, proofBytes, publicInputBytes, metadata } = params;

  if (!wallet.publicKey || !wallet.signTransaction || !wallet.sendTransaction) {
    throw new Error('Wallet not connected or missing required methods');
  }

  // Get merkle tree and tree authority
  // For beta tester attestations, use beta tester tree if available
  const { getBetaTesterMerkleTree } = await import('./config');
  const merkleTree = getBetaTesterMerkleTree() || getMerkleTree();
  if (!merkleTree) {
    throw new Error('Merkle tree not configured. Please set NEXT_PUBLIC_BETA_TESTER_MERKLE_TREE or NEXT_PUBLIC_VERISOL_MERKLE_TREE environment variable.');
  }

  const treeAuthority = getTreeAuthority() || deriveTreeAuthority(merkleTree);

  // Create Anchor provider
  // AnchorProvider expects a wallet adapter that has signTransaction and sendTransaction
  const walletAdapter = {
    publicKey: wallet.publicKey,
    signTransaction: wallet.signTransaction?.bind(wallet),
    signAllTransactions: wallet.signAllTransactions?.bind(wallet),
  };
  
  const provider = new AnchorProvider(
    connection,
    walletAdapter as any,
    { commitment: 'confirmed' }
  );

  // Create program instance
  const program = new Program<VeriSolProgram>(VeriSolIDL, VERISOL_PROGRAM_ID, provider);

  try {
    // Try full compressed NFT minting
    // Anchor expects bytes as Buffer or Uint8Array
    const txSignature = await program.methods
      .verifyAndMint(proofBytes, publicInputBytes)
      .accounts({
        payer: wallet.publicKey,
        merkleTree: merkleTree,
        treeAuthority: treeAuthority,
        logWrapper: LOG_WRAPPER,
        compressionProgram: COMPRESSION_PROGRAM_ID,
        bubblegumProgram: BUBBLEGUM_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return txSignature;
  } catch (mintError: any) {
    console.error('Compressed NFT minting failed:', mintError);
    
    // Fallback to proof-only verification if minting fails
    try {
      const txSignature = await program.methods
        .verifyProofOnly(proofBytes, publicInputBytes)
        .accounts({
          payer: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.warn('Used proof-only verification (cNFT minting unavailable)');
      return txSignature;
    } catch (fallbackError: any) {
      console.error('Proof-only verification also failed:', fallbackError);
      throw new Error(
        `Failed to mint attestation: ${mintError.message || 'Unknown error'}`
      );
    }
  }
}

/**
 * Check if VeriSol infrastructure is set up
 */
export async function checkVeriSolSetup(connection: Connection): Promise<{
  programExists: boolean;
  merkleTreeExists: boolean;
  treeAuthorityExists: boolean;
  ready: boolean;
  errors: string[];
}> {
  const errors: string[] = [];
  let programExists = false;
  let merkleTreeExists = false;
  let treeAuthorityExists = false;

  // Check program
  try {
    const programInfo = await connection.getAccountInfo(VERISOL_PROGRAM_ID);
    programExists = !!programInfo;
    if (!programExists) {
      errors.push('VeriSol program not found on blockchain');
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
    errors.push('Merkle tree not configured (NEXT_PUBLIC_VERISOL_MERKLE_TREE not set)');
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

  const ready = programExists && merkleTreeExists && treeAuthorityExists;

  return {
    programExists,
    merkleTreeExists,
    treeAuthorityExists,
    ready,
    errors,
  };
}

