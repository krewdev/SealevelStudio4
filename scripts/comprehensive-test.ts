#!/usr/bin/env ts-node

/**
 * Comprehensive Test Suite for Sealevel Studio
 * Tests all features, API endpoints, and integrations
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';


/**
 * Extract URLs from any text using regex.
 * This will match http, https URLs appearing in the file.
 */
function extractUrlsFromText(text: string): string[] {
  // This is a loose regex for matching URLs. You may refine as needed.
  const urlRegex = /\bhttps?:\/\/[^\s'")]+/g;
  return text.match(urlRegex) || [];
}

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
  } catch (error) {
    results.push({
      category,
      feature,
      status: 'fail',
      message: error instanceof Error ? error.message : String(error),
    });
    failedTests++;
    console.log(`❌ [${category}] ${feature}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function readFile(filePath: string): string {
  try {
    return readFileSync(filePath, 'utf-8');
  } catch {
    return '';
  }
}

function fileExists(filePath: string): boolean {
  return existsSync(filePath);
}

console.log('🧪 Sealevel Studio Comprehensive Test Suite\n');
console.log('=' .repeat(60));

// ============================================================================
// 1. LANDING PAGE & MULTI-CHAIN SUPPORT
// ============================================================================
console.log('\n📄 1. Landing Page & Multi-Chain Support\n');

test('Landing Page', 'Component exists', () => {
  return fileExists(join(process.cwd(), 'app/components/LandingPage.tsx'));
});

test('Landing Page', 'Blockchain selector exists', () => {
  const content = readFile(join(process.cwd(), 'app/components/LandingPage.tsx'));
  return content.includes('BLOCKCHAINS') && content.includes('selectedBlockchain');
});

test('Landing Page', 'Polkadot support', () => {
  const content = readFile(join(process.cwd(), 'app/components/LandingPage.tsx'));
  return content.includes("id: 'polkadot'") && content.includes('Polkadot');
});

test('Landing Page', 'Solana support', () => {
  const content = readFile(join(process.cwd(), 'app/components/LandingPage.tsx'));
  return content.includes("id: 'solana'") && content.includes('Solana');
});

test('Landing Page', 'All buttons have type="button"', () => {
  const content = readFile(join(process.cwd(), 'app/components/LandingPage.tsx'));
  const buttonMatches = content.match(/<button/g) || [];
  const typeButtonMatches = content.match(/type="button"/g) || [];
  return buttonMatches.length === typeButtonMatches.length;
});

test('Landing Page', 'onGetStarted callback accepts blockchain parameter', () => {
  const content = readFile(join(process.cwd(), 'app/components/LandingPage.tsx'));
  return content.includes('onGetStarted: (blockchain?: BlockchainType)');
});

// ============================================================================
// 2. PRICE TRACKING & CHARTS
// ============================================================================
console.log('\n📊 2. Price Tracking & Charts\n');

test('Price API', 'Price API route exists', () => {
  return fileExists(join(process.cwd(), 'app/api/prices/route.ts'));
});

test('Price API', 'Supports SOL token', () => {
  const content = readFile(join(process.cwd(), 'app/api/prices/route.ts'));
  return content.includes("'sol'") && content.includes('solana');
});

test('Price API', 'Supports DOT token', () => {
  const content = readFile(join(process.cwd(), 'app/api/prices/route.ts'));
  return content.includes("'dot'") && content.includes('polkadot');
});

test('Price API', 'CoinGecko integration', () => {
  const content = readFile(join(process.cwd(), 'app/api/prices/route.ts'));
  // Extract URLs from the content
  const urls = extractUrlsFromText(content);
  // Check if any of the parsed URLs have host ending with 'coingecko.com'
  const hasCoinGeckoReference = urls.some(urlStr => {
    try {
      const parsed = new URL(urlStr);
      // CoinGecko host can be 'coingecko.com', 'www.coingecko.com', etc.
      return parsed.hostname === 'coingecko.com' || parsed.hostname.endsWith('.coingecko.com');
    } catch {
      return false;
    }
  });
  // Fallback: Also check for direct API variable usage (in case integration is via env var)
  return hasCoinGeckoReference || content.includes('COINGECKO_API');
});

test('Price API', 'Birdeye fallback for Solana', () => {
  const content = readFile(join(process.cwd(), 'app/api/prices/route.ts'));
  return content.includes('birdeye') && content.includes('isSolana');
});

test('Charts View', 'Component exists', () => {
  return fileExists(join(process.cwd(), 'app/components/ChartsView.tsx'));
});

test('Charts View', 'Token selector (SOL/DOT)', () => {
  const content = readFile(join(process.cwd(), 'app/components/ChartsView.tsx'));
  return content.includes('selectedToken') && content.includes("'sol' | 'dot'");
});

test('Charts View', 'Timeframe selector', () => {
  const content = readFile(join(process.cwd(), 'app/components/ChartsView.tsx'));
  return content.includes('timeframe') && content.includes("'1h' | '24h' | '7d' | '30d'");
});

test('Charts View', 'Real-time price fetching', () => {
  const content = readFile(join(process.cwd(), 'app/components/ChartsView.tsx'));
  return content.includes('/api/prices') && content.includes('fetchPriceData');
});

test('Price Chart', 'Component exists', () => {
  return fileExists(join(process.cwd(), 'app/components/charts/PriceChart.tsx'));
});

test('Price Chart', 'Uses Recharts library', () => {
  const content = readFile(join(process.cwd(), 'app/components/charts/PriceChart.tsx'));
  return content.includes('recharts') && (content.includes('LineChart') || content.includes('AreaChart'));
});

// ============================================================================
// 3. SOCIAL BOTS (TWITTER, SUBSTACK, TELEGRAM)
// ============================================================================
console.log('\n🤖 3. Social Bots\n');

test('Twitter Bot', 'Component exists', () => {
  return fileExists(join(process.cwd(), 'app/components/TwitterBot.tsx'));
});

test('Twitter Bot', 'OAuth authentication', () => {
  const content = readFile(join(process.cwd(), 'app/components/TwitterBot.tsx'));
  return content.includes('checkAuthStatus') && content.includes('handleLogin');
});

test('Twitter Bot', 'Autonomous agent', () => {
  const content = readFile(join(process.cwd(), 'app/components/TwitterBot.tsx'));
  return content.includes('agentRunning') && content.includes('handleStartAgent');
});

test('Twitter API', 'Auth initiate route', () => {
  return fileExists(join(process.cwd(), 'app/api/twitter/auth/initiate/route.ts'));
});

test('Twitter API', 'Auth callback route', () => {
  return fileExists(join(process.cwd(), 'app/api/twitter/auth/callback/route.ts'));
});

test('Twitter API', 'Agent route', () => {
  return fileExists(join(process.cwd(), 'app/api/twitter/agent/route.ts'));
});

test('Substack Bot', 'Component exists', () => {
  return fileExists(join(process.cwd(), 'app/components/SubstackBot.tsx'));
});

test('Substack Bot', 'Autonomous agent', () => {
  const content = readFile(join(process.cwd(), 'app/components/SubstackBot.tsx'));
  return content.includes('agentRunning') && content.includes('handleStartAgent');
});

test('Substack API', 'Auth route', () => {
  return fileExists(join(process.cwd(), 'app/api/substack/auth/route.ts'));
});

test('Substack API', 'Agent route', () => {
  return fileExists(join(process.cwd(), 'app/api/substack/agent/route.ts'));
});

test('Telegram Bot', 'Component exists', () => {
  return fileExists(join(process.cwd(), 'app/components/TelegramBot.tsx'));
});

test('Telegram Bot', 'Bot token authentication', () => {
  const content = readFile(join(process.cwd(), 'app/components/TelegramBot.tsx'));
  return content.includes('botToken') && content.includes('handleLogin');
});

test('Telegram Bot', 'Autonomous agent', () => {
  const content = readFile(join(process.cwd(), 'app/components/TelegramBot.tsx'));
  return content.includes('agentRunning') && content.includes('handleStartAgent');
});

test('Telegram API', 'Auth route', () => {
  return fileExists(join(process.cwd(), 'app/api/telegram/auth/route.ts'));
});

test('Telegram API', 'Agent route', () => {
  return fileExists(join(process.cwd(), 'app/api/telegram/agent/route.ts'));
});

// ============================================================================
// 4. CORE COMPONENTS
// ============================================================================
console.log('\n🔧 4. Core Components\n');

test('Transaction Builder', 'Component exists', () => {
  return fileExists(join(process.cwd(), 'app/components/UnifiedTransactionBuilder.tsx'));
});

test('Transaction Builder', 'Token image upload', () => {
  const content = readFile(join(process.cwd(), 'app/components/UnifiedTransactionBuilder.tsx'));
  return content.includes('tokenImage') && content.includes('isImageField');
});

test('Transaction Builder', 'Flash loan support', () => {
  const content = readFile(join(process.cwd(), 'app/components/UnifiedTransactionBuilder.tsx'));
  return content.includes('flash') || content.includes('Flash');
});

test('Arbitrage Scanner', 'Component exists', () => {
  return fileExists(join(process.cwd(), 'app/components/ArbitrageScanner.tsx'));
});

test('Arbitrage Scanner', 'Pool scanning integration', () => {
  const content = readFile(join(process.cwd(), 'app/components/ArbitrageScanner.tsx'));
  return content.includes('PoolScanner') || content.includes('scan');
});

test('AI Cyber Playground', 'Component exists', () => {
  return fileExists(join(process.cwd(), 'app/components/AICyberPlayground.tsx'));
});

test('AI Cyber Playground', 'Arbitrage detection', () => {
  const content = readFile(join(process.cwd(), 'app/components/AICyberPlayground.tsx'));
  return content.includes('ArbitrageDetector') && content.includes('detectOpportunities');
});

test('AI Cyber Playground', 'Markdown rendering', () => {
  const content = readFile(join(process.cwd(), 'app/components/AICyberPlayground.tsx'));
  return content.includes('ReactMarkdown') || content.includes('react-markdown');
});

test('R&D Console', 'Component exists', () => {
  return fileExists(join(process.cwd(), 'app/components/AdvancedR&DConsole.tsx'));
});

test('R&D Console', 'Draggable functionality', () => {
  const content = readFile(join(process.cwd(), 'app/components/AdvancedR&DConsole.tsx'));
  return content.includes('isDragging') && content.includes('handleMouseDown');
});

// ============================================================================
// 5. TOOLS & UTILITIES
// ============================================================================
console.log('\n🛠️  5. Tools & Utilities\n');

test('Rent Reclaimer', 'Component exists', () => {
  return fileExists(join(process.cwd(), 'app/components/RentReclaimer.tsx'));
});

test('Rent Reclaimer', 'Close account instruction', () => {
  const content = readFile(join(process.cwd(), 'app/components/RentReclaimer.tsx'));
  return content.includes('createCloseAccountInstruction') || content.includes('closeAccount');
});

test('Devnet Faucet', 'Component exists', () => {
  return fileExists(join(process.cwd(), 'app/components/DevnetFaucet.tsx'));
});

test('Devnet Faucet', 'Airdrop functionality', () => {
  const content = readFile(join(process.cwd(), 'app/components/DevnetFaucet.tsx'));
  return content.includes('requestAirdrop') || content.includes('airdrop');
});

test('Tools Hub', 'Component exists', () => {
  return fileExists(join(process.cwd(), 'app/components/ToolsHub.tsx'));
});

// ============================================================================
// 6. ATTESTATION SYSTEM
// ============================================================================
console.log('\n🛡️  6. Attestation System\n');

test('VeriSol Attestation', 'Component exists', () => {
  return fileExists(join(process.cwd(), 'app/components/VeriSolAttestation.tsx'));
});

test('VeriSol Attestation', 'Tier system (10, 50, 250)', () => {
  const content = readFile(join(process.cwd(), 'app/components/VeriSolAttestation.tsx'));
  return content.includes('tier') && (content.includes('10') || content.includes('50') || content.includes('250'));
});

test('Attestation Program', 'Rust program exists', () => {
  return fileExists(join(process.cwd(), 'programs/attestation-program/programs/attestation-program/src/lib.rs'));
});

test('Attestation Client', 'TypeScript client exists', () => {
  return fileExists(join(process.cwd(), 'app/lib/attestation/client.ts'));
});

test('Attestation API', 'Check route exists', () => {
  return fileExists(join(process.cwd(), 'app/api/verisol/check/route.ts'));
});

// ============================================================================
// 7. API ENDPOINTS
// ============================================================================
console.log('\n🌐 7. API Endpoints\n');

test('Solana Program API', 'Accounts route', () => {
  return fileExists(join(process.cwd(), 'app/api/solana/program/accounts/route.ts'));
});

test('Solana Program API', 'PDA route', () => {
  return fileExists(join(process.cwd(), 'app/api/solana/program/pda/route.ts'));
});

test('Solana Program API', 'Decode route', () => {
  return fileExists(join(process.cwd(), 'app/api/solana/program/decode/route.ts'));
});

test('Birdeye API', 'Prices route', () => {
  return fileExists(join(process.cwd(), 'app/api/birdeye/prices/route.ts'));
});

test('Jupiter API', 'Quote route', () => {
  return fileExists(join(process.cwd(), 'app/api/jupiter/quote/route.ts'));
});

test('Jupiter API', 'Swap route', () => {
  return fileExists(join(process.cwd(), 'app/api/jupiter/swap/route.ts'));
});

// ============================================================================
// 8. NAVIGATION & ROUTING
// ============================================================================
console.log('\n🧭 8. Navigation & Routing\n');

test('Main App', 'Page component exists', () => {
  return fileExists(join(process.cwd(), 'app/page.tsx'));
});

test('Main App', 'Blockchain state management', () => {
  const content = readFile(join(process.cwd(), 'app/page.tsx'));
  return content.includes('selectedBlockchain') && content.includes('BlockchainType');
});

test('Main App', 'Social bots in navigation', () => {
  const content = readFile(join(process.cwd(), 'app/page.tsx'));
  return content.includes('twitter-bot') && content.includes('substack-bot') && content.includes('telegram-bot');
});

test('Main App', 'Charts in navigation', () => {
  const content = readFile(join(process.cwd(), 'app/page.tsx'));
  return content.includes('charts') && content.includes('ChartsView');
});

test('Main App', 'Tools in navigation', () => {
  const content = readFile(join(process.cwd(), 'app/page.tsx'));
  return content.includes('rent-reclaimer') && content.includes('faucet');
});

// ============================================================================
// 9. LIBRARIES & UTILITIES
// ============================================================================
console.log('\n📚 9. Libraries & Utilities\n');

test('Lending Protocols', 'Protocol definitions exist', () => {
  return fileExists(join(process.cwd(), 'app/lib/lending/protocols.ts'));
});

test('Lending Protocols', 'Flash loan stack manager', () => {
  return fileExists(join(process.cwd(), 'app/lib/lending/flash-loan-stack.ts'));
});

test('Pool Scanner', 'Scanner exists', () => {
  return fileExists(join(process.cwd(), 'app/lib/pools/scanner.ts'));
});

test('Pool Scanner', 'Birdeye fetcher integration', () => {
  const content = readFile(join(process.cwd(), 'app/lib/pools/scanner.ts'));
  return content.includes('BirdeyeFetcher') || content.includes('birdeye');
});

test('Arbitrage Detector', 'Detector exists', () => {
  return fileExists(join(process.cwd(), 'app/lib/pools/arbitrage.ts'));
});

// ============================================================================
// 10. CONFIGURATION & ENVIRONMENT
// ============================================================================
console.log('\n⚙️  10. Configuration & Environment\n');

test('Environment Template', 'File exists', () => {
  return fileExists(join(process.cwd(), 'env.template'));
});

test('Environment Template', 'Twitter credentials', () => {
  const content = readFile(join(process.cwd(), 'env.template'));
  return content.includes('TWITTER_CLIENT_ID') && content.includes('TWITTER_CLIENT_SECRET');
});

test('Environment Template', 'Substack credentials', () => {
  const content = readFile(join(process.cwd(), 'env.template'));
  return content.includes('SUBSTACK_API_KEY') && content.includes('SUBSTACK_PUBLICATION_ID');
});

test('Environment Template', 'Telegram credentials', () => {
  const content = readFile(join(process.cwd(), 'env.template'));
  return content.includes('TELEGRAM_BOT_TOKEN');
});

test('Environment Template', 'Attestation program ID', () => {
  const content = readFile(join(process.cwd(), 'env.template'));
  return content.includes('ATTESTATION_PROGRAM_ID');
});

// ============================================================================
// SUMMARY
// ============================================================================
console.log('\n' + '='.repeat(60));
console.log('\n📊 Test Summary\n');

const categories = Array.from(new Set(results.map(r => r.category)));
for (const category of categories) {
  const categoryResults = results.filter(r => r.category === category);
  const passed = categoryResults.filter(r => r.status === 'pass').length;
  const failed = categoryResults.filter(r => r.status === 'fail').length;
  const warnings = categoryResults.filter(r => r.status === 'warning').length;
  console.log(`\n${category}:`);
  console.log(`  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  ⚠️  Warnings: ${warnings}`);
}

console.log(`\n📈 Overall Statistics:`);
console.log(`  Total Tests: ${totalTests}`);
console.log(`  ✅ Passed: ${passedTests} (${((passedTests / totalTests) * 100).toFixed(1)}%)`);
console.log(`  ❌ Failed: ${failedTests} (${((failedTests / totalTests) * 100).toFixed(1)}%)`);
console.log(`  ⚠️  Warnings: ${warningTests} (${((warningTests / totalTests) * 100).toFixed(1)}%)`);

if (failedTests > 0) {
  console.log('\n❌ Failed Tests:');
  results.filter(r => r.status === 'fail').forEach(r => {
    console.log(`   - [${r.category}] ${r.feature}: ${r.message}`);
  });
}

if (warningTests > 0) {
  console.log('\n⚠️  Warnings:');
  results.filter(r => r.status === 'warning').forEach(r => {
    console.log(`   - [${r.category}] ${r.feature}: ${r.message}`);
  });
}

console.log('\n' + '='.repeat(60));

// Exit with appropriate code
process.exit(failedTests > 0 ? 1 : 0);

