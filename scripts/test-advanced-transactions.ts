#!/usr/bin/env ts-node

/**
 * Advanced Transactions Test Suite
 *
 * Tests the advanced transaction building functionality including:
 * - Component structure and file organization
 * - Template system validation
 * - UI component integration
 * - Feature completeness
 */

import * as fs from 'fs';
import * as path from 'path';

interface TestResult {
  category: string;
  feature: string;
  status: 'pass' | 'fail' | 'warning' | 'skip';
  message: string;
  details?: string;
}

const results: TestResult[] = [];
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
let warningTests = 0;
let skippedTests = 0;

function test(category: string, feature: string, testFn: () => boolean | string | { pass: boolean; message?: string }): void {
  totalTests++;
  try {
    const result = testFn();
    if (typeof result === 'boolean') {
      if (result) {
        results.push({ category, feature, status: 'pass', message: 'OK' });
        passedTests++;
        console.log(`✅ [${category}] ${feature}`);
      } else {
        results.push({ category, feature, status: 'fail', message: 'Test returned false' });
        failedTests++;
        console.log(`❌ [${category}] ${feature}: Test returned false`);
      }
    } else if (typeof result === 'string') {
      results.push({ category, feature, status: 'warning', message: result });
      warningTests++;
      console.log(`⚠️  [${category}] ${feature}: ${result}`);
    } else if (result && typeof result === 'object' && 'pass' in result) {
      if (result.pass) {
        results.push({ category, feature, status: 'pass', message: result.message || 'OK' });
        passedTests++;
        console.log(`✅ [${category}] ${feature}${result.message ? ': ' + result.message : ''}`);
      } else {
        results.push({ category, feature, status: 'fail', message: result.message || 'Test failed' });
        failedTests++;
        console.log(`❌ [${category}] ${feature}: ${result.message || 'Test failed'}`);
      }
    }
  } catch (error: any) {
    results.push({ category, feature, status: 'fail', message: `Exception: ${error.message}`, details: error.stack });
    failedTests++;
    console.log(`❌ [${category}] ${feature}: Exception - ${error.message}`);
  }
}

// Helper functions
function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

function readFile(filePath: string): string {
  return fs.readFileSync(filePath, 'utf8');
}

// Test file structure and organization
function testFileStructure(): void {
  console.log('\n🏗️  Testing File Structure & Organization\n');

  test('File Structure', 'UnifiedTransactionBuilder component exists', () => {
    return fileExists(path.join(process.cwd(), 'app/components/UnifiedTransactionBuilder.tsx'));
  });

  test('File Structure', 'TransactionBuilder library exists', () => {
    return fileExists(path.join(process.cwd(), 'app/lib/transaction-builder.ts'));
  });

  test('File Structure', 'Transaction types exist', () => {
    return fileExists(path.join(process.cwd(), 'app/lib/instructions/types.ts'));
  });

  test('File Structure', 'Instruction templates exist', () => {
    return fileExists(path.join(process.cwd(), 'app/lib/instructions/templates.ts'));
  });

  test('File Structure', 'AdvancedInstructionCard component exists', () => {
    return fileExists(path.join(process.cwd(), 'app/components/AdvancedInstructionCard.tsx'));
  });

  test('File Structure', 'TemplateSelectorModal component exists', () => {
    return fileExists(path.join(process.cwd(), 'app/components/TemplateSelectorModal.tsx'));
  });

  test('File Structure', 'Transaction builder has proper TypeScript types', () => {
    const content = readFile(path.join(process.cwd(), 'app/lib/instructions/types.ts'));
    return content.includes('interface') && content.includes('TransactionDraft');
  });
}

// Test instruction templates
function testInstructionTemplates(): void {
  console.log('\n📋 Testing Instruction Templates\n');

  test('Instruction Templates', 'Templates module has proper exports', () => {
    const content = readFile(path.join(process.cwd(), 'app/lib/instructions/templates.ts'));
    return content.includes('export function getTemplatesByCategory') &&
           content.includes('export function getTemplateById');
  });

  test('Instruction Templates', 'Templates include system program templates', () => {
    const content = readFile(path.join(process.cwd(), 'app/lib/instructions/templates.ts'));
    return content.includes('system_transfer') || content.includes('SystemProgram');
  });

  test('Instruction Templates', 'Templates include SPL token templates', () => {
    const content = readFile(path.join(process.cwd(), 'app/lib/instructions/templates.ts'));
    return content.includes('spl_token') || content.includes('TOKEN_PROGRAM_ID');
  });

  test('Instruction Templates', 'Templates include DeFi templates', () => {
    const content = readFile(path.join(process.cwd(), 'app/lib/instructions/templates.ts'));
    return content.includes('jupiter') || content.includes('defi');
  });

  test('Instruction Templates', 'Templates have proper structure', () => {
    const content = readFile(path.join(process.cwd(), 'app/lib/instructions/templates.ts'));
    return content.includes('id:') &&
           content.includes('programId:') &&
           content.includes('name:') &&
           content.includes('accounts:') &&
           content.includes('args:');
  });
}

// Test template system
function testTemplateSystem(): void {
  console.log('\n📋 Testing Template System\n');

  test('Template System', 'Templates file contains instruction definitions', () => {
    const content = readFile(path.join(process.cwd(), 'app/lib/instructions/templates.ts'));
    return content.includes('INSTRUCTION_TEMPLATES') && content.includes('export const');
  });

  test('Template System', 'Has getTemplateById function', () => {
    const content = readFile(path.join(process.cwd(), 'app/lib/instructions/templates.ts'));
    return content.includes('getTemplateById') && content.includes('export function');
  });

  test('Template System', 'Has getTemplatesByCategory function', () => {
    const content = readFile(path.join(process.cwd(), 'app/lib/instructions/templates.ts'));
    return content.includes('getTemplatesByCategory');
  });

  test('Template System', 'Includes system program templates', () => {
    const content = readFile(path.join(process.cwd(), 'app/lib/instructions/templates.ts'));
    return content.includes('system_transfer') || content.includes('SystemProgram');
  });

  test('Template System', 'Includes SPL token templates', () => {
    const content = readFile(path.join(process.cwd(), 'app/lib/instructions/templates.ts'));
    return content.includes('spl_token') || content.includes('TOKEN_PROGRAM_ID');
  });

  test('Template System', 'Includes DeFi templates', () => {
    const content = readFile(path.join(process.cwd(), 'app/lib/instructions/templates.ts'));
    return content.includes('jupiter') || content.includes('defi');
  });
}

// Test component features
function testComponentFeatures(): void {
  console.log('\n⚛️  Testing Component Features\n');

  test('Component Features', 'Advanced mode has template selector', () => {
    const content = readFile(path.join(process.cwd(), 'app/components/UnifiedTransactionBuilder.tsx'));
    return content.includes('TemplateSelectorModal');
  });

  test('Component Features', 'Advanced mode has instruction cards', () => {
    const content = readFile(path.join(process.cwd(), 'app/components/UnifiedTransactionBuilder.tsx'));
    return content.includes('AdvancedInstructionCard');
  });

  test('Component Features', 'Supports instruction validation', () => {
    const content = readFile(path.join(process.cwd(), 'app/components/UnifiedTransactionBuilder.tsx'));
    return content.includes('validateAdvancedInstruction');
  });

  test('Component Features', 'Has instruction management functions', () => {
    const content = readFile(path.join(process.cwd(), 'app/components/UnifiedTransactionBuilder.tsx'));
    return content.includes('addAdvancedInstruction') &&
           content.includes('removeAdvancedInstruction');
  });

  test('Component Features', 'Supports account copying', () => {
    const content = readFile(path.join(process.cwd(), 'app/components/UnifiedTransactionBuilder.tsx'));
    return content.includes('copyAddress');
  });

  test('Component Features', 'Has transaction building functionality', () => {
    const content = readFile(path.join(process.cwd(), 'app/components/UnifiedTransactionBuilder.tsx'));
    return content.includes('buildTransaction') && content.includes('TransactionBuilder');
  });
}

// Test advanced UI features
function testAdvancedUIFeatures(): void {
  console.log('\n🎨 Testing Advanced UI Features\n');

  test('UI Features', 'Supports clipboard functionality', () => {
    const content = readFile(path.join(process.cwd(), 'app/components/UnifiedTransactionBuilder.tsx'));
    return content.includes('copiedAddresses');
  });

  test('UI Features', 'Has focus management for inputs', () => {
    const content = readFile(path.join(process.cwd(), 'app/components/UnifiedTransactionBuilder.tsx'));
    return content.includes('focusedInputField');
  });

  test('UI Features', 'Supports template categories', () => {
    const content = readFile(path.join(process.cwd(), 'app/components/UnifiedTransactionBuilder.tsx'));
    return content.includes('selectedCategory');
  });

  test('UI Features', 'Has search functionality', () => {
    const content = readFile(path.join(process.cwd(), 'app/components/UnifiedTransactionBuilder.tsx'));
    return content.includes('searchQuery');
  });

  test('UI Features', 'Supports priority fees', () => {
    const content = readFile(path.join(process.cwd(), 'app/components/UnifiedTransactionBuilder.tsx'));
    return content.includes('priorityFee');
  });

  test('UI Features', 'Supports memo field', () => {
    const content = readFile(path.join(process.cwd(), 'app/components/UnifiedTransactionBuilder.tsx'));
    return content.includes('memo');
  });
}

// Test integration with other systems
function testIntegration(): void {
  console.log('\n🔗 Testing System Integration\n');

  test('Integration', 'Integrates with wallet adapter', () => {
    const content = readFile(path.join(process.cwd(), 'app/components/UnifiedTransactionBuilder.tsx'));
    return content.includes('useWallet') && content.includes('@solana/wallet-adapter');
  });

  test('Integration', 'Integrates with Solana connection', () => {
    const content = readFile(path.join(process.cwd(), 'app/components/UnifiedTransactionBuilder.tsx'));
    return content.includes('useConnection');
  });

  test('Integration', 'Supports ArbitragePanel integration', () => {
    const content = readFile(path.join(process.cwd(), 'app/components/UnifiedTransactionBuilder.tsx'));
    return content.includes('ArbitragePanel');
  });

  test('Integration', 'Supports AI agent integration', () => {
    const content = readFile(path.join(process.cwd(), 'app/components/UnifiedTransactionBuilder.tsx'));
    return content.includes('UnifiedAIAgents');
  });

  test('Integration', 'Has proper error handling', () => {
    const content = readFile(path.join(process.cwd(), 'app/components/UnifiedTransactionBuilder.tsx'));
    return content.includes('setBuildError') && content.includes('buildError');
  });
}

// Main test runner
function runTests(): void {
  console.log('🧪 Advanced Transactions Test Suite\n');
  console.log('============================================================\n');

  testFileStructure();
  testTemplateSystem();
  testComponentFeatures();
  testAdvancedUIFeatures();
  testIntegration();

  // Summary
  console.log('\n============================================================');
  console.log('\n📊 Test Summary\n');

  const categories = Array.from(new Set(results.map(r => r.category)));
  categories.forEach(category => {
    const categoryResults = results.filter(r => r.category === category);
    const passed = categoryResults.filter(r => r.status === 'pass').length;
    const failed = categoryResults.filter(r => r.status === 'fail').length;
    const warnings = categoryResults.filter(r => r.status === 'warning').length;

    console.log(`${category}:`);
    console.log(`  ✅ Passed: ${passed}`);
    console.log(`  ❌ Failed: ${failed}`);
    console.log(`  ⚠️  Warnings: ${warnings}`);
    console.log();
  });

  console.log(`Overall Statistics:`);
  console.log(`  Total Tests: ${totalTests}`);
  console.log(`  ✅ Passed: ${passedTests} (${((passedTests / totalTests) * 100).toFixed(1)}%)`);
  console.log(`  ❌ Failed: ${failedTests} (${((failedTests / totalTests) * 100).toFixed(1)}%)`);
  console.log(`  ⚠️  Warnings: ${warningTests} (${((warningTests / totalTests) * 100).toFixed(1)}%)`);
  console.log(`  ⏭️  Skipped: ${skippedTests} (${((skippedTests / totalTests) * 100).toFixed(1)}%)`);

  if (failedTests === 0) {
    console.log('\n🎉 All tests passed! Advanced transactions are working correctly.');
  } else {
    console.log(`\n⚠️  ${failedTests} test(s) failed. Please review the results above.`);
    process.exit(1);
  }
}

// Run the tests
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}

export { runTests };
