// Attestation Program Client
// TypeScript client for interacting with the custom attestation program

import { Program, AnchorProvider, web3, BN } from '@coral-xyz/anchor';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import type { WalletContextState } from '@solana/wallet-adapter-react';

// Import IDL - this will be generated after building the Anchor program
// For now, we'll define a basic structure
export interface AttestationProgramIDL {
  version: string;
  name: string;
  instructions: Array<{
    name: string;
    accounts: Array<any>;
    args: Array<any>;
  }>;
  accounts: Array<any>;
  types: Array<any>;
}

// Program ID - from the deployed program
export const ATTESTATION_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_ATTESTATION_PROGRAM_ID || 
  'AeK2u45NkNvAcgZuYyCWqmRuCsnXPvcutR3pziXF1cDw' // Deployed program address
);

// Bubblegum Program IDs
export const BUBBLEGUM_PROGRAM_ID = new PublicKey('BGUMAp9Gq7iTEuizy4pqaxsTyUCbk68f37Gc5o4tBzLb');
export const COMPRESSION_PROGRAM_ID = new PublicKey('cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK');
export const LOG_WRAPPER = new PublicKey('noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV');

export interface AttestationMetadata {
  name: string;
  symbol: string;
  uri: string;
  attributes: Array<{ trait_type: string; value: string }>;
}

export interface AttestationClient {
  initialize(merkleTree: PublicKey): Promise<string>;
  mintAttestation(
    usageCount: number,
    metadata: AttestationMetadata
  ): Promise<{ txSignature: string; tier: number }>;
  verifyEligibility(usageCount: number): Promise<number>; // Returns tier (0 = not eligible)
  getTierForUsage(usageCount: number): number; // Helper to get tier locally
  updateThresholds(tier1: number, tier2: number, tier3: number): Promise<string>;
  revokeAttestation(attestationId: number): Promise<string>;
  // Presale attestation methods
  initializePresaleRegistry(merkleTree: PublicKey): Promise<string>;
  mintPresaleAttestation(
    solContributed: number, // SOL amount in lamports
    metadata: AttestationMetadata
  ): Promise<string>;
  verifyPresaleEligibility(solContributed: number): Promise<boolean>;
}

export interface TierInfo {
  tier: number;
  name: string;
  threshold: number;
  rarity: string;
  color: string;
  description: string;
}

export const TIER_CONFIG: Record<number, TierInfo> = {
  1: {
    tier: 1,
    name: 'Bronze',
    threshold: 10,
    rarity: 'Common',
    color: '#CD7F32',
    description: 'Beta Tester - Bronze',
  },
  2: {
    tier: 2,
    name: 'Silver',
    threshold: 50,
    rarity: 'Rare',
    color: '#C0C0C0',
    description: 'Beta Tester - Silver',
  },
  3: {
    tier: 3,
    name: 'Gold',
    threshold: 250,
    rarity: 'Epic',
    color: '#FFD700',
    description: 'Beta Tester - Gold',
  },
};

/**
 * Get tier for a given usage count
 */
export function getTierForUsage(usageCount: number): number {
  if (usageCount >= TIER_CONFIG[3].threshold) return 3;
  if (usageCount >= TIER_CONFIG[2].threshold) return 2;
  if (usageCount >= TIER_CONFIG[1].threshold) return 1;
  return 0;
}

/**
 * Get tier info for a given tier
 */
export function getTierInfo(tier: number): TierInfo {
  return TIER_CONFIG[tier] || TIER_CONFIG[1];
}

/**
 * Create an attestation client for interacting with the program
 */
export function createAttestationClient(
  connection: Connection,
  wallet: WalletContextState
): AttestationClient {
  if (!wallet.publicKey || !wallet.signTransaction || !wallet.sendTransaction) {
    throw new Error('Wallet not connected or missing required methods');
  }

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

  // Lazy-load the IDL when needed (for beta testing)
  let program: Program<any> | null = null;
  let idlLoadPromise: Promise<Program<any> | null> | null = null;

  // Lazy load function for IDL
  const loadProgram = async (): Promise<Program<any> | null> => {
    if (program) return program;
    if (idlLoadPromise) return idlLoadPromise;

    idlLoadPromise = (async () => {
      try {
        let idl: any;
        
        if (typeof window === 'undefined') {
          // Server-side: use fs
          const { readFileSync } = await import('fs');
          const { join } = await import('path');
          const idlPath = join(process.cwd(), 'programs/attestation-program/target/idl/sealevel_attestation.json');
          idl = JSON.parse(readFileSync(idlPath, 'utf-8'));
        } else {
          // Client-side: fetch from API
          const idlResponse = await fetch('/api/attestation/idl');
          if (!idlResponse.ok) {
            throw new Error('Failed to fetch IDL');
          }
          idl = await idlResponse.json();
        }
        
        program = new Program(idl, ATTESTATION_PROGRAM_ID, provider);
        console.log('✅ Attestation program loaded from IDL (beta testing mode)');
        return program;
      } catch (error) {
        console.warn('⚠️ Could not load IDL, will check if program is deployed:', error);
        return null;
      }
    })();

    return idlLoadPromise;
  };

  // Check if program is deployed on-chain
  const isProgramDeployed = async () => {
    try {
      const programInfo = await connection.getAccountInfo(ATTESTATION_PROGRAM_ID);
      return !!programInfo;
    } catch {
      return false;
    }
  };

  return {
    async initialize(merkleTree: PublicKey) {
      const [registry] = PublicKey.findProgramAddressSync(
        [Buffer.from('attestation_registry')],
        ATTESTATION_PROGRAM_ID
      );

      // Load program if not already loaded
      const loadedProgram = await loadProgram();

      // Use real program if available
      if (loadedProgram) {
        try {
          const tx = await loadedProgram.methods
            .initialize(merkleTree)
            .accounts({
              registry,
              authority: wallet.publicKey!,
              systemProgram: web3.SystemProgram.programId,
            })
            .rpc();
          return tx;
        } catch (error) {
          console.error('Error initializing attestation program:', error);
          throw error;
        }
      }

      // Fallback: check if program is deployed but IDL not loaded
      const deployed = await isProgramDeployed();
      if (deployed) {
        throw new Error('Program is deployed but IDL could not be loaded. Please ensure the IDL file exists at programs/attestation-program/target/idl/sealevel_attestation.json');
      }

      throw new Error('Attestation program not deployed. Please deploy the program first.');
    },

    async mintAttestation(usageCount: number, metadata: AttestationMetadata) {
      const [registry] = PublicKey.findProgramAddressSync(
        [Buffer.from('attestation_registry')],
        ATTESTATION_PROGRAM_ID
      );

      // Load program if not already loaded
      const loadedProgram = await loadProgram();

      // Use real program if available (beta testing)
      if (loadedProgram) {
        try {
          const tx = await loadedProgram.methods
            .mintAttestation(
              new BN(usageCount),
              {
                name: metadata.name,
                symbol: metadata.symbol,
                uri: metadata.uri,
                attributes: metadata.attributes.map(attr => ({
                  traitType: attr.trait_type,
                  value: attr.value,
                })),
              }
            )
            .accounts({
              registry,
              payer: wallet.publicKey!,
              wallet: wallet.publicKey!,
              systemProgram: web3.SystemProgram.programId,
            })
            .rpc();

          // Get tier from the program response
          const tier = await loadedProgram.methods
            .verifyEligibility(new BN(usageCount))
            .accounts({ 
              registry, 
              wallet: wallet.publicKey! 
            })
            .view();

          return { txSignature: tx, tier: tier as number };
        } catch (error) {
          console.error('Error minting attestation:', error);
          throw error;
        }
      }

      // Fallback: check if program is deployed but IDL not loaded
      const deployed = await isProgramDeployed();
      if (deployed) {
        throw new Error('Program is deployed but IDL could not be loaded. Please ensure the IDL file exists.');
      }

      // For now, determine tier client-side as fallback
      const tier = this.getTierForUsage(usageCount);
      if (tier === 0) {
        throw new Error('Insufficient usage to qualify for any tier');
      }

      throw new Error('Attestation program not available. Please ensure the program is deployed and IDL is accessible.');
    },

    getTierForUsage(usageCount: number): number {
      if (usageCount >= TIER_CONFIG[3].threshold) return 3;
      if (usageCount >= TIER_CONFIG[2].threshold) return 2;
      if (usageCount >= TIER_CONFIG[1].threshold) return 1;
      return 0;
    },

    async verifyEligibility(usageCount: number): Promise<number> {
      const [registry] = PublicKey.findProgramAddressSync(
        [Buffer.from('attestation_registry')],
        ATTESTATION_PROGRAM_ID
      );

      // Load program if not already loaded
      const loadedProgram = await loadProgram();

      // Use real program if available (beta testing)
      if (loadedProgram) {
        try {
          const tier = await loadedProgram.methods
            .verifyEligibility(new BN(usageCount))
            .accounts({
              registry,
              wallet: wallet.publicKey!,
            })
            .view();
          return tier as number;
        } catch (error) {
          console.error('Error verifying eligibility:', error);
          // Fallback to client-side calculation
        }
      }

      // Fallback: determine tier client-side
      return this.getTierForUsage(usageCount);
    },

    async updateThresholds(tier1: number, tier2: number, tier3: number) {
      const [registry] = PublicKey.findProgramAddressSync(
        [Buffer.from('attestation_registry')],
        ATTESTATION_PROGRAM_ID
      );

      // Load program if not already loaded
      const loadedProgram = await loadProgram();

      // Use real program if available (beta testing)
      if (loadedProgram) {
        try {
          const tx = await loadedProgram.methods
            .updateThresholds(
              new BN(tier1),
              new BN(tier2),
              new BN(tier3)
            )
            .accounts({
              registry,
              authority: wallet.publicKey!,
            })
            .rpc();
          return tx;
        } catch (error) {
          console.error('Error updating thresholds:', error);
          throw error;
        }
      }

      // Fallback: check if program is deployed but IDL not loaded
      const deployed = await isProgramDeployed();
      if (deployed) {
        throw new Error('Program is deployed but IDL could not be loaded. Please ensure the IDL file exists.');
      }

      throw new Error('Attestation program not available. Please ensure the program is deployed and IDL is accessible.');
    },

    async revokeAttestation(attestationId: number) {
      const [registry] = PublicKey.findProgramAddressSync(
        [Buffer.from('attestation_registry')],
        ATTESTATION_PROGRAM_ID
      );

      // TODO: Implement once program is deployed
      // const tx = await program.methods
      //   .revokeAttestation(attestationId)
      //   .accounts({
      //     registry,
      //     authority: wallet.publicKey,
      //   })
      //   .rpc();

      throw new Error('Program not yet deployed. Please build and deploy the Anchor program first.');
    },

    async initializePresaleRegistry(merkleTree: PublicKey) {
      const [presaleRegistry] = PublicKey.findProgramAddressSync(
        [Buffer.from('presale_registry')],
        ATTESTATION_PROGRAM_ID
      );

      const loadedProgram = await loadProgram();

      if (loadedProgram) {
        try {
          const tx = await loadedProgram.methods
            .initializePresaleRegistry(merkleTree)
            .accounts({
              presaleRegistry,
              authority: wallet.publicKey!,
              systemProgram: web3.SystemProgram.programId,
            })
            .rpc();
          return tx;
        } catch (error) {
          console.error('Error initializing presale registry:', error);
          throw error;
        }
      }

      const deployed = await isProgramDeployed();
      if (deployed) {
        throw new Error('Program is deployed but IDL could not be loaded. Please ensure the IDL file exists.');
      }

      throw new Error('Attestation program not deployed. Please deploy the program first.');
    },

    async mintPresaleAttestation(solContributed: number, metadata: AttestationMetadata) {
      const [presaleRegistry] = PublicKey.findProgramAddressSync(
        [Buffer.from('presale_registry')],
        ATTESTATION_PROGRAM_ID
      );

      const loadedProgram = await loadProgram();

      if (loadedProgram) {
        try {
          const tx = await loadedProgram.methods
            .mintPresaleAttestation(
              new BN(solContributed),
              {
                name: metadata.name,
                symbol: metadata.symbol,
                uri: metadata.uri,
                attributes: metadata.attributes.map(attr => ({
                  traitType: attr.trait_type,
                  value: attr.value,
                })),
              }
            )
            .accounts({
              presaleRegistry,
              payer: wallet.publicKey!,
              wallet: wallet.publicKey!,
              systemProgram: web3.SystemProgram.programId,
            })
            .rpc();

          return tx;
        } catch (error) {
          console.error('Error minting presale attestation:', error);
          throw error;
        }
      }

      const deployed = await isProgramDeployed();
      if (deployed) {
        throw new Error('Program is deployed but IDL could not be loaded. Please ensure the IDL file exists.');
      }

      throw new Error('Attestation program not available. Please ensure the program is deployed and IDL is accessible.');
    },

    async verifyPresaleEligibility(solContributed: number): Promise<boolean> {
      const [presaleRegistry] = PublicKey.findProgramAddressSync(
        [Buffer.from('presale_registry')],
        ATTESTATION_PROGRAM_ID
      );

      const loadedProgram = await loadProgram();

      if (loadedProgram) {
        try {
          const eligible = await loadedProgram.methods
            .verifyPresaleEligibility(new BN(solContributed))
            .accounts({
              presaleRegistry,
              wallet: wallet.publicKey!,
            })
            .view();
          return eligible as boolean;
        } catch (error) {
          console.error('Error verifying presale eligibility:', error);
          // Fallback to client-side check
        }
      }

      // Fallback: check client-side (minimum 0.1 SOL = 100_000_000 lamports)
      return solContributed >= 100_000_000;
    },
  };
}

/**
 * Helper to check if attestation program is deployed
 */
export async function checkAttestationProgramDeployed(
  connection: Connection
): Promise<boolean> {
  try {
    const programInfo = await connection.getAccountInfo(ATTESTATION_PROGRAM_ID);
    return !!programInfo;
  } catch {
    return false;
  }
}

