// Configuration Health Check Endpoint
// Shows what environment variables are configured and what features are available

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface FeatureStatus {
  name: string;
  enabled: boolean;
  required: boolean;
  missingVars?: string[];
  optionalVars?: string[];
  message?: string;
}

export async function GET() {
  const features: FeatureStatus[] = [];

  // Core Application
  features.push({
    name: 'Core Application',
    enabled: !!process.env.NEXT_PUBLIC_APP_URL,
    required: true,
    missingVars: !process.env.NEXT_PUBLIC_APP_URL ? ['NEXT_PUBLIC_APP_URL'] : undefined,
    message: !process.env.NEXT_PUBLIC_APP_URL 
      ? 'Set NEXT_PUBLIC_APP_URL to your production domain'
      : 'Core application is configured',
  });

  // Solana RPC
  const hasRpc = !!(process.env.NEXT_PUBLIC_SOLANA_RPC_MAINNET || process.env.NEXT_PUBLIC_SOLANA_RPC_DEVNET);
  features.push({
    name: 'Solana RPC',
    enabled: hasRpc,
    required: false,
    optionalVars: ['NEXT_PUBLIC_SOLANA_RPC_MAINNET', 'NEXT_PUBLIC_SOLANA_RPC_DEVNET'],
    message: hasRpc 
      ? 'Using custom RPC endpoints (faster, higher rate limits)'
      : 'Using public RPC endpoints (slower, rate-limited)',
  });

  // AI Features
  const hasLocalAI = process.env.LOCAL_AI_ENABLED === 'true' && !!process.env.LOCAL_AI_ENDPOINT;
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasGemini = !!process.env.GEMINI_API_KEY;
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
  const hasAnyAI = hasLocalAI || hasOpenAI || hasGemini || hasAnthropic;

  features.push({
    name: 'AI Features',
    enabled: hasAnyAI,
    required: false,
    optionalVars: ['LOCAL_AI_ENDPOINT', 'OPENAI_API_KEY', 'GEMINI_API_KEY', 'ANTHROPIC_API_KEY'],
    message: hasAnyAI
      ? `AI enabled: ${[
          hasLocalAI && 'Local AI',
          hasOpenAI && 'OpenAI',
          hasGemini && 'Gemini',
          hasAnthropic && 'Anthropic',
        ].filter(Boolean).join(', ')}`
      : 'No AI provider configured. AI features will be disabled.',
  });

  // Enhanced RPC Features
  const hasHelius = !!process.env.HELIUS_API_KEY || !!process.env.NEXT_PUBLIC_HELIUS_API_KEY;
  features.push({
    name: 'Helius Enhanced RPC',
    enabled: hasHelius,
    required: false,
    optionalVars: ['HELIUS_API_KEY', 'NEXT_PUBLIC_HELIUS_API_KEY'],
    message: hasHelius
      ? 'Helius API enabled (faster RPC, DAS API access)'
      : 'Helius API not configured (using standard RPC)',
  });

  // Token Price Data
  const hasBirdeye = !!process.env.BIRDEYE_API_KEY || !!process.env.NEXT_PUBLIC_BIRDEYE_API_KEY;
  features.push({
    name: 'Token Price Data (Birdeye)',
    enabled: hasBirdeye,
    required: false,
    optionalVars: ['BIRDEYE_API_KEY', 'NEXT_PUBLIC_BIRDEYE_API_KEY'],
    message: hasBirdeye
      ? 'Birdeye API enabled (real-time token prices)'
      : 'Birdeye API not configured (price data may be limited)',
  });

  // Jupiter Swaps
  const hasJupiter = !!process.env.JUPITER_API_KEY;
  features.push({
    name: 'Jupiter Swaps',
    enabled: hasJupiter,
    required: false,
    optionalVars: ['JUPITER_API_KEY'],
    message: hasJupiter
      ? 'Jupiter API enabled (swap functionality)'
      : 'Jupiter API not configured (swaps may have rate limits)',
  });

  // Twitter Bot
  const hasTwitter = !!(process.env.TWITTER_CLIENT_ID && process.env.TWITTER_CLIENT_SECRET);
  features.push({
    name: 'Twitter Bot',
    enabled: hasTwitter,
    required: false,
    optionalVars: ['TWITTER_CLIENT_ID', 'TWITTER_CLIENT_SECRET', 'TWITTER_CALLBACK_URL'],
    message: hasTwitter
      ? 'Twitter bot enabled'
      : 'Twitter bot not configured (feature will be disabled)',
  });

  // Substack Bot
  const hasSubstack = !!process.env.SUBSTACK_API_KEY;
  features.push({
    name: 'Substack Bot',
    enabled: hasSubstack,
    required: false,
    optionalVars: ['SUBSTACK_API_KEY', 'SUBSTACK_PUBLICATION_ID'],
    message: hasSubstack
      ? 'Substack bot enabled'
      : 'Substack bot not configured (feature will be disabled)',
  });

  // Telegram Bot
  const hasTelegram = !!process.env.TELEGRAM_BOT_TOKEN;
  features.push({
    name: 'Telegram Bot',
    enabled: hasTelegram,
    required: false,
    optionalVars: ['TELEGRAM_BOT_TOKEN'],
    message: hasTelegram
      ? 'Telegram bot enabled'
      : 'Telegram bot not configured (feature will be disabled)',
  });

  // Attestation Features
  const hasAttestation = !!(process.env.NEXT_PUBLIC_ATTESTATION_PROGRAM_ID || 
                           process.env.NEXT_PUBLIC_BETA_TESTER_MERKLE_TREE);
  features.push({
    name: 'Attestation Features',
    enabled: hasAttestation,
    required: false,
    optionalVars: [
      'NEXT_PUBLIC_ATTESTATION_PROGRAM_ID',
      'NEXT_PUBLIC_BETA_TESTER_MERKLE_TREE',
      'NEXT_PUBLIC_ATTESTATION_MERKLE_TREE',
    ],
    message: hasAttestation
      ? 'Attestation features enabled'
      : 'Attestation features not configured (feature will be disabled)',
  });

  // Calculate overall status
  const requiredFeatures = features.filter(f => f.required);
  const allRequiredEnabled = requiredFeatures.every(f => f.enabled);
  const enabledCount = features.filter(f => f.enabled).length;
  const totalCount = features.length;

  return NextResponse.json({
    status: allRequiredEnabled ? 'healthy' : 'degraded',
    message: allRequiredEnabled
      ? 'All required features are configured'
      : 'Some required features are missing',
    summary: {
      enabled: enabledCount,
      total: totalCount,
      required: requiredFeatures.length,
      requiredEnabled: requiredFeatures.filter(f => f.enabled).length,
    },
    features,
    recommendations: generateRecommendations(features),
  });
}

function generateRecommendations(features: FeatureStatus[]): string[] {
  const recommendations: string[] = [];

  const missingRequired = features.filter(f => f.required && !f.enabled);
  if (missingRequired.length > 0) {
    recommendations.push(
      `⚠️ Required: Configure ${missingRequired.map(f => f.name).join(', ')}`
    );
  }

  const disabledImportant = features.filter(
    f => !f.required && !f.enabled && 
    ['AI Features', 'Solana RPC', 'Helius Enhanced RPC'].includes(f.name)
  );
  if (disabledImportant.length > 0) {
    recommendations.push(
      `💡 Recommended: Enable ${disabledImportant.map(f => f.name).join(', ')} for better performance`
    );
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ Configuration looks good!');
  }

  return recommendations;
}

