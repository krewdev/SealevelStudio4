'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageSquare, 
  X, 
  Bot,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import { AVAILABLE_AGENTS } from '../lib/agents/agents';
import { AgentChat } from './AgentChat';
import type { SimpleBlock } from './UnifiedTransactionBuilder';
import { Transaction } from '@solana/web3.js';
import { ArbitrageOpportunity, PoolData } from '../lib/pools/types';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useUsageTracking } from '../hooks/useUsageTracking';
import { AgentSuggestion } from '../lib/agents/types';

interface UnifiedAIAgentsProps {
  // Transaction Agent props
  simpleWorkflow?: SimpleBlock[];
  transactionDraft?: any;
  onAddBlock?: (block: SimpleBlock) => void;
  onUpdateBlock?: (blockId: string, params: Record<string, string>) => void;
  errors?: string[];
  warnings?: string[];
  availableBlocks?: SimpleBlock[];
  onExplainBlock?: (blockId: string) => void;
  onOptimize?: () => void;
  
  // Scanner Agent props
  opportunities?: ArbitrageOpportunity[];
  pools?: PoolData[];
  selectedOpportunity?: ArbitrageOpportunity | null;
  onSelectOpportunity?: (opportunity: ArbitrageOpportunity) => void;
  onBuildTransaction?: (opportunity: ArbitrageOpportunity) => void;
  
  // Simulator Agent props
  transaction?: Transaction | null;
  onFixErrors?: (fixes: any[]) => void;
}

export function UnifiedAIAgents(props: UnifiedAIAgentsProps) {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const { checkFeatureAccess, trackFeatureUsage, getStats, getTrialStatus, isTrialActive } = useUsageTracking();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('transaction-assistant');
  const [isMinimized, setIsMinimized] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Get enabled agents only
  const enabledAgents = AVAILABLE_AGENTS.filter(agent => agent.enabled);

  // Set default tab to first enabled agent
  useEffect(() => {
    if (enabledAgents.length > 0 && !enabledAgents.find(a => a.id === activeTab)) {
      setActiveTab(enabledAgents[0].id);
    }
  }, []);

  // Response generators for each agent
  const handleAgentSend = async (message: string): Promise<{ content: string; suggestions?: AgentSuggestion[] }> => {
    // Check access
    const access = checkFeatureAccess('ai_query');
    if (!access.allowed) {
      return {
        content: `⚠️ ${access.reason || 'AI queries not available. Please check your subscription or free trial status.'}`,
      };
    }

    // Track usage
    trackFeatureUsage('ai_query', { messageLength: message.length });

    // Route to appropriate agent handler
    switch (activeTab) {
      case 'transaction-assistant':
        return generateTransactionResponse(message, props.simpleWorkflow || [], props.errors || [], props.warnings || []);
      
      case 'scanner-agent':
        return generateScannerResponse(message, props.opportunities || [], props.selectedOpportunity || null, props.pools || []);
      
      case 'simulator-agent':
        return generateSimulatorResponse(message, props.transaction || null, props.simpleWorkflow || []);
      
      case 'account-security-agent':
        return await generateAccountSecurityResponse(message, publicKey, connection, { getStats, getTrialStatus, isTrialActive });
      
      case 'global-scanner-agent':
        return await generateGlobalScannerResponse(message, publicKey, connection);
      
      default:
        return { content: 'Agent not available.' };
    }
  };

  const handleSuggestion = (suggestion: AgentSuggestion) => {
    if (suggestion.action) {
      suggestion.action();
    }
    if (suggestion.data) {
      if (suggestion.data.opportunity && props.onSelectOpportunity) {
        props.onSelectOpportunity(suggestion.data.opportunity);
      }
      if (suggestion.data.opportunity && props.onBuildTransaction) {
        props.onBuildTransaction(suggestion.data.opportunity);
      }
    }
  };

  // Get initial messages and auto-messages for each agent
  const getAgentConfig = (): { name: string; initialMessage: string; icon: React.ReactNode; autoMessages?: Array<{ delay: number; content: string }> } => {
    const agent = enabledAgents.find(a => a.id === activeTab);
    if (!agent) return { name: 'AI Agent', initialMessage: 'Hello! How can I help?', icon: <Bot size={16} /> };

    const configs: Record<string, { name: string; initialMessage: string; icon: React.ReactNode; autoMessages?: Array<{ delay: number; content: string }> }> = {
      'transaction-assistant': {
        name: 'Transaction Assistant',
        initialMessage: "👋 Hi! I'm your Transaction Assistant. I can help you build Solana transactions, suggest optimizations, and explain what each instruction does. What would you like to build?",
        icon: <Bot size={16} />,
      },
      'scanner-agent': {
        name: 'Scanner AI Agent',
        initialMessage: "👋 Hi! I'm your Arbitrage Scanner AI. I analyze opportunities, calculate risk/reward ratios, suggest optimal entry/exit points, and detect market manipulation. What would you like to know?",
        icon: <Bot size={16} />,
        autoMessages: props.opportunities && props.opportunities.length > 0 ? [{
          delay: 2000,
          content: `🔍 I found ${props.opportunities.length} arbitrage opportunity(ies). Would you like me to analyze them?`,
        }] : undefined,
      },
      'simulator-agent': {
        name: 'Simulator AI Agent',
        initialMessage: "👋 Hi! I'm your Transaction Simulator AI. I predict transaction outcomes, detect failures before execution, optimize compute units, and suggest improvements. Ready to analyze your transaction!",
        icon: <Bot size={16} />,
      },
      'account-security-agent': {
        name: 'Account & Security Agent',
        initialMessage: "👋 Hi! I'm your Account & Security Assistant. I can help you with usage tracking, payments, security recommendations, and account details. What would you like to know?",
        icon: <Bot size={16} />,
      },
      'global-scanner-agent': {
        name: 'Global Scanner Agent',
        initialMessage: "👋 Hi! I'm your Global Scanner AI. I provide blockchain analytics using Dune Analytics and Solscan API. What would you like to explore?",
        icon: <Bot size={16} />,
      },
    };

    return configs[activeTab] || { name: agent.name, initialMessage: 'Hello! How can I help?', icon: <Bot size={16} /> };
  };

  const agentConfig = getAgentConfig();

  // Get active agent info
  const activeAgent = enabledAgents.find(a => a.id === activeTab);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 group"
        title="Open AI Agents"
      >
        <Sparkles size={20} className="group-hover:rotate-12 transition-transform" />
        <span className="font-medium">AI Agents</span>
        {enabledAgents.length > 0 && (
          <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
            {enabledAgents.length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div
      ref={panelRef}
      className={`fixed bottom-6 right-6 z-50 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl transition-all duration-300 ${
        isMinimized ? 'w-80 h-16' : 'w-[500px] h-[600px]'
      } flex flex-col`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800/50">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-purple-400" />
            <h3 className="font-semibold text-white">AI Agents</h3>
          </div>
          
          {/* Tabs */}
          {!isMinimized && (
            <div className="flex items-center gap-1 ml-4 flex-1 overflow-x-auto scrollbar-hide">
              {enabledAgents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => setActiveTab(agent.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                    activeTab === agent.id
                      ? `${agent.color} text-white`
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                  title={agent.description}
                >
                  <span>{agent.icon}</span>
                  <span className="hidden sm:inline">{agent.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            {isMinimized ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Agent Content */}
      {!isMinimized && (
        <div className="flex-1 overflow-hidden relative">
          <AgentChat
            agentName={agentConfig.name}
            agentIcon={agentConfig.icon}
            initialMessage={agentConfig.initialMessage}
            onSend={handleAgentSend}
            onSuggestion={handleSuggestion}
            autoMessages={agentConfig.autoMessages || []}
          />
        </div>
      )}

      {/* Minimized View */}
      {isMinimized && activeAgent && (
        <div className="flex items-center justify-between px-4 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-lg">{activeAgent.icon}</span>
            <div>
              <p className="text-sm font-medium text-white">{activeAgent.name}</p>
              <p className="text-xs text-gray-400 truncate max-w-[200px]">
                {activeAgent.description}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsMinimized(false)}
            className="text-purple-400 hover:text-purple-300 transition-colors"
          >
            <ChevronUp size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

// Response generator functions for each agent
function generateTransactionResponse(
  message: string,
  workflow: SimpleBlock[],
  errors: string[],
  warnings: string[]
): { content: string; suggestions?: AgentSuggestion[] } {
  const lowerMessage = message.toLowerCase();
  
  // Natural language transaction building
  if ((lowerMessage.includes('send') || lowerMessage.includes('transfer')) && 
      (lowerMessage.includes('token') || lowerMessage.includes('coin'))) {
    return {
      content: `✅ **Transfer Token**\n\nI can help you transfer tokens! Here's what you need:\n\n• **Transfer Token Block**: Add this to your workflow\n• **Destination**: Recipient's token account address\n• **Amount**: Amount to transfer (in token's smallest unit)\n• **Source**: Your token account (if not using default)\n\n💡 Ask me to "add transfer token block" and I'll add it for you!`,
      suggestions: [
        {
          type: 'explain',
          title: 'Explain Token Transfer',
          description: 'Learn more about token transfers',
        }
      ]
    };
  }

  if ((lowerMessage.includes('send') || lowerMessage.includes('transfer')) && 
      (lowerMessage.includes('sol') || lowerMessage.includes('lamport'))) {
    return {
      content: `✅ **Transfer SOL**\n\nI can help you transfer SOL! Here's what you need:\n\n• **Transfer SOL Block**: Add this to your workflow\n• **To**: Recipient wallet address\n• **Amount**: Amount in lamports (1 SOL = 1,000,000,000 lamports)\n\n💡 Example: 0.1 SOL = 100,000,000 lamports\n\nAsk me to "add transfer SOL block" and I'll add it for you!`,
      suggestions: [
        {
          type: 'explain',
          title: 'Explain SOL Transfer',
          description: 'Learn more about SOL transfers',
        }
      ]
    };
  }

  if (lowerMessage.includes('stake') || lowerMessage.includes('staking') || lowerMessage.includes('delegate')) {
    return {
      content: `📌 **Staking Tokens**\n\nTo stake SOL on Solana:\n\n1. **Create Stake Account**: Use the "Create Stake Account" block\n2. **Delegate Stake**: Use the "Delegate Stake" block\n   - Set validator public key\n   - Set amount to stake (in lamports)\n\n💡 Staking helps secure the network and earns you rewards!\n\nAsk me to "add staking block" and I'll help you set it up!`,
      suggestions: [
        {
          type: 'explain',
          title: 'Explain Staking',
          description: 'Learn more about Solana staking',
        }
      ]
    };
  }

  if (lowerMessage.includes('collect') && lowerMessage.includes('rent') || 
      lowerMessage.includes('close') && lowerMessage.includes('account')) {
    return {
      content: `💰 **Collecting Rent**\n\nTo collect rent from closed accounts:\n\n1. **Close Account**: Use the "Close Account" block\n   - This closes an account and returns rent to the owner\n   - Specify the account to close\n   - Set the destination for the rent (usually your wallet)\n\n💡 Closing unused accounts returns the rent-exempt balance to you!\n\nAsk me to "add close account block" and I'll help you set it up!`,
      suggestions: [
        {
          type: 'explain',
          title: 'Explain Rent Collection',
          description: 'Learn more about Solana rent',
        }
      ]
    };
  }

  if (lowerMessage.includes('swap') || lowerMessage.includes('trade') || lowerMessage.includes('exchange')) {
    return {
      content: `✅ **Jupiter Swap**\n\nI can help you swap tokens! Here's what you need:\n\n• **Jupiter Swap Block**: Add this to your workflow\n• **Input Token**: Token mint address to swap from\n• **Output Token**: Token mint address to swap to\n• **Amount**: Input amount (in token's smallest unit)\n• **Min Amount Out**: Minimum output (slippage protection)\n\n💡 Jupiter provides the best rates across all Solana DEXs!\n\nAsk me to "add swap block" and I'll add it for you!`,
      suggestions: [
        {
          type: 'explain',
          title: 'Explain Jupiter Swap',
          description: 'Learn more about Jupiter aggregator',
        }
      ]
    };
  }

  if (lowerMessage.includes('bridge') || lowerMessage.includes('cross-chain') || lowerMessage.includes('wormhole')) {
    return {
      content: `🌉 **Bridging Tokens**\n\nTo bridge tokens across chains:\n\n1. **Wormhole Bridge**: Use Wormhole protocol for cross-chain transfers\n   - Supports: Ethereum, BSC, Polygon, Avalanche, and more\n   - Bridge SOL or SPL tokens\n\n2. **Steps**:\n   - Lock tokens on source chain\n   - Wait for confirmation\n   - Redeem on destination chain\n\n💡 Available via Wormhole integration. Would you like me to add a bridge block?`,
      suggestions: [
        {
          type: 'explain',
          title: 'Explain Bridging',
          description: 'Learn more about cross-chain bridges',
        }
      ]
    };
  }
  
  if (lowerMessage.includes('transfer') || lowerMessage.includes('send')) {
    return {
      content: `To transfer SOL or tokens:\n\n1. **Transfer SOL**: Use the "Transfer SOL" block\n   - Set recipient address\n   - Set amount in lamports (1 SOL = 1,000,000,000 lamports)\n\n2. **Transfer Token**: Use the "Transfer Token" block\n   - Set destination token account\n   - Set amount to transfer`,
    };
  }
  
  if (errors.length > 0) {
    return {
      content: `I found ${errors.length} error(s):\n\n${errors.map(e => `• ${e}`).join('\n')}\n\nCommon fixes:\n• Check address format (base58)\n• Verify amounts in correct units\n• Ensure all required fields are filled`,
      suggestions: errors.slice(0, 3).map(error => ({
        type: 'fix_error' as const,
        title: `Fix: ${error}`,
        description: 'Get help with this error',
      })),
    };
  }
  
  return {
    content: `I can help you with:\n\n• 🧱 Adding blocks\n• ⚙️ Configuring parameters\n• 🐛 Fixing errors\n• ⚡ Optimizing transactions\n• 📚 Explaining how things work\n\nWhat would you like to do?`,
  };
}

function generateScannerResponse(
  message: string,
  opportunities: ArbitrageOpportunity[],
  selectedOpportunity: ArbitrageOpportunity | null,
  pools: PoolData[]
): { content: string; suggestions?: AgentSuggestion[] } {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('best') || lowerMessage.includes('top')) {
    if (opportunities.length === 0) {
      return { content: 'No opportunities available. Please scan for opportunities first.' };
    }
    const best = [...opportunities].sort((a, b) => b.netProfit - a.netProfit)[0];
    return {
      content: `🏆 **Best Opportunity**\n\nProfit: ${best.netProfit.toFixed(6)} SOL (${best.profitPercent.toFixed(2)}%)\nConfidence: ${best.confidence}\nPath: ${best.path.startToken.symbol} → ${best.path.endToken.symbol}\nHops: ${best.path.totalHops}`,
      suggestions: [{
        type: 'explain' as const,
        title: 'Analyze this opportunity',
        description: 'Get detailed analysis',
        data: { opportunity: best },
      }],
    };
  }
  
  if (lowerMessage.includes('risk') || lowerMessage.includes('safe')) {
    if (selectedOpportunity) {
      return {
        content: `📊 **Risk Assessment**\n\nAnalyzing:\n• Profit margin stability\n• Path complexity\n• Liquidity risks\n• Gas cost efficiency\n• Market manipulation indicators\n\nWould you like a detailed analysis?`,
      };
    }
    return {
      content: 'To assess risk, please select an opportunity first.',
    };
  }
  
  return {
    content: `I can help you with:\n\n• 🔍 Analyzing opportunities\n• 📊 Risk assessment\n• 💰 Profit calculations\n• 🎯 Strategy suggestions\n• ⚠️ Market manipulation detection\n\nWhat would you like to know?`,
  };
}

function generateSimulatorResponse(
  message: string,
  transaction: Transaction | null,
  workflow: SimpleBlock[]
): { content: string; suggestions?: AgentSuggestion[] } {
  const lowerMessage = message.toLowerCase();
  
  if (!transaction) {
    return {
      content: 'No transaction available for analysis. Please build a transaction first.',
    };
  }
  
  if (lowerMessage.includes('predict') || lowerMessage.includes('outcome')) {
    return {
      content: `🔮 **Outcome Prediction**\n\nAnalyzing transaction:\n• Account states\n• Compute units\n• Fee estimation\n• Potential errors\n• Success probability\n\nI'll provide a detailed prediction shortly!`,
    };
  }
  
  if (lowerMessage.includes('optimize')) {
    return {
      content: `⚡ **Optimization Analysis**\n\nChecking:\n• Transaction size\n• Account usage\n• Compute units\n• Fee optimization\n• Instruction ordering\n\nI'll provide suggestions shortly!`,
    };
  }
  
  return {
    content: `I can help you with:\n\n• 🔮 Predicting outcomes\n• ⚡ Optimizing transactions\n• 🐛 Detecting failures\n• 💰 Cost estimation\n• 📊 Compute unit analysis\n\nWhat would you like to analyze?`,
  };
}

async function generateAccountSecurityResponse(
  message: string,
  publicKey: any,
  connection: any,
  helpers: { getStats: any; getTrialStatus: any; isTrialActive: any }
): Promise<{ content: string; suggestions?: AgentSuggestion[] }> {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('usage') || lowerMessage.includes('stats')) {
    const stats = helpers.getStats('all_time');
    return {
      content: `📊 **Usage Statistics**\n\nTotal Features Used: ${stats.totalFeaturesUsed}\nActive Trial: ${helpers.isTrialActive() ? 'Yes' : 'No'}\n\nWould you like detailed breakdown?`,
    };
  }
  
  if (lowerMessage.includes('balance') || lowerMessage.includes('seal')) {
    return {
      content: `💰 **SEAL Token Balance**\n\nChecking your SEAL balance...\n\n(Payment collection is disabled during beta)`,
    };
  }
  
  if (lowerMessage.includes('trial') || lowerMessage.includes('free')) {
    const trial = helpers.getTrialStatus();
    return {
      content: `🎁 **Free Trial Status**\n\nActive: ${trial.isActive ? 'Yes' : 'No'}\nDays Remaining: ${trial.daysRemaining}\nFeatures Used: ${trial.featuresUsed}\n\nWould you like to see your usage limits?`,
    };
  }
  
  return {
    content: `I can help you with:\n\n• 📊 Usage tracking\n• 💰 SEAL balance & payments\n• 🔐 Security recommendations\n• 📈 Account information\n• 🎁 Free trial status\n\nWhat would you like to know?`,
  };
}

async function generateGlobalScannerResponse(
  message: string,
  publicKey: any,
  connection: any
): Promise<{ content: string; suggestions?: AgentSuggestion[] }> {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('wallet') || lowerMessage.includes('address')) {
    if (publicKey) {
      return {
        content: `🔍 **Wallet Analysis**\n\nAnalyzing wallet: ${publicKey.toString().slice(0, 8)}...\n\nFetching data from Dune Analytics and Solscan...`,
      };
    }
    return {
      content: 'Please connect your wallet to analyze it.',
    };
  }
  
  if (lowerMessage.includes('token') || lowerMessage.includes('price')) {
    return {
      content: `📊 **Token Analysis**\n\nI can analyze:\n• Token price history\n• Trading volume\n• Holder distribution\n• Market trends\n\nWhich token would you like to analyze?`,
    };
  }
  
  return {
    content: `I can help you with:\n\n• 🔍 Wallet analysis\n• 📊 Token analytics\n• 📈 Market trends\n• 💹 Trading data\n• 🌐 Blockchain insights\n\nWhat would you like to explore?`,
  };
}

