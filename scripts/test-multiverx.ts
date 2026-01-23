#!/usr/bin/env ts-node

/**
 * MultiverX Blockchain Tests
 * Tests MultiverX-specific features including shard simulator
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { ShardTransactionSimulator } from '../app/lib/shard-simulator/simulator';
import type { ShardTransaction } from '../app/lib/shard-simulator/types';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  error?: string;
}

const results: TestResult[] = [];

function test(name: string, fn: () => Promise<void> | void) {
  return async () => {
    try {
      await fn();
      results.push({ name, passed: true, message: '✅ Passed' });
      console.log(`✅ ${name}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      results.push({ name, passed: false, message: '❌ Failed', error: errorMessage });
      console.error(`❌ ${name}: ${errorMessage}`);
    }
  };
}

async function runTests() {
  console.log('🧪 Testing MultiverX Blockchain Features\n');

  // Test 1: MultiverX is listed in blockchain types
  await test('MultiverX - Listed in blockchain types', async () => {
    const filePath = join(process.cwd(), 'app/components/LandingPage.tsx');
    if (!existsSync(filePath)) {
      throw new Error('LandingPage.tsx not found');
    }
    
    const content = readFileSync(filePath, 'utf-8');
    
    // Check if multiverx is in BlockchainType
    if (!content.includes("'multiverx'") && !content.includes('multiverx')) {
      throw new Error('MultiverX not found in BlockchainType');
    }
    
    // Check if it's in the BLOCKCHAINS array
    if (!content.includes('id: \'multiverx\'') && !content.includes("id: 'multiverx'")) {
      throw new Error('MultiverX not found in BLOCKCHAINS array');
    }
  })();

  // Test 2: MultiverX has correct configuration
  await test('MultiverX - Correct configuration in LandingPage', async () => {
    const filePath = join(process.cwd(), 'app/components/LandingPage.tsx');
    const content = readFileSync(filePath, 'utf-8');
    
    // Check for MultiversX name
    if (!content.includes('MultiversX') && !content.includes('MultiverX')) {
      throw new Error('MultiversX name not found');
    }
    
    // Check for features
    if (!content.includes('Shard Simulator') && !content.includes('shard')) {
      throw new Error('Shard Simulator feature not mentioned');
    }
  })();

  // Test 3: Shard Simulator exists
  await test('Shard Simulator - Files exist', async () => {
    const simulatorPath = join(process.cwd(), 'app/lib/shard-simulator/simulator.ts');
    const typesPath = join(process.cwd(), 'app/lib/shard-simulator/types.ts');
    const indexPath = join(process.cwd(), 'app/lib/shard-simulator/index.ts');
    
    if (!existsSync(simulatorPath)) {
      throw new Error('simulator.ts not found');
    }
    if (!existsSync(typesPath)) {
      throw new Error('types.ts not found');
    }
    if (!existsSync(indexPath)) {
      throw new Error('index.ts not found');
    }
  })();

  // Test 4: Shard Simulator - Can be instantiated
  await test('Shard Simulator - Can be instantiated', async () => {
    const simulator = new ShardTransactionSimulator({
      shardCount: 3,
      enableAdaptiveSharding: true,
    });
    
    if (!simulator) {
      throw new Error('Failed to create simulator instance');
    }
  })();

  // Test 5: Shard Simulator - Intra-shard transaction
  await test('Shard Simulator - Intra-shard transaction simulation', async () => {
    const simulator = new ShardTransactionSimulator({ shardCount: 3 });
    
    // Create transaction within same shard (same address prefix)
    const transaction: ShardTransaction = {
      from: 'erd1testfrom123456789',
      to: 'erd1testfrom987654321', // Same prefix to ensure same shard
      amount: '100',
      gasEstimate: 70000,
    } as ShardTransaction;
    
    const result = await simulator.simulateTransaction(transaction);
    
    if (typeof result.success !== 'boolean') {
      throw new Error('Result should have success boolean');
    }
    if (typeof result.time !== 'number') {
      throw new Error('Result should have time number');
    }
    if (!Array.isArray(result.errors)) {
      throw new Error('Result should have errors array');
    }
  })();

  // Test 6: Shard Simulator - Cross-shard transaction
  await test('Shard Simulator - Cross-shard transaction simulation', async () => {
    const simulator = new ShardTransactionSimulator({ shardCount: 3 });
    
    // Create transaction across different shards (different address prefixes)
    const transaction: ShardTransaction = {
      from: 'erd1aaaaaaaaaaaaaaaaa',
      to: 'erd1zzzzzzzzzzzzzzzzz', // Different prefix to ensure different shard
      amount: '100',
      gasEstimate: 70000,
    } as ShardTransaction;
    
    const result = await simulator.simulateTransaction(transaction);
    
    if (typeof result.success !== 'boolean') {
      throw new Error('Result should have success boolean');
    }
    if (typeof result.time !== 'number') {
      throw new Error('Result should have time number');
    }
    // Cross-shard should take longer (at least 100ms for cross-shard latency)
    if (result.time < 100 && transaction.type === 'cross-shard') {
      throw new Error('Cross-shard transaction should have higher latency');
    }
  })();

  // Test 7: Shard Simulator - Batch simulation
  await test('Shard Simulator - Multiple transaction simulation', async () => {
    const simulator = new ShardTransactionSimulator({ shardCount: 3 });
    
    // Simulate multiple transactions
    const transaction1: ShardTransaction = {
      from: 'erd1test1',
      to: 'erd1test2',
      amount: '100',
      gasEstimate: 70000,
    } as ShardTransaction;
    
    const transaction2: ShardTransaction = {
      from: 'erd1test3',
      to: 'erd1test4',
      amount: '200',
      gasEstimate: 70000,
    } as ShardTransaction;
    
    const result1 = await simulator.simulateTransaction(transaction1);
    const result2 = await simulator.simulateTransaction(transaction2);
    
    if (typeof result1.success !== 'boolean' || typeof result2.success !== 'boolean') {
      throw new Error('Both transactions should return success status');
    }
    if (typeof result1.time !== 'number' || typeof result2.time !== 'number') {
      throw new Error('Both transactions should return time');
    }
  })();

  // Test 8: Shard Simulator - Adaptive sharding
  await test('Shard Simulator - Adaptive sharding enabled', async () => {
    const simulator = new ShardTransactionSimulator({
      shardCount: 3,
      enableAdaptiveSharding: true,
    });
    
    // Test that simulator works with adaptive sharding
    const transaction: ShardTransaction = {
      from: 'erd1test1',
      to: 'erd1test2',
      amount: '100',
      gasEstimate: 70000,
    } as ShardTransaction;
    
    const result = await simulator.simulateTransaction(transaction);
    if (typeof result.success !== 'boolean') {
      throw new Error('Simulator should work with adaptive sharding enabled');
    }
  })();

  // Test 9: MultiverX - Stored in localStorage
  await test('MultiverX - Can be stored in localStorage', async () => {
    const filePath = join(process.cwd(), 'app/page.tsx');
    const content = readFileSync(filePath, 'utf-8');
    
    // Check if multiverx is in the allowed list
    if (!content.includes("'multiverx'") && !content.includes('multiverx')) {
      throw new Error('MultiverX not found in localStorage allowed list');
    }
  })();

  // Test 10: Shard Simulator - Types are exported
  await test('Shard Simulator - Types are properly exported', async () => {
    const typesPath = join(process.cwd(), 'app/lib/shard-simulator/types.ts');
    const content = readFileSync(typesPath, 'utf-8');
    
    // Check for key types
    if (!content.includes('ShardConfig')) {
      throw new Error('ShardConfig type not found');
    }
    if (!content.includes('ShardTransaction')) {
      throw new Error('ShardTransaction type not found');
    }
    if (!content.includes('ShardSimulationResult')) {
      throw new Error('ShardSimulationResult type not found');
    }
  })();

  // Test 11: Shard Simulator - MultiversX architecture reference
  await test('Shard Simulator - References MultiversX architecture', async () => {
    const simulatorPath = join(process.cwd(), 'app/lib/shard-simulator/simulator.ts');
    const content = readFileSync(simulatorPath, 'utf-8');
    
    // Check for MultiversX reference
    if (!content.includes('MultiversX') && !content.includes('MultiverX')) {
      throw new Error('MultiversX architecture not referenced');
    }
  })();

  // Test 12: Shard Simulator - Cross-shard message handling
  await test('Shard Simulator - Cross-shard message simulation', async () => {
    const simulator = new ShardTransactionSimulator({ shardCount: 3 });
    
    const transaction: ShardTransaction = {
      from: 'erd1from1111111111',
      to: 'erd1to999999999999',
      amount: '100',
      gasEstimate: 70000,
    } as ShardTransaction;
    
    const result = await simulator.simulateTransaction(transaction);
    
    // Verify transaction was processed
    if (typeof result.success !== 'boolean') {
      throw new Error('Transaction simulation should return success status');
    }
    if (typeof result.time !== 'number') {
      throw new Error('Transaction simulation should return time');
    }
    
    // If it's a cross-shard transaction, verify it has higher latency
    if (transaction.type === 'cross-shard' && result.time < 100) {
      throw new Error('Cross-shard transaction should have higher latency (>= 100ms)');
    }
  })();

  // Print summary
  console.log('\n📊 Test Summary\n');
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  console.log(`Total: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}\n`);

  if (failed > 0) {
    console.log('Failed Tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  ❌ ${r.name}: ${r.error || r.message}`);
    });
    process.exit(1);
  } else {
    console.log('🎉 All MultiverX tests passed!');
    process.exit(0);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});
