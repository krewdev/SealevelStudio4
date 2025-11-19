// Price API for fetching real-time and historical price data
// Supports Solana (SOL) and Polkadot (DOT)

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface PriceDataPoint {
  timestamp: Date;
  price: number;
  volume?: number;
  high?: number;
  low?: number;
  open?: number;
  close?: number;
}

// CoinGecko API (free, no API key needed for basic usage)
const COINGECKO_API = 'https://api.coingecko.com/api/v3';

/**
 * Fetch price data for a token
 * GET /api/prices?token=sol&timeframe=24h
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token')?.toLowerCase() || 'sol';
    const timeframe = searchParams.get('timeframe') || '24h';

    // Map token symbols to CoinGecko IDs
    const tokenMap: Record<string, string> = {
      'sol': 'solana',
      'solana': 'solana',
      'dot': 'polkadot',
      'polkadot': 'polkadot',
    };

    const coinId = tokenMap[token] || token;
    const isSolana = token === 'sol' || token === 'solana';
    let birdeyePrice: number | null = null;
    
    // For Solana, try Birdeye first for more accurate on-chain prices
    if (isSolana) {
      try {
        const birdeyeApiKey = process.env.BIRDEYE_API_KEY || process.env.NEXT_PUBLIC_BIRDEYE_API_KEY;
        const SOL_MINT = 'So11111111111111111111111111111111111111112';
        
        if (birdeyeApiKey) {
          // Try Birdeye for Solana price
          const birdeyeResponse = await fetch(
            `https://public-api.birdeye.so/defi/price?address=${SOL_MINT}`,
            {
              headers: {
                'X-API-KEY': birdeyeApiKey,
                'Accept': 'application/json',
                'x-chain': 'solana',
              },
            }
          );
          
          if (birdeyeResponse.ok) {
            const birdeyeData = await birdeyeResponse.json();
            if (birdeyeData.success && birdeyeData.data?.value) {
              birdeyePrice = birdeyeData.data.value;
            }
          }
        }
      } catch (error) {
        console.warn('Birdeye price fetch failed, using CoinGecko:', error);
        // Continue with CoinGecko
      }
    }

    // Determine days based on timeframe
    let days = 1;
    let interval = 'hourly';
    if (timeframe === '7d') {
      days = 7;
      interval = 'hourly';
    } else if (timeframe === '30d') {
      days = 30;
      interval = 'daily';
    } else if (timeframe === '1h') {
      days = 1;
      interval = 'minutely';
    } else {
      // 24h default
      days = 1;
      interval = 'hourly';
    }

    // Fetch market data with price history
    const [marketDataResponse, historyResponse] = await Promise.all([
      fetch(`${COINGECKO_API}/coins/${coinId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`),
      fetch(`${COINGECKO_API}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}&interval=${interval}`),
    ]);

    if (!marketDataResponse.ok || !historyResponse.ok) {
      throw new Error('Failed to fetch price data from CoinGecko');
    }

    const [marketData, historyData] = await Promise.all([
      marketDataResponse.json(),
      historyResponse.json(),
    ]);

    // Extract current price and volume
    // Use Birdeye price for Solana if available (more accurate), otherwise use CoinGecko
    const currentPrice = (isSolana && birdeyePrice !== null) ? birdeyePrice : (marketData.market_data?.current_price?.usd || 0);
    const volume24h = marketData.market_data?.total_volume?.usd || 0;
    const high24h = marketData.market_data?.high_24h?.usd || currentPrice;
    const low24h = marketData.market_data?.low_24h?.usd || currentPrice;
    const priceChange24h = marketData.market_data?.price_change_percentage_24h || 0;

    // Process price history
    const prices: PriceDataPoint[] = [];
    const priceHistory = historyData.prices || [];
    const volumes = historyData.total_volumes || [];

    // For better OHLC data, we'll use price points to estimate
    // CoinGecko provides prices array, we'll derive OHLC from adjacent points
    for (let i = 0; i < priceHistory.length; i++) {
      const [timestamp, price] = priceHistory[i];
      const volume = volumes[i] ? volumes[i][1] : undefined;
      
      // Get previous and next prices for better OHLC estimation
      const prevPrice = i > 0 ? priceHistory[i - 1][1] : price;
      const nextPrice = i < priceHistory.length - 1 ? priceHistory[i + 1][1] : price;
      
      // Calculate high/low from price movement
      const priceRange = Math.abs(nextPrice - prevPrice) * 0.5;
      const high = Math.max(price, prevPrice, nextPrice) + priceRange * 0.1;
      const low = Math.min(price, prevPrice, nextPrice) - priceRange * 0.1;
      
      prices.push({
        timestamp: new Date(timestamp),
        price: price,
        volume: volume,
        high: Math.max(high, price),
        low: Math.max(low, 0), // Ensure low is not negative
        open: prevPrice,
        close: price,
      });
    }

    // If we have price history, use the last price as current
    const finalPrice = prices.length > 0 ? prices[prices.length - 1].price : currentPrice;

    return NextResponse.json({
      success: true,
      token: coinId,
      symbol: token.toUpperCase(),
      currentPrice: finalPrice,
      priceChange24h,
      volume24h,
      high24h,
      low24h,
      data: prices,
      timeframe,
    });
  } catch (error) {
    console.error('Price API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch price data',
      },
      { status: 500 }
    );
  }
}

