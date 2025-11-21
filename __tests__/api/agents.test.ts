/**
 * Tests for Agent API Routes
 * Tests agent creation, control, and management
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock Next.js request/response
const createMockRequest = (method: string, body?: any, searchParams?: Record<string, string>) => {
  return {
    method,
    json: async () => body || {},
    nextUrl: {
      searchParams: {
        get: (key: string) => searchParams?.[key] || null,
      },
    },
  } as any;
};

const createMockResponse = () => {
  const res: any = {
    status: 200,
    json: jest.fn(),
  };
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('Agent API Tests', () => {
  const baseUrl = 'http://localhost:3000';

  describe('POST /api/agents/create', () => {
    it('should create an arbitrage agent', async () => {
      const response = await fetch(`${baseUrl}/api/agents/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'arbitrage',
          config: {
            name: 'Test Arbitrage Agent',
            strategy: 'arbitrage',
            riskTolerance: 'medium',
            maxPositionSize: 1.0,
            minProfitThreshold: 0.01,
            slippageTolerance: 0.5,
            priorityFee: 10000,
          },
        }),
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.agent).toBeDefined();
      expect(data.agent.type).toBe('arbitrage');
      expect(data.agent.wallet).toBeDefined();
    });

    it('should create an AI-enhanced agent with LLM', async () => {
      const response = await fetch(`${baseUrl}/api/agents/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'ai-enhanced',
          config: {
            name: 'AI Trading Bot',
            strategy: 'arbitrage',
            riskTolerance: 'medium',
            maxPositionSize: 1.0,
            minProfitThreshold: 0.02,
            plugins: ['jupiter-swap', 'risk-assessment'],
          },
        }),
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.agent.type).toBe('ai-enhanced');
    });

    it('should reject invalid agent type', async () => {
      const response = await fetch(`${baseUrl}/api/agents/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'invalid-type',
          config: {},
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Unknown agent type');
    });

    it('should require config parameter', async () => {
      const response = await fetch(`${baseUrl}/api/agents/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'arbitrage',
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('config');
    });
  });

  describe('GET /api/agents/list', () => {
    it('should list all agents', async () => {
      // First create an agent
      await fetch(`${baseUrl}/api/agents/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'arbitrage',
          config: {
            name: 'Test Agent',
            strategy: 'arbitrage',
          },
        }),
      });

      // Then list agents
      const response = await fetch(`${baseUrl}/api/agents/list`);
      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.agents)).toBe(true);
    });
  });

  describe('POST /api/agents/control', () => {
    let agentWallet: string;

    beforeEach(async () => {
      // Create an agent for testing
      const createResponse = await fetch(`${baseUrl}/api/agents/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'arbitrage',
          config: {
            name: 'Test Control Agent',
            strategy: 'arbitrage',
            enabled: false, // Don't auto-start
          },
        }),
      });
      const createData = await createResponse.json();
      agentWallet = createData.agent.wallet;
    });

    it('should start an agent', async () => {
      const response = await fetch(`${baseUrl}/api/agents/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          wallet: agentWallet,
        }),
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.status.isRunning).toBe(true);
    });

    it('should stop an agent', async () => {
      // First start it
      await fetch(`${baseUrl}/api/agents/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          wallet: agentWallet,
        }),
      });

      // Then stop it
      const response = await fetch(`${baseUrl}/api/agents/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'stop',
          wallet: agentWallet,
        }),
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.status.isRunning).toBe(false);
    });

    it('should get agent status', async () => {
      const response = await fetch(`${baseUrl}/api/agents/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'status',
          wallet: agentWallet,
        }),
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.status).toBeDefined();
      expect(data.status.agentWallet).toBe(agentWallet);
    });

    it('should return 404 for non-existent agent', async () => {
      const response = await fetch(`${baseUrl}/api/agents/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          wallet: 'InvalidWalletAddress123',
        }),
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toContain('not found');
    });
  });
});

