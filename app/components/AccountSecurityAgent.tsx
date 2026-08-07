// Account & Security AI Agent
// Handles usage tracking, payments, client accounts, and security

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Shield,
  Send,
  X,
  Bot,
  User,
  CreditCard,
  BarChart3,
  Lock,
  AlertTriangle,
  CheckCircle,
  Clock,
  Gift,
} from 'lucide-react';
import { useActiveWallet } from '../hooks/useActiveWallet';
import { useConnection } from '@solana/wallet-adapter-react';
import { AgentMessage, AgentSuggestion } from '../lib/agents/types';
import { useUsageTracking } from '../hooks/useUsageTracking';
import {
  getSealBalance,
  getFormattedSealBalance,
  hasSufficientSeal,
  getFeatureCost,
  formatSealAmount,
  SEAL_TOKEN_ECONOMICS,
} from '../lib/seal-token';
import { isPaymentCollectionEnabled } from '../lib/usage-tracking';

interface AccountSecurityAgentProps {
  // Optional props for future expansion
}

export function AccountSecurityAgent({}: AccountSecurityAgentProps) {
  const { publicKey } = useActiveWallet();
  const { connection } = useConnection();
  const {
    getStats,
    getTrialStatus,
    checkFeatureAccess,
    isTrialActive,
    trackFeatureUsage,
  } = useUsageTracking();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AgentMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: "👋 Hi! I'm your Account & Security Assistant. I can help you with:\n\n• 📊 **Usage Tracking**: Check your feature usage and statistics\n• 💰 **Payments**: View SEAL balance, costs, and payment status\n• 🔐 **Security**: Get security recommendations and account safety tips\n• 📈 **Account Info**: View subscription status, free trial, and account details\n\nWhat would you like to know?",
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

    // Track AI query usage
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
      agent: 'account-security',
      messageLength: userMessage.length,
    });

    setIsTyping(true);

    // Generate response
    setTimeout(async () => {
      const response = await generateResponse(userMessage, publicKey, connection, {
        getStats,
        getTrialStatus,
        isTrialActive,
        checkFeatureAccess,
      });
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
        className="fixed bottom-4 right-4 z-50 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white p-4 rounded-full shadow-lg transition-all flex items-center gap-2"
        title="Account & Security Assistant"
      >
        <Shield size={20} />
        {isOpen ? <X size={16} /> : null}
      </button>

      {/* Agent Chat Window */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 z-50 w-96 h-[600px] bg-slate-900 border border-slate-700 rounded-lg shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-gradient-to-r from-purple-600 to-blue-600">
            <div className="flex items-center gap-2">
              <Shield size={20} className="text-white" />
              <h3 className="font-semibold text-white">Account & Security</h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-white/20 p-1 rounded"
            >
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map(message => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center flex-shrink-0">
                    <Shield size={16} className="text-white" />
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
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center">
                  <Shield size={16} className="text-white" />
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
                placeholder="Ask about usage, payments, security..."
                className="flex-1 bg-slate-800 text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2 rounded-lg transition-colors"
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
  publicKey: any,
  connection: any,
  helpers: {
    getStats: (period?: 'daily' | 'weekly' | 'monthly' | 'all_time') => any;
    getTrialStatus: () => any;
    isTrialActive: () => boolean;
    checkFeatureAccess: (feature: any) => { allowed: boolean; reason?: string };
  }
): Promise<{ content: string; suggestions?: AgentSuggestion[] }> {
  const lowerMessage = userMessage.toLowerCase();

  // Usage tracking queries
  if (lowerMessage.includes('usage') || lowerMessage.includes('statistics') || lowerMessage.includes('stats')) {
    const stats = helpers.getStats('all_time');
    const trialStatus = helpers.getTrialStatus();

    if (!stats) {
      return {
        content: 'No usage data available. Connect your wallet to track usage.',
      };
    }

    return {
      content: `📊 **Usage Statistics**\n\n` +
        `**Total Usage:**\n` +
        `• Scanner Scans: ${stats.features.scanner_scan}\n` +
        `• Simulations: ${stats.features.simulation}\n` +
        `• AI Queries: ${stats.features.ai_query}\n` +
        `• Code Exports: ${stats.features.code_export}\n` +
        `• Advanced Transactions: ${stats.features.advanced_transaction}\n\n` +
        `${trialStatus && helpers.isTrialActive() ? `**Free Trial:**\n• ${trialStatus.remainingDays} days remaining\n• ${trialStatus.totalUsage} features used\n\n` : ''}` +
        `**Total Cost:** ${formatSealAmount(BigInt(stats.totalCost))} SEAL (not charged during development)`,
      suggestions: [
        {
          type: 'explain',
          title: 'View Daily Stats',
          description: 'See today\'s usage',
          action: () => {
            const dailyStats = helpers.getStats('daily');
            // Would update message with daily stats
          },
        },
        {
          type: 'explain',
          title: 'View Weekly Stats',
          description: 'See this week\'s usage',
        },
      ],
    };
  }

  // Balance queries
  if (lowerMessage.includes('balance') || lowerMessage.includes('seal') || lowerMessage.includes('tokens')) {
    if (!publicKey) {
      return {
        content: 'Please connect your wallet to check your SEAL balance.',
      };
    }

    return getSealBalance(connection, publicKey).then(balance => {
      const formatted = balance !== null ? formatSealAmount(balance) : '0';
      return {
        content: `💰 **SEAL Token Balance**\n\n` +
          `Your balance: **${formatted} SEAL**\n\n` +
          `${balance === null || balance === BigInt(0) ? '💡 You don\'t have any SEAL tokens yet. During development, all features are free to use!' : '💡 Payment collection is disabled during development. All features are free!'}\n\n` +
          `**Feature Costs:**\n` +
          `• Scanner Scan: ${getFeatureCost('scanner_scan')} SEAL\n` +
          `• Simulation: ${getFeatureCost('simulation')} SEAL\n` +
          `• AI Query: ${getFeatureCost('ai_query')} SEAL\n` +
          `• Code Export: ${getFeatureCost('code_export')} SEAL`,
      };
    }).catch(() => ({
      content: 'Unable to fetch balance. Please try again later.',
    }));
  }

  // Free trial queries
  if (lowerMessage.includes('trial') || lowerMessage.includes('free')) {
    const trialStatus = helpers.getTrialStatus();
    const isActive = helpers.isTrialActive();

    if (!trialStatus) {
      return {
        content: 'No free trial found. A new trial will be created when you first use a feature.',
      };
    }

    if (!isActive) {
      return {
        content: `⏰ **Free Trial Expired**\n\n` +
          `Your 7-day free trial has ended.\n\n` +
          `**Trial Summary:**\n` +
          `• Started: ${trialStatus.startDate.toLocaleDateString()}\n` +
          `• Ended: ${trialStatus.endDate.toLocaleDateString()}\n` +
          `• Total Features Used: ${trialStatus.totalUsage}\n\n` +
          `💡 Payment collection is disabled during development. All features remain free!`,
      };
    }

    return {
      content: `🎁 **Free Trial Active**\n\n` +
        `**Status:** Active\n` +
        `**Remaining:** ${trialStatus.remainingDays} day${trialStatus.remainingDays !== 1 ? 's' : ''}\n` +
        `**Ends:** ${trialStatus.endDate.toLocaleDateString()}\n\n` +
        `**Usage:**\n` +
        `• Scanner Scans: ${trialStatus.featuresUsed.scanner_scan} / 50\n` +
        `• Simulations: ${trialStatus.featuresUsed.simulation} / 30\n` +
        `• AI Queries: ${trialStatus.featuresUsed.ai_query} / 100\n` +
        `• Code Exports: ${trialStatus.featuresUsed.code_export} / 20\n` +
        `• Advanced Transactions: ${trialStatus.featuresUsed.advanced_transaction} / 50\n\n` +
        `💡 Payment collection is disabled during development. All features are free!`,
    };
  }

  // Security queries
  if (lowerMessage.includes('security') || lowerMessage.includes('safe') || lowerMessage.includes('protect')) {
    return {
      content: `🔐 **Security Recommendations**\n\n` +
        `**Account Security:**\n` +
        `• Never share your private key or seed phrase\n` +
        `• Use hardware wallets for large amounts\n` +
        `• Verify all transaction details before signing\n` +
        `• Test on devnet before mainnet\n` +
        `• Keep your wallet software updated\n\n` +
        `**Transaction Security:**\n` +
        `• Always verify recipient addresses\n` +
        `• Use slippage protection for swaps\n` +
        `• Review transaction costs before executing\n` +
        `• Check for suspicious activity\n\n` +
        `**Platform Security:**\n` +
        `• Payment collection is disabled during development\n` +
        `• All transactions are client-side only\n` +
        `• No private keys are stored or transmitted\n` +
        `• API keys are server-side only`,
      suggestions: [
        {
          type: 'explain',
          title: 'Security Best Practices',
          description: 'Learn more about Solana security',
        },
      ],
    };
  }

  // Payment queries
  if (lowerMessage.includes('payment') || lowerMessage.includes('pay') || lowerMessage.includes('cost')) {
    const paymentEnabled = isPaymentCollectionEnabled();
    return {
      content: `💳 **Payment Information**\n\n` +
        `**Status:** ${paymentEnabled ? 'Enabled' : 'Disabled (Development Mode)'}\n\n` +
        `${paymentEnabled ? 'Payments are active. SEAL tokens will be deducted for feature usage.' : '💡 Payment collection is disabled during development. All features are free to use!'}\n\n` +
        `**Feature Pricing:**\n` +
        `• Scanner Scan: ${getFeatureCost('scanner_scan')} SEAL\n` +
        `• Scanner Auto-Refresh: ${getFeatureCost('scanner_auto_refresh')} SEAL/hour\n` +
        `• Simulation: ${getFeatureCost('simulation')} SEAL\n` +
        `• AI Query: ${getFeatureCost('ai_query')} SEAL\n` +
        `• Code Export: ${getFeatureCost('code_export')} SEAL\n` +
        `• Advanced Transaction: ${getFeatureCost('advanced_transaction')} SEAL\n\n` +
        `**Subscription Tiers:**\n` +
        `• Free: 0 SEAL/month (limited features)\n` +
        `• Basic: ${SEAL_TOKEN_ECONOMICS.subscriptions.basic.price} SEAL/month\n` +
        `• Pro: ${SEAL_TOKEN_ECONOMICS.subscriptions.pro.price} SEAL/month (unlimited)`,
    };
  }

  // Account queries
  if (lowerMessage.includes('account') || lowerMessage.includes('subscription') || lowerMessage.includes('tier')) {
    const trialStatus = helpers.getTrialStatus();
    const isActive = helpers.isTrialActive();

    return {
      content: `👤 **Account Information**\n\n` +
        `${publicKey ? `**Wallet:** ${publicKey.toString().slice(0, 8)}...${publicKey.toString().slice(-8)}\n\n` : '**Wallet:** Not connected\n\n'}` +
        `**Subscription:**\n` +
        `${isActive ? `• Free Trial Active (${trialStatus?.remainingDays || 0} days remaining)` : '• Free Tier (Trial expired)'}\n\n` +
        `**Status:**\n` +
        `• Payment Collection: ${isPaymentCollectionEnabled() ? 'Enabled' : 'Disabled (Development)'}\n` +
        `• All Features: Free during development\n\n` +
        `💡 To upgrade, payment collection must be enabled in production.`,
    };
  }

  // Default response
  return {
    content: `I can help you with:\n\n` +
      `📊 **Usage Tracking**\n` +
      `• View your feature usage statistics\n` +
      `• Check free trial status and limits\n` +
      `• See daily/weekly/monthly usage\n\n` +
      `💰 **Payments**\n` +
      `• Check SEAL token balance\n` +
      `• View feature costs\n` +
      `• Understand subscription tiers\n\n` +
      `🔐 **Security**\n` +
      `• Get security recommendations\n` +
      `• Learn best practices\n` +
      `• Account safety tips\n\n` +
      `👤 **Account**\n` +
      `• View account information\n` +
      `• Check subscription status\n` +
      `• Manage account settings\n\n` +
      `What would you like to know?`,
    suggestions: [
      {
        type: 'explain',
        title: 'Check Usage',
        description: 'View your usage statistics',
      },
      {
        type: 'explain',
        title: 'Check Balance',
        description: 'View SEAL token balance',
      },
      {
        type: 'explain',
        title: 'Security Tips',
        description: 'Get security recommendations',
      },
    ],
  };
}

