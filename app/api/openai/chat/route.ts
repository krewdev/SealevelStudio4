import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

/**
 * OpenAI API Proxy for Service Bot
 * Server-side proxy to keep API key secure
 * 
 * This service bot provides intelligent assistance for:
 * - Solana development questions
 * - Code explanations and debugging
 * - Platform usage and features
 * - General technical assistance
 */
export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    const localAiEndpoint = process.env.LOCAL_AI_ENDPOINT;
    
    if (!apiKey && !localAiEndpoint) {
      return NextResponse.json(
        { 
          error: 'No AI provider configured',
          suggestion: 'Please set either OPENAI_API_KEY or LOCAL_AI_ENDPOINT in your environment variables',
          requiresConfiguration: true
        },
        { status: 503 } // Service Unavailable
      );
    }

    // If no OpenAI key but local AI is available, allow request to proceed (client should handle)
    // Or if the client specifically requested a model that implies local execution
    
    // Only block if NO key and NO local endpoint (handled above)
    // If we have local endpoint but no key, we should let it through if the client is okay with it
    // The client-side code should prefer local endpoint if available and no key is set.
    
    // If request comes here without apiKey but with localAiEndpoint, we should inform client 
    // OR if this is a proxy to OpenAI, we can't proxy without a key.
    // However, if the intention is to use local AI, the CLIENT should call the local endpoint directly, not this proxy.
    // This route is specifically for OpenAI proxying.
    
    // Correction: The original logic was blocking requests even if local AI was available.
    // If this route is ONLY for OpenAI, then blocking is correct.
    // But the client might call this to check availability or fallback.
    
    if (!apiKey && localAiEndpoint) {
      return NextResponse.json(
        { 
          error: 'OpenAI API key not configured',
          suggestion: `Local AI is available at ${localAiEndpoint}. Please configure the client to use the local endpoint directly.`,
          localAiAvailable: true,
          localAiEndpoint,
          requiresConfiguration: true
        },
        { status: 503 }
      );
    }

    if (!apiKey) {
      return NextResponse.json(
        { 
          error: 'OpenAI API key not configured',
          suggestion: 'Please set OPENAI_API_KEY in your environment variables, or configure LOCAL_AI_ENDPOINT for local AI support',
          requiresConfiguration: true
        },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { 
      messages, 
      model = 'gpt-4o-mini', 
      temperature = 0.7,
      maxTokens = 2000,
      context 
    } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Missing or invalid messages array' },
        { status: 400 }
      );
    }

    // Build system message with context about Sealevel Studio
    const systemMessage = {
      role: 'system',
      content: `You are an intelligent AI assistant for Sealevel Studio, a comprehensive Solana development platform. 

Your role is to help users with:
- Solana blockchain development questions
- Understanding Solana programs, transactions, and accounts
- Code explanations and debugging assistance
- Platform features and how to use them
- Best practices for Solana development
- Security considerations for Solana applications

${context ? `\nAdditional Context:\n${JSON.stringify(context, null, 2)}` : ''}

Be helpful, accurate, and concise. When discussing code, provide clear examples. Always prioritize security best practices when giving Solana development advice.`
    };

    // Prepare messages with system message first
    const chatMessages = [systemMessage, ...messages];

    const payload = {
      model,
      messages: chatMessages,
      temperature,
      max_tokens: maxTokens,
      stream: false
    };

    // Retry logic with exponential backoff
    let response;
    let delay = 1000;
    const maxRetries = 3;

    for (let i = 0; i < maxRetries; i++) {
      try {
        response = await fetch(OPENAI_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
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
          throw new Error(`OpenAI API error: ${response.status} - ${errorBody}`);
        }

        const result = await response.json();

        if (result.choices?.[0]?.message?.content) {
          return NextResponse.json({
            success: true,
            message: result.choices[0].message.content,
            usage: result.usage,
            model: result.model
          });
        } else {
          console.warn('Unexpected OpenAI API response structure:', result);
          throw new Error('Received an empty or invalid response from OpenAI API');
        }
      } catch (error) {
        if (i === maxRetries - 1) {
          throw error;
        }
      }
    }

    throw new Error('OpenAI API request failed after multiple retries');
  } catch (error) {
    console.error('OpenAI API proxy error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    );
  }
}

