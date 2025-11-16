// AI Agent for Arbitrage Scanner - Analyzes opportunities, calculates risk/reward, suggests strategies

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  MessageSquare, 
  Send, 
  X, 
  Bot, 
  User, 
  Sparkles,
  Lightbulb,
  CheckCircle,
  AlertCircle,
  Zap,
  TrendingUp,
  TrendingDown,
  Shield,
  Target,
  Clock,
  DollarSign
} from 'lucide-react';
import { AgentMessage, AgentSuggestion } from '../lib/agents/types';
import { ArbitrageOpportunity, PoolData } from '../lib/pools/types';

interface ScannerAgentProps {
  opportunities?: ArbitrageOpportunity[];
  pools?: PoolData[];
  selectedOpportunity?: ArbitrageOpportunity | null;
  onSelectOpportunity?: (opportunity: ArbitrageOpportunity) => void;
  onBuildTransaction?: (opportunity: ArbitrageOpportunity) => void;
}

export function ScannerAgent({
  opportunities = [],
  pools = [],
  selectedOpportunity = null,
  onSelectOpportunity,
  onBuildTransaction
}: ScannerAgentProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AgentMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: "👋 Hi! I'm your Arbitrage Scanner AI. I analyze opportunities, calculate risk/reward ratios, suggest optimal entry/exit points, and detect market manipulation. What would you like to know?",
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Auto-analyze when opportunities change
  useEffect(() => {
    if (opportunities.length > 0 && messages.length === 1) {
      setTimeout(() => {
        const analysis = analyzeOpportunities(opportunities);
        addMessage('assistant', analysis.content, analysis.suggestions);
      }, 2000);
    }
  }, [opportunities.length]);

  // Auto-analyze selected opportunity
  useEffect(() => {
    if (selectedOpportunity && isOpen) {
      setTimeout(() => {
        const analysis = analyzeOpportunity(selectedOpportunity, pools);
        addMessage('assistant', analysis.content, analysis.suggestions);
      }, 1000);
    }
  }, [selectedOpportunity?.id]);

  const addMessage = useCallback((role: 'user' | 'assistant', content: string, suggestions?: AgentSuggestion[]) => {
    const newMessage: AgentMessage = {
      id: Date.now().toString(),
      role,
      content,
      timestamp: new Date(),
      suggestions
    };
    setMessages(prev => [...prev, newMessage]);
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage = input.trim();
    setInput('');
    addMessage('user', userMessage);

    setIsTyping(true);

    // Generate AI response
    setTimeout(() => {
      const response = generateResponse(userMessage, opportunities, selectedOpportunity, pools);
      addMessage('assistant', response.content, response.suggestions);
      setIsTyping(false);
    }, 1000);
  };

  const handleSuggestion = (suggestion: AgentSuggestion) => {
    if (suggestion.action) {
      suggestion.action();
    }
    
    if (suggestion.data) {
      if (suggestion.data.opportunity && onSelectOpportunity) {
        onSelectOpportunity(suggestion.data.opportunity);
      }
      if (suggestion.data.opportunity && onBuildTransaction) {
        onBuildTransaction(suggestion.data.opportunity);
      }
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
        className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110"
        title="Open Scanner AI Agent"
      >
        {isOpen ? <X size={24} /> : <Bot size={24} />}
      </button>

      {/* Agent Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-96 h-[600px] bg-gray-900 border border-gray-700 rounded-lg shadow-2xl flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={20} className="text-white" />
              <h3 className="text-white font-semibold">Scanner AI Agent</h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-white/20 rounded p-1"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-100'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {message.role === 'assistant' && (
                      <Bot size={16} className="mt-1 flex-shrink-0" />
                    )}
                    {message.role === 'user' && (
                      <User size={16} className="mt-1 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      {message.suggestions && message.suggestions.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {message.suggestions.map((suggestion, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleSuggestion(suggestion)}
                              className="w-full text-left text-xs bg-gray-700 hover:bg-gray-600 rounded p-2 transition-colors"
                            >
                              <div className="font-semibold">{suggestion.title}</div>
                              <div className="text-gray-400">{suggestion.description}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-800 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Bot size={16} />
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-700 p-4">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about opportunities, risk, or strategies..."
                className="flex-1 bg-gray-800 text-gray-100 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Analyze all opportunities
function analyzeOpportunities(opportunities: ArbitrageOpportunity[]): { content: string; suggestions?: AgentSuggestion[] } {
  if (opportunities.length === 0) {
    return {
      content: "No arbitrage opportunities found. Try scanning again or adjust your filters.",
    };
  }

  const sorted = [...opportunities].sort((a, b) => b.netProfit - a.netProfit);
  const best = sorted[0];
  const highConfidence = opportunities.filter(o => o.confidence >= 0.7);
  const avgProfit = opportunities.reduce((sum, o) => sum + o.netProfit, 0) / opportunities.length;

  const content = `📊 **Opportunity Analysis**\n\n` +
    `Found **${opportunities.length}** arbitrage opportunities:\n\n` +
    `🏆 **Best Opportunity**:\n` +
    `• Profit: ${best.netProfit.toFixed(6)} SOL (${best.profitPercent.toFixed(2)}%)\n` +
    `• Confidence: ${(best.confidence * 100).toFixed(0)}%\n` +
    `• Hops: ${best.path.totalHops}\n` +
    `• Gas: ${(best.gasEstimate / 1e9).toFixed(6)} SOL\n\n` +
    `📈 **Statistics**:\n` +
    `• High confidence: ${highConfidence.length}\n` +
    `• Average profit: ${avgProfit.toFixed(6)} SOL\n` +
    `• Total potential: ${opportunities.reduce((sum, o) => sum + o.netProfit, 0).toFixed(6)} SOL\n\n` +
    `💡 **Recommendations**:\n` +
    `${best.confidence >= 0.7 ? '✅ This opportunity has high confidence - good for execution\n' : ''}` +
    `${best.netProfit > 0.01 ? '✅ Profitable after gas costs\n' : '⚠️ Low profit margin - consider larger amounts\n'}` +
    `${best.path.totalHops <= 2 ? '✅ Simple path - lower risk\n' : '⚠️ Complex path - higher gas costs\n'}`;

  return {
    content,
    suggestions: [
      {
        type: 'explain',
        title: `Analyze: ${best.path.startToken.symbol} → ${best.path.endToken.symbol}`,
        description: `Get detailed analysis of the best opportunity`,
        data: { opportunity: best },
      },
      {
        type: 'optimize',
        title: 'Show all high-confidence opportunities',
        description: 'Filter to show only high-confidence opportunities',
      },
    ],
  };
}

// Analyze single opportunity
function analyzeOpportunity(opportunity: ArbitrageOpportunity, pools: PoolData[]): { content: string; suggestions?: AgentSuggestion[] } {
  const riskAssessment = assessRisk(opportunity, pools);
  const entryExit = suggestEntryExit(opportunity);
  const manipulation = detectManipulation(opportunity, pools);

  const content = `🔍 **Detailed Analysis**: ${opportunity.path.startToken.symbol} → ${opportunity.path.endToken.symbol}\n\n` +
    `💰 **Profitability**:\n` +
    `• Gross Profit: ${opportunity.profit.toFixed(6)} SOL\n` +
    `• Net Profit: ${opportunity.netProfit.toFixed(6)} SOL (after gas)\n` +
    `• Profit %: ${opportunity.profitPercent.toFixed(2)}%\n` +
    `• Input: ${(Number(opportunity.inputAmount) / 1e9).toFixed(4)} SOL\n\n` +
    `📊 **Risk Assessment**:\n` +
    `• Overall Risk: ${riskAssessment.level.toUpperCase()}\n` +
    `• Confidence: ${(opportunity.confidence * 100).toFixed(0)}%\n` +
    `• ${riskAssessment.factors.map(f => `• ${f}`).join('\n')}\n\n` +
    `🎯 **Entry/Exit Strategy**:\n` +
    `• ${entryExit.recommendation}\n\n` +
    `${manipulation.detected ? `⚠️ **Manipulation Warning**:\n${manipulation.reasons.map(r => `• ${r}`).join('\n')}\n\n` : ''}` +
    `⏱️ **Timing**:\n` +
    `• Execute within: ${opportunity.expiresAt ? `${Math.max(0, Math.floor((opportunity.expiresAt.getTime() - Date.now()) / 1000))}s` : 'Unknown'}\n` +
    `• Best time: ${entryExit.bestTime}\n\n` +
    `💡 **Recommendation**: ${riskAssessment.recommendation}`;

  return {
    content,
    suggestions: [
      {
        type: 'optimize',
        title: 'Build Transaction',
        description: 'Create transaction for this opportunity',
        data: { opportunity },
      },
      {
        type: 'explain',
        title: 'Explain Path',
        description: 'Understand the arbitrage path in detail',
      },
    ],
  };
}

// Assess risk
function assessRisk(opportunity: ArbitrageOpportunity, pools: PoolData[]): {
  level: 'low' | 'medium' | 'high';
  factors: string[];
  recommendation: string;
} {
  const factors: string[] = [];
  let riskScore = 0;

  // Profit margin risk
  if (opportunity.profitPercent < 0.5) {
    factors.push('Low profit margin - vulnerable to price movements');
    riskScore += 2;
  }

  // Path complexity risk
  if (opportunity.path.totalHops > 3) {
    factors.push('Complex path - higher execution risk');
    riskScore += 1;
  }

  // Confidence risk
  if (opportunity.confidence < 0.4) {
    factors.push('Low confidence - opportunity may not be real');
    riskScore += 2;
  }

  // Liquidity risk
  const lowLiquidityPools = opportunity.steps.filter(step => {
    const pool = pools.find(p => p.id === step.pool.id);
    return pool && (pool.tvl < 10000 || pool.volume24h < 1000);
  });
  if (lowLiquidityPools.length > 0) {
    factors.push(`Low liquidity in ${lowLiquidityPools.length} pool(s)`);
    riskScore += 2;
  }

  // Gas cost risk
  if (opportunity.gasEstimate / 1e9 > opportunity.netProfit * 0.5) {
    factors.push('High gas cost relative to profit');
    riskScore += 1;
  }

  let level: 'low' | 'medium' | 'high';
  let recommendation: string;

  if (riskScore <= 2) {
    level = 'low';
    recommendation = '✅ Good opportunity - proceed with execution';
  } else if (riskScore <= 4) {
    level = 'medium';
    recommendation = '⚠️ Moderate risk - monitor closely and execute quickly';
  } else {
    level = 'high';
    recommendation = '❌ High risk - consider waiting or skipping';
  }

  return { level, factors, recommendation };
}

// Suggest entry/exit points
function suggestEntryExit(opportunity: ArbitrageOpportunity): {
  recommendation: string;
  bestTime: string;
} {
  const profitPercent = opportunity.profitPercent;
  
  let recommendation: string;
  if (profitPercent > 2) {
    recommendation = 'Execute immediately - high profit margin';
  } else if (profitPercent > 1) {
    recommendation = 'Good opportunity - execute within next block';
  } else if (profitPercent > 0.5) {
    recommendation = 'Moderate opportunity - monitor for better timing';
  } else {
    recommendation = 'Low margin - wait for better opportunity or use larger amount';
  }

  const bestTime = opportunity.expiresAt 
    ? `Within ${Math.max(0, Math.floor((opportunity.expiresAt.getTime() - Date.now()) / 1000))} seconds`
    : 'As soon as possible';

  return { recommendation, bestTime };
}

// Detect market manipulation
function detectManipulation(opportunity: ArbitrageOpportunity, pools: PoolData[]): {
  detected: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  let detected = false;

  // Check for suspiciously high profit
  if (opportunity.profitPercent > 10) {
    reasons.push('Unusually high profit - may be temporary or manipulated');
    detected = true;
  }

  // Check for low liquidity
  const lowLiquidity = opportunity.steps.some(step => {
    const pool = pools.find(p => p.id === step.pool.id);
    return pool && pool.tvl < 5000;
  });
  if (lowLiquidity) {
    reasons.push('Low liquidity pools - price may be manipulated');
    detected = true;
  }

  // Check for very recent price changes
  const recentPriceChanges = opportunity.steps.filter(step => {
    const pool = pools.find(p => p.id === step.pool.id);
    return pool && pool.recentTrades.length > 0;
  });
  if (recentPriceChanges.length === opportunity.steps.length) {
    reasons.push('All pools have recent trades - opportunity may be fleeting');
  }

  return { detected, reasons };
}

// Generate response to user query
function generateResponse(
  userMessage: string,
  opportunities: ArbitrageOpportunity[],
  selectedOpportunity: ArbitrageOpportunity | null,
  pools: PoolData[]
): { content: string; suggestions?: AgentSuggestion[] } {
  const lowerMessage = userMessage.toLowerCase();

  if (lowerMessage.includes('risk') || lowerMessage.includes('safe')) {
    if (selectedOpportunity) {
      const risk = assessRisk(selectedOpportunity, pools);
      return {
        content: `📊 **Risk Assessment**\n\n` +
          `Risk Level: **${risk.level.toUpperCase()}**\n\n` +
          `Factors:\n${risk.factors.map(f => `• ${f}`).join('\n')}\n\n` +
          `Recommendation: ${risk.recommendation}`,
      };
    }
    return {
      content: 'To assess risk, please select an opportunity first. I can then analyze:\n\n• Profit margin stability\n• Path complexity\n• Liquidity risks\n• Gas cost efficiency\n• Market manipulation indicators',
    };
  }

  if (lowerMessage.includes('best') || lowerMessage.includes('top') || lowerMessage.includes('recommend')) {
    if (opportunities.length === 0) {
      return { content: 'No opportunities available. Please scan for opportunities first.' };
    }
    const best = [...opportunities].sort((a, b) => b.netProfit - a.netProfit)[0];
    return {
      content: `🏆 **Best Opportunity**\n\n` +
        `Profit: ${best.netProfit.toFixed(6)} SOL (${best.profitPercent.toFixed(2)}%)\n` +
        `Confidence: ${best.confidence}\n` +
        `Path: ${best.path.startToken.symbol} → ${best.path.endToken.symbol}\n` +
        `Hops: ${best.path.totalHops}\n\n` +
        `Would you like me to analyze this in detail?`,
      suggestions: [
        {
          type: 'explain',
          title: 'Analyze this opportunity',
          description: 'Get detailed risk and strategy analysis',
          data: { opportunity: best },
        },
      ],
    };
  }

  if (lowerMessage.includes('execute') || lowerMessage.includes('build') || lowerMessage.includes('transaction')) {
    if (selectedOpportunity) {
      return {
        content: `✅ Ready to build transaction for:\n\n` +
          `Profit: ${selectedOpportunity.netProfit.toFixed(6)} SOL\n` +
          `Path: ${selectedOpportunity.path.startToken.symbol} → ${selectedOpportunity.path.endToken.symbol}\n` +
          `Confidence: ${selectedOpportunity.confidence}\n\n` +
          `Click "Build Transaction" to proceed!`,
        suggestions: [
          {
            type: 'optimize',
            title: 'Build Transaction',
            description: 'Create transaction for this opportunity',
            data: { opportunity: selectedOpportunity },
          },
        ],
      };
    }
    return {
      content: 'Please select an opportunity first, then I can help you build the transaction.',
    };
  }

  if (lowerMessage.includes('help') || lowerMessage.includes('what can')) {
    return {
      content: `I can help you with:\n\n` +
        `📊 **Analysis**: Analyze opportunities, calculate risk/reward\n` +
        `🎯 **Strategy**: Suggest optimal entry/exit points\n` +
        `🛡️ **Security**: Detect market manipulation and risks\n` +
        `💡 **Insights**: Explain opportunities and paths\n` +
        `⚡ **Optimization**: Find best opportunities\n` +
        `🔍 **Details**: Deep dive into specific opportunities\n\n` +
        `Try asking:\n` +
        `• "What's the best opportunity?"\n` +
        `• "Analyze this opportunity"\n` +
        `• "What's the risk?"\n` +
        `• "Should I execute this?"`,
    };
  }

  // Default response
  return {
    content: `I understand you're asking about arbitrage opportunities. ` +
      `I found ${opportunities.length} opportunity(ies). ` +
      `I can help you analyze them, assess risks, suggest strategies, and detect manipulation. ` +
      `What would you like to know?`,
    suggestions: opportunities.length > 0 ? [
      {
        type: 'explain',
        title: 'Show best opportunity',
        description: 'Find the most profitable opportunity',
      },
      {
        type: 'optimize',
        title: 'Analyze all opportunities',
        description: 'Get comprehensive analysis',
      },
    ] : [],
  };
}

