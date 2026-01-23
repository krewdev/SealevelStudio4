/**
 * Test script to verify lazy initialization patterns
 * Checks code structure without requiring full dependencies
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

const results: TestResult[] = [];

function test(name: string, fn: () => boolean | string): void {
  try {
    const result = fn();
    if (result === true) {
      results.push({ name, passed: true, message: '✅ Passed' });
      console.log(`✅ ${name}`);
    } else {
      results.push({ name, passed: false, message: String(result) });
      console.log(`❌ ${name}: ${result}`);
    }
  } catch (error) {
    results.push({ 
      name, 
      passed: false, 
      message: error instanceof Error ? error.message : String(error) 
    });
    console.log(`❌ ${name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

console.log('🧪 Testing Lazy Initialization Patterns\n');

// Test 1: Core AI Model - should not auto-initialize
test('Core AI Model - No auto-initialization on module load', () => {
  const filePath = join(process.cwd(), 'app/lib/ai/core-model.ts');
  if (!existsSync(filePath)) return 'File not found';
  
  const content = readFileSync(filePath, 'utf-8');
  
  // Should NOT have auto-initialization at module level
  const hasAutoInit = content.includes('if (typeof window === \'undefined\' &&') && 
                      content.includes('initializeCoreModel()');
  
  if (hasAutoInit) {
    return 'Core model still auto-initializes on module load';
  }
  
  // Should have lazy getter function
  if (!content.includes('getCoreModel()') && !content.includes('getCoreModel():')) {
    return 'Missing getCoreModel() function';
  }
  
  return true;
});

// Test 2: Provider Registry - should be lazy
test('Provider Registry - Lazy initialization pattern', () => {
  const filePath = join(process.cwd(), 'app/lib/ai/consensus/providers/registry.ts');
  if (!existsSync(filePath)) return 'File not found';
  
  const content = readFileSync(filePath, 'utf-8');
  
  // Should have getProviderRegistry function
  if (!content.includes('getProviderRegistry()') && !content.includes('getProviderRegistry():')) {
    return 'Missing getProviderRegistry() function';
  }
  
  // Should not have direct export of new instance
  if (content.includes('export const providerRegistry = new ProviderRegistry()')) {
    return 'Provider registry still uses eager initialization';
  }
  
  return true;
});

// Test 3: Email Service - should be lazy
test('Email Service - Lazy initialization pattern', () => {
  const filePath = join(process.cwd(), 'app/lib/email/service.ts');
  if (!existsSync(filePath)) return 'File not found';
  
  const content = readFileSync(filePath, 'utf-8');
  
  // Should have getEmailService function
  if (!content.includes('getEmailService()') && !content.includes('getEmailService():')) {
    return 'Missing getEmailService() function';
  }
  
  // Should handle missing API key gracefully
  if (!content.includes('RESEND_API_KEY not configured')) {
    return 'Missing graceful handling of missing API key';
  }
  
  return true;
});

// Test 4: Database Connection - should be lazy
test('Database Connection - Lazy initialization pattern', () => {
  const filePath = join(process.cwd(), 'app/lib/database/connection.ts');
  if (!existsSync(filePath)) return 'File not found';
  
  const content = readFileSync(filePath, 'utf-8');
  
  // Should have getPool function
  if (!content.includes('getPool()') && !content.includes('getPool():')) {
    return 'Missing getPool() function';
  }
  
  // Should handle missing DATABASE_URL gracefully
  if (!content.includes('DATABASE_URL not configured')) {
    return 'Missing graceful handling of missing DATABASE_URL';
  }
  
  return true;
});

// Test 5: MCP Server - resources should be lazy
test('MCP Server - Lazy resource loading', () => {
  const filePath = join(process.cwd(), 'app/lib/ai/mcp/server.js');
  if (!existsSync(filePath)) return 'File not found';
  
  const content = readFileSync(filePath, 'utf-8');
  
  // Should have getResources function
  if (!content.includes('function getResources()')) {
    return 'Missing getResources() function';
  }
  
  // Should not initialize resources at module level
  if (content.includes('resources = registerResources()') && 
      !content.includes('function getResources()')) {
    return 'Resources still initialize at module level';
  }
  
  return true;
});

// Test 6: API Routes - should handle missing dependencies
test('OpenAI API - Handles missing API key gracefully', () => {
  const filePath = join(process.cwd(), 'app/api/openai/chat/route.ts');
  if (!existsSync(filePath)) return 'File not found';
  
  const content = readFileSync(filePath, 'utf-8');
  
  // Should check for API key and return 503 if missing
  if (!content.includes('OPENAI_API_KEY') || !content.includes('503')) {
    return 'Missing graceful handling of missing API key';
  }
  
  if (!content.includes('requiresConfiguration')) {
    return 'Missing requiresConfiguration flag in error response';
  }
  
  return true;
});

// Test 7: Gemini API - should handle missing dependencies
test('Gemini API - Handles missing API key gracefully', () => {
  const filePath = join(process.cwd(), 'app/api/gemini/analyze/route.ts');
  if (!existsSync(filePath)) return 'File not found';
  
  const content = readFileSync(filePath, 'utf-8');
  
  // Should check for API key and return 503 if missing
  if (!content.includes('GEMINI_API_KEY') || !content.includes('503')) {
    return 'Missing graceful handling of missing API key';
  }
  
  if (!content.includes('requiresConfiguration')) {
    return 'Missing requiresConfiguration flag in error response';
  }
  
  return true;
});

// Test 8: Wallet Creation - should handle errors gracefully
test('Wallet Creation - Error handling', () => {
  const filePath = join(process.cwd(), 'app/api/wallet/create/route.ts');
  if (!existsSync(filePath)) return 'File not found';
  
  const content = readFileSync(filePath, 'utf-8');
  
  // Should have try-catch
  if (!content.includes('try {') || !content.includes('catch')) {
    return 'Missing error handling';
  }
  
  // Should return proper error responses
  if (!content.includes('NextResponse.json') || !content.includes('error')) {
    return 'Missing error response handling';
  }
  
  return true;
});

// Test 9: UserContext - should handle localStorage safely
test('UserContext - Safe localStorage access', () => {
  const filePath = join(process.cwd(), 'app/contexts/UserContext.tsx');
  if (!existsSync(filePath)) return 'File not found';
  
  const content = readFileSync(filePath, 'utf-8');
  
  // Should check for window/localStorage before using
  if (content.includes('localStorage.getItem') && 
      !content.includes('typeof window') && 
      !content.includes('window !== \'undefined\'')) {
    return 'Missing window check before localStorage access';
  }
  
  return true;
});

// Test 10: LoginGate - should validate input
test('LoginGate - Input validation', () => {
  const filePath = join(process.cwd(), 'app/components/LoginGate.tsx');
  if (!existsSync(filePath)) return 'File not found';
  
  const content = readFileSync(filePath, 'utf-8');
  
  // Should validate email format
  if (!content.includes('emailRegex') && !content.includes('email format')) {
    return 'Missing email validation';
  }
  
  // Should validate vanity prefix
  if (!content.includes('base58Regex') || !content.includes('Base58')) {
    return 'Missing vanity prefix validation';
  }
  
  return true;
});

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
    console.log(`  ❌ ${r.name}: ${r.message}`);
  });
  process.exit(1);
} else {
  console.log('🎉 All lazy initialization tests passed!');
  process.exit(0);
}
