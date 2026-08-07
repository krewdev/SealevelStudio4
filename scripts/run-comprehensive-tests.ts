#!/usr/bin/env ts-node

/**
 * Comprehensive Test Execution Script
 * 
 * This script helps execute and verify all on-chain functions and user workflows.
 * Run with: npx ts-node scripts/run-comprehensive-tests.ts
 */

import { Connection, Keypair, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import * as fs from 'fs';
import * as path from 'path';

// Test configuration
const RPC_ENDPOINT = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const connection = new Connection(RPC_ENDPOINT, 'confirmed');

// Test results storage
interface TestResult {
  id: string;
  name: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  transactionSignature?: string;
  error?: string;
  timestamp: Date;
}

const testResults: TestResult[] = [];

// Helper function to log test results
function logTest(testId: string, testName: string, status: 'PASS' | 'FAIL' | 'SKIP', details?: any) {
  const result: TestResult = {
    id: testId,
    name: testName,
    status,
    timestamp: new Date(),
    ...details
  };
  testResults.push(result);
  
  const statusIcon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏭️';
  console.log(`${statusIcon} ${testId}: ${testName}`);
  if (details?.transactionSignature) {
    console.log(`   Transaction: ${details.transactionSignature}`);
  }
  if (details?.error) {
    console.log(`   Error: ${details.error}`);
  }
}

// Helper function to create test wallet
async function createTestWallet(): Promise<Keypair> {
  const keypair = Keypair.generate();
  console.log(`\n📝 Test Wallet Created: ${keypair.publicKey.toBase58()}`);
  
  // Request airdrop
  try {
    const signature = await connection.requestAirdrop(keypair.publicKey, 2 * 1e9); // 2 SOL
    await connection.confirmTransaction(signature);
    console.log(`   Airdrop received: ${signature}`);
    logTest('SETUP-001', 'Create test wallet and airdrop', 'PASS', { transactionSignature: signature });
  } catch (error: any) {
    logTest('SETUP-001', 'Create test wallet and airdrop', 'FAIL', { error: error.message });
    throw error;
  }
  
  return keypair;
}

// Test: System Program Transfer
async function testSystemTransfer(sender: Keypair, recipient: PublicKey): Promise<void> {
  const testId = 'TC-007';
  const testName = 'Build and execute SOL transfer transaction';
  
  try {
    const amount = 0.1 * 1e9; // 0.1 SOL
    
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: sender.publicKey,
        toPubkey: recipient,
        lamports: amount,
      })
    );
    
    const signature = await connection.sendTransaction(transaction, [sender]);
    await connection.confirmTransaction(signature);
    
    // Verify balance
    const balance = await connection.getBalance(recipient);
    if (balance >= amount) {
      logTest(testId, testName, 'PASS', { transactionSignature: signature });
    } else {
      logTest(testId, testName, 'FAIL', { error: 'Balance verification failed' });
    }
  } catch (error: any) {
    logTest(testId, testName, 'FAIL', { error: error.message });
  }
}

// Test: Account Info Fetching
async function testAccountInfo(address: PublicKey): Promise<void> {
  const testId = 'TC-001';
  const testName = 'Inspect system account';
  
  try {
    const accountInfo = await connection.getAccountInfo(address);
    
    if (accountInfo) {
      logTest(testId, testName, 'PASS', {
        owner: accountInfo.owner.toBase58(),
        lamports: accountInfo.lamports,
        executable: accountInfo.executable
      });
    } else {
      logTest(testId, testName, 'FAIL', { error: 'Account not found' });
    }
  } catch (error: any) {
    logTest(testId, testName, 'FAIL', { error: error.message });
  }
}

// Test: Transaction Simulation
async function testTransactionSimulation(sender: Keypair, recipient: PublicKey): Promise<void> {
  const testId = 'TC-017';
  const testName = 'Transaction simulation';
  
  try {
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: sender.publicKey,
        toPubkey: recipient,
        lamports: 0.1 * 1e9,
      })
    );
    
    const simulation = await connection.simulateTransaction(transaction);
    
    if (simulation.value.err === null) {
      logTest(testId, testName, 'PASS', {
        computeUnitsUsed: simulation.value.unitsConsumed,
        logs: simulation.value.logs?.slice(0, 3) // First 3 logs
      });
    } else {
      logTest(testId, testName, 'FAIL', { error: JSON.stringify(simulation.value.err) });
    }
  } catch (error: any) {
    logTest(testId, testName, 'FAIL', { error: error.message });
  }
}

// Test: Airdrop (Devnet)
async function testAirdrop(recipient: PublicKey): Promise<void> {
  const testId = 'TC-045';
  const testName = 'Request airdrop on devnet';
  
  try {
    const balanceBefore = await connection.getBalance(recipient);
    const airdropAmount = 1 * 1e9; // 1 SOL
    
    const signature = await connection.requestAirdrop(recipient, airdropAmount);
    await connection.confirmTransaction(signature);
    
    const balanceAfter = await connection.getBalance(recipient);
    
    if (balanceAfter >= balanceBefore + airdropAmount) {
      logTest(testId, testName, 'PASS', { transactionSignature: signature });
    } else {
      logTest(testId, testName, 'FAIL', { error: 'Balance not increased correctly' });
    }
  } catch (error: any) {
    logTest(testId, testName, 'FAIL', { error: error.message });
  }
}

// Test: Get Recent Blockhash
async function testGetRecentBlockhash(): Promise<void> {
  const testId = 'BLOCKCHAIN-001';
  const testName = 'Get recent blockhash';
  
  try {
    const { blockhash } = await connection.getLatestBlockhash();
    
    if (blockhash) {
      logTest(testId, testName, 'PASS', { blockhash });
    } else {
      logTest(testId, testName, 'FAIL', { error: 'No blockhash returned' });
    }
  } catch (error: any) {
    logTest(testId, testName, 'FAIL', { error: error.message });
  }
}

// Test: Get Balance
async function testGetBalance(address: PublicKey): Promise<void> {
  const testId = 'BLOCKCHAIN-002';
  const testName = 'Get account balance';
  
  try {
    const balance = await connection.getBalance(address);
    logTest(testId, testName, 'PASS', { balance, balanceSOL: balance / 1e9 });
  } catch (error: any) {
    logTest(testId, testName, 'FAIL', { error: error.message });
  }
}

// Main test execution
async function runTests() {
  console.log('🚀 Starting Comprehensive On-Chain Tests\n');
  console.log(`Network: ${RPC_ENDPOINT}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);
  
  try {
    // Setup: Create test wallets
    const testWallet1 = await createTestWallet();
    const testWallet2 = Keypair.generate();
    
    // Test blockchain connectivity
    await testGetRecentBlockhash();
    await testGetBalance(testWallet1.publicKey);
    
    // Test account inspection
    await testAccountInfo(testWallet1.publicKey);
    
    // Test airdrop
    await testAirdrop(testWallet2.publicKey);
    
    // Test transaction simulation
    await testTransactionSimulation(testWallet1, testWallet2.publicKey);
    
    // Test system transfer
    await testSystemTransfer(testWallet1, testWallet2.publicKey);
    
    // Generate test report
    generateTestReport();
    
  } catch (error: any) {
    console.error('\n❌ Test execution failed:', error);
    process.exit(1);
  }
}

// Generate test report
function generateTestReport() {
  const passed = testResults.filter(r => r.status === 'PASS').length;
  const failed = testResults.filter(r => r.status === 'FAIL').length;
  const skipped = testResults.filter(r => r.status === 'SKIP').length;
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST REPORT');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${testResults.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  const successRate = testResults.length === 0
    ? '0.0'
    : ((passed / testResults.length) * 100).toFixed(1);
  console.log(`Success Rate: ${successRate}%`);
  console.log('='.repeat(60));
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    testResults.filter(r => r.status === 'FAIL').forEach(result => {
      console.log(`  - ${result.id}: ${result.name}`);
      if (result.error) {
        console.log(`    Error: ${result.error}`);
      }
    });
  }
  
  // Save report to file
  const reportPath = path.join(process.cwd(), 'test-results', `test-report-${Date.now()}.json`);
  const reportDir = path.dirname(reportPath);
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    network: RPC_ENDPOINT,
    summary: {
      total: testResults.length,
      passed,
      failed,
      skipped
    },
    results: testResults
  }, null, 2));
  
  console.log(`\n📄 Report saved to: ${reportPath}`);
}

// Run tests
if (require.main === module) {
  runTests().catch(console.error);
}

export { runTests, testResults };
