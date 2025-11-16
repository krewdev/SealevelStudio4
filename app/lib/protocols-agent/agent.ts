/**
 * Protocols AI Agent
 * Assists users with bundler, market maker, and advertising bots
 */

import { ProtocolAgentContext, ProtocolAgentSuggestion, ProtocolAgentResponse } from './types';
import { SEAL_TOKEN_ECONOMICS } from '../seal-token/config';

/**
 * Generate AI response for protocol assistance
 */
export async function generateProtocolAgentResponse(
  userMessage: string,
  context: ProtocolAgentContext
): Promise<ProtocolAgentResponse> {
  const suggestions: ProtocolAgentSuggestion[] = [];
  let analysis = '';
  const warnings: string[] = [];
  
  // Detect intent
  const message = userMessage.toLowerCase();
  
  // Bundler suggestions
  if (message.includes('multi-send') || message.includes('bundler') || message.includes('send to multiple')) {
    suggestions.push({
      type: 'bundler',
      title: 'Multi-Send Transaction Bundler',
      description: 'Send SOL to up to 50 wallets in a single transaction. Automatically creates new accounts if needed.',
      action: {
        type: 'configure',
        parameters: {
          maxRecipients: 50,
          createAccounts: true,
        },
      },
      confidence: 0.9,
    });
    
    analysis = 'You can use the transaction bundler to send SOL to multiple wallets efficiently. ';
    analysis += `Cost: ${SEAL_TOKEN_ECONOMICS.pricing.bundler_multi_send} SEAL per transaction.`;
    
    if (context.isBetaTester) {
      const discount = SEAL_TOKEN_ECONOMICS.beta_tester.discount_percentage;
      const discountedCost = SEAL_TOKEN_ECONOMICS.pricing.bundler_multi_send * (1 - discount / 100);
      analysis += ` As a beta tester, you get ${discount}% off: ${discountedCost} SEAL.`;
    }
  }
  
  // Market maker suggestions
  if (message.includes('market maker') || message.includes('trading bot') || message.includes('automated trading')) {
    suggestions.push({
      type: 'market_maker',
      title: 'On-Chain Market Maker Agent',
      description: 'Autonomous agent with its own wallet that makes markets based on analytics. Supports grid, TWAP, DCA, and market making strategies.',
      action: {
        type: 'configure',
        parameters: {
          strategies: ['grid', 'twap', 'market_making', 'dca'],
          useAnalytics: true,
        },
      },
      confidence: 0.9,
    });
    
    analysis = 'The market maker agent operates autonomously with its own wallet. ';
    analysis += `Setup cost: ${SEAL_TOKEN_ECONOMICS.pricing.market_maker_setup} SEAL. `;
    analysis += `Monthly: ${SEAL_TOKEN_ECONOMICS.pricing.market_maker_monthly} SEAL. `;
    analysis += `Per trade: ${SEAL_TOKEN_ECONOMICS.pricing.market_maker_trade} SEAL.`;
    
    if (context.isBetaTester) {
      analysis += ` Beta testers get 1 free month and ${SEAL_TOKEN_ECONOMICS.beta_tester.discount_percentage}% discount.`;
    }
    
    warnings.push('Market maker requires initial funding for the agent wallet.');
  }
  
  // Advertising bot suggestions
  if (message.includes('advertising') || message.includes('telegram') || message.includes('twitter') || message.includes('promote')) {
    if (message.includes('telegram') || !message.includes('twitter')) {
      suggestions.push({
        type: 'advertising',
        title: 'Telegram Advertising Bot',
        description: 'Automatically post token information to Telegram channels. Customizable message templates and posting schedules.',
        action: {
          type: 'configure',
          parameters: {
            platform: 'telegram',
            interval: 60, // minutes
          },
        },
        confidence: 0.85,
      });
    }
    
    if (message.includes('twitter') || !message.includes('telegram')) {
      suggestions.push({
        type: 'advertising',
        title: 'Twitter/X Advertising Bot',
        description: 'Automatically post token information to Twitter/X. Customizable tweets with hashtags and scheduling.',
        action: {
          type: 'configure',
          parameters: {
            platform: 'twitter',
            interval: 60, // minutes
          },
        },
        confidence: 0.85,
      });
    }
    
    analysis = 'Advertising bots can help promote your token. ';
    analysis += `Telegram: ${SEAL_TOKEN_ECONOMICS.pricing.telegram_bot_setup} SEAL setup, ${SEAL_TOKEN_ECONOMICS.pricing.telegram_bot_monthly} SEAL/month. `;
    analysis += `Twitter: ${SEAL_TOKEN_ECONOMICS.pricing.twitter_bot_setup} SEAL setup, ${SEAL_TOKEN_ECONOMICS.pricing.twitter_bot_monthly} SEAL/month.`;
    
    warnings.push('⚠️ IMPORTANT: Spam violates platform ToS. Use responsibly and comply with rate limits.');
  }
  
  // Cost estimate
  let costEstimate;
  if (suggestions.length > 0) {
    const suggestion = suggestions[0];
    let baseCost = 0;
    
    if (suggestion.type === 'bundler') {
      baseCost = SEAL_TOKEN_ECONOMICS.pricing.bundler_multi_send;
    } else if (suggestion.type === 'market_maker') {
      baseCost = SEAL_TOKEN_ECONOMICS.pricing.market_maker_setup;
    } else if (suggestion.type === 'advertising') {
      const platform = suggestion.action?.parameters?.platform;
      baseCost = platform === 'telegram'
        ? SEAL_TOKEN_ECONOMICS.pricing.telegram_bot_setup
        : SEAL_TOKEN_ECONOMICS.pricing.twitter_bot_setup;
    }
    
    if (baseCost > 0) {
      const discount = context.isBetaTester
        ? SEAL_TOKEN_ECONOMICS.beta_tester.discount_percentage
        : 0;
      const finalCost = baseCost * (1 - discount / 100);
      
      costEstimate = {
        service: suggestion.title,
        sealCost: baseCost,
        discount: discount > 0 ? discount : undefined,
        finalCost,
      };
    }
  }
  
  // Check balance
  if (costEstimate && context.sealBalance < costEstimate.finalCost) {
    warnings.push(`Insufficient SEAL balance. Need ${costEstimate.finalCost} SEAL, have ${context.sealBalance} SEAL.`);
  }
  
  // Beta tester perks reminder
  if (context.isBetaTester && suggestions.length > 0) {
    analysis += `\n\n🎁 Beta Tester Perks: You received ${SEAL_TOKEN_ECONOMICS.beta_tester.airdrop_amount} SEAL airdrop and get ${SEAL_TOKEN_ECONOMICS.beta_tester.discount_percentage}% discount on all services!`;
  }
  
  return {
    suggestions,
    analysis,
    costEstimate,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Get service recommendations based on user needs
 */
export function getServiceRecommendations(context: ProtocolAgentContext): ProtocolAgentSuggestion[] {
  const recommendations: ProtocolAgentSuggestion[] = [];
  
  // Always suggest bundler for efficiency
  recommendations.push({
    type: 'bundler',
    title: 'Try Multi-Send Bundler',
    description: 'Save time and fees by sending SOL to multiple wallets in one transaction.',
    confidence: 0.8,
  });
  
  // Suggest market maker if user has tokens
  recommendations.push({
    type: 'market_maker',
    title: 'Automate Trading with Market Maker',
    description: 'Let an on-chain agent manage your token trading based on analytics.',
    confidence: 0.7,
  });
  
  // Suggest advertising for new tokens
  recommendations.push({
    type: 'advertising',
    title: 'Promote Your Token',
    description: 'Automatically post to Telegram and Twitter to reach more users.',
    confidence: 0.6,
  });
  
  return recommendations;
}

