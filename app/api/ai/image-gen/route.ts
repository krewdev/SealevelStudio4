import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

const OPENAI_API_URL = 'https://api.openai.com/v1/images/generations';

/**
 * AI Image Generation API for Token Branding
 * Generates token logos and brand images for social media
 * Uses DALL-E 3 for high-quality, professional results
 */
export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { 
          error: 'OpenAI API key not configured. Image generation requires DALL-E 3 API access.',
          suggestion: 'Please set OPENAI_API_KEY in your environment variables, or use manual image upload instead.',
          requiresApiKey: true
        },
        { status: 503 } // Service Unavailable
      );
    }

    const body = await request.json();
    const { 
      tokenSymbol,
      tokenName,
      prompt,
      size = '1024x1024', // Options: 1024x1024, 1792x1024, 1024x1792
      quality = 'hd', // 'standard' or 'hd'
      style = 'vivid' // 'vivid' or 'natural'
    } = body;

    if (!tokenSymbol && !prompt) {
      return NextResponse.json(
        { error: 'Token symbol or custom prompt is required' },
        { status: 400 }
      );
    }

    // Build intelligent prompt based on token info
    let imagePrompt = prompt;
    
    if (!prompt && tokenSymbol) {
      // Auto-generate a professional prompt for token branding
      imagePrompt = `Create a professional cryptocurrency token logo for "${tokenName || tokenSymbol}". 
The logo should feature the symbol "${tokenSymbol}" prominently and be suitable for use on social media, 
trading platforms, and cryptocurrency exchanges. 
Design requirements:
- Modern, clean, and professional appearance
- Vibrant colors that stand out on dark backgrounds
- The token symbol "${tokenSymbol}" should be clearly visible
- Circular or square format suitable for profile pictures
- Tech-forward aesthetic with blockchain/crypto themes
- High contrast and legibility at small sizes
- No text other than the token symbol
- Professional gradient or solid background`;
    }

    // Rate limiting check (basic)
    const requestCount = await checkRateLimit(request);
    if (requestCount > 10) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    const payload = {
      model: 'dall-e-3',
      prompt: imagePrompt,
      n: 1,
      size,
      quality,
      style,
      response_format: 'url'
    };

    console.log('Generating image with DALL-E 3:', { tokenSymbol, tokenName, size, quality });

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('OpenAI Image API error:', errorBody);
      
      // Handle specific errors
      if (response.status === 400) {
        return NextResponse.json(
          { error: 'Invalid prompt or parameters. Please try a different description.' },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: `Image generation failed: ${response.status}` },
        { status: response.status }
      );
    }

    const result = await response.json();

    if (result.data?.[0]?.url) {
      return NextResponse.json({
        success: true,
        imageUrl: result.data[0].url,
        revisedPrompt: result.data[0].revised_prompt,
        metadata: {
          tokenSymbol,
          tokenName,
          size,
          quality,
          style,
          generatedAt: new Date().toISOString()
        }
      });
    } else {
      console.warn('Unexpected DALL-E API response:', result);
      throw new Error('No image data returned from API');
    }

  } catch (error) {
    console.error('Image generation error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Image generation failed',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * Simple rate limiting (in-memory, resets on restart)
 * In production, use Redis or a proper rate limiting service
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();

async function checkRateLimit(request: NextRequest): Promise<number> {
  const ip = request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             'unknown';
  
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour window
  
  const existing = requestCounts.get(ip);
  
  if (!existing || now > existing.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + windowMs });
    return 1;
  }
  
  existing.count++;
  return existing.count;
}
