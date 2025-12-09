/**
 * Script to test all possible combinations in the Transaction Builder
 * Generates a comprehensive test report
 */

import { Connection, PublicKey, Keypair, SystemProgram } from '@solana/web3.js';
import { TransactionBuilder } from '../app/lib/transaction-builder';
import { INSTRUCTION_TEMPLATES, getTemplatesByCategory, getTemplateById } from '../app/lib/instructions/templates';
import { TransactionDraft, BuiltInstruction } from '../app/lib/instructions/types';

interface TestResult {
  testName: string;
  passed: boolean;
  error?: string;
  instructionCount?: number;
  duration?: number;
}

const results: TestResult[] = [];
const testKeypair1 = Keypair.generate();
const testKeypair2 = Keypair.generate();
const testKeypair3 = Keypair.generate();

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const builder = new TransactionBuilder(connection);

function createBuiltInstruction(
  templateId: string,
  accounts: Record<string, string>,
  args: Record<string, any> = {}
): BuiltInstruction {
  const template = getTemplateById(templateId);
  if (!template) {
    throw new Error(`Template not found: ${templateId}`);
  }
  return { template, accounts, args };
}

function createTestDraft(instructions: BuiltInstruction[]): TransactionDraft {
  return { instructions, priorityFee: undefined, memo: undefined };
}

async function runTest(
  testName: string,
  testFn: () => Promise<void>
): Promise<void> {
  const startTime = Date.now();
  try {
    await testFn();
    const duration = Date.now() - startTime;
    results.push({
      testName,
      passed: true,
      duration,
    });
    console.log(`✅ ${testName} (${duration}ms)`);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    results.push({
      testName,
      passed: false,
      error: error.message || String(error),
      duration,
    });
    console.log(`❌ ${testName}: ${error.message}`);
  }
}

async function testAllIndividualTemplates() {
  console.log('\n📋 Testing All Individual Instruction Templates...\n');
  
  for (const template of INSTRUCTION_TEMPLATES) {
    // Skip create_token_and_mint - it's handled via _operation flag
    if (template.id === 'spl_token_create_mint') {
      continue;
    }
    
    await runTest(`${template.category} - ${template.name}`, async () => {
      const accounts: Record<string, string> = {};
      const args: Record<string, any> = {};

      template.accounts.forEach((account) => {
        // Always include accounts with default pubkeys, even if optional
        if (account.pubkey) {
          accounts[account.name] = account.pubkey;
        } else if (!account.isOptional) {
          // For required accounts without default pubkeys, generate one
          if (account.type === 'signer') {
            accounts[account.name] = testKeypair1.publicKey.toBase58();
          } else {
            accounts[account.name] = testKeypair2.publicKey.toBase58();
          }
        }
      });

      template.args.forEach((arg) => {
        if (!arg.isOptional) {
          switch (arg.type) {
            case 'u64':
            case 'u32':
            case 'u16':
            case 'u8':
              args[arg.name] = arg.validation?.min || 1;
              break;
            case 'i64':
            case 'i32':
              args[arg.name] = arg.validation?.min || 0;
              break;
            case 'string':
              args[arg.name] = 'test';
              break;
            case 'bool':
              args[arg.name] = false;
              break;
            case 'pubkey':
              args[arg.name] = testKeypair3.publicKey.toBase58();
              break;
            default:
              args[arg.name] = arg.defaultValue || '';
          }
        }
      });

      // For custom instructions, provide a programId
      if (template.id === 'custom_instruction') {
        args['programId'] = SystemProgram.programId.toBase58();
      }

      const instruction = createBuiltInstruction(template.id, accounts, args);
      const draft = createTestDraft([instruction]);
      const tx = await builder.buildTransaction(draft);
      
      if (tx.instructions.length === 0) {
        throw new Error('No instructions generated');
      }
    });
  }
}

async function testCategoryCombinations() {
  console.log('\n🔄 Testing Category Combinations...\n');
  
  const categories = ['system', 'token', 'nft', 'defi', 'custom'];
  
  for (const cat1 of categories) {
    for (const cat2 of categories) {
      const templates1 = getTemplatesByCategory(cat1).filter(t => t.id !== 'spl_token_create_mint');
      const templates2 = getTemplatesByCategory(cat2).filter(t => t.id !== 'spl_token_create_mint');
      
      if (templates1.length === 0 || templates2.length === 0) {
        continue;
      }
      
      await runTest(`${cat1} + ${cat2}`, async () => {
        const template1 = templates1[0];
        const template2 = templates2[0];
        
        const accounts1: Record<string, string> = {};
        const accounts2: Record<string, string> = {};
        const args1: Record<string, any> = {};
        const args2: Record<string, any> = {};
        
        template1.accounts.forEach((acc) => {
          if (!acc.isOptional) {
            if (acc.pubkey) {
              accounts1[acc.name] = acc.pubkey;
            } else if (acc.type === 'signer') {
              accounts1[acc.name] = testKeypair1.publicKey.toBase58();
            } else {
              accounts1[acc.name] = testKeypair2.publicKey.toBase58();
            }
          }
        });
        template1.args.forEach((arg) => {
          if (!arg.isOptional) {
            if (arg.type.includes('u') || arg.type.includes('i')) {
              args1[arg.name] = 1;
            } else if (arg.type === 'string') {
              args1[arg.name] = 'test';
            } else if (arg.type === 'bool') {
              args1[arg.name] = false;
            }
          }
        });
        
        template2.accounts.forEach((acc) => {
          if (!acc.isOptional) {
            if (acc.pubkey) {
              accounts2[acc.name] = acc.pubkey;
            } else if (acc.type === 'signer') {
              accounts2[acc.name] = testKeypair1.publicKey.toBase58();
            } else {
              accounts2[acc.name] = testKeypair2.publicKey.toBase58();
            }
          }
        });
        template2.args.forEach((arg) => {
          if (!arg.isOptional) {
            if (arg.type.includes('u') || arg.type.includes('i')) {
              args2[arg.name] = 1;
            } else if (arg.type === 'string') {
              args2[arg.name] = 'test';
            } else if (arg.type === 'bool') {
              args2[arg.name] = false;
            }
          }
        });
        
        // For custom instructions, provide a programId
        if (template1.id === 'custom_instruction') {
          args1['programId'] = SystemProgram.programId.toBase58();
        }
        if (template2.id === 'custom_instruction') {
          args2['programId'] = SystemProgram.programId.toBase58();
        }
        
        const inst1 = createBuiltInstruction(template1.id, accounts1, args1);
        const inst2 = createBuiltInstruction(template2.id, accounts2, args2);
        const draft = createTestDraft([inst1, inst2]);
        const tx = await builder.buildTransaction(draft);
        
        if (tx.instructions.length < 2) {
          throw new Error(`Expected at least 2 instructions, got ${tx.instructions.length}`);
        }
      });
    }
  }
}

async function testParameterVariations() {
  console.log('\n📊 Testing Parameter Variations...\n');
  
  const amounts = [1, 100, 1000, 1000000, 1000000000];
  
  for (const amount of amounts) {
    await runTest(`system_transfer with amount ${amount}`, async () => {
      const instruction = createBuiltInstruction('system_transfer', {
        from: testKeypair1.publicKey.toBase58(),
        to: testKeypair2.publicKey.toBase58(),
      }, { amount });
      
      const draft = createTestDraft([instruction]);
      const tx = await builder.buildTransaction(draft);
      
      if (tx.instructions.length === 0) {
        throw new Error('No instructions generated');
      }
    });
  }
}

async function testTransactionFeatures() {
  console.log('\n⚙️ Testing Transaction Features...\n');
  
  await runTest('Priority fee', async () => {
    const instruction = createBuiltInstruction('system_transfer', {
      from: testKeypair1.publicKey.toBase58(),
      to: testKeypair2.publicKey.toBase58(),
    }, { amount: 1000000 });
    
    const draft: TransactionDraft = {
      instructions: [instruction],
      priorityFee: 10000,
      memo: undefined,
    };
    
    const tx = await builder.buildTransaction(draft);
    if (tx.instructions.length < 2) {
      throw new Error('Priority fee instruction not added');
    }
  });
  
  await runTest('Memo', async () => {
    const instruction = createBuiltInstruction('system_transfer', {
      from: testKeypair1.publicKey.toBase58(),
      to: testKeypair2.publicKey.toBase58(),
    }, { amount: 1000000 });
    
    const draft: TransactionDraft = {
      instructions: [instruction],
      priorityFee: undefined,
      memo: 'Test memo',
    };
    
    const tx = await builder.buildTransaction(draft);
    if (tx.instructions.length < 2) {
      throw new Error('Memo instruction not added');
    }
  });
  
  await runTest('Priority fee + Memo', async () => {
    const instruction = createBuiltInstruction('system_transfer', {
      from: testKeypair1.publicKey.toBase58(),
      to: testKeypair2.publicKey.toBase58(),
    }, { amount: 1000000 });
    
    const draft: TransactionDraft = {
      instructions: [instruction],
      priorityFee: 5000,
      memo: 'Test transaction',
    };
    
    const tx = await builder.buildTransaction(draft);
    if (tx.instructions.length < 3) {
      throw new Error('Both priority fee and memo not added');
    }
  });
}

async function testFlashLoanCombinations() {
  console.log('\n💸 Testing Flash Loan Combinations...\n');
  
  const flashLoanPairs = [
    { borrow: 'kamino_flash_loan', repay: 'kamino_flash_repay' },
    { borrow: 'solend_flash_loan', repay: 'solend_flash_repay' },
    { borrow: 'marginfi_flash_loan', repay: 'marginfi_flash_repay' },
  ];
  
  // Basic flash loan pairs
  for (const { borrow, repay } of flashLoanPairs) {
    await runTest(`${borrow} + ${repay}`, async () => {
      const borrowTemplate = getTemplateById(borrow);
      const repayTemplate = getTemplateById(repay);
      
      const borrowAccounts: Record<string, string> = {
        lendingPool: testKeypair1.publicKey.toBase58(),
        borrowerTokenAccount: testKeypair2.publicKey.toBase58(),
        borrower: testKeypair1.publicKey.toBase58(),
        tokenMint: testKeypair3.publicKey.toBase58(),
      };
      
      // Add tokenProgram if it has a default pubkey
      const borrowTokenProgram = borrowTemplate?.accounts.find(acc => acc.name === 'tokenProgram');
      if (borrowTokenProgram?.pubkey) {
        borrowAccounts.tokenProgram = borrowTokenProgram.pubkey;
      }
      
      const repayAccounts: Record<string, string> = {
        lendingPool: testKeypair1.publicKey.toBase58(),
        borrowerTokenAccount: testKeypair2.publicKey.toBase58(),
        borrower: testKeypair1.publicKey.toBase58(),
        tokenMint: testKeypair3.publicKey.toBase58(),
      };
      
      // Add tokenProgram if it has a default pubkey
      const repayTokenProgram = repayTemplate?.accounts.find(acc => acc.name === 'tokenProgram');
      if (repayTokenProgram?.pubkey) {
        repayAccounts.tokenProgram = repayTokenProgram.pubkey;
      }
      
      const borrowInst = createBuiltInstruction(borrow, borrowAccounts, { amount: 1000000 });
      const repayInst = createBuiltInstruction(repay, repayAccounts, { repayAmount: 1001000 });
      
      const draft = createTestDraft([borrowInst, repayInst]);
      const tx = await builder.buildTransaction(draft);
      
      if (tx.instructions.length < 2) {
        throw new Error('Flash loan pair not built correctly');
      }
    });
  }
  
  // Flash loan arbitrage workflows
  for (const { borrow, repay } of flashLoanPairs) {
    await runTest(`${borrow} arbitrage (borrow + swap + repay)`, async () => {
      const borrowTemplate = getTemplateById(borrow);
      const repayTemplate = getTemplateById(repay);
      
      const borrowAccounts: Record<string, string> = {
        lendingPool: testKeypair1.publicKey.toBase58(),
        borrowerTokenAccount: testKeypair2.publicKey.toBase58(),
        borrower: testKeypair1.publicKey.toBase58(),
        tokenMint: testKeypair3.publicKey.toBase58(),
      };
      
      const borrowTokenProgram = borrowTemplate?.accounts.find(acc => acc.name === 'tokenProgram');
      if (borrowTokenProgram?.pubkey) {
        borrowAccounts.tokenProgram = borrowTokenProgram.pubkey;
      }
      
      const repayAccounts: Record<string, string> = {
        lendingPool: testKeypair1.publicKey.toBase58(),
        borrowerTokenAccount: testKeypair2.publicKey.toBase58(),
        borrower: testKeypair1.publicKey.toBase58(),
        tokenMint: testKeypair3.publicKey.toBase58(),
      };
      
      const repayTokenProgram = repayTemplate?.accounts.find(acc => acc.name === 'tokenProgram');
      if (repayTokenProgram?.pubkey) {
        repayAccounts.tokenProgram = repayTokenProgram.pubkey;
      }
      
      const borrowInst = createBuiltInstruction(borrow, borrowAccounts, { amount: 1000000 });
      
      const swapInst = createBuiltInstruction('jupiter_swap', {
        userTransferAuthority: testKeypair1.publicKey.toBase58(),
        userSourceTokenAccount: testKeypair2.publicKey.toBase58(),
        userDestinationTokenAccount: testKeypair3.publicKey.toBase58(),
        destinationTokenAccount: testKeypair2.publicKey.toBase58(),
        destinationMint: testKeypair3.publicKey.toBase58(),
      }, { amount: 1000000, minAmountOut: 1100000 });
      
      const repayInst = createBuiltInstruction(repay, repayAccounts, { repayAmount: 1001000 });
      
      const draft = createTestDraft([borrowInst, swapInst, repayInst]);
      const tx = await builder.buildTransaction(draft);
      
      if (tx.instructions.length < 3) {
        throw new Error('Flash loan arbitrage workflow not built correctly');
      }
    });
  }
  
  // Flash loan with priority fee
  for (const { borrow, repay } of flashLoanPairs) {
    await runTest(`${borrow} + ${repay} with priority fee`, async () => {
      const borrowTemplate = getTemplateById(borrow);
      const repayTemplate = getTemplateById(repay);
      
      const borrowAccounts: Record<string, string> = {
        lendingPool: testKeypair1.publicKey.toBase58(),
        borrowerTokenAccount: testKeypair2.publicKey.toBase58(),
        borrower: testKeypair1.publicKey.toBase58(),
        tokenMint: testKeypair3.publicKey.toBase58(),
      };
      
      const borrowTokenProgram = borrowTemplate?.accounts.find(acc => acc.name === 'tokenProgram');
      if (borrowTokenProgram?.pubkey) {
        borrowAccounts.tokenProgram = borrowTokenProgram.pubkey;
      }
      
      const repayAccounts: Record<string, string> = {
        lendingPool: testKeypair1.publicKey.toBase58(),
        borrowerTokenAccount: testKeypair2.publicKey.toBase58(),
        borrower: testKeypair1.publicKey.toBase58(),
        tokenMint: testKeypair3.publicKey.toBase58(),
      };
      
      const repayTokenProgram = repayTemplate?.accounts.find(acc => acc.name === 'tokenProgram');
      if (repayTokenProgram?.pubkey) {
        repayAccounts.tokenProgram = repayTokenProgram.pubkey;
      }
      
      const borrowInst = createBuiltInstruction(borrow, borrowAccounts, { amount: 1000000 });
      const repayInst = createBuiltInstruction(repay, repayAccounts, { repayAmount: 1001000 });
      
      const draft: TransactionDraft = {
        instructions: [borrowInst, repayInst],
        priorityFee: 50000,
        memo: undefined,
      };
      
      const tx = await builder.buildTransaction(draft);
      if (tx.instructions.length < 3) {
        throw new Error('Priority fee not added to flash loan transaction');
      }
    });
  }
  
  // Multiple flash loans
  await runTest('Multiple flash loans (Kamino + Solend)', async () => {
    const kaminoBorrow = createBuiltInstruction('kamino_flash_loan', {
      lendingPool: testKeypair1.publicKey.toBase58(),
      borrowerTokenAccount: testKeypair2.publicKey.toBase58(),
      borrower: testKeypair1.publicKey.toBase58(),
      tokenMint: testKeypair3.publicKey.toBase58(),
    }, { amount: 1000000 });
    
    const solendBorrow = createBuiltInstruction('solend_flash_loan', {
      lendingPool: testKeypair1.publicKey.toBase58(),
      borrowerTokenAccount: testKeypair2.publicKey.toBase58(),
      borrower: testKeypair1.publicKey.toBase58(),
      tokenMint: testKeypair3.publicKey.toBase58(),
    }, { amount: 2000000 });
    
    const solendRepay = createBuiltInstruction('solend_flash_repay', {
      lendingPool: testKeypair1.publicKey.toBase58(),
      borrowerTokenAccount: testKeypair2.publicKey.toBase58(),
      borrower: testKeypair1.publicKey.toBase58(),
      tokenMint: testKeypair3.publicKey.toBase58(),
    }, { repayAmount: 2002000 });
    
    const kaminoRepay = createBuiltInstruction('kamino_flash_repay', {
      lendingPool: testKeypair1.publicKey.toBase58(),
      borrowerTokenAccount: testKeypair2.publicKey.toBase58(),
      borrower: testKeypair1.publicKey.toBase58(),
      tokenMint: testKeypair3.publicKey.toBase58(),
    }, { repayAmount: 1001000 });
    
    const draft = createTestDraft([kaminoBorrow, solendBorrow, solendRepay, kaminoRepay]);
    const tx = await builder.buildTransaction(draft);
    
    if (tx.instructions.length < 4) {
      throw new Error('Multiple flash loans not built correctly');
    }
  });
}

async function testComplexWorkflows() {
  console.log('\n🔗 Testing Complex Workflows...\n');
  
  await runTest('Token creation workflow', async () => {
    const createToken = createBuiltInstruction('spl_token_create_mint', {
      payer: testKeypair1.publicKey.toBase58(),
    }, {
      _operation: 'create_token_and_mint',
      decimals: 9,
      initialSupply: 1000000,
    });
    
    const createMetadata = createBuiltInstruction('mpl_create_metadata', {
      metadata: testKeypair1.publicKey.toBase58(),
      mint: testKeypair2.publicKey.toBase58(),
      mintAuthority: testKeypair1.publicKey.toBase58(),
      payer: testKeypair1.publicKey.toBase58(),
      updateAuthority: testKeypair1.publicKey.toBase58(),
    }, {
      name: 'Test Token',
      symbol: 'TEST',
      uri: 'https://test.com/metadata.json',
    });
    
    const draft = createTestDraft([createToken, createMetadata]);
    const tx = await builder.buildTransaction(draft);
    
    if (tx.instructions.length < 2) {
      throw new Error('Complex workflow not built correctly');
    }
  });
  
  await runTest('Arbitrage workflow', async () => {
    const flashLoan = createBuiltInstruction('kamino_flash_loan', {
      lendingPool: testKeypair1.publicKey.toBase58(),
      borrowerTokenAccount: testKeypair2.publicKey.toBase58(),
      borrower: testKeypair1.publicKey.toBase58(),
      tokenMint: testKeypair3.publicKey.toBase58(),
    }, { amount: 1000000 });
    
    const swap = createBuiltInstruction('jupiter_swap', {
      userTransferAuthority: testKeypair1.publicKey.toBase58(),
      userSourceTokenAccount: testKeypair2.publicKey.toBase58(),
      userDestinationTokenAccount: testKeypair3.publicKey.toBase58(),
      destinationTokenAccount: testKeypair2.publicKey.toBase58(),
      destinationMint: testKeypair3.publicKey.toBase58(),
    }, { amount: 1000000, minAmountOut: 1100000 });
    
    const repay = createBuiltInstruction('kamino_flash_repay', {
      lendingPool: testKeypair1.publicKey.toBase58(),
      borrowerTokenAccount: testKeypair2.publicKey.toBase58(),
      borrower: testKeypair1.publicKey.toBase58(),
      tokenMint: testKeypair3.publicKey.toBase58(),
    }, { repayAmount: 1001000 });
    
    const draft = createTestDraft([flashLoan, swap, repay]);
    const tx = await builder.buildTransaction(draft);
    
    if (tx.instructions.length < 3) {
      throw new Error('Arbitrage workflow not built correctly');
    }
  });
}

function generateReport() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST REPORT');
  console.log('='.repeat(80));
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  const avgDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0) / total;
  
  console.log(`\nTotal Tests: ${total}`);
  console.log(`✅ Passed: ${passed} (${((passed / total) * 100).toFixed(1)}%)`);
  console.log(`❌ Failed: ${failed} (${((failed / total) * 100).toFixed(1)}%)`);
  console.log(`⏱️  Average Duration: ${avgDuration.toFixed(2)}ms`);
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.testName}`);
      console.log(`    Error: ${r.error}`);
    });
  }
  
  console.log('\n' + '='.repeat(80));
  
  // Group by category
  const byCategory: Record<string, { passed: number; failed: number }> = {};
  results.forEach(r => {
    const category = r.testName.split(' - ')[0] || 'Other';
    if (!byCategory[category]) {
      byCategory[category] = { passed: 0, failed: 0 };
    }
    if (r.passed) {
      byCategory[category].passed++;
    } else {
      byCategory[category].failed++;
    }
  });
  
  console.log('\n📈 Results by Category:');
  Object.entries(byCategory).forEach(([category, stats]) => {
    const total = stats.passed + stats.failed;
    const percentage = ((stats.passed / total) * 100).toFixed(1);
    console.log(`  ${category}: ${stats.passed}/${total} passed (${percentage}%)`);
  });
  
  console.log('\n' + '='.repeat(80));
}

async function main() {
  console.log('🚀 Starting Comprehensive Transaction Builder Tests\n');
  console.log(`Testing ${INSTRUCTION_TEMPLATES.length} instruction templates`);
  console.log(`Total possible combinations: ${INSTRUCTION_TEMPLATES.length * INSTRUCTION_TEMPLATES.length}`);
  
  try {
    await testAllIndividualTemplates();
    await testCategoryCombinations();
    await testParameterVariations();
    await testTransactionFeatures();
    await testFlashLoanCombinations();
    await testComplexWorkflows();
    
    generateReport();
    
    const failed = results.filter(r => !r.passed).length;
    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();

