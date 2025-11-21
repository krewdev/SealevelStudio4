'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Brain,
  Zap,
  TrendingUp,
  Shield,
  Gamepad2,
  Network,
  Activity,
  Sparkles,
  Layers,
  Target,
  BarChart3,
  Cpu,
  Database,
  Radio,
  CheckCircle,
  AlertTriangle,
  Play,
  Pause,
  RefreshCw,
} from 'lucide-react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { ContextManagerAgent, LocalStorageContextStorage, APIContextStorage } from '../lib/agents/context-manager';
import { ContextAwareAgent, MasterContextAggregator } from '../lib/agents/context-integration';
import { PoolScanner } from '../lib/pools/scanner';
import { ArbitrageDetector } from '../lib/pools/arbitrage';
import { ArbitrageOpportunity } from '../lib/pools/types';
import { DEFAULT_SCANNER_CONFIG } from '../lib/pools/types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface AgentStatus {
  id: string;
  name: string;
  status: 'active' | 'idle' | 'processing' | 'error';
  health: number; // 0-100
  contextCount: number;
  lastActivity: Date;
  tier: 1 | 2 | 3;
  parent?: string;
}

interface Task {
  id: string;
  agentId: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  timestamp: Date;
}

export function AICyberPlayground({ onBack }: { onBack?: () => void }) {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  
  const [masterActive, setMasterActive] = useState(false);
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [userQuery, setUserQuery] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [arbitrageOpportunities, setArbitrageOpportunities] = useState<ArbitrageOpportunity[]>([]);
  const [isScanningArbitrage, setIsScanningArbitrage] = useState(false);
  const [contextManager] = useState(() => {
    const storage = typeof window !== 'undefined' 
      ? new LocalStorageContextStorage()
      : new APIContextStorage('/api/context');
    return new ContextManagerAgent(storage);
  });
  const [scanner] = useState(() => new PoolScanner());

  // Initialize agents
  useEffect(() => {
    const initialAgents: AgentStatus[] = [
      // Tier 1
      { id: 'master', name: 'Master AI', status: 'idle', health: 100, contextCount: 0, lastActivity: new Date(), tier: 1 },
      { id: 'trading', name: 'Trading Strategist', status: 'idle', health: 100, contextCount: 0, lastActivity: new Date(), tier: 1 },
      { id: 'blockchain', name: 'Blockchain Analyst', status: 'idle', health: 100, contextCount: 0, lastActivity: new Date(), tier: 1 },
      { id: 'security', name: 'Security Auditor', status: 'idle', health: 100, contextCount: 0, lastActivity: new Date(), tier: 1 },
      { id: 'gaming', name: 'Gaming Manager', status: 'idle', health: 100, contextCount: 0, lastActivity: new Date(), tier: 1 },
      { id: 'context', name: 'Context Manager', status: 'active', health: 100, contextCount: 0, lastActivity: new Date(), tier: 1 },
      { id: 'quality', name: 'Quality Controller', status: 'active', health: 100, contextCount: 0, lastActivity: new Date(), tier: 1 },
      
      // Tier 2
      { id: 'arbitrage', name: 'Arbitrage Hunter', status: 'idle', health: 100, contextCount: 0, lastActivity: new Date(), tier: 2, parent: 'trading' },
      { id: 'market-maker', name: 'Market Maker', status: 'idle', health: 100, contextCount: 0, lastActivity: new Date(), tier: 2, parent: 'trading' },
      { id: 'position', name: 'Position Manager', status: 'idle', health: 100, contextCount: 0, lastActivity: new Date(), tier: 2, parent: 'trading' },
      { id: 'tx-builder', name: 'Transaction Builder', status: 'idle', health: 100, contextCount: 0, lastActivity: new Date(), tier: 2, parent: 'blockchain' },
      { id: 'pool-scanner', name: 'Pool Scanner', status: 'idle', health: 100, contextCount: 0, lastActivity: new Date(), tier: 2, parent: 'blockchain' },
      { id: 'wallet-inspector', name: 'Wallet Inspector', status: 'idle', health: 100, contextCount: 0, lastActivity: new Date(), tier: 2, parent: 'blockchain' },
      { id: 'vuln-scanner', name: 'Vulnerability Scanner', status: 'idle', health: 100, contextCount: 0, lastActivity: new Date(), tier: 2, parent: 'security' },
      { id: 'risk-assessor', name: 'Risk Assessor', status: 'idle', health: 100, contextCount: 0, lastActivity: new Date(), tier: 2, parent: 'security' },
      { id: 'game-engine', name: 'Game Engine', status: 'idle', health: 100, contextCount: 0, lastActivity: new Date(), tier: 2, parent: 'gaming' },
      { id: 'escrow', name: 'Escrow Manager', status: 'idle', health: 100, contextCount: 0, lastActivity: new Date(), tier: 2, parent: 'gaming' },
      { id: 'house-ai', name: 'House AI', status: 'idle', health: 100, contextCount: 0, lastActivity: new Date(), tier: 2, parent: 'gaming' },
      { id: 'matchmaker', name: 'Matchmaker', status: 'idle', health: 100, contextCount: 0, lastActivity: new Date(), tier: 2, parent: 'gaming' },
      { id: 'memory', name: 'Memory Agent', status: 'active', health: 100, contextCount: 0, lastActivity: new Date(), tier: 2, parent: 'context' },
    ];
    setAgents(initialAgents);
  }, []);

  // Simulate agent activity
  useEffect(() => {
    if (!masterActive) return;

    const interval = setInterval(() => {
      setAgents(prev => prev.map(agent => {
        if (agent.id === 'master' || Math.random() > 0.7) {
          return {
            ...agent,
            lastActivity: new Date(),
            contextCount: agent.contextCount + (Math.random() > 0.8 ? 1 : 0),
            health: Math.max(80, Math.min(100, agent.health + (Math.random() - 0.5) * 2)),
          };
        }
        return agent;
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, [masterActive]);

  const handleQuery = useCallback(async () => {
    if (!userQuery.trim()) return;

    const queryLower = userQuery.toLowerCase();
    const isArbitrageQuery = queryLower.includes('arbitrage') || queryLower.includes('find') && (queryLower.includes('opportunity') || queryLower.includes('trade'));

    // Create task
    const task: Task = {
      id: `task-${Date.now()}`,
      agentId: isArbitrageQuery ? 'arbitrage' : 'master',
      description: userQuery,
      status: 'in_progress',
      progress: 0,
      timestamp: new Date(),
    };
    setTasks(prev => [task, ...prev]);

    // Update agents
    setAgents(prev => prev.map(a => 
      (a.id === 'master' || (isArbitrageQuery && a.id === 'arbitrage')) ? { ...a, status: 'processing' as const } : a
    ));

    try {
      // Handle arbitrage scanning
      if (isArbitrageQuery) {
        setIsScanningArbitrage(true);
        setResponse('🔍 **Arbitrage Hunter Activated**\n\nScanning DEX pools for arbitrage opportunities...\n\nThis may take 10-30 seconds...');
        
        // Update progress
        for (let i = 0; i <= 90; i += 10) {
          await new Promise(resolve => setTimeout(resolve, 200));
          setTasks(prev => prev.map(t => 
            t.id === task.id ? { ...t, progress: i } : t
          ));
        }

        // Actually scan for arbitrage
        try {
          scanner.updateConfig(DEFAULT_SCANNER_CONFIG);
          const state = await scanner.scan(connection);
          
          if (state.pools.length > 0) {
            // Initialize Birdeye optimizer if available
            let birdeyeOptimizer: any = undefined;
            try {
              const birdeyeFetcher = scanner.getFetcher('birdeye');
              if (birdeyeFetcher) {
                const { BirdeyeOptimizer } = await import('../lib/pools/birdeye-optimizer');
                birdeyeOptimizer = new BirdeyeOptimizer(birdeyeFetcher as any);
              }
            } catch (error) {
              console.error('Error initializing Birdeye optimizer:', error);
            }
            
            const detector = new ArbitrageDetector(state.pools, DEFAULT_SCANNER_CONFIG, connection, birdeyeOptimizer);
            const opportunities = await detector.detectOpportunities();
            
            // Sort by profit
            opportunities.sort((a, b) => Number(b.profit) - Number(a.profit));
            setArbitrageOpportunities(opportunities);
            
            // Update arbitrage agent
            setAgents(prev => prev.map(a => 
              a.id === 'arbitrage' ? { ...a, status: 'active' as const, lastActivity: new Date() } : a
            ));

            if (opportunities.length > 0) {
              const best = opportunities[0];
              const simpleArb = opportunities.filter(o => o.type === 'simple').length;
              const multiHop = opportunities.filter(o => o.type === 'multi_hop').length;
              const crossProtocol = opportunities.filter(o => o.type === 'cross_protocol').length;
              
              // Analyze the opportunity type and provide strategic insights
              let strategyAdvice = '';
              if (best.type === 'simple') {
                strategyAdvice = '\n**Strategy Analysis:**\n• This is a classic 2-pool spatial arbitrage\n• Best executed atomically via Jito bundles to eliminate execution risk\n• Consider flash loans from Kamino for zero-capital execution';
              } else if (best.type === 'multi_hop') {
                strategyAdvice = '\n**Strategy Analysis:**\n• Multi-hop pathfinding using modified Dijkstra\'s algorithm\n• Higher complexity but potentially better profit margins\n• Requires careful slippage modeling across multiple pools';
              } else if (best.type === 'cross_protocol') {
                strategyAdvice = '\n**Strategy Analysis:**\n• Cross-protocol opportunity (e.g., DEX-DEX arbitrage)\n• May involve different fee structures (0.10% Meteora vs 0.30% Raydium)\n• Atomic execution via Jito bundles is critical for risk-free execution';
              }
              
              const topOpportunities = opportunities.length > 1 
                ? `\n**Top ${Math.min(3, opportunities.length)} Opportunities:**\n${opportunities.slice(0, 3).map((opp, idx) => 
                    `${idx + 1}. ${opp.profit.toFixed(6)} SOL (${opp.profitPercent.toFixed(2)}%) - ${opp.type} - ${(opp.confidence * 100).toFixed(0)}% confidence`
                  ).join('\n')}`
                : '';
              
              const responseText = `✅ **Arbitrage Opportunities Found!**\n\nFound ${opportunities.length} opportunity(ies)\n• Simple (2-pool): ${simpleArb}\n• Multi-hop: ${multiHop}\n• Cross-protocol: ${crossProtocol}\n\n🏆 **Best Opportunity:**\n• Profit: ${best.profit.toFixed(6)} SOL (${best.profitPercent.toFixed(2)}%)\n• Type: ${best.type}\n• Confidence: ${(best.confidence * 100).toFixed(0)}%\n• Path: ${best.path.startToken?.symbol || 'Token A'} → ${best.path.endToken?.symbol || 'Token B'}\n• Hops: ${best.path.totalHops || 1}\n• Net Profit (after gas): ${best.netProfit.toFixed(6)} SOL${strategyAdvice}${topOpportunities}\n\n💡 **Execution Recommendations:**\n• Use Jito bundles for atomic execution (eliminates execution risk)\n• Consider Kamino flash loans for zero-capital arbitrage\n• Monitor ShredStream for MEV opportunities\n• Use the Arbitrage Scanner view to build transactions`;
              
              setResponse(responseText);
            } else {
              setResponse(`🔍 **Scan Complete**\n\nNo arbitrage opportunities found at this time.\n\n• Scanned ${state.pools.length} pools across multiple DEXs\n• Checked for:\n  - Simple 2-pool arbitrage\n  - Multi-hop triangular arbitrage\n  - Cross-protocol opportunities\n\n**Why no opportunities?**\n• Market efficiency: Price gaps may have been closed by other bots\n• Low volatility: Arbitrage requires price discrepancies\n• High competition: 98% of arbitrage attempts fail (by design)\n\n**Advanced Strategies to Consider:**\n• Monitor Jito ShredStream for MEV opportunities (front-running/back-running)\n• Watch for new pool creation events (initialize2 on Raydium)\n• Track LSD de-pegging (mSOL, JitoSOL price deviations)\n• Consider flash loan arbitrage for zero-capital strategies\n\n💡 Try during higher volatility periods or monitor for unconventional opportunities.`);
            }
          } else {
            setResponse('⚠️ **Scan Failed**\n\nNo pools were found. This could be due to:\n• Network connectivity issues\n• DEX API limitations\n• Configuration problems\n\nPlease try again or check the Arbitrage Scanner view.');
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          setResponse(`❌ **Error Scanning for Arbitrage**\n\n${errorMsg}\n\nPlease try again or check your connection.`);
        } finally {
          setIsScanningArbitrage(false);
        }
      } else {
        // Regular AI processing
        // Get context via GET request
        const contextResponse = await fetch(
          `/api/context?agentId=master&sessionId=${publicKey?.toString() || 'default'}&action=summary`
        );
        const context = contextResponse.ok ? await contextResponse.json() : null;

        // Simulate processing
        for (let i = 0; i <= 100; i += 10) {
          await new Promise(resolve => setTimeout(resolve, 100));
          setTasks(prev => prev.map(t => 
            t.id === task.id ? { ...t, progress: i } : t
          ));
        }

        // Save context
        await contextManager.saveContext(
          'master',
          publicKey?.toString() || 'default',
          {
            query: userQuery,
            timestamp: new Date().toISOString(),
          },
          {
            tags: ['user-query', 'interaction'],
            priority: 'medium',
          }
        );

        // Generate intelligent response based on query content
        let responseText = '';
        const queryLower = userQuery.toLowerCase();
        
        if (queryLower.includes('jito') || queryLower.includes('bundle') || queryLower.includes('mev')) {
          responseText = `🤖 **Master AI - MEV Strategy Analysis**\n\nI've analyzed your query about Jito/MEV strategies.\n\n**Jito Bundles & Atomic Arbitrage:**\n• Jito bundles enable atomic execution (all-or-nothing)\n• Up to 5 transactions executed sequentially and atomically\n• Eliminates execution risk - if any transaction fails, entire bundle reverts\n• Tip-based auction system (10k-50k lamports competitive)\n\n**Key APIs to Watch:**\n• Jito ShredStream (gRPC): Lowest latency feed for MEV opportunities\n• Jito Block Engine: Submit bundles via sendBundle API\n• Monitor for large swaps, new pool creation, oracle updates\n\n**Advanced Strategies:**\n• Front-running: Spot large pending swaps, buy before, sell after\n• Back-running: Follow profitable transactions (liquidations, new pools)\n• Protected Arbitrage: Bundle user's swap + your arbitrage + profit split\n\n💡 Ask me to "Find arbitrage opportunities" to scan real DEX pools!`;
        } else if (queryLower.includes('flash loan') || queryLower.includes('kamino')) {
          responseText = `🤖 **Master AI - Flash Loan Strategy**\n\n**Zero-Capital Arbitrage via Flash Loans:**\n• Flash loans must be borrowed and repaid in same transaction\n• Perfect for atomic arbitrage (all-or-nothing execution)\n• Kamino Lend provides Solana-native flash loan primitives\n\n**Execution Blueprint:**\n1. Flash borrow capital (e.g., 10,000 USDC from Kamino)\n2. Execute arbitrage swaps (e.g., USDC → SOL → USDC)\n3. Repay flash loan + fee from proceeds\n4. Keep profit (all in one atomic Jito bundle)\n\n**Key Benefits:**\n• Zero starting capital required\n• Zero capital risk (transaction reverts if arbitrage fails)\n• Maximum capital efficiency\n\n💡 Flash loans transform arbitrage from capital-bound to information-bound!`;
        } else if (queryLower.includes('strategy') || queryLower.includes('how to') || queryLower.includes('method')) {
          responseText = `🤖 **Master AI - Arbitrage Strategy Guide**\n\n**Types of Arbitrage on Solana:**\n\n1. **Spatial Arbitrage (DEX-DEX):**\n   • Exploit price differences between pools (e.g., Raydium vs Orca)\n   • Classic 2-pool model\n\n2. **Triangular Arbitrage:**\n   • Price loop: SOL → USDC → BONK → SOL\n   • Uses modified Dijkstra's algorithm for pathfinding\n\n3. **Atomic Arbitrage (via Jito):**\n   • Both buy and sell in single atomic transaction\n   • Eliminates execution risk completely\n   • 98% failure rate is by design (speculative spam protection)\n\n4. **MEV Strategies:**\n   • Front-running: Sandwich attacks on large swaps\n   • Back-running: Liquidations, new pool sniping\n   • Protected Arbitrage: Shared MEV with users\n\n**APIs to Monitor:**\n• Jito ShredStream (gRPC) - MEV opportunities\n• WebSocket onLogs - New pool creation (Raydium initialize2)\n• Program subscriptions - Account state changes\n\n💡 Ask me to "Find arbitrage opportunities" for real-time scanning!`;
        } else {
          responseText = `🤖 **Master AI Response**\n\nI've analyzed your query: "${userQuery}"\n\n${context ? `📊 Context: ${context.totalContexts} previous interactions found\n` : ''}✅ Processing complete. All agents are coordinating to handle this request.\n\n**Available Capabilities:**\n• Real-time arbitrage scanning across multiple DEXs\n• MEV strategy analysis (Jito bundles, front-running, back-running)\n• Flash loan arbitrage strategies\n• Pathfinding algorithm insights\n• Market analysis and opportunity detection\n\n**Next Steps:**\n- Routing to appropriate Tier 1 agent\n- Gathering context from specialized agents\n- Generating comprehensive response\n\n💡 Try asking:\n• "Find arbitrage opportunities" - Real-time market scanning\n• "Explain Jito bundles" - MEV execution strategies\n• "How do flash loans work?" - Zero-capital arbitrage`;

        }

        setResponse(responseText);
      }

      setTasks(prev => prev.map(t => 
        t.id === task.id ? { ...t, status: 'completed' as const, progress: 100 } : t
      ));
      setAgents(prev => prev.map(a => 
        (a.id === 'master' || a.id === 'arbitrage') ? { ...a, status: 'active' as const } : a
      ));
    } catch (error) {
      setTasks(prev => prev.map(t => 
        t.id === task.id ? { ...t, status: 'failed' as const } : t
      ));
      setAgents(prev => prev.map(a => 
        (a.id === 'master' || a.id === 'arbitrage') ? { ...a, status: 'error' as const } : a
      ));
      setResponse(`❌ **Error**\n\n${error instanceof Error ? error.message : 'An unknown error occurred'}`);
    }

    setUserQuery('');
  }, [userQuery, publicKey, contextManager, connection, scanner]);

  const getAgentIcon = (agentId: string) => {
    const icons: Record<string, React.ReactNode> = {
      master: <Brain className="w-5 h-5" />,
      trading: <TrendingUp className="w-5 h-5" />,
      blockchain: <Network className="w-5 h-5" />,
      security: <Shield className="w-5 h-5" />,
      gaming: <Gamepad2 className="w-5 h-5" />,
      context: <Database className="w-5 h-5" />,
      quality: <CheckCircle className="w-5 h-5" />,
    };
    return icons[agentId] || <Activity className="w-5 h-5" />;
  };

  const getStatusColor = (status: AgentStatus['status']) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'processing': return 'bg-blue-500 animate-pulse';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const tier1Agents = agents.filter(a => a.tier === 1);
  const tier2Agents = agents.filter(a => a.tier === 2);
  const tier3Agents = agents.filter(a => a.tier === 3);

  return (
    <div className="min-h-screen animated-bg text-white relative overflow-y-auto">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>
      
      {/* Header */}
      <div className="relative z-10 border-b border-purple-800/50 glass-strong">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Brain className="w-10 h-10 text-purple-400 animate-pulse" />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-slate-900 animate-ping" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                  AI Cyber Playground
                </h1>
                <p className="text-sm text-gray-400">The Future of AI-Powered DeFi</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setMasterActive(!masterActive)}
                className={`px-6 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                  masterActive
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {masterActive ? (
                  <>
                    <Pause className="w-4 h-4" />
                    Stop Master
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Start Master
                  </>
                )}
              </button>
              {onBack && (
                <button
                  onClick={onBack}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Back
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Command Center */}
          <div className="lg:col-span-2 space-y-6">
            {/* Master AI Command Interface */}
            <div className="card-modern card-glow p-6">
              <div className="flex items-center gap-3 mb-4">
                <Brain className="w-8 h-8 text-purple-400" />
                <div>
                  <h2 className="text-xl font-bold">Master AI Orchestrator</h2>
                  <p className="text-sm text-gray-400">Central command for all agents</p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${masterActive ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
                  <span className="text-sm">{masterActive ? 'Active' : 'Idle'}</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="text-center text-gray-400 py-8">
                  <Brain className="w-16 h-16 mx-auto mb-4 text-purple-400 opacity-50" />
                  <p className="text-lg font-medium">AI Orchestration Paused</p>
                  <p className="text-sm">Master AI agents are currently offline for maintenance.</p>
                </div>
              </div>
            </div>

            {/* Agent Hierarchy Visualization */}
            <div className="card-modern p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-400" />
                Agent Hierarchy
              </h3>

              {/* Tier 1 Agents */}
              <div className="mb-6">
                <div className="text-sm font-semibold text-purple-400 mb-3">Tier 1: Strategic Agents</div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {tier1Agents.map(agent => (
                    <div
                      key={agent.id}
                      onClick={() => setSelectedAgent(agent.id)}
                      className={`card-modern p-3 cursor-pointer ${
                        selectedAgent === agent.id
                          ? 'border-purple-500 glow-purple'
                          : ''
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {getAgentIcon(agent.id)}
                        <span className="text-sm font-medium">{agent.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(agent.status)}`} />
                        <span>{agent.status}</span>
                        <span className="ml-auto">Health: {agent.health}%</span>
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        Context: {agent.contextCount}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tier 2 Agents */}
              <div>
                <div className="text-sm font-semibold text-blue-400 mb-3">Tier 2: Execution Agents</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {tier2Agents.map(agent => (
                    <div
                      key={agent.id}
                      onClick={() => setSelectedAgent(agent.id)}
                      className={`p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                        selectedAgent === agent.id
                          ? 'border-blue-500 bg-blue-900/30'
                          : 'border-blue-700/50 bg-slate-800/50 hover:border-blue-600'
                      }`}
                    >
                      <div className="flex items-center gap-1 mb-1">
                        <div className={`w-1.5 h-1.5 rounded-full ${getStatusColor(agent.status)}`} />
                        <span className="truncate">{agent.name}</span>
                      </div>
                      <div className="text-gray-500 text-[10px]">
                        {agent.health}% • {agent.contextCount} ctx
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Task Queue */}
            <div className="card-modern p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-purple-400" />
                Task Queue
              </h3>
              <div className="space-y-2">
                {tasks.slice(0, 5).map(task => (
                  <div
                    key={task.id}
                    className="card-modern p-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{task.description}</span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        task.status === 'completed' ? 'bg-green-900/50 text-green-400' :
                        task.status === 'failed' ? 'bg-red-900/50 text-red-400' :
                        task.status === 'in_progress' ? 'bg-blue-900/50 text-blue-400' :
                        'bg-gray-900/50 text-gray-400'
                      }`}>
                        {task.status}
                      </span>
                    </div>
                    {task.status === 'in_progress' && (
                      <div className="w-full bg-slate-900 rounded-full h-1.5">
                        <div
                          className="bg-gradient-to-r from-purple-500 to-blue-500 h-1.5 rounded-full transition-all"
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                ))}
                {tasks.length === 0 && (
                  <div className="text-center text-gray-500 py-8">No tasks yet</div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* System Stats */}
            <div className="card-modern p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-400" />
                System Stats
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Total Agents</span>
                  <span className="font-bold">{agents.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Active Agents</span>
                  <span className="font-bold text-green-400">
                    {agents.filter(a => a.status === 'active' || a.status === 'processing').length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Total Contexts</span>
                  <span className="font-bold">
                    {agents.reduce((sum, a) => sum + a.contextCount, 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">System Health</span>
                  <span className="font-bold text-green-400">
                    {Math.round(agents.reduce((sum, a) => sum + a.health, 0) / agents.length)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Selected Agent Details */}
            {selectedAgent && (
              <div className="card-modern p-6">
                <h3 className="text-lg font-bold mb-4">Agent Details</h3>
                {(() => {
                  const agent = agents.find(a => a.id === selectedAgent);
                  if (!agent) return null;
                  return (
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm text-gray-400">Name</div>
                        <div className="font-semibold">{agent.name}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-400">Status</div>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${getStatusColor(agent.status)}`} />
                          <span className="capitalize">{agent.status}</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-400">Health</div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-800 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full"
                              style={{ width: `${agent.health}%` }}
                            />
                          </div>
                          <span className="text-sm">{agent.health}%</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-400">Context Count</div>
                        <div className="font-semibold">{agent.contextCount}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-400">Last Activity</div>
                        <div className="text-xs text-gray-500">
                          {agent.lastActivity.toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Quick Actions */}
            <div className="card-modern p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                Quick Actions
              </h3>
              <div className="space-y-2">
                <button
                  disabled
                  className="w-full text-left px-4 py-2 bg-gray-700/50 rounded-lg transition-colors text-sm text-gray-500 cursor-not-allowed"
                  title="AI orchestration currently paused"
                >
                  🔍 Find Arbitrage (Disabled)
                </button>
                <button
                  disabled
                  className="w-full text-left px-4 py-2 bg-gray-700/50 rounded-lg transition-colors text-sm text-gray-500 cursor-not-allowed"
                  title="AI orchestration currently paused"
                >
                  🛡️ Security Audit (Disabled)
                </button>
                <button
                  disabled
                  className="w-full text-left px-4 py-2 bg-gray-700/50 rounded-lg transition-colors text-sm text-gray-500 cursor-not-allowed"
                  title="AI orchestration currently paused"
                >
                  🎲 Create Game (Disabled)
                </button>
                <button
                  disabled
                  className="w-full text-left px-4 py-2 bg-gray-700/50 rounded-lg transition-colors text-sm text-gray-500 cursor-not-allowed"
                  title="AI orchestration currently paused"
                >
                  📊 System Health (Disabled)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

