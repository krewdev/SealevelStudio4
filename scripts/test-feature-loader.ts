#!/usr/bin/env ts-node

/**
 * Feature Loader Test
 *
 * Tests the new focused loading experience that shows only the current feature
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

// Test feature mapping
function testFeatureMapping(): void {
  console.log('\n🗺️  Testing Feature Mapping\n');

  test('Feature Mapping', 'FeatureHighlightLoader component exists', () => {
    return fileExists(path.join(process.cwd(), 'app/components/FeatureHighlightLoader.tsx'));
  });

  test('Feature Mapping', 'Page.tsx uses FeatureHighlightLoader', () => {
    const content = readFile(path.join(process.cwd(), 'app/page.tsx'));
    return content.includes('FeatureHighlightLoader') && content.includes('currentFeature');
  });

  test('Feature Mapping', 'getCurrentFeatureId function exists', () => {
    const content = readFile(path.join(process.cwd(), 'app/page.tsx'));
    return content.includes('getCurrentFeatureId');
  });

  test('Feature Mapping', 'Feature loader accepts currentFeature prop', () => {
    const content = readFile(path.join(process.cwd(), 'app/components/FeatureHighlightLoader.tsx'));
    return content.includes('currentFeature?: string') && content.includes('currentFeature = ');
  });

  test('Feature Mapping', 'Function contains proper case mappings', () => {
    const content = readFile(path.join(process.cwd(), 'app/page.tsx'));
    return content.includes("case 'builder':") &&
           content.includes("case 'ai-agents':") &&
           content.includes("case 'charts':") &&
           content.includes("case 'cybersecurity':") &&
           content.includes("return 'transaction-builder'") &&
           content.includes("return 'ai-agents'") &&
           content.includes("return 'market-analytics'");
  });
}

// Test focused loading experience
function testFocusedLoading(): void {
  console.log('\n🎯 Testing Focused Loading Experience\n');

  test('Focused Loading', 'Shows single feature instead of cycling', () => {
    const content = readFile(path.join(process.cwd(), 'app/components/FeatureHighlightLoader.tsx'));
    return !content.includes('currentFeatureIndex') && content.includes('currentFeature = FEATURES.find');
  });

  test('Focused Loading', 'Displays feature-specific loading messages', () => {
    const content = readFile(path.join(process.cwd(), 'app/components/FeatureHighlightLoader.tsx'));
    return content.includes('Loading {currentFeature.title}') &&
           content.includes('Initializing {currentFeature.title}');
  });

  test('Focused Loading', 'Shows feature-specific tips/facts', () => {
    const content = readFile(path.join(process.cwd(), 'app/components/FeatureHighlightLoader.tsx'));
    return content.includes('Did you know?') &&
           content.includes('currentFeature.id === ');
  });

  test('Focused Loading', 'Launch button uses feature colors', () => {
    const content = readFile(path.join(process.cwd(), 'app/components/FeatureHighlightLoader.tsx'));
    return content.includes('currentFeature.bgColor') &&
           content.includes('Launch {currentFeature.title}');
  });

  test('Focused Loading', 'Shows feature loading steps', () => {
    const content = readFile(path.join(process.cwd(), 'app/components/FeatureHighlightLoader.tsx'));
    return content.includes('Initializing components') &&
           content.includes('Loading dependencies') &&
           content.includes('Connecting to Solana');
  });
}

// Main test runner
function runTests(): void {
  console.log('🎮 Feature Loader Test Suite');
  console.log('============================================================\n');

  testFeatureMapping();
  testFocusedLoading();

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
    console.log('\n🎉 All feature loader tests passed! The focused loading experience is ready.');
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
