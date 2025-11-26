/**
 * Hook for AI-powered arbitrage analysis with structured output
 * Uses LM Studio to analyze arbitrage opportunities and return structured results
 */

import { useState, useCallback } from 'react';
import { ArbitrageOpportunity } from '../lib/pools/types';
import {
  ArbitrageScanningResults,
  ArbitrageResultsJSONSchema,
  validateArbitrageResults,
  getArbitrageResultsPrompt,
} from '../lib/arbitrage/arbitrage-result-schema';

const LM_STUDIO_ENDPOINT = process.env.NEXT_PUBLIC_LM_STUDIO_ENDPOINT || 'http://localhost:1234/v1';

interface UseArbitrageAIReturn {
  analyzeScan: (
    opportunities: ArbitrageOpportunity[],
    executedTrades?: any[],
    failedTrades?: any[],
    missedTrades?: any[]
  ) => Promise<ArbitrageScanningResults | null>;
  isLoading: boolean;
  error: string | null;
}

export function useArbitrageAI(): UseArbitrageAIReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeScan = useCallback(
    async (
      opportunities: ArbitrageOpportunity[],
      executedTrades: any[] = [],
      failedTrades: any[] = [],
      missedTrades: any[] = []
    ): Promise<ArbitrageScanningResults | null> => {
      setIsLoading(true);
      setError(null);

      try {
        // Convert opportunities to schema format
        const scanData = {
          opportunities: opportunities.map((opp) => ({
            id: opp.id,
            type: opp.type,
            path: opp.steps.map((step) => ({
              dex: step.dex || 'Unknown',
              poolAddress: step.pool?.poolAddress || '',
              inputToken: step.tokenIn?.mint || step.tokenIn?.symbol || 'Unknown',
              outputToken: step.tokenOut?.mint || step.tokenOut?.symbol || 'Unknown',
              inputAmount: Number(step.amountIn) / 1e9,
              outputAmount: Number(step.amountOut) / 1e9,
            })),
            inputToken: opp.path.startToken?.symbol || 'Unknown',
            outputToken: opp.path.endToken?.symbol || 'Unknown',
            inputAmount: Number(opp.inputAmount) / 1e9,
            estimatedOutput: Number(opp.outputAmount) / 1e9,
            estimatedProfit: opp.profit,
            profitPercent: opp.profitPercent,
            estimatedGasFee: opp.gasEstimate / 1e9,
            netProfit: opp.netProfit,
            confidence: opp.confidence,
            expiresAt: opp.expiresAt?.toISOString(),
            riskLevel: opp.confidence > 0.8 ? 'low' : opp.confidence > 0.5 ? 'medium' : 'high',
            chain: 'solana',
            detectedAt: opp.timestamp.toISOString(),
          })),
          executedTrades,
          failedTrades,
          missedTrades,
        };

        // Create prompt with schema
        const prompt = `${getArbitrageResultsPrompt()}

Current scan data:
${JSON.stringify(scanData, null, 2)}

Analyze this data and return the complete structured results.`;

        // Call LM Studio with structured output
        const response = await fetch(`${LM_STUDIO_ENDPOINT}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'local-model',
            messages: [
              {
                role: 'system',
                content: 'You are an expert arbitrage analyst. Always return valid JSON matching the provided schema.',
              },
              { role: 'user', content: prompt },
            ],
            response_format: {
              type: 'json_schema',
              json_schema: ArbitrageResultsJSONSchema,
            },
            temperature: 0.3, // Lower for structured output
            max_tokens: 4000,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`LM Studio API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content;

        if (!content) {
          throw new Error('No response from AI');
        }

        // Parse and validate
        let parsed: any;
        try {
          parsed = JSON.parse(content);
        } catch (e) {
          // Try to extract JSON from markdown code blocks
          const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[1]);
          } else {
            throw new Error('Invalid JSON response from AI');
          }
        }

        // Validate against schema
        const validated = validateArbitrageResults(parsed);
        return validated;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        console.error('Arbitrage AI analysis error:', err);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return { analyzeScan, isLoading, error };
}

