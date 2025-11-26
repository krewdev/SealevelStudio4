import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';

/**
 * Gemini API Proxy for Cybersecurity Analysis
 * Server-side proxy to keep API key secure
 */
export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { 
          error: 'Gemini API key not configured',
          suggestion: 'Please set GEMINI_API_KEY in your environment variables, or use local AI for analysis',
          requiresConfiguration: true,
          alternative: 'Consider using LOCAL_AI_ENDPOINT for local AI analysis instead'
        },
        { status: 503 } // Service Unavailable
      );
    }

    const body = await request.json();
    const { codeSnippet, systemPrompt, temperature = 0.1 } = body;

    if (!codeSnippet || !systemPrompt) {
      return NextResponse.json(
        { error: 'Missing required parameters: codeSnippet and systemPrompt' },
        { status: 400 }
      );
    }

    const payload = {
      contents: [{
        parts: [{ text: codeSnippet }]
      }],
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      },
      generationConfig: {
        temperature,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
      }
    };

    // Retry logic with exponential backoff
    let response;
    let delay = 1000;
    const maxRetries = 3;

    for (let i = 0; i < maxRetries; i++) {
      try {
        response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.status === 429 || (response.status >= 500 && response.status <= 599)) {
          if (i < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2;
            continue;
          }
        }

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`Gemini API error: ${response.status} - ${errorBody}`);
        }

        const result = await response.json();

        if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
          return NextResponse.json({
            success: true,
            analysis: result.candidates[0].content.parts[0].text
          });
        } else {
          console.warn('Unexpected Gemini API response structure:', result);
          throw new Error('Received an empty or invalid response from Gemini API');
        }
      } catch (error) {
        if (i === maxRetries - 1) {
          throw error;
        }
      }
    }

    throw new Error('Gemini API analysis failed after multiple retries');
  } catch (error) {
    console.error('Gemini API proxy error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    );
  }
}

