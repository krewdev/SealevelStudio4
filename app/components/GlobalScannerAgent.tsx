// Global Scanner AI Agent
// Integrates with Dune Analytics and Solscan API for blockchain analytics

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Globe,
  Send,
  X,
  User,
  TrendingUp,
  BarChart3,
  Search,
  AlertCircle,
  CheckCircle,
  Zap,
  Database,
  ExternalLink,
} from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { AgentMessage, AgentSuggestion } from '../lib/agents/types';
import { useUsageTracking } from '../hooks/useUsageTracking';
import {
  getSolscanAccountInfo,
  getSolscanAccountTokens,
  getSolscanAccountTransactions,
  getSolscanTokenInfo,
  getSolscanTokenMarket,
} from '../lib/analytics/solscan';
import {
  executeDuneQuery,
  getDuneQueryResults,
  POPULAR_DUNE_QUERIES,
} from '../lib/analytics/dune';

interface GlobalScannerAgentProps {
  // Optional props for future expansion
}

export function GlobalScannerAgent({}: GlobalScannerAgentProps) {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const { trackFeatureUsage, checkFeatureAccess } = useUsageTracking();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AgentMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: "🌐 Hi! I'm your Global Scanner AI Agent. I provide blockchain analytics and insights using Dune Analytics and Solscan.\n\nI can help you with:\n\n• 📊 **Account Analytics**: Analyze wallet addresses, tokens, and transactions\n• 📈 **Token Research**: Get token information, prices, and market data\n• 🔍 **Network Insights**: Query Dune Analytics for on-chain data\n• 📉 **Transaction History**: View and analyze transaction history\n• 💡 **Smart Insights**: Get AI-powered analysis of blockchain data\n\nWhat would you like to explore?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addMessage = useCallback(
    (role: 'user' | 'assistant', content: string, suggestions?: AgentSuggestion[]) => {
      const newMessage: AgentMessage = {
        id: Date.now().toString(),
        role,
        content,
        timestamp: new Date(),
        suggestions,
      };

      setMessages(prev => [...prev, newMessage]);
    },
    []
  );

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    // Check if user can use AI agent
    const access = checkFeatureAccess('ai_query');
    if (!access.allowed) {
      addMessage('assistant', `⚠️ ${access.reason || 'AI queries not available. Please check your subscription or free trial status.'}`);
      return;
    }

    const userMessage = input.trim();
    setInput('');
    addMessage('user', userMessage);

    // Track usage
    trackFeatureUsage('ai_query', {
      agent: 'global-scanner',
      messageLength: userMessage.length,
    });

    setIsTyping(true);

    // Generate response
    setTimeout(async () => {
      const response = await generateResponse(userMessage, publicKey, connection);
      addMessage('assistant', response.content, response.suggestions);
      setIsTyping(false);
    }, 1000);
  };

  const handleSuggestion = (suggestion: AgentSuggestion) => {
    if (suggestion.action) {
      suggestion.action();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Agent Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-24 right-4 z-50 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white p-4 rounded-full shadow-lg transition-all flex items-center gap-2"
        title="Global Scanner Agent"
      >
        <Globe size={20} />
        {isOpen ? <X size={16} /> : null}
      </button>

      {/* Agent Chat Window */}
      {isOpen && (
        <div className="fixed bottom-32 right-4 z-50 w-96 h-[600px] bg-slate-900 border border-slate-700 rounded-lg shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-gradient-to-r from-blue-600 to-cyan-600">
            <div className="flex items-center gap-2">
              <Globe size={20} className="text-white" />
              <h3 className="font-semibold text-white">Global Scanner</h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-white/20 p-1 rounded"
            >
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
            {messages.map(message => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-600 to-cyan-600 flex items-center justify-center flex-shrink-0">
                    <Globe size={16} className="text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-200'
                  }`}
                >
                  <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                  {message.suggestions && message.suggestions.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {message.suggestions.map((suggestion, i) => (
                        <button
                          key={i}
                          onClick={() => handleSuggestion(suggestion)}
                          className="block w-full text-left px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs transition-colors"
                        >
                          {suggestion.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                    <User size={16} className="text-white" />
                  </div>
                )}
              </div>
            ))}
            {isTyping && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-600 to-cyan-600 flex items-center justify-center">
                  <Globe size={16} className="text-white" />
                </div>
                <div className="bg-slate-800 rounded-lg p-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-slate-700">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Analyze address, token, or query Dune..."
                className="flex-1 bg-slate-800 text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2 rounded-lg transition-colors"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Generate response based on user query
async function generateResponse(
  userMessage: string,
  publicKey: PublicKey | null,
  connection: any
): Promise<{ content: string; suggestions?: AgentSuggestion[] }> {
  const lowerMessage = userMessage.toLowerCase();

  // Extract address from message (basic pattern matching)
  const addressMatch = userMessage.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/);
  const address = addressMatch ? addressMatch[0] : null;

  // Account analysis queries
  if (lowerMessage.includes('account') || lowerMessage.includes('wallet') || lowerMessage.includes('address')) {
    const targetAddress = address || (publicKey?.toString());
    
    if (!targetAddress) {
      return {
        content: 'Please provide a wallet address to analyze, or connect your wallet.\n\nExample: "Analyze account 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"',
      };
    }

    try {
      const accountInfo = await getSolscanAccountInfo(targetAddress);
      const tokens = await getSolscanAccountTokens(targetAddress);
      const transactions = await getSolscanAccountTransactions(targetAddress, 10);

      if (!accountInfo) {
        return {
          content: `❌ Could not fetch account information for ${targetAddress.slice(0, 8)}...${targetAddress.slice(-8)}.\n\nPlease verify the address is correct.`,
        };
      }

      const solBalance = (accountInfo.lamports / 1e9).toFixed(4);

      return {
        content: `📊 **Account Analysis**\n\n` +
          `**Address:** ${targetAddress.slice(0, 8)}...${targetAddress.slice(-8)}\n` +
          `**Balance:** ${solBalance} SOL\n` +
          `**Owner Program:** ${accountInfo.owner.slice(0, 8)}...${accountInfo.owner.slice(-8)}\n` +
          `**Rent Epoch:** ${accountInfo.rentEpoch}\n\n` +
          `**Tokens:** ${tokens.length} token${tokens.length !== 1 ? 's' : ''} found\n` +
          `**Recent Transactions:** ${transactions.length} transactions\n\n` +
          `${tokens.length > 0 ? `**Top Tokens:**\n${tokens.slice(0, 5).map((t, i) => `${i + 1}. ${t.tokenSymbol || 'Unknown'} (${t.tokenName || 'N/A'})`).join('\n')}\n\n` : ''}` +
          `💡 Want more details? Ask about specific tokens or transactions!`,
        suggestions: [
          {
            type: 'explain',
            title: 'View All Tokens',
            description: 'See complete token list',
          },
          {
            type: 'explain',
            title: 'Transaction History',
            description: 'View full transaction history',
          },
        ],
      };
    } catch (error) {
      return {
        content: `❌ Error analyzing account: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  // Token analysis queries
  if (lowerMessage.includes('token') && address) {
    try {
      const tokenInfo = await getSolscanTokenInfo(address);
      const marketData = await getSolscanTokenMarket(address);

      if (!tokenInfo) {
        return {
          content: `❌ Could not fetch token information for ${address.slice(0, 8)}...${address.slice(-8)}.\n\nPlease verify the token address is correct.`,
        };
      }

      return {
        content: `🪙 **Token Analysis**\n\n` +
          `**Token:** ${tokenInfo.tokenName} (${tokenInfo.tokenSymbol})\n` +
          `**Address:** ${address.slice(0, 8)}...${address.slice(-8)}\n` +
          `**Decimals:** ${tokenInfo.tokenDecimals}\n` +
          `**Supply:** ${(Number(tokenInfo.tokenSupply) / Math.pow(10, tokenInfo.tokenDecimals)).toLocaleString()} ${tokenInfo.tokenSymbol}\n\n` +
          `${marketData ? `**Market Data:**\n` +
          `• Price: $${marketData.price?.toFixed(6) || 'N/A'}\n` +
          `${marketData.marketCap ? `• Market Cap: $${marketData.marketCap.toLocaleString()}\n` : ''}` +
          `${marketData.volume24h ? `• 24h Volume: $${marketData.volume24h.toLocaleString()}\n` : ''}` +
          `${marketData.priceChange24h ? `• 24h Change: ${marketData.priceChange24h > 0 ? '+' : ''}${marketData.priceChange24h.toFixed(2)}%\n` : ''}` +
          `\n` : ''}` +
          `💡 Want to analyze this token further? Ask about holders, transactions, or price history!`,
      };
    } catch (error) {
      return {
        content: `❌ Error analyzing token: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  // Dune Analytics queries
  if (lowerMessage.includes('dune') || lowerMessage.includes('analytics') || lowerMessage.includes('query')) {
    return {
      content: `📊 **Dune Analytics Integration**\n\n` +
        `I can query Dune Analytics for on-chain data and insights.\n\n` +
        `**Available Queries:**\n` +
        `• Network statistics\n` +
        `• Token analytics\n` +
        `• DeFi metrics\n` +
        `• NFT data\n\n` +
        `**Example Queries:**\n` +
        `• "Query Dune for SOL price"\n` +
        `• "Get DEX volume from Dune"\n` +
        `• "Show top tokens by volume"\n\n` +
        `💡 Note: Dune query IDs need to be configured. Ask me to execute a specific query!`,
      suggestions: [
        {
          type: 'explain',
          title: 'Execute Dune Query',
          description: 'Run a Dune Analytics query',
        },
      ],
    };
  }

  // Network stats queries
  if (lowerMessage.includes('network') || lowerMessage.includes('stats') || lowerMessage.includes('solana')) {
    return {
      content: `🌐 **Solana Network Insights**\n\n` +
        `I can provide network-level analytics using Dune Analytics and Solscan.\n\n` +
        `**Available Insights:**\n` +
        `• Network TPS (Transactions Per Second)\n` +
        `• Total SOL supply\n` +
        `• Active validators\n` +
        `• Network health metrics\n` +
        `• DeFi TVL\n` +
        `• NFT market statistics\n\n` +
        `**Example Queries:**\n` +
        `• "What's the current network TPS?"\n` +
        `• "Show me SOL supply stats"\n` +
        `• "Get DeFi TVL data"\n\n` +
        `💡 Ask me specific questions about the Solana network!`,
    };
  }

  // Default response
  return {
    content: `🌐 **Global Scanner Agent**\n\n` +
      `I provide blockchain analytics and insights using:\n\n` +
      `📊 **Dune Analytics**: On-chain data queries and analytics\n` +
      `🔍 **Solscan API**: Account, token, and transaction data\n\n` +
      `**I can help you with:**\n\n` +
      `• **Account Analysis**: Analyze any wallet address\n` +
      `  Example: "Analyze account 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"\n\n` +
      `• **Token Research**: Get token information and market data\n` +
      `  Example: "Analyze token EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"\n\n` +
      `• **Network Insights**: Query Dune Analytics for on-chain data\n` +
      `  Example: "Get network TPS from Dune"\n\n` +
      `• **Transaction Analysis**: View and analyze transaction history\n` +
      `  Example: "Show transactions for [address]"\n\n` +
      `What would you like to explore?`,
    suggestions: [
      {
        type: 'explain',
        title: 'Analyze My Wallet',
        description: 'Analyze connected wallet',
        action: () => {
          if (publicKey) {
            // Trigger account analysis
          }
        },
      },
      {
        type: 'explain',
        title: 'Network Stats',
        description: 'Get Solana network statistics',
      },
    ],
  };
}

