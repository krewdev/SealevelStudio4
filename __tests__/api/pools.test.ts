/**
 * Tests for Pool Scanning API
 * Tests on-chain pool gathering and aggregation
 */

import { describe, it, expect } from '@jest/globals';

describe('Pool Scanning API Tests', () => {
  const baseUrl = 'http://localhost:3000';

  describe('GET /api/pools/scan', () => {
    it('should scan pools from all DEXs', async () => {
      const response = await fetch(`${baseUrl}/api/pools/scan?network=mainnet`);
      
      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.stats).toBeDefined();
      expect(data.stats.totalPools).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(data.pools)).toBe(true);
      expect(data.poolsByDex).toBeDefined();
    });

    it('should filter pools by specific DEXes', async () => {
      const response = await fetch(
        `${baseUrl}/api/pools/scan?network=mainnet&dexes=orca,raydium`
      );

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.success).toBe(true);
      
      // Check that only requested DEXes are included
      const returnedDexes = Object.keys(data.poolsByDex);
      for (const dex of returnedDexes) {
        expect(['orca', 'raydium']).toContain(dex);
      }
    });

    it('should filter by minimum liquidity', async () => {
      const response = await fetch(
        `${baseUrl}/api/pools/scan?network=mainnet&minLiquidity=1000`
      );

      expect(response.ok).toBe(true);
      const data = await response.json();
      
      // Verify all pools meet minimum liquidity
      for (const pool of data.pools) {
        const liquidity = pool.tokenA.reserve * pool.price + 
                         pool.tokenB.reserve * (1 / pool.price);
        expect(liquidity).toBeGreaterThanOrEqual(1000);
      }
    });

    it('should include opportunities when requested', async () => {
      const response = await fetch(
        `${baseUrl}/api/pools/scan?network=mainnet&opportunities=true`
      );

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.opportunities).toBeDefined();
    });

    it('should work with devnet', async () => {
      const response = await fetch(`${baseUrl}/api/pools/scan?network=devnet`);
      
      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.stats.network).toBe('devnet');
    });
  });

  describe('POST /api/pools/scan', () => {
    it('should find pools for specific token pair', async () => {
      const response = await fetch(`${baseUrl}/api/pools/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenA: 'So11111111111111111111111111111111111111112', // SOL
          tokenB: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
          network: 'mainnet',
        }),
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.tokenA).toBeDefined();
      expect(data.tokenB).toBeDefined();
      expect(Array.isArray(data.pools)).toBe(true);
      
      // Verify all pools contain the requested tokens
      for (const pool of data.pools) {
        const poolTokens = [
          pool.tokenA.mint.toLowerCase(),
          pool.tokenB.mint.toLowerCase(),
        ];
        expect(
          poolTokens.includes('So11111111111111111111111111111111111111112'.toLowerCase()) &&
          poolTokens.includes('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'.toLowerCase())
        ).toBe(true);
      }
    });

    it('should require tokenA and tokenB', async () => {
      const response = await fetch(`${baseUrl}/api/pools/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenA: 'So11111111111111111111111111111111111111112',
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('tokenB');
    });
  });
});

