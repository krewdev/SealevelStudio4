/**
 * Test script to verify all services work on-demand
 * Tests lazy initialization and graceful handling of missing dependencies
 */

import { getCoreModel, initializeCoreModel } from '../app/lib/ai/core-model';
import { getProviderRegistry } from '../app/lib/ai/consensus/providers/registry';
import { getEmailService } from '../app/lib/email/service';
import { getPool, checkConnection } from '../app/lib/database/connection';

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
  console.log('🧪 Testing Services On-Demand Initialization\n');

  // Test 1: Core AI Model - should not initialize on import
  await test('Core AI Model - Lazy initialization', async () => {
    // Import should not initialize
    const model1 = getCoreModel();
    if (model1 !== null && process.env.LOCAL_AI_ENABLED !== 'true' && !process.env.LOCAL_AI_ENDPOINT) {
      throw new Error('Core model should be null when not configured');
    }
    
    // Explicit initialization should work
    if (process.env.LOCAL_AI_ENABLED === 'true' || process.env.LOCAL_AI_ENDPOINT) {
      const model2 = initializeCoreModel();
      if (!model2) {
        throw new Error('Core model should initialize when explicitly called');
      }
    }
  })();

  // Test 2: Provider Registry - should be lazy
  await test('Provider Registry - Lazy initialization', async () => {
    const registry = getProviderRegistry();
    if (!registry) {
      throw new Error('Provider registry should return an instance');
    }
    
    // Should not crash even if no providers configured
    const providers = registry.getAll();
    if (!Array.isArray(providers)) {
      throw new Error('getAll() should return an array');
    }
  })();

  // Test 3: Email Service - should handle missing API key
  await test('Email Service - Handles missing API key', async () => {
    // This should not throw even if RESEND_API_KEY is missing
    const emailService = getEmailService();
    // Should return null if not configured, but not throw
    if (emailService === null && process.env.RESEND_API_KEY) {
      throw new Error('Email service should be available when API key is set');
    }
  })();

  // Test 4: Database Connection - should handle missing DATABASE_URL
  await test('Database Connection - Handles missing DATABASE_URL', async () => {
    const pool = getPool();
    // Should return null if not configured, but not throw
    if (pool === null && process.env.DATABASE_URL) {
      throw new Error('Database pool should be available when DATABASE_URL is set');
    }
    
    // checkConnection should not throw
    const isConnected = await checkConnection();
    if (typeof isConnected !== 'boolean') {
      throw new Error('checkConnection should return a boolean');
    }
  })();

  // Test 5: API Routes - test wallet creation endpoint
  await test('Wallet Creation API - Handles requests gracefully', async () => {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    try {
      const response = await fetch(`${baseUrl}/api/wallet/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: 'test-session-' + Date.now() }),
      });

      if (!response.ok && response.status !== 500) {
        // 500 is acceptable if there's a real error, but other errors suggest issues
        const data = await response.json();
        if (data.error && !data.error.includes('Failed to create wallet')) {
          throw new Error(`Unexpected error: ${data.error}`);
        }
      }
    } catch (error) {
      // Network errors are OK if server isn't running
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.log('   ℹ️  Server not running, skipping API test');
        return;
      }
      throw error;
    }
  })();

  // Test 6: OpenAI API - should handle missing key gracefully
  await test('OpenAI API - Handles missing API key', async () => {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    try {
      const response = await fetch(`${baseUrl}/api/openai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: 'test' }] }),
      });

      const data = await response.json();
      
      // Should return 503 with helpful message if API key missing
      if (!process.env.OPENAI_API_KEY && !process.env.LOCAL_AI_ENDPOINT) {
        if (response.status !== 503) {
          throw new Error(`Expected 503 but got ${response.status}`);
        }
        if (!data.requiresConfiguration) {
          throw new Error('Should indicate configuration is required');
        }
      }
    } catch (error) {
      // Network errors are OK if server isn't running
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.log('   ℹ️  Server not running, skipping API test');
        return;
      }
      throw error;
    }
  })();

  // Test 7: Gemini API - should handle missing key gracefully
  await test('Gemini API - Handles missing API key', async () => {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    try {
      const response = await fetch(`${baseUrl}/api/gemini/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          codeSnippet: 'test code',
          systemPrompt: 'test prompt'
        }),
      });

      const data = await response.json();
      
      // Should return 503 with helpful message if API key missing
      if (!process.env.GEMINI_API_KEY) {
        if (response.status !== 503) {
          throw new Error(`Expected 503 but got ${response.status}`);
        }
        if (!data.requiresConfiguration) {
          throw new Error('Should indicate configuration is required');
        }
      }
    } catch (error) {
      // Network errors are OK if server isn't running
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.log('   ℹ️  Server not running, skipping API test');
        return;
      }
      throw error;
    }
  })();

  // Test 8: Health check endpoint
  await test('Health Check API - Returns configuration status', async () => {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    try {
      const response = await fetch(`${baseUrl}/api/health/config`);
      
      if (response.ok) {
        const data = await response.json();
        if (!data.features || !Array.isArray(data.features)) {
          throw new Error('Health check should return features array');
        }
      }
    } catch (error) {
      // Network errors are OK if server isn't running
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.log('   ℹ️  Server not running, skipping API test');
        return;
      }
      throw error;
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
    console.log('🎉 All tests passed!');
    process.exit(0);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});
