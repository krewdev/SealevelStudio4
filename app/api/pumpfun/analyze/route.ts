/**
 * API route for AI-powered pump.fun token analysis
 * Analyzes new token launches for sniping opportunities
 */

import { NextRequest, NextResponse } from 'next/server';
import { PumpFunToken } from '../../../lib/pumpfun/stream';
import { getSnipingAnalysisPrompt, validateSnipingAnalysis } from '../../../lib/pumpfun/ai-analysis';

export const dynamic = 'force-dynamic';

const LM_STUDIO_ENDPOINT = process.env.NEXT_PUBLIC_LM_STUDIO_ENDPOINT || 'http://localhost:1234/v1';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, marketContext } = body;

    if (!token || !token.mint) {
      return NextResponse.json(
        { error: 'Token data required', success: false },
        { status: 400 }
      );
    }

    // Generate analysis prompt
    const prompt = getSnipingAnalysisPrompt(token as PumpFunToken, marketContext);

    // Call LM Studio for AI analysis
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
            content: 'You are an expert cryptocurrency trader specializing in early token launches and sniping strategies. Analyze tokens objectively and provide actionable insights with risk assessment.',
          },
          { role: 'user', content: prompt },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'sniping_analysis',
            schema: {
              type: 'object',
              properties: {
                shouldSnipe: { type: 'boolean' },
                confidence: { type: 'number', minimum: 0, maximum: 100 },
                riskLevel: { type: 'string', enum: ['low', 'medium', 'high', 'very_high'] },
                expectedProfit: { type: 'number' },
                maxInvestment: { type: 'number' },
                reasons: { type: 'array', items: { type: 'string' } },
                warnings: { type: 'array', items: { type: 'string' } },
                metrics: {
                  type: 'object',
                  properties: {
                    creatorReputation: { type: 'string', enum: ['unknown', 'new', 'suspicious', 'verified', 'trusted'] },
                    tokenomicsScore: { type: 'number', minimum: 0, maximum: 100 },
                    liquidityScore: { type: 'number', minimum: 0, maximum: 100 },
                    socialScore: { type: 'number', minimum: 0, maximum: 100 },
                    technicalScore: { type: 'number', minimum: 0, maximum: 100 },
                  },
                },
                timing: {
                  type: 'object',
                  properties: {
                    urgency: { type: 'string', enum: ['immediate', 'soon', 'wait', 'skip'] },
                    optimalEntryPrice: { type: 'number' },
                    exitStrategy: { type: 'string' },
                  },
                },
              },
              required: ['shouldSnipe', 'confidence', 'riskLevel', 'reasons', 'warnings'],
            },
          },
        },
        temperature: 0.3,
        max_tokens: 2000,
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

    // Parse JSON response
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
    const validated = validateSnipingAnalysis(parsed);

    return NextResponse.json({
      success: true,
      analysis: validated,
      token: {
        mint: token.mint,
        symbol: token.symbol,
        name: token.name,
      },
    });
  } catch (error) {
    console.error('Pump.fun analysis API error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}








