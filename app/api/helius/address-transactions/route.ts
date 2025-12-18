import { NextRequest, NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';

/**
 * Helius Address Transaction History
 * GET /api/helius/address-transactions?address=...&network=devnet&limit=100
 * 
 * Fetches transaction history for a Solana address using Helius Enhanced Transaction API
 * Returns parsed transaction history with detailed information
 */

interface AddressTransactionsRequest {
  address: string; // Solana address (public key)
  network?: 'mainnet' | 'devnet' | 'testnet'; // Network (default: devnet)
  limit?: number; // Number of transactions to return (default: 100, max: 1000)
  before?: string; // Transaction signature to fetch transactions before (for pagination)
  until?: string; // Transaction signature to fetch transactions until (for pagination)
}

interface HeliusAddressTransaction {
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
 * Get Helius API URL for address transactions
 */
function getHeliusAddressTransactionsUrl(
  address: string,
  network: 'mainnet' | 'devnet' | 'testnet',
  limit: number,
  before?: string,
  until?: string
): string {
  const apiKey = getHeliusApiKey();
  if (!apiKey) {
    throw new Error('Helius API key not configured');
  }

  const baseUrl = network === 'mainnet' 
    ? 'https://api-mainnet.helius-rpc.com'
    : network === 'devnet'
    ? 'https://api-devnet.helius-rpc.com'
    : 'https://api-testnet.helius-rpc.com';

  // Build query parameters
  const params = new URLSearchParams({
    'api-key': apiKey,
    limit: limit.toString(),
  });

  if (before) {
    params.append('before', before);
  }
  if (until) {
    params.append('until', until);
  }

  return `${baseUrl}/v0/addresses/${address}/transactions?${params.toString()}`;
}

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const address = searchParams.get('address');
    const network = (searchParams.get('network') || 'devnet') as 'mainnet' | 'devnet' | 'testnet';
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Math.min(Math.max(1, parseInt(limitParam, 10)), 1000) : 100;
    const before = searchParams.get('before') || undefined;
    const until = searchParams.get('until') || undefined;

    if (!address) {
      return NextResponse.json(
        { error: 'Address is required as query parameter' },
        { status: 400 }
      );
    }

    // Validate address format
    try {
      new PublicKey(address);
    } catch {
      return NextResponse.json(
        { error: 'Invalid Solana address format' },
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

    // Get Helius API URL for address transactions
    const apiUrl = getHeliusAddressTransactionsUrl(address, network, limit, before, until);

    // Call Helius Enhanced Transaction API
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
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
    const transactions: HeliusAddressTransaction[] = Array.isArray(data) ? data : [];

    return NextResponse.json({
      success: true,
      address,
      network,
      count: transactions.length,
      transactions,
      pagination: {
        limit,
        before,
        until,
        hasMore: transactions.length === limit, // Likely more if we got the full limit
      },
    });

  } catch (error: any) {
    console.error('Error fetching address transactions:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to fetch address transactions',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint for fetching address transactions
 * POST /api/helius/address-transactions
 * Body: { address: string, network?: string, limit?: number, before?: string, until?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body: AddressTransactionsRequest = await request.json();
    const { address, network = 'devnet', limit = 100, before, until } = body;

    if (!address) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      );
    }

    // Validate address format
    try {
      new PublicKey(address);
    } catch {
      return NextResponse.json(
        { error: 'Invalid Solana address format' },
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

    // Get Helius API URL for address transactions
    const apiUrl = getHeliusAddressTransactionsUrl(
      address,
      network,
      Math.min(Math.max(1, limit), 1000),
      before,
      until
    );

    // Call Helius Enhanced Transaction API
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
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
    const transactions: HeliusAddressTransaction[] = Array.isArray(data) ? data : [];

    return NextResponse.json({
      success: true,
      address,
      network,
      count: transactions.length,
      transactions,
      pagination: {
        limit,
        before,
        until,
        hasMore: transactions.length === limit,
      },
    });

  } catch (error: any) {
    console.error('Error fetching address transactions:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to fetch address transactions',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

