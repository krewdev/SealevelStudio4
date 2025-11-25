import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
// Default to the user's specified local server port if env var is missing, or use the env var
const LOCAL_AI_ENDPOINT = process.env.LOCAL_AI_ENDPOINT || 'http://localhost:1234/v1';
const USE_LOCAL_AI = true; // Default to true as requested by user context

export async function POST(request: NextRequest) {
  try {
    const { tokenSymbol, tokenName, mood } = await request.json();

    let systemPrompt = `You are a crypto social media marketing expert. Write a short, engaging tweet (under 280 chars) for a token named "${tokenName}" ($${tokenSymbol}).`;
    
    switch (mood) {
      case 'fomo':
        systemPrompt += ' Create intense urgency (FOMO). Use 🚀 and 🔥 emojis. Imply it is about to moon.';
        break;
      case 'fear':
        systemPrompt += ' Create a sense of missing out (FUD/Fear). Ask if they are fading the next big thing. Be provocative.';
        break;
      case 'greed':
        systemPrompt += ' Focus on potential gains, wealth, and luxury. Use 💎 and 💰 emojis. Talk about sending it to Valhalla.';
        break;
      case 'build':
        systemPrompt += ' Focus on technology, development updates, and team strength. Be professional but bullish. Use 🛠️ and 🏗️ emojis.';
        break;
      case 'promote':
        systemPrompt += ' General community promotion. Welcoming, hype-building, and viral. Use hashtags.';
        break;
    }

    let message = '';
    let errorDetails: string[] = [];

    // Try Local AI first (as requested)
    const localAiEnabled = process.env.LOCAL_AI_ENABLED !== 'false' && LOCAL_AI_ENDPOINT;
    
    if (localAiEnabled) {
      try {
        console.log('Attempting Local AI generation at:', LOCAL_AI_ENDPOINT);
        const localResponse = await fetch(`${LOCAL_AI_ENDPOINT}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'local-model', // Usually ignored by local servers but good practice
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Write a unique ${mood} post for $${tokenSymbol}.` }
            ],
            max_tokens: 150,
            temperature: 0.9
          }),
          signal: AbortSignal.timeout(30000) // 30 second timeout
        });

        if (localResponse.ok) {
          const data = await localResponse.json();
          message = data.choices[0]?.message?.content?.trim();
          if (message) {
            console.log('✅ Local AI generation successful');
          }
        } else {
          const errorText = await localResponse.text();
          errorDetails.push(`Local AI returned status ${localResponse.status}: ${errorText}`);
        }
      } catch (localError: any) {
        const errorMsg = localError.message || String(localError);
        errorDetails.push(`Local AI error: ${errorMsg}`);
        console.warn('Local AI failed:', errorMsg);
      }
    } else {
      errorDetails.push('Local AI is disabled (LOCAL_AI_ENABLED=false or no LOCAL_AI_ENDPOINT)');
    }

    // Fallback to OpenAI if local failed or returned empty
    if (!message && OPENAI_API_KEY) {
      try {
        console.log('Falling back to OpenAI...');
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Write a unique ${mood} post for $${tokenSymbol}.` }
            ],
            max_tokens: 100,
            temperature: 0.9
          }),
          signal: AbortSignal.timeout(30000) // 30 second timeout
        });

        if (response.ok) {
          const data = await response.json();
          message = data.choices[0]?.message?.content?.trim();
          if (message) {
            console.log('✅ OpenAI fallback successful');
          }
        } else {
          const errorText = await response.text();
          errorDetails.push(`OpenAI returned status ${response.status}: ${errorText}`);
        }
      } catch (openaiError: any) {
        const errorMsg = openaiError.message || String(openaiError);
        errorDetails.push(`OpenAI error: ${errorMsg}`);
        console.warn('OpenAI fallback failed:', errorMsg);
      }
    } else if (!message && !OPENAI_API_KEY) {
      errorDetails.push('OpenAI API key not configured (optional fallback)');
    }

    if (!message) {
      return NextResponse.json({ 
        error: 'Failed to generate message. No AI providers available or all providers failed.',
        details: errorDetails,
        suggestions: [
          'Ensure LOCAL_AI_ENDPOINT is set and your local AI server is running',
          'Or set OPENAI_API_KEY for fallback support',
          'Check that your local AI server is accessible at the configured endpoint'
        ],
        requiresConfiguration: true
      }, { status: 503 }); // Service Unavailable
    }

    const cleanMessage = message.replace(/^"|"$/g, '').trim(); // Remove quotes
    return NextResponse.json({ success: true, message: cleanMessage });

  } catch (error) {
    console.error('Marketing gen error:', error);
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 });
  }
}
