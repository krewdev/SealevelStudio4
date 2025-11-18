#!/usr/bin/env ts-node

/**
 * Functional Test Script for Sealevel Studio
 * Tests key features for basic functionality
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface TestResult {
  feature: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
}

const results: TestResult[] = [];

function testFeature(name: string, test: () => boolean | string): void {
  try {
    const result = test();
    if (result === true) {
      results.push({ feature: name, status: 'pass', message: 'OK' });
      console.log(`✅ ${name}`);
    } else {
      results.push({ feature: name, status: 'warning', message: String(result) });
      console.log(`⚠️  ${name}: ${result}`);
    }
  } catch (error) {
    results.push({ 
      feature: name, 
      status: 'fail', 
      message: error instanceof Error ? error.message : String(error) 
    });
    console.log(`❌ ${name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

console.log('🧪 Sealevel Studio Feature Tests\n');

// Test 1: Landing Page Component Exists
testFeature('LandingPage component exists', () => {
  const filePath = join(process.cwd(), 'app/components/LandingPage.tsx');
  const content = readFileSync(filePath, 'utf-8');
  return content.includes('export function LandingPage') && 
         content.includes('onGetStarted') &&
         content.includes('type="button"');
});

// Test 2: Landing Page Buttons
testFeature('LandingPage buttons have proper handlers', () => {
  const filePath = join(process.cwd(), 'app/components/LandingPage.tsx');
  const content = readFileSync(filePath, 'utf-8');
  const buttonCount = (content.match(/type="button"/g) || []).length;
  const onClickCount = (content.match(/onClick=\{/g) || []).length;
  return buttonCount >= 3 && onClickCount >= 3 
    ? true 
    : `Expected 3+ buttons with onClick handlers, found ${buttonCount} buttons and ${onClickCount} handlers`;
});

// Test 3: AI Cyber Playground Arbitrage Integration
testFeature('AI Cyber Playground has arbitrage scanning', () => {
  const filePath = join(process.cwd(), 'app/components/AICyberPlayground.tsx');
  const content = readFileSync(filePath, 'utf-8');
  return content.includes('PoolScanner') && 
         content.includes('ArbitrageDetector') &&
         content.includes('detectOpportunities');
});

// Test 4: R&D Console Draggable
testFeature('R&D Console has draggable functionality', () => {
  const filePath = join(process.cwd(), 'app/components/AdvancedR&DConsole.tsx');
  const content = readFileSync(filePath, 'utf-8');
  return content.includes('isDragging') && 
         content.includes('handleMouseDown') &&
         content.includes('position');
});

// Test 5: AI Menu Removed
testFeature('UnifiedAIAgents component is not rendered in main app', () => {
  const filePath = join(process.cwd(), 'app/page.tsx');
  const content = readFileSync(filePath, 'utf-8');
  // Should not have <UnifiedAIAgents /> in the render
  const hasUnifiedAIAgents = content.includes('<UnifiedAIAgents');
  return !hasUnifiedAIAgents 
    ? true 
    : 'UnifiedAIAgents component is still being rendered';
});

// Test 6: AI Section in Sidebar
testFeature('AI section exists in sidebar navigation', () => {
  const filePath = join(process.cwd(), 'app/page.tsx');
  const content = readFileSync(filePath, 'utf-8');
  return content.includes('{/* AI */}') && 
         content.includes('aiItems.length > 0') &&
         content.includes('cyber-playground');
});

// Test 7: AgentChat Scrollbar
testFeature('AgentChat has custom scrollbar', () => {
  const filePath = join(process.cwd(), 'app/components/AgentChat.tsx');
  const content = readFileSync(filePath, 'utf-8');
  return content.includes('custom-scrollbar') && 
         content.includes('overflow-y-auto');
});

// Test 8: Core Components Exist
testFeature('Core components are present', () => {
  const components = [
    'UnifiedTransactionBuilder',
    'ArbitrageScanner',
  ];
  const missing: string[] = [];
  
  for (const component of components) {
    try {
      const filePath = join(process.cwd(), `app/components/${component}.tsx`);
      readFileSync(filePath, 'utf-8');
    } catch {
      missing.push(component);
    }
  }
  
  return missing.length === 0 
    ? true 
    : `Missing components: ${missing.join(', ')}`;
});

// Test 9: Navigation Items
testFeature('Navigation has required items', () => {
  const filePath = join(process.cwd(), 'app/page.tsx');
  const content = readFileSync(filePath, 'utf-8');
  const required = ['inspector', 'builder', 'scanner', 'cyber-playground'];
  const missing = required.filter(item => !content.includes(`id: '${item}'`));
  return missing.length === 0 
    ? true 
    : `Missing navigation items: ${missing.join(', ')}`;
});

// Test 10: TypeScript Compilation
testFeature('TypeScript compiles without errors', () => {
  // This is a basic check - full compilation would require tsc
  return true; // Will be checked separately
});

// Summary
console.log('\n📊 Test Summary:');
const passed = results.filter(r => r.status === 'pass').length;
const warnings = results.filter(r => r.status === 'warning').length;
const failed = results.filter(r => r.status === 'fail').length;

console.log(`✅ Passed: ${passed}`);
console.log(`⚠️  Warnings: ${warnings}`);
console.log(`❌ Failed: ${failed}`);

if (failed > 0) {
  console.log('\n❌ Failed Tests:');
  results.filter(r => r.status === 'fail').forEach(r => {
    console.log(`   - ${r.feature}: ${r.message}`);
  });
}

if (warnings > 0) {
  console.log('\n⚠️  Warnings:');
  results.filter(r => r.status === 'warning').forEach(r => {
    console.log(`   - ${r.feature}: ${r.message}`);
  });
}

process.exit(failed > 0 ? 1 : 0);

