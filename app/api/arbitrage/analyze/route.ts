/**
 * API route for AI-powered arbitrage analysis
 * Returns structured arbitrage scanning results using the schema
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  ArbitrageResultsJSONSchema,
  validateArbitrageResults,
  getArbitrageResultsPrompt,
} from '../../../lib/arbitrage/arbitrage-result-schema';

export const dynamic = 'force-dynamic';

const LM_STUDIO_ENDPOINT = process.env.NEXT_PUBLIC_LM_STUDIO_ENDPOINT || 'http://localhost:1234/v1';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      opportunities = [],
      executedTrades = [],
      failedTrades = [],
      missedTrades = [],
      scanMetadata = {},
    } = body;

    // Create prompt with schema
    const scanData = {
      opportunities,
      executedTrades,
      failedTrades,
      missedTrades,
      scanMetadata,
    };

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
        temperature: 0.3,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `LM Studio API error: ${response.status} - ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 });
    }

    // Parse JSON (handle markdown code blocks)
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1]);
      } else {
        return NextResponse.json({ error: 'Invalid JSON response from AI', raw: content }, { status: 500 });
      }
    }

    // Validate against schema
    const validated = validateArbitrageResults(parsed);

    return NextResponse.json({
      success: true,
      results: validated,
    });
  } catch (error) {
    console.error('Arbitrage analysis API error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}

