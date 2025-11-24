/**
 * AI-Powered Pump.fun Token Analysis
 * Analyzes new token launches for sniping opportunities
 */

import { z } from 'zod';
import { PumpFunToken } from './stream';

/**
 * Sniping Analysis Result Schema
 */
export const SnipingAnalysisSchema = z.object({
  shouldSnipe: z.boolean().describe('Whether to snipe this token based on AI analysis'),
  confidence: z.number().min(0).max(100).describe('Confidence level (0-100)'),
  riskLevel: z.enum(['low', 'medium', 'high', 'very_high']).describe('Risk assessment'),
  expectedProfit: z.number().optional().describe('Expected profit potential in SOL'),
  maxInvestment: z.number().optional().describe('Recommended maximum investment in SOL'),
  reasons: z.array(z.string()).describe('Reasons for snipe decision'),
  warnings: z.array(z.string()).describe('Warnings or red flags'),
  metrics: z.object({
    creatorReputation: z.enum(['unknown', 'new', 'suspicious', 'verified', 'trusted']).optional(),
    tokenomicsScore: z.number().min(0).max(100).optional(),
    liquidityScore: z.number().min(0).max(100).optional(),
    socialScore: z.number().min(0).max(100).optional(),
    technicalScore: z.number().min(0).max(100).optional(),
  }).optional(),
  timing: z.object({
    urgency: z.enum(['immediate', 'soon', 'wait', 'skip']).describe('When to execute snipe'),
    optimalEntryPrice: z.number().optional().describe('Optimal entry price in SOL'),
    exitStrategy: z.string().optional().describe('Recommended exit strategy'),
  }).optional(),
});

export type SnipingAnalysis = z.infer<typeof SnipingAnalysisSchema>;

/**
 * Generate AI analysis prompt for token sniping
 */
export function getSnipingAnalysisPrompt(token: PumpFunToken, marketContext?: any): string {
  return `Analyze this new token launch on pump.fun for sniping opportunities:

Token Information:
- Name: ${token.name}
- Symbol: ${token.symbol}
- Mint: ${token.mint}
- Creator: ${token.creator}
- Created: ${new Date(token.createdAt).toISOString()}

Market Data:
- Current Price: ${token.price} SOL
- Market Cap: ${token.marketCap} SOL
- 24h Volume: ${token.volume24h} SOL
- 24h Price Change: ${token.priceChange24h}%
- Holders: ${token.holders}
- Liquidity: ${token.liquidity} SOL
- Bonding Curve Progress: ${token.bondingCurveProgress}%

${token.socialLinks ? `Social Links:
- Twitter: ${token.socialLinks.twitter || 'N/A'}
- Telegram: ${token.socialLinks.telegram || 'N/A'}
- Website: ${token.socialLinks.website || 'N/A'}
` : ''}

${marketContext ? `Market Context:
- Recent similar launches performance
- Current market sentiment
- Trending tokens
` : ''}

Analysis Requirements:
1. Assess if this token is worth sniping (early entry)
2. Evaluate risk factors (rug pull potential, creator reputation, tokenomics)
3. Calculate expected profit potential
4. Determine optimal entry timing and price
5. Identify any red flags or warnings
6. Provide confidence level (0-100)

Consider:
- Token name/symbol quality and branding
- Creator wallet history and reputation
- Initial liquidity and market cap
- Social media presence and engagement
- Tokenomics and supply distribution
- Market timing and conditions
- Similar token performance patterns

Return a structured analysis with:
- shouldSnipe: boolean
- confidence: 0-100
- riskLevel: low/medium/high/very_high
- expectedProfit: SOL amount (if positive)
- maxInvestment: recommended SOL amount
- reasons: array of positive factors
- warnings: array of risk factors
- metrics: scores for creator, tokenomics, liquidity, social, technical
- timing: urgency level and optimal entry strategy`;
}

/**
 * Validate and parse AI analysis response
 */
export function validateSnipingAnalysis(data: any): SnipingAnalysis {
  return SnipingAnalysisSchema.parse(data);
}








