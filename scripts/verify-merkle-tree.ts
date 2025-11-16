#!/usr/bin/env ts-node
/**
 * Script to verify merkle tree setup
 * 
 * Usage:
 *   ts-node scripts/verify-merkle-tree.ts --network devnet
 */

import { Connection } from '@solana/web3.js';
import { checkVeriSolSetup, getBetaTesterMerkleTree, getTreeAuthority } from '../app/lib/verisol/config';

async function main() {
  const args = process.argv.slice(2);
  const network = args.includes('--network') 
    ? args[args.indexOf('--network') + 1] as 'devnet' | 'mainnet' | 'testnet'
    : 'devnet';

  const rpcUrl = network === 'mainnet'
    ? 'https://api.mainnet-beta.solana.com'
    : network === 'testnet'
    ? 'https://api.testnet.solana.com'
    : 'https://api.devnet.solana.com';

  const connection = new Connection(rpcUrl, 'confirmed');

  console.log('🔍 Verifying Merkle Tree Setup');
  console.log('==============================');
  console.log(`Network: ${network}`);
  console.log(`RPC: ${rpcUrl}`);
  console.log('');

  // Check beta tester tree
  const betaTesterTree = getBetaTesterMerkleTree();
  if (betaTesterTree) {
    console.log('✅ Beta Tester Merkle Tree:');
    console.log(`   ${betaTesterTree.toString()}`);
    
    // Check if tree exists on-chain
    try {
      const accountInfo = await connection.getAccountInfo(betaTesterTree);
      if (accountInfo) {
        console.log('   Status: Found on-chain ✅');
      } else {
        console.log('   Status: Not found on-chain ⚠️');
      }
    } catch (error) {
      console.log('   Status: Error checking on-chain ⚠️');
    }
  } else {
    console.log('❌ Beta Tester Merkle Tree: Not configured');
  }
  console.log('');

  // Check general tree
  const generalTree = getTreeAuthority();
  if (generalTree) {
    console.log('✅ General VeriSol Tree Authority:');
    console.log(`   ${generalTree.toString()}`);
  } else {
    console.log('ℹ️  General VeriSol Tree: Not configured (using beta tester tree)');
  }
  console.log('');

  // Check full setup
  console.log('Checking full VeriSol setup...');
  const status = await checkVeriSolSetup(connection);
  
  if (status.ready) {
    console.log('✅ VeriSol setup is ready!');
  } else {
    console.log('❌ VeriSol setup has issues:');
    status.errors.forEach(error => {
      console.log(`   - ${error}`);
    });
  }
  console.log('');

  // Summary
  console.log('📊 Summary');
  console.log('==========');
  console.log(`Program Exists: ${status.programExists ? '✅' : '❌'}`);
  console.log(`Merkle Tree Exists: ${status.merkleTreeExists ? '✅' : '❌'}`);
  console.log(`Tree Authority Exists: ${status.treeAuthorityExists ? '✅' : '❌'}`);
  console.log(`Overall Ready: ${status.ready ? '✅' : '❌'}`);
}

main().catch(console.error);

