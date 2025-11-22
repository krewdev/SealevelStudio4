#!/usr/bin/env ts-node
/**
 * Social Media Bots Functionality Test
 *
 * Tests the actual API endpoints and functionality of:
 * - Twitter Bot (OAuth 2.0, Agent Control)
 * - Telegram Bot (Bot Token Auth, Agent Control)
 * - Substack Bot (API Key Auth, Agent Control)
 *
 * This script tests both success and error scenarios
 */

import fetch from 'node-fetch';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

interface TestResult {
  service: string;
  test: string;
  status: 'pass' | 'fail' | 'skip';
  message: string;
  response?: any;
}

const results: TestResult[] = [];

async function runTest(service: string, testName: string, testFn: () => Promise<any>): Promise<void> {
  console.log(`🔄 Testing ${service} ${testName}...`);

  try {
    const result = await testFn();

    if (typeof result === 'boolean') {
      results.push({
        service,
        test: testName,
        status: result ? 'pass' : 'fail',
        message: result ? 'OK' : 'Test returned false'
      });
      console.log(`${result ? '✅' : '❌'} ${service} ${testName}: ${result ? 'OK' : 'Test returned false'}`);
    } else if (typeof result === 'string') {
      results.push({
        service,
        test: testName,
        status: 'fail',
        message: result
      });
      console.log(`❌ ${service} ${testName}: ${result}`);
    } else if (result && typeof result === 'object' && 'pass' in result) {
      results.push({
        service,
        test: testName,
        status: result.pass ? 'pass' : 'fail',
        message: result.message || (result.pass ? 'OK' : 'Test failed'),
        response: result.response
      });
      console.log(`${result.pass ? '✅' : '❌'} ${service} ${testName}: ${result.message || (result.pass ? 'OK' : 'Test failed')}`);
    }
  } catch (error) {
    results.push({
      service,
      test: testName,
      status: 'fail',
      message: error instanceof Error ? error.message : String(error),
    });
    console.log(`❌ ${service} ${testName}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function test(service: string, testName: string, testFn: () => Promise<boolean | string | { pass: boolean; message?: string; response?: any }>): void {
  testFn().then(result => {
    if (typeof result === 'boolean') {
      results.push({
        service,
        test: testName,
        status: result ? 'pass' : 'fail',
        message: result ? 'OK' : 'Test returned false'
      });
    } else if (typeof result === 'string') {
      results.push({
        service,
        test: testName,
        status: 'fail',
        message: result
      });
    } else if (result && typeof result === 'object' && 'pass' in result) {
      results.push({
        service,
        test: testName,
        status: result.pass ? 'pass' : 'fail',
        message: result.message || (result.pass ? 'OK' : 'Test failed'),
        response: result.response
      });
    }
  }).catch(error => {
    results.push({
      service,
      test: testName,
      status: 'fail',
      message: error instanceof Error ? error.message : String(error)
    });
  });
}

async function makeRequest(url: string, options: any = {}): Promise<any> {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json().catch(() => null);
    return {
      ok: response.ok,
      status: response.status,
      data,
      headers: Object.fromEntries(response.headers.entries()),
    };
  } catch (error) {
    throw new Error(`Network error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// ============================================================================
// TWITTER BOT TESTS
// ============================================================================

async function testTwitterAuthInitiate() {
  console.log('🔄 Testing Twitter OAuth initiation...');

  try {
    const result = await makeRequest(`${BASE_URL}/api/twitter/auth/initiate`, {
      method: 'POST',
    });

    if (!result.ok) {
      if (result.status === 500 && result.data?.error?.includes('credentials not configured')) {
        return { pass: true, message: 'Correctly handles missing credentials', response: result };
      }
      return { pass: false, message: `Unexpected error: ${result.data?.error}`, response: result };
    }

    // Check if response has expected OAuth fields
    const hasAuthUrl = result.data?.authUrl;
    const hasState = result.data?.state;
    const hasCodeVerifier = result.data?.codeVerifier;

    if (hasAuthUrl && hasState && hasCodeVerifier) {
      return { pass: true, message: 'OAuth initiation successful', response: result };
    } else {
      return { pass: false, message: 'Missing OAuth response fields', response: result };
    }
  } catch (error) {
    return { pass: false, message: error instanceof Error ? error.message : String(error) };
  }
}

async function testTwitterAgentStatus() {
  console.log('🔄 Testing Twitter agent status...');

  try {
    const result = await makeRequest(`${BASE_URL}/api/twitter/agent?userId=test`);

    if (!result.ok) {
      return { pass: false, message: `HTTP ${result.status}: ${result.data?.error}`, response: result };
    }

    const hasExpectedFields = 'isRunning' in result.data && 'activities' in result.data;
    if (hasExpectedFields) {
      return { pass: true, message: 'Agent status retrieved successfully', response: result };
    } else {
      return { pass: false, message: 'Missing expected fields in response', response: result };
    }
  } catch (error) {
    return { pass: false, message: error instanceof Error ? error.message : String(error) };
  }
}

async function testTwitterAgentStartWithoutAuth() {
  console.log('🔄 Testing Twitter agent start without auth...');

  try {
    const result = await makeRequest(`${BASE_URL}/api/twitter/agent?action=start&userId=test`, {
      method: 'POST',
    });

    if (result.status === 401 && result.data?.error === 'Not authenticated') {
      return { pass: true, message: 'Correctly requires authentication', response: result };
    } else {
      return { pass: false, message: 'Should require authentication', response: result };
    }
  } catch (error) {
    return { pass: false, message: error instanceof Error ? error.message : String(error) };
  }
}

// ============================================================================
// TELEGRAM BOT TESTS
// ============================================================================

async function testTelegramAuthCheck() {
  console.log('🔄 Testing Telegram auth check...');

  try {
    const result = await makeRequest(`${BASE_URL}/api/telegram/auth`);

    if (!result.ok) {
      return { pass: false, message: `HTTP ${result.status}: ${result.data?.error}`, response: result };
    }

    const hasExpectedFields = 'authenticated' in result.data;
    if (hasExpectedFields) {
      return { pass: true, message: 'Auth check successful', response: result };
    } else {
      return { pass: false, message: 'Missing expected fields in response', response: result };
    }
  } catch (error) {
    return { pass: false, message: error instanceof Error ? error.message : String(error) };
  }
}

async function testTelegramAuthWithInvalidToken() {
  console.log('🔄 Testing Telegram auth with invalid token...');

  try {
    const result = await makeRequest(`${BASE_URL}/api/telegram/auth`, {
      method: 'POST',
      body: JSON.stringify({ botToken: 'invalid_token' }),
    });

    if (result.status === 401 && result.data?.error) {
      return { pass: true, message: 'Correctly rejects invalid token', response: result };
    } else {
      return { pass: false, message: 'Should reject invalid token', response: result };
    }
  } catch (error) {
    return { pass: false, message: error instanceof Error ? error.message : String(error) };
  }
}

async function testTelegramAuthWithoutToken() {
  console.log('🔄 Testing Telegram auth without token...');

  try {
    const result = await makeRequest(`${BASE_URL}/api/telegram/auth`, {
      method: 'POST',
      body: JSON.stringify({}),
    });

    if (result.status === 400 && result.data?.error?.includes('bot token is required')) {
      return { pass: true, message: 'Correctly requires token', response: result };
    } else {
      return { pass: false, message: 'Should require token', response: result };
    }
  } catch (error) {
    return { pass: false, message: error instanceof Error ? error.message : String(error) };
  }
}

async function testTelegramAgentStatus() {
  console.log('🔄 Testing Telegram agent status...');

  try {
    const result = await makeRequest(`${BASE_URL}/api/telegram/agent?userId=test`);

    if (!result.ok) {
      return { pass: false, message: `HTTP ${result.status}: ${result.data?.error}`, response: result };
    }

    const hasExpectedFields = 'isRunning' in result.data && 'activities' in result.data;
    if (hasExpectedFields) {
      return { pass: true, message: 'Agent status retrieved successfully', response: result };
    } else {
      return { pass: false, message: 'Missing expected fields in response', response: result };
    }
  } catch (error) {
    return { pass: false, message: error instanceof Error ? error.message : String(error) };
  }
}

// ============================================================================
// SUBSTACK BOT TESTS
// ============================================================================

async function testSubstackAuthCheck() {
  console.log('🔄 Testing Substack auth check...');

  try {
    const result = await makeRequest(`${BASE_URL}/api/substack/auth`);

    if (!result.ok) {
      return { pass: false, message: `HTTP ${result.status}: ${result.data?.error}`, response: result };
    }

    const hasExpectedFields = 'authenticated' in result.data;
    if (hasExpectedFields) {
      return { pass: true, message: 'Auth check successful', response: result };
    } else {
      return { pass: false, message: 'Missing expected fields in response', response: result };
    }
  } catch (error) {
    return { pass: false, message: error instanceof Error ? error.message : String(error) };
  }
}

async function testSubstackAuthWithoutCredentials() {
  console.log('🔄 Testing Substack auth without credentials...');

  try {
    const result = await makeRequest(`${BASE_URL}/api/substack/auth`, {
      method: 'POST',
      body: JSON.stringify({}),
    });

    if (result.status === 400 && result.data?.error?.includes('credentials required')) {
      return { pass: true, message: 'Correctly requires credentials', response: result };
    } else {
      return { pass: false, message: 'Should require credentials', response: result };
    }
  } catch (error) {
    return { pass: false, message: error instanceof Error ? error.message : String(error) };
  }
}

async function testSubstackAgentStatus() {
  console.log('🔄 Testing Substack agent status...');

  try {
    const result = await makeRequest(`${BASE_URL}/api/substack/agent?userId=test`);

    if (!result.ok) {
      return { pass: false, message: `HTTP ${result.status}: ${result.data?.error}`, response: result };
    }

    const hasExpectedFields = 'isRunning' in result.data && 'activities' in result.data;
    if (hasExpectedFields) {
      return { pass: true, message: 'Agent status retrieved successfully', response: result };
    } else {
      return { pass: false, message: 'Missing expected fields in response', response: result };
    }
  } catch (error) {
    return { pass: false, message: error instanceof Error ? error.message : String(error) };
  }
}

// ============================================================================
// RUN ALL TESTS
// ============================================================================

async function runTests() {
  console.log('🤖 Social Media Bots Functionality Test\n');
  console.log('=' .repeat(60));
  console.log(`Testing against: ${BASE_URL}`);
  console.log('='.repeat(60));

  // Twitter Tests
  console.log('\n🐦 TWITTER BOT TESTS\n');
  await runTest('Twitter', 'OAuth Initiation', testTwitterAuthInitiate);
  await runTest('Twitter', 'Agent Status Check', testTwitterAgentStatus);
  await runTest('Twitter', 'Agent Start Without Auth', testTwitterAgentStartWithoutAuth);

  // Telegram Tests
  console.log('\n✈️ TELEGRAM BOT TESTS\n');
  await runTest('Telegram', 'Auth Status Check', testTelegramAuthCheck);
  await runTest('Telegram', 'Auth With Invalid Token', testTelegramAuthWithInvalidToken);
  await runTest('Telegram', 'Auth Without Token', testTelegramAuthWithoutToken);
  await runTest('Telegram', 'Agent Status Check', testTelegramAgentStatus);

  // Substack Tests
  console.log('\n📝 SUBSTACK BOT TESTS\n');
  await runTest('Substack', 'Auth Status Check', testSubstackAuthCheck);
  await runTest('Substack', 'Auth Without Credentials', testSubstackAuthWithoutCredentials);
  await runTest('Substack', 'Agent Status Check', testSubstackAgentStatus);

  // ============================================================================
  // RESULTS SUMMARY
  // ============================================================================

  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Test Results Summary\n');

  const services = Array.from(new Set(results.map(r => r.service)));
  for (const service of services) {
    const serviceResults = results.filter(r => r.service === service);
    const passed = serviceResults.filter(r => r.status === 'pass').length;
    const failed = serviceResults.filter(r => r.status === 'fail').length;
    const total = serviceResults.length;

    console.log(`\n${service}:`);
    console.log(`  ✅ Passed: ${passed}/${total} (${((passed / total) * 100).toFixed(1)}%)`);
    console.log(`  ❌ Failed: ${failed}/${total}`);

    if (failed > 0) {
      console.log('  Failed tests:');
      serviceResults.filter(r => r.status === 'fail').forEach(r => {
        console.log(`    - ${r.test}: ${r.message}`);
      });
    }
  }

  const totalPassed = results.filter(r => r.status === 'pass').length;
  const totalFailed = results.filter(r => r.status === 'fail').length;
  const totalTests = results.length;

  console.log(`\n📈 Overall Statistics:`);
  console.log(`  Total Tests: ${totalTests}`);
  console.log(`  ✅ Passed: ${totalPassed} (${((totalPassed / totalTests) * 100).toFixed(1)}%)`);
  console.log(`  ❌ Failed: ${totalFailed} (${((totalFailed / totalTests) * 100).toFixed(1)}%)`);

  if (totalFailed > 0) {
    console.log('\n❌ Failed Tests Details:');
    results.filter(r => r.status === 'fail').forEach(r => {
      console.log(`   - [${r.service}] ${r.test}: ${r.message}`);
      if (r.response) {
        console.log(`     Response: ${JSON.stringify(r.response, null, 2)}`);
      }
    });
  }

  console.log('\n💡 Recommendations:');
  console.log('  - Set up API credentials in environment variables for full functionality testing');
  console.log('  - Test with real social media accounts in staging environment');
  console.log('  - Monitor rate limits and implement proper error handling');

  console.log('\n' + '='.repeat(60));

  // Exit with appropriate code
  process.exit(totalFailed > 0 ? 1 : 0);
}

if (require.main === module) {
  runTests().catch((error) => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

export { runTests };
