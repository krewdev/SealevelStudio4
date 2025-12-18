#!/usr/bin/env ts-node
/**
 * Attestation Setup Checker
 * Verifies that all attestation components are properly configured
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

interface SetupStatus {
  programId: boolean;
  programDeployed: boolean;
  merkleTree: boolean;
  merkleTreeExists: boolean;
  idlExists: boolean;
  envConfigured: boolean;
  ready: boolean;
  errors: string[];
  warnings: string[];
}

async function checkAttestationSetup(): Promise<SetupStatus> {
  const status: SetupStatus = {
    programId: false,
    programDeployed: false,
    merkleTree: false,
    merkleTreeExists: false,
    idlExists: false,
    envConfigured: false,
    ready: false,
    errors: [],
    warnings: [],
  };

  // Check environment variables
  const programId = process.env.NEXT_PUBLIC_ATTESTATION_PROGRAM_ID;
  const merkleTree = process.env.NEXT_PUBLIC_BETA_TESTER_MERKLE_TREE || 
                     process.env.NEXT_PUBLIC_VERISOL_MERKLE_TREE ||
                     process.env.NEXT_PUBLIC_ATTESTATION_MERKLE_TREE;

  if (programId) {
    status.programId = true;
    try {
      new PublicKey(programId);
    } catch {
      status.errors.push(`Invalid program ID format: ${programId}`);
      status.programId = false;
    }
  } else {
    status.errors.push('NEXT_PUBLIC_ATTESTATION_PROGRAM_ID not set in environment');
  }

  if (merkleTree) {
    status.merkleTree = true;
    try {
      new PublicKey(merkleTree);
    } catch {
      status.errors.push(`Invalid merkle tree address format: ${merkleTree}`);
      status.merkleTree = false;
    }
  } else {
    status.errors.push('Merkle tree not configured. Set NEXT_PUBLIC_BETA_TESTER_MERKLE_TREE or NEXT_PUBLIC_VERISOL_MERKLE_TREE');
  }

  // Check IDL file
  const possibleIdlPaths = [
    join(process.cwd(), 'programs/attestation-program/target/idl/sealevel_attestation.json'),
    join(process.cwd(), 'programs/attestation-program/target/idl/attestation_program.json'),
    join(process.cwd(), 'programs/attestation-program/target/idl/attestation-program.json'),
  ];

  for (const idlPath of possibleIdlPaths) {
    if (existsSync(idlPath)) {
      status.idlExists = true;
      try {
        const idl = JSON.parse(readFileSync(idlPath, 'utf-8'));
        if (!idl.version || !idl.name || !idl.instructions) {
          status.warnings.push(`IDL at ${idlPath} appears to be invalid`);
        }
      } catch {
        status.warnings.push(`IDL at ${idlPath} could not be parsed`);
      }
      break;
    }
  }

  if (!status.idlExists) {
    status.errors.push('IDL file not found. Run: cd programs/attestation-program && anchor build');
  }

  // Check on-chain deployment
  if (status.programId) {
    try {
      const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_DEVNET || 
                     process.env.NEXT_PUBLIC_SOLANA_RPC_MAINNET ||
                     'https://api.devnet.solana.com';
      const connection = new Connection(rpcUrl, 'confirmed');
      const programPubkey = new PublicKey(programId!);
      const programInfo = await connection.getAccountInfo(programPubkey);
      
      if (programInfo) {
        status.programDeployed = true;
      } else {
        status.errors.push(`Program ${programId} not found on-chain. Deploy with: anchor deploy`);
      }
    } catch (error) {
      status.errors.push(`Error checking program deployment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Check merkle tree on-chain
  if (status.merkleTree && merkleTree) {
    try {
      const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_DEVNET || 
                     process.env.NEXT_PUBLIC_SOLANA_RPC_MAINNET ||
                     'https://api.devnet.solana.com';
      const connection = new Connection(rpcUrl, 'confirmed');
      const treePubkey = new PublicKey(merkleTree);
      const treeInfo = await connection.getAccountInfo(treePubkey);
      
      if (treeInfo) {
        status.merkleTreeExists = true;
      } else {
        status.errors.push(`Merkle tree ${merkleTree} not found on-chain. Create it first.`);
      }
    } catch (error) {
      status.errors.push(`Error checking merkle tree: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  status.envConfigured = status.programId && status.merkleTree;
  status.ready = status.programId && 
                 status.programDeployed && 
                 status.merkleTree && 
                 status.merkleTreeExists && 
                 status.idlExists &&
                 status.errors.length === 0;

  return status;
}

// Run check
checkAttestationSetup().then((status) => {
  console.log('\n📋 Attestation Setup Status\n');
  console.log('Environment Configuration:');
  console.log(`  Program ID: ${status.programId ? '✅' : '❌'} ${process.env.NEXT_PUBLIC_ATTESTATION_PROGRAM_ID || 'Not set'}`);
  console.log(`  Merkle Tree: ${status.merkleTree ? '✅' : '❌'} ${process.env.NEXT_PUBLIC_BETA_TESTER_MERKLE_TREE || process.env.NEXT_PUBLIC_VERISOL_MERKLE_TREE || 'Not set'}`);
  console.log(`  IDL File: ${status.idlExists ? '✅' : '❌'}`);
  console.log('\nOn-Chain Status:');
  console.log(`  Program Deployed: ${status.programDeployed ? '✅' : '❌'}`);
  console.log(`  Merkle Tree Exists: ${status.merkleTreeExists ? '✅' : '❌'}`);
  
  if (status.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    status.warnings.forEach(w => console.log(`  - ${w}`));
  }

  if (status.errors.length > 0) {
    console.log('\n❌ Errors:');
    status.errors.forEach(e => console.log(`  - ${e}`));
  }

  console.log(`\n${status.ready ? '✅ Setup is complete!' : '❌ Setup incomplete. Fix errors above.'}\n`);

  process.exit(status.ready ? 0 : 1);
}).catch((error) => {
  console.error('Error checking setup:', error);
  process.exit(1);
});


