import { NextRequest, NextResponse } from 'next/server';

/**
 * Helius Enhanced Transaction Parser
 * POST /api/helius/parse-transaction
 * 
 * Parses a Solana transaction using Helius Enhanced Transaction API
 * Returns human-readable transaction details including:
 * - Token transfers
 * - NFT transfers
 * - Program interactions
 * - Account changes
 * - Fee information
 */

interface ParseTransactionRequest {
  signature: string; // Transaction signature
  network?: 'mainnet' | 'devnet' | 'testnet'; // Network (default: devnet)
}

interface HeliusParsedTransaction {
  signature: string;
  timestamp: number;
  fee: number;
  feePayer: string;
  instructions: Array<{
    programId: string;
    programName?: string;
    type?: string;
    data?: any;
  }>;
  tokenTransfers?: Array<{
    fromTokenAccount?: string;
    toTokenAccount?: string;
    fromUserAccount?: string;
    toUserAccount?: string;
    tokenAmount: number;
    mint: string;
    tokenStandard?: string;
  }>;
  nativeTransfers?: Array<{
    fromUserAccount: string;
    toUserAccount: string;
    amount: number;
  }>;
  accountData?: Array<{
    account: string;
    nativeBalanceChange?: number;
    tokenBalanceChanges?: Array<{
      userAccount: string;
      tokenAccount: string;
      mint: string;
      rawTokenAmount: {
        tokenAmount: string;
        decimals: number;
      };
      tokenAmount: number;
    }>;
  }>;
  events?: Array<{
    type: string;
    source: string;
    nativeTransfers?: Array<{
      fromUserAccount: string;
      toUserAccount: string;
      amount: number;
    }>;
    tokenTransfers?: Array<{
      fromTokenAccount: string;
      toTokenAccount: string;
      fromUserAccount: string;
      toUserAccount: string;
      tokenAmount: number;
      mint: string;
    }>;
  }>;
  error?: string;
}

/**
 * Extract Helius API key from environment variable
 * Handles both full URL format and raw API key
 */
function getHeliusApiKey(): string | null {
  const apiKey = process.env.HELIUS_API_KEY || process.env.NEXT_PUBLIC_HELIUS_API_KEY;
  if (!apiKey) {
    return null;
  }

  // If it's a URL, extract the API key
  if (apiKey.includes('helius-rpc.com')) {
    const match = apiKey.match(/[?&]api-key=([^&]+)/);
    return match ? match[1] : apiKey.split('api-key=')[1]?.split('&')[0] || apiKey;
  }

  return apiKey;
}

/**
 * Get Helius API base URL for a given network
 */
function getHeliusApiUrl(network: 'mainnet' | 'devnet' | 'testnet'): string {
  const apiKey = getHeliusApiKey();
  if (!apiKey) {
    throw new Error('Helius API key not configured');
  }

  const baseUrl = network === 'mainnet' 
    ? 'https://api-mainnet.helius-rpc.com'
    : network === 'devnet'
    ? 'https://api-devnet.helius-rpc.com'
    : 'https://api-testnet.helius-rpc.com'; // Note: testnet may not be available

  return `${baseUrl}/v0/transactions/?api-key=${apiKey}`;
}

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body: ParseTransactionRequest = await request.json();
    const { signature, network = 'devnet' } = body;

    if (!signature) {
      return NextResponse.json(
        { error: 'Transaction signature is required' },
        { status: 400 }
      );
    }

    // Validate signature format (base58, 88 characters)
    if (signature.length !== 88 || !/^[A-Za-z0-9]+$/.test(signature)) {
      return NextResponse.json(
        { error: 'Invalid transaction signature format' },
        { status: 400 }
      );
    }

    const apiKey = getHeliusApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Helius API key not configured. Please set HELIUS_API_KEY or NEXT_PUBLIC_HELIUS_API_KEY in your environment variables.' },
        { status: 500 }
      );
    }

    // Get Helius Enhanced Transaction API URL
    const apiUrl = getHeliusApiUrl(network);

    // Call Helius Enhanced Transaction API
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transactions: [signature],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Helius API error:', response.status, errorText);
      
      return NextResponse.json(
        { 
          error: `Helius API error: ${response.status}`,
          details: errorText,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Helius returns an array of parsed transactions
    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json(
        { error: 'Transaction not found or could not be parsed' },
        { status: 404 }
      );
    }

    const parsedTx: HeliusParsedTransaction = data[0];

    return NextResponse.json({
      success: true,
      transaction: parsedTx,
    });

  } catch (error: any) {
    console.error('Error parsing transaction:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to parse transaction',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for parsing a transaction by signature
 * GET /api/helius/parse-transaction?signature=...&network=mainnet
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const signature = searchParams.get('signature');
    const network = (searchParams.get('network') || 'devnet') as 'mainnet' | 'devnet' | 'testnet';

    if (!signature) {
      return NextResponse.json(
        { error: 'Transaction signature is required as query parameter' },
        { status: 400 }
      );
    }

    // Reuse POST logic
    return POST(new NextRequest(request.url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify({ signature, network }),
    }));

  } catch (error: any) {
    console.error('Error in GET parse-transaction:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to parse transaction',
      },
      { status: 500 }
    );
  }
}

