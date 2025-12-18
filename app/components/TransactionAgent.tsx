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
  FileText,
  TrendingUp
} from 'lucide-react';
import { AgentMessage, AgentSuggestion } from '../lib/agents/types';
import type { SimpleBlock } from './UnifiedTransactionBuilder';
import { useUsageTracking } from '../hooks/useUsageTracking';

interface TransactionAgentProps {
  simpleWorkflow?: SimpleBlock[];
  transactionDraft?: any;
  onAddBlock?: (block: SimpleBlock) => void;
  onUpdateBlock?: (blockId: string, params: Record<string, string>) => void;
  errors?: string[];
  warnings?: string[];
  availableBlocks?: SimpleBlock[];
  onExplainBlock?: (blockId: string) => void;
  onOptimize?: () => void;
}

// Helper to find block by keywords
function findBlockByKeywords(keywords: string[], availableBlocks: SimpleBlock[]): SimpleBlock | null {
  const lowerKeywords = keywords.map(k => k.toLowerCase());
  
  for (const block of availableBlocks) {
    const blockNameLower = block.name.toLowerCase();
    const blockIdLower = block.id.toLowerCase();
    
    if (lowerKeywords.some(k => blockNameLower.includes(k) || blockIdLower.includes(k))) {
      return block;
    }
  }
  
  return null;
}

export function TransactionAgent({
  simpleWorkflow = [],
  transactionDraft,
  onAddBlock,
  onUpdateBlock,
  errors = [],
  warnings = [],
  availableBlocks = [],
  onExplainBlock,
  onOptimize
}: TransactionAgentProps) {
  // Store reference to onAddBlock for use in generateResponse
  const onAddBlockRef = useRef(onAddBlock);
  useEffect(() => {
    onAddBlockRef.current = onAddBlock;
  }, [onAddBlock]);
  const { trackFeatureUsage, checkFeatureAccess } = useUsageTracking();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AgentMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: "👋 Hi! I'm your Transaction Assistant. I can help you build Solana transactions, suggest optimizations, and explain what each instruction does. What would you like to build?",
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

  // Auto-suggestions based on context
  useEffect(() => {
    if (simpleWorkflow.length === 0 && messages.length === 1) {
      // Suggest starting when workflow is empty
      const suggestion: AgentMessage = {
        id: 'suggestion-1',
        role: 'assistant',
        content: '💡 Tip: Start by adding a block from the left sidebar. I can help explain what each one does!',
        timestamp: new Date(),
        suggestions: [
          {
            type: 'explain',
            title: 'Show available blocks',
            description: 'I can explain what each block does',
            action: () => {
              setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'assistant',
                content: 'Here are some common blocks you can use:\n\n• Transfer SOL - Send SOL between accounts\n• Transfer Token - Send SPL tokens\n• Jupiter Swap - Swap tokens via Jupiter\n• Create ATA - Create Associated Token Account\n\nHover over any block to see detailed information!',
                timestamp: new Date()
              }]);
            }
          }
        ]
      };
      if (messages.length === 1) {
        setTimeout(() => {
          setMessages(prev => [...prev, suggestion]);
        }, 2000);
      }
    }

    // Auto-analyze when workflow changes
    if (simpleWorkflow.length > 0 && messages.length > 1) {
      const hasEmptyParams = simpleWorkflow.some(block => 
        Object.values(block.params).some(val => !val || val === '')
      );
      
      if (hasEmptyParams) {
        const analysis: AgentMessage = {
          id: `analysis-${Date.now()}`,
          role: 'assistant',
          content: `🔍 I noticed some blocks have empty parameters. Would you like me to help fill them in?`,
          timestamp: new Date(),
          suggestions: simpleWorkflow
            .filter(block => Object.entries(block.params).some(([key, val]) => !val || val === ''))
            .slice(0, 3)
            .map(block => ({
              type: 'update_param' as const,
              title: `Fill ${block.name} parameters`,
              description: `Help configure ${block.name}`,
              action: () => {
                const emptyParams = Object.entries(block.params)
                  .filter(([_, val]) => !val || val === '')
                  .map(([key]) => key);
                setMessages(prev => [...prev, {
                  id: Date.now().toString(),
                  role: 'assistant',
                  content: `To configure ${block.name}, you need to fill:\n\n${emptyParams.map(p => `• ${p}`).join('\n')}\n\nWhat values would you like to use?`,
                  timestamp: new Date()
                }]);
              },
              data: block
            }))
        };
        // Only add if not already shown recently
        const recentAnalysis = messages.filter(m => m.id.startsWith('analysis-'));
        if (recentAnalysis.length === 0) {
          setTimeout(() => {
            setMessages(prev => [...prev, analysis]);
          }, 3000);
        }
      }
    }

    // Auto-detect errors
    if (errors.length > 0) {
      const errorMsg: AgentMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ I found ${errors.length} error(s) in your transaction. Let me help fix them!`,
        timestamp: new Date(),
        suggestions: errors.slice(0, 3).map(error => ({
          type: 'fix_error' as const,
          title: `Fix: ${error}`,
          description: 'Get help with this error',
          action: () => {
            setMessages(prev => [...prev, {
              id: Date.now().toString(),
              role: 'assistant',
              content: `Let's fix: ${error}\n\nCommon solutions:\n• Check address format (should be base58)\n• Verify amounts are in correct units\n• Ensure all required fields are filled\n\nWhat specific help do you need?`,
              timestamp: new Date()
            }]);
          }
        }))
      };
      const recentErrors = messages.filter(m => m.id.startsWith('error-'));
      if (recentErrors.length === 0) {
        setTimeout(() => {
          setMessages(prev => [...prev, errorMsg]);
        }, 2000);
      }
    }
  }, [simpleWorkflow.length, errors.length, messages.length]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    // Check if user can use AI agent (free trial or subscription)
    const access = checkFeatureAccess('ai_query');
    if (!access.allowed) {
      addMessage('assistant', `⚠️ ${access.reason || 'AI queries not available. Please check your subscription or free trial status.'}`);
      return;
    }

    const userMessage = input.trim();
    setInput('');
    addMessage('user', userMessage);

    // Track usage (payment collection disabled during development)
    trackFeatureUsage('ai_query', {
      messageLength: userMessage.length,
      workflowLength: simpleWorkflow.length,
    });

    setIsTyping(true);

    // Simulate AI response (replace with actual AI API call)
    setTimeout(() => {
      const response = generateResponse(
        userMessage, 
        simpleWorkflow, 
        errors, 
        warnings,
        availableBlocks,
        onAddBlockRef.current
      );
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
        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-full shadow-lg flex items-center justify-center text-white transition-all hover:scale-110"
        title="AI Assistant"
      >
        {isOpen ? <X size={24} /> : <Bot size={24} />}
      </button>

      {/* Agent Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-40 w-96 h-[600px] bg-gray-800 border border-gray-700 rounded-lg shadow-2xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gradient-to-r from-purple-600/20 to-indigo-600/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 flex items-center justify-center">
                <Bot size={20} className="text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Transaction Assistant</h3>
                <p className="text-xs text-gray-400">AI-powered help</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
                    <Bot size={16} className="text-white" />
                  </div>
                )}
                <div className={`max-w-[80%] ${message.role === 'user' ? 'order-2' : ''}`}>
                  <div
                    className={`rounded-lg p-3 ${
                      message.role === 'user'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-700 text-gray-100'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                  {message.suggestions && message.suggestions.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {message.suggestions.map((suggestion, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSuggestion(suggestion)}
                          className="w-full text-left p-2 bg-gray-700/50 hover:bg-gray-700 border border-gray-600 rounded-lg transition-colors group"
                        >
                          <div className="flex items-start gap-2">
                            <Lightbulb size={14} className="text-yellow-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <div className="text-xs font-medium text-gray-200 group-hover:text-white">
                                {suggestion.title}
                              </div>
                              <div className="text-xs text-gray-400 mt-0.5">
                                {suggestion.description}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
                    <User size={16} className="text-white" />
                  </div>
                )}
              </div>
            ))}
            {isTyping && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center">
                  <Bot size={16} className="text-white" />
                </div>
                <div className="bg-gray-700 rounded-lg p-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          {simpleWorkflow.length > 0 && (
            <div className="px-4 pt-2 border-t border-gray-700">
              <div className="flex flex-wrap gap-2 mb-2">
                <button
                  onClick={() => {
                    const analysis = analyzeTransaction(simpleWorkflow);
                    addMessage('assistant', analysis);
                  }}
                  className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Sparkles size={12} />
                  Analyze
                </button>
                {onOptimize && (
                  <button
                    onClick={() => {
                      if (onOptimize) onOptimize();
                      addMessage('assistant', '🔍 Analyzing your transaction for optimizations...\n\nChecking:\n• Transaction size\n• Account usage\n• Compute units\n• Fee optimization\n\nI\'ll provide suggestions shortly!');
                    }}
                    className="px-3 py-1.5 text-xs bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <Zap size={12} />
                    Optimize
                  </button>
                )}
                <button
                  onClick={() => {
                    const blocks = simpleWorkflow.map((b, i) => `${i + 1}. ${b.name}${Object.values(b.params).some(v => !v || v === '') ? ' (incomplete)' : ''}`).join('\n');
                    addMessage('assistant', `📋 Your Transaction Summary:\n\n${blocks}\n\n${simpleWorkflow.length} block(s) total\n${simpleWorkflow.filter(b => Object.values(b.params).every(v => v && v !== '')).length} complete\n${simpleWorkflow.filter(b => Object.values(b.params).some(v => !v || v === '')).length} need configuration`);
                  }}
                  className="px-3 py-1.5 text-xs bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle size={12} />
                  Summary
                </button>
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t border-gray-700">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything about building transactions..."
                className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={isTyping}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white transition-all"
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

// Enhanced response generator with context awareness, code generation, security analysis
function generateResponse(
  userMessage: string,
  workflow: SimpleBlock[],
  errors: string[],
  warnings: string[],
  availableBlocks: SimpleBlock[] = [],
  onAddBlock?: (block: SimpleBlock) => void
): { content: string; suggestions?: AgentSuggestion[] } {
  const lowerMessage = userMessage.toLowerCase();
  const suggestions: AgentSuggestion[] = [];
  
  // Enhanced context analysis
  const context = analyzeTransactionContext(workflow);

  // Natural language transaction building
  if ((lowerMessage.includes('send') || lowerMessage.includes('transfer')) && 
      (lowerMessage.includes('token') || lowerMessage.includes('coin'))) {
    const tokenTransferBlock = findBlockByKeywords(['token', 'transfer'], availableBlocks);
    if (tokenTransferBlock && onAddBlock) {
      const newBlock: SimpleBlock = {
        ...tokenTransferBlock,
        instanceId: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };
      onAddBlock(newBlock);
      return {
        content: `✅ **Added Transfer Token block!**\n\nI've added a "Transfer Token" block to your workflow. Please configure:\n\n• **Destination**: The recipient's token account address\n• **Amount**: Amount to transfer (in token's smallest unit)\n• **Source**: Your token account (if not using default)\n\n💡 The block is ready for you to fill in the details!`,
        suggestions: [
          {
            type: 'explain',
            title: 'Explain Token Transfer',
            description: 'Learn more about token transfers',
          }
        ]
      };
    }
  }

  if ((lowerMessage.includes('send') || lowerMessage.includes('transfer')) && 
      (lowerMessage.includes('sol') || lowerMessage.includes('lamport'))) {
    const solTransferBlock = findBlockByKeywords(['sol', 'transfer', 'system'], availableBlocks);
    if (solTransferBlock && onAddBlock) {
      const newBlock: SimpleBlock = {
        ...solTransferBlock,
        instanceId: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };
      onAddBlock(newBlock);
      return {
        content: `✅ **Added Transfer SOL block!**\n\nI've added a "Transfer SOL" block to your workflow. Please configure:\n\n• **To**: Recipient wallet address\n• **Amount**: Amount in lamports (1 SOL = 1,000,000,000 lamports)\n\n💡 Example: 0.1 SOL = 100,000,000 lamports`,
        suggestions: [
          {
            type: 'explain',
            title: 'Explain SOL Transfer',
            description: 'Learn more about SOL transfers',
          }
        ]
      };
    }
  }

  if (lowerMessage.includes('stake') || lowerMessage.includes('staking') || lowerMessage.includes('delegate')) {
    const stakeBlock = findBlockByKeywords(['stake', 'delegate'], availableBlocks);
    if (stakeBlock && onAddBlock) {
      const newBlock: SimpleBlock = {
        ...stakeBlock,
        instanceId: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };
      onAddBlock(newBlock);
      return {
        content: `✅ **Added Staking block!**\n\nI've added a staking/delegation block to your workflow. Please configure:\n\n• **Validator**: Validator public key\n• **Amount**: SOL to stake (in lamports)\n• **Stake Account**: Your stake account (if creating new, leave empty)\n\n💡 Staking SOL helps secure the Solana network and earns rewards!`,
        suggestions: [
          {
            type: 'explain',
            title: 'Explain Staking',
            description: 'Learn more about Solana staking',
          }
        ]
      };
    } else {
      return {
        content: `📌 **Staking Tokens**\n\nTo stake SOL on Solana, you'll need to:\n\n1. **Create Stake Account**: Use the "Create Stake Account" block\n2. **Delegate Stake**: Use the "Delegate Stake" block\n   - Set validator public key\n   - Set amount to stake\n\n💡 Staking helps secure the network and earns you rewards!`,
      };
    }
  }

  if (lowerMessage.includes('collect') && lowerMessage.includes('rent') || 
      lowerMessage.includes('close') && lowerMessage.includes('account')) {
    return {
      content: `💰 **Collecting Rent**\n\nTo collect rent from closed accounts:\n\n1. **Close Account**: Use the "Close Account" block\n   - This closes an account and returns rent to the owner\n   - Specify the account to close\n   - Set the destination for the rent (usually your wallet)\n\n💡 Closing unused accounts returns the rent-exempt balance to you!`,
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
    const swapBlock = findBlockByKeywords(['swap', 'jupiter'], availableBlocks);
    if (swapBlock && onAddBlock) {
      const newBlock: SimpleBlock = {
        ...swapBlock,
        instanceId: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };
      onAddBlock(newBlock);
      return {
        content: `✅ **Added Jupiter Swap block!**\n\nI've added a "Jupiter Swap" block for token swapping. Please configure:\n\n• **Input Token**: Token mint address to swap from\n• **Output Token**: Token mint address to swap to\n• **Amount**: Input amount (in token's smallest unit)\n• **Min Amount Out**: Minimum output (slippage protection)\n\n💡 Jupiter provides the best rates across all Solana DEXs!`,
        suggestions: [
          {
            type: 'explain',
            title: 'Explain Jupiter Swap',
            description: 'Learn more about Jupiter aggregator',
          }
        ]
      };
    }
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

  // Context-aware responses
  if (lowerMessage.includes('transfer') || lowerMessage.includes('send')) {
    return {
      content: `To transfer SOL or tokens, you'll need:\n\n1. **Transfer SOL**: Use the "Transfer SOL" block\n   - Set the recipient address in the "to" field\n   - Set the amount in lamports (1 SOL = 1,000,000,000 lamports)\n\n2. **Transfer Token**: Use the "Transfer Token" block\n   - Set the destination token account\n   - Set the amount to transfer\n\n💡 Tip: You can copy addresses from your clipboard or use the clipboard button in the header!`,
      suggestions: [
        {
          type: 'explain',
          title: 'Explain Transfer SOL',
          description: 'Learn more about transferring SOL',
        },
        {
          type: 'explain',
          title: 'Explain Transfer Token',
          description: 'Learn more about transferring tokens',
        }
      ]
    };
  }

  if (lowerMessage.includes('swap') || lowerMessage.includes('jupiter')) {
    return {
      content: `Jupiter Swap allows you to swap tokens on Solana. Here's what you need:\n\n• **Amount**: The amount of input tokens (in token's smallest unit)\n• **Min Amount Out**: Minimum output tokens (slippage protection)\n\n💡 Make sure you have the token accounts set up first! If you need to create an Associated Token Account, use the "Create ATA" block.`,
    };
  }

  if (lowerMessage.includes('ata') || lowerMessage.includes('token account')) {
    return {
      content: `An Associated Token Account (ATA) is a token account owned by a specific wallet for a specific token mint.\n\nTo create one:\n1. Add the "Create ATA" block\n2. Set the wallet address (usually your wallet)\n3. Set the token mint address\n\n💡 ATAs are deterministic - the same wallet + mint always creates the same ATA address!`,
    };
  }

  if (lowerMessage.includes('error') || errors.length > 0) {
    return {
      content: `I see you have some errors. Let me help:\n\n${errors.map(e => `• ${e}`).join('\n')}\n\nCommon fixes:\n• Check that all addresses are valid Solana addresses\n• Ensure amounts are in the correct units (lamports for SOL)\n• Verify all required fields are filled\n\nWould you like me to suggest specific fixes?`,
      suggestions: errors.map(error => ({
        type: 'fix_error',
        title: `Fix: ${error}`,
        description: 'Get help fixing this error',
      }))
    };
  }

  if (lowerMessage.includes('help') || lowerMessage.includes('how') || lowerMessage.includes('what can')) {
    return {
      content: `I can help you with:\n\n• 🧱 **Adding blocks** - Explain what each block does and when to use them\n• ⚙️ **Configuring parameters** - Help set up accounts, amounts, and addresses\n• 🐛 **Fixing errors** - Debug transaction issues and validation errors\n• ⚡ **Optimizing** - Reduce costs and improve transaction efficiency\n• 📚 **Explaining** - Understand how Solana transactions work\n• 🔍 **Reviewing** - Check your transaction before building\n\nWhat would you like to do?`,
    };
  }

  if (lowerMessage.includes('lamport') || lowerMessage.includes('sol')) {
    return {
      content: `**SOL vs Lamports:**\n\n• 1 SOL = 1,000,000,000 lamports\n• Lamports are the smallest unit of SOL\n• When entering amounts, use lamports (e.g., 1 SOL = 1000000000)\n\n💡 Quick conversions:\n• 0.1 SOL = 100,000,000 lamports\n• 1 SOL = 1,000,000,000 lamports\n• 10 SOL = 10,000,000,000 lamports`,
    };
  }

  if (workflow.length > 0 && (lowerMessage.includes('review') || lowerMessage.includes('check') || lowerMessage.includes('analyze'))) {
    const analysis = analyzeTransaction(workflow);
    return {
      content: analysis + `\n\nWould you like me to:\n• Perform security analysis\n• Suggest optimizations\n• Generate code\n• Check for specific issues?`,
      suggestions: [
        {
          type: 'explain',
          title: 'Security Analysis',
          description: 'Check for vulnerabilities',
        },
        {
          type: 'optimize',
          title: 'Get Optimizations',
          description: 'See cost and efficiency improvements',
        },
        {
          type: 'explain',
          title: 'Generate Code',
          description: 'Get production-ready code',
        }
      ]
    };
  }


  if (lowerMessage.includes('cost') || lowerMessage.includes('fee') || lowerMessage.includes('price')) {
    const costInSOL = context.estimatedCost / 1e9;
    const computeUnits = context.estimatedComputeUnits;
    return {
      content: `💰 **Enhanced Cost Estimation**\n\n` +
        `**Transaction Overview:**\n` +
        `• Intent: ${context.intent}\n` +
        `• Complexity: ${context.complexity}\n` +
        `• Blocks: ${workflow.length}\n\n` +
        `**Estimated Costs:**\n` +
        `• Base fee: ~5,000 lamports\n` +
        `• Per instruction: ~2,000 lamports\n` +
        `• Total estimated: ~${context.estimatedCost.toLocaleString()} lamports (${costInSOL.toFixed(6)} SOL)\n\n` +
        `**Compute Units:**\n` +
        `• Estimated: ${computeUnits.toLocaleString()} CU\n` +
        `• Limit: 1,400,000 CU per transaction\n` +
        `• Usage: ${((computeUnits / 1400000) * 100).toFixed(1)}% of limit\n\n` +
        `**Cost Breakdown:**\n` +
        `• Transaction fee: ~${(context.estimatedCost * 0.6 / 1e9).toFixed(6)} SOL\n` +
        `• Account rent (if creating accounts): Variable\n` +
        `• Priority fees: Optional (for faster confirmation)\n\n` +
        `💡 **Note:** Actual fees may vary based on:\n` +
        `• Network congestion\n` +
        `• Account rent requirements\n` +
        `• Priority fees (if set)\n` +
        `• Compute unit consumption\n\n` +
        `Want me to help optimize costs?`,
      suggestions: [
        {
          type: 'optimize',
          title: 'Optimize transaction costs',
          description: 'Get cost-saving suggestions',
        },
        {
          type: 'explain',
          title: 'Explain cost breakdown',
          description: 'Learn more about Solana fees',
        }
      ]
    };
  }

  if (lowerMessage.includes('validate') || lowerMessage.includes('check') || lowerMessage.includes('verify')) {
    const issues: string[] = [];
    workflow.forEach((block, i) => {
      const emptyParams = Object.entries(block.params).filter(([_, val]) => !val || val === '');
      if (emptyParams.length > 0) {
        issues.push(`Block ${i + 1} (${block.name}): Missing ${emptyParams.map(([key]) => key).join(', ')}`);
      }
    });

    if (issues.length === 0) {
      return {
        content: `✅ Validation Check:\n\nAll blocks appear to be configured correctly!\n\n• ${workflow.length} block(s) configured\n• All required parameters filled\n• No obvious errors detected\n\nReady to build! 🚀`,
      };
    }

    return {
      content: `🔍 Validation Results:\n\nFound ${issues.length} issue(s):\n\n${issues.map((issue, i) => `${i + 1}. ${issue}`).join('\n')}\n\nWould you like me to help fix these?`,
      suggestions: issues.slice(0, 3).map((issue, i) => ({
        type: 'fix_error' as const,
        title: `Fix: ${issue.split(':')[0]}`,
        description: issue.split(':')[1]?.trim() || 'Fix this issue',
      }))
    };
  }

  // Default response with enhanced capabilities
  const contextSummary = workflow.length > 0 
    ? `\n**Current Transaction Context:**\n• Intent: ${context.intent}\n• Complexity: ${context.complexity}\n• Blocks: ${workflow.length}\n• Estimated cost: ${(context.estimatedCost / 1e9).toFixed(6)} SOL\n`
    : '';
  
  return {
    content: `I understand you're asking about "${userMessage}". Let me help you with that!${contextSummary}\n` +
      `**I can help you with:**\n\n` +
      `🧱 **Building:**\n` +
      `• Explain what each block does\n` +
      `• Add more blocks to your transaction\n` +
      `• Review for errors and issues\n\n` +
      `⚡ **Optimization:**\n` +
      `• Optimize transaction costs and compute units\n` +
      `• Suggest best practices\n` +
      `• Improve transaction efficiency\n\n` +
      `💻 **Code Generation:**\n` +
      `• Generate production-ready TypeScript code\n` +
      `• Include explanations and best practices\n` +
      `• Provide complete implementation examples\n\n` +
      `🛡️ **Security:**\n` +
      `• Analyze transaction for vulnerabilities\n` +
      `• Detect common security issues\n` +
      `• Suggest security improvements\n\n` +
      `💰 **Cost Analysis:**\n` +
      `• Estimate transaction costs\n` +
      `• Calculate compute unit usage\n` +
      `• Optimize fees\n\n` +
      `📚 **Learning:**\n` +
      `• Answer questions about Solana\n` +
      `• Explain transaction concepts\n` +
      `• Provide best practices\n\n` +
      `What would you like to know?`,
    suggestions: workflow.length > 0 ? [
      {
        type: 'explain',
        title: 'Generate Code',
        description: 'Get production-ready code',
      },
      {
        type: 'optimize',
        title: 'Optimize Transaction',
        description: 'Get optimization suggestions',
      },
      {
        type: 'explain',
        title: 'Security Analysis',
        description: 'Check for vulnerabilities',
      }
    ] : [
      {
        type: 'explain',
        title: 'Show available blocks',
        description: 'See what blocks you can add',
      }
    ]
  };
}

// Enhanced transaction context analysis
interface TransactionContext {
  intent: string;
  complexity: 'simple' | 'moderate' | 'complex';
  patterns: string[];
  risks: string[];
  optimizations: string[];
  estimatedCost: number;
  estimatedComputeUnits: number;
}

function analyzeTransactionContext(workflow: SimpleBlock[]): TransactionContext {
  const patterns: string[] = [];
  const risks: string[] = [];
  const optimizations: string[] = [];
  
  // Detect patterns
  const hasTransfer = workflow.some(b => b.id === 'system_transfer' || b.id === 'token_transfer');
  const hasSwap = workflow.some(b => b.id === 'jup_swap');
  const hasATA = workflow.some(b => b.id === 'ata_create');
  const hasTokenCreation = workflow.some(b => b.id === 'create_token_and_mint');
  const hasMint = workflow.some(b => b.id === 'token_mint');
  
  if (hasTransfer) patterns.push('transfer');
  if (hasSwap) patterns.push('swap');
  if (hasATA) patterns.push('ata_creation');
  if (hasTokenCreation) patterns.push('token_creation');
  
  // Determine intent
  let intent = 'unknown';
  if (hasTokenCreation) intent = 'token_creation';
  else if (hasSwap && hasTransfer) intent = 'swap_and_transfer';
  else if (hasSwap) intent = 'token_swap';
  else if (hasTransfer) intent = 'transfer';
  else if (hasATA) intent = 'account_setup';
  
  // Assess complexity
  let complexity: 'simple' | 'moderate' | 'complex' = 'simple';
  if (workflow.length > 5) complexity = 'complex';
  else if (workflow.length > 2) complexity = 'moderate';
  
  // Detect risks
  if (hasSwap && !hasATA) {
    risks.push('Swap may fail if token accounts don\'t exist');
  }
  if (workflow.length > 5) {
    risks.push('Large transaction may exceed compute unit limits');
  }
  if (hasTokenCreation) {
    risks.push('Token creation requires additional signers (mint keypair)');
  }
  
  // Suggest optimizations
  if (hasATA && hasTransfer && workflow.findIndex(b => b.id === 'ata_create') > workflow.findIndex(b => b.id === 'token_transfer')) {
    optimizations.push('Reorder: Create ATA before token transfer');
  }
  if (workflow.filter(b => b.id === 'system_transfer').length > 3) {
    optimizations.push('Consider batching multiple transfers');
  }
  
  // Estimate costs
  const baseFee = 5000;
  const perInstruction = 2000;
  const estimatedCost = baseFee + (workflow.length * perInstruction);
  const estimatedComputeUnits = 200000 + (workflow.length * 100000);
  
  return {
    intent,
    complexity,
    patterns,
    risks,
    optimizations,
    estimatedCost,
    estimatedComputeUnits,
  };
}

// Generate production-ready code with explanations
function generateProductionCode(workflow: SimpleBlock[], context: TransactionContext): { content: string; suggestions?: AgentSuggestion[] } {
  if (workflow.length === 0) {
    return {
      content: 'No blocks in your transaction yet. Add some blocks first, then I can generate the code!',
    };
  }
  
  const imports = new Set<string>();
  const instructions: string[] = [];
  const explanations: string[] = [];
  
  imports.add("import { Connection, Transaction, PublicKey, Keypair } from '@solana/web3.js';");
  imports.add("import { sendTransaction } from '@solana/wallet-adapter-react';");
  
  workflow.forEach((block, i) => {
    const blockNum = i + 1;
    
    if (block.id === 'system_transfer') {
      imports.add("import { SystemProgram } from '@solana/web3.js';");
      const to = block.params.to || 'RECIPIENT_ADDRESS';
      const amount = block.params.amount || '0';
      instructions.push(`// Instruction ${blockNum}: Transfer SOL
transaction.add(
  SystemProgram.transfer({
    fromPubkey: wallet.publicKey,
    toPubkey: new PublicKey('${to}'),
    lamports: ${amount}
  })
);`);
      explanations.push(`${blockNum}. Transfers ${amount} lamports (${(Number(amount) / 1e9).toFixed(4)} SOL) to ${to}`);
    } else if (block.id === 'token_transfer') {
      imports.add("import { createTransferInstruction, getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';");
      const destination = block.params.destination || 'DESTINATION_TOKEN_ACCOUNT';
      const amount = block.params.amount || '0';
      instructions.push(`// Instruction ${blockNum}: Transfer SPL Token
const destinationTokenAccount = new PublicKey('${destination}');
// Note: Ensure source token account exists and has sufficient balance
transaction.add(
  createTransferInstruction(
    sourceTokenAccount, // Your source token account
    destinationTokenAccount,
    wallet.publicKey, // Owner
    ${amount},
    [],
    TOKEN_PROGRAM_ID
  )
);`);
      explanations.push(`${blockNum}. Transfers ${amount} tokens to ${destination}`);
    } else if (block.id === 'jup_swap') {
      imports.add("import { createSwapInstruction } from '@jup-ag/api';");
      const amount = block.params.amount || '0';
      const minAmountOut = block.params.minAmountOut || '0';
      instructions.push(`// Instruction ${blockNum}: Jupiter Swap
// Note: Jupiter swaps require route calculation via Jupiter API
// This is a simplified example - use Jupiter SDK for full implementation
const swapAmount = ${amount};
const minAmountOut = ${minAmountOut};
// Use Jupiter API to get swap instruction
// const swapInstruction = await getSwapInstruction(...);
// transaction.add(swapInstruction);`);
      explanations.push(`${blockNum}. Swaps ${amount} tokens with minimum output of ${minAmountOut}`);
    } else if (block.id === 'ata_create') {
      imports.add("import { createAssociatedTokenAccountInstruction, getAssociatedTokenAddress, ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token';");
      const owner = block.params.owner || 'wallet.publicKey';
      const mint = block.params.mint || 'TOKEN_MINT_ADDRESS';
      instructions.push(`// Instruction ${blockNum}: Create Associated Token Account
const mintAddress = new PublicKey('${mint}');
const ownerAddress = new PublicKey('${owner}');
const ata = await getAssociatedTokenAddress(mintAddress, ownerAddress);
transaction.add(
  createAssociatedTokenAccountInstruction(
    wallet.publicKey, // Payer
    ata, // ATA address
    ownerAddress, // Owner
    mintAddress, // Mint
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  )
);`);
      explanations.push(`${blockNum}. Creates ATA for mint ${mint} owned by ${owner}`);
    } else if (block.id === 'create_token_and_mint') {
      imports.add("import { createInitializeMintInstruction, MINT_SIZE, getMinimumBalanceForRentExemptMint, TOKEN_PROGRAM_ID } from '@solana/spl-token';");
      imports.add("import { SystemProgram } from '@solana/web3.js';");
      instructions.push(`// Instruction ${blockNum}: Create Token + Mint (Multi-instruction)
// This is a complex operation requiring multiple instructions
// 1. Create mint account
// 2. Initialize mint
// 3. Create ATA
// 4. Mint tokens
// Note: Requires mint keypair as additional signer
const mintKeypair = Keypair.generate();
const mint = mintKeypair.publicKey;
const decimals = ${block.params.decimals || 9};
const initialSupply = ${block.params.initialSupply || '0'};

// Create mint account
const mintRent = await connection.getMinimumBalanceForRentExemption(MINT_SIZE);
transaction.add(
  SystemProgram.createAccount({
    fromPubkey: wallet.publicKey,
    newAccountPubkey: mint,
    space: MINT_SIZE,
    lamports: mintRent,
    programId: TOKEN_PROGRAM_ID,
  })
);

// Initialize mint
transaction.add(
  createInitializeMintInstruction(
    mint,
    decimals,
    wallet.publicKey, // Mint authority
    null, // Freeze authority
    TOKEN_PROGRAM_ID
  )
);

// ... (additional instructions for ATA creation and minting)`);
      explanations.push(`${blockNum}. Creates new token mint with ${block.params.decimals || 9} decimals and mints ${block.params.initialSupply || '0'} tokens`);
    } else {
      instructions.push(`// Instruction ${blockNum}: ${block.name}\n// TODO: Implement ${block.name} instruction`);
      explanations.push(`${blockNum}. ${block.name} (needs implementation)`);
    }
  });
  
  const code = `\`\`\`typescript
${Array.from(imports).join('\n')}

/**
 * Generated Transaction Code
 * Intent: ${context.intent}
 * Complexity: ${context.complexity}
 * Blocks: ${workflow.length}
 * 
 * ${explanations.join('\n * ')}
 */

async function buildAndSendTransaction(
  connection: Connection,
  wallet: { publicKey: PublicKey; signTransaction: (tx: Transaction) => Promise<Transaction> }
) {
  const transaction = new Transaction();
  
${instructions.join('\n\n')}

  // Set recent blockhash
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = wallet.publicKey;
  
  // Sign transaction
  const signed = await wallet.signTransaction(transaction);
  
  // Send transaction
  const signature = await connection.sendRawTransaction(signed.serialize());
  await connection.confirmTransaction(signature, 'confirmed');
  
  return signature;
}
\`\`\`

**Explanation:**
${explanations.map((e, i) => `${i + 1}. ${e}`).join('\n')}

**Best Practices Applied:**
${context.optimizations.length > 0 
  ? context.optimizations.map(o => `• ${o}`).join('\n')
  : '• Transaction structure follows Solana best practices'}

**Security Notes:**
${context.risks.length > 0
  ? context.risks.map(r => `• ⚠️ ${r}`).join('\n')
  : '• No obvious security risks detected'}`;

  return {
    content: code,
    suggestions: [
      {
        type: 'explain',
        title: 'Copy Code',
        description: 'Copy this code to your clipboard',
      },
      {
        type: 'optimize',
        title: 'Optimize Code',
        description: 'Get optimization suggestions',
      },
    ],
  };
}

// Security analysis
function analyzeSecurity(workflow: SimpleBlock[], context: TransactionContext): { content: string; suggestions?: AgentSuggestion[] } {
  const vulnerabilities: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];
  
  // Check for common security issues
  workflow.forEach((block, i) => {
    // Check for hardcoded addresses
    if (block.params.to && block.params.to.length < 32) {
      warnings.push(`Block ${i + 1}: Address "${block.params.to}" looks suspiciously short`);
    }
    
    // Check for zero amounts
    if (block.params.amount && Number(block.params.amount) === 0) {
      warnings.push(`Block ${i + 1}: Amount is zero - verify this is intentional`);
    }
    
    // Check for missing slippage protection
    if (block.id === 'jup_swap' && (!block.params.minAmountOut || Number(block.params.minAmountOut) === 0)) {
      vulnerabilities.push(`Block ${i + 1}: Jupiter swap missing slippage protection (minAmountOut)`);
    }
    
    // Check for token creation without proper authority management
    if (block.id === 'create_token_and_mint') {
      if (block.params.revokeMintAuthority !== 'true') {
        warnings.push(`Block ${i + 1}: Mint authority not revoked - consider revoking for security`);
      }
      if (block.params.enableFreeze === 'true') {
        warnings.push(`Block ${i + 1}: Freeze authority enabled - tokens can be frozen`);
      }
    }
  });
  
  // Check transaction structure
  if (context.complexity === 'complex') {
    warnings.push('Complex transaction - consider splitting for better security and gas efficiency');
  }
  
  // Recommendations
  if (vulnerabilities.length === 0 && warnings.length === 0) {
    recommendations.push('✅ Transaction structure looks secure');
    recommendations.push('✅ No obvious vulnerabilities detected');
  } else {
    if (vulnerabilities.length > 0) {
      recommendations.push('🔴 Fix vulnerabilities before executing');
    }
    if (warnings.length > 0) {
      recommendations.push('⚠️ Review warnings and verify they are intentional');
    }
  }
  
  recommendations.push('💡 Always test on devnet before mainnet');
  recommendations.push('💡 Verify all addresses before executing');
  recommendations.push('💡 Use slippage protection for swaps');
  
  const content = `🛡️ **Security Analysis**\n\n` +
    `**Transaction Overview:**\n` +
    `• Intent: ${context.intent}\n` +
    `• Complexity: ${context.complexity}\n` +
    `• Blocks: ${workflow.length}\n\n` +
    `${vulnerabilities.length > 0 ? `❌ **Vulnerabilities Found:**\n${vulnerabilities.map((v, i) => `${i + 1}. ${v}`).join('\n')}\n\n` : '✅ **No Critical Vulnerabilities**\n\n'}` +
    `${warnings.length > 0 ? `⚠️ **Warnings:**\n${warnings.map((w, i) => `${i + 1}. ${w}`).join('\n')}\n\n` : ''}` +
    `**Recommendations:**\n${recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}`;

  return {
    content,
    suggestions: vulnerabilities.length > 0 ? [
      {
        type: 'fix_error',
        title: 'Fix Vulnerabilities',
        description: `Fix ${vulnerabilities.length} security issue(s)`,
      },
    ] : undefined,
  };
}

// Cost optimization suggestions
function suggestOptimizations(workflow: SimpleBlock[], context: TransactionContext): { content: string; suggestions?: AgentSuggestion[] } {
  const optimizations: string[] = [];
  
  // Check instruction ordering
  const ataIndex = workflow.findIndex(b => b.id === 'ata_create');
  const tokenOpIndex = workflow.findIndex(b => b.id === 'token_transfer' || b.id === 'jup_swap');
  if (ataIndex !== -1 && tokenOpIndex !== -1 && ataIndex > tokenOpIndex) {
    optimizations.push('Reorder instructions: Create ATA before token operations (saves compute units)');
  }
  
  // Check for batching opportunities
  const transfers = workflow.filter(b => b.id === 'system_transfer');
  if (transfers.length > 3) {
    optimizations.push(`Batch ${transfers.length} transfers - consider combining into fewer instructions`);
  }
  
  // Check compute unit usage
  if (context.estimatedComputeUnits > 800000) {
    optimizations.push('High compute usage - consider splitting transaction or optimizing instructions');
  }
  
  // Check costs
  const costInSOL = context.estimatedCost / 1e9;
  if (costInSOL > 0.001) {
    optimizations.push(`Transaction cost is ${costInSOL.toFixed(6)} SOL - consider optimizing`);
  }
  
  // Check for unnecessary operations
  const duplicateATAs = workflow.filter((b, i) => 
    b.id === 'ata_create' && 
    workflow.findIndex(bb => bb.id === 'ata_create' && bb.params.mint === b.params.mint && bb.params.owner === b.params.owner) !== i
  );
  if (duplicateATAs.length > 0) {
    optimizations.push('Remove duplicate ATA creation - ATAs are deterministic');
  }
  
  if (optimizations.length === 0) {
    return {
      content: `✅ **Optimization Analysis**\n\n` +
        `Your transaction is already well-optimized!\n\n` +
        `• Estimated cost: ${(context.estimatedCost / 1e9).toFixed(6)} SOL\n` +
        `• Estimated compute: ${context.estimatedComputeUnits.toLocaleString()} CU\n` +
        `• Instruction count: ${workflow.length}\n\n` +
        `No optimizations needed at this time.`,
    };
  }
  
  const estimatedSavings = optimizations.length * 0.0001; // Rough estimate
  
  return {
    content: `⚡ **Optimization Suggestions**\n\n` +
      `Found ${optimizations.length} optimization opportunity(ies):\n\n` +
      optimizations.map((o, i) => `${i + 1}. ${o}`).join('\n\n') +
      `\n\n**Potential Savings:**\n` +
      `• Estimated: ~${estimatedSavings.toFixed(6)} SOL per optimization\n` +
      `• Compute units: Could reduce by ~${Math.floor(context.estimatedComputeUnits * 0.1).toLocaleString()} CU\n\n` +
      `Would you like me to help implement these optimizations?`,
    suggestions: [
      {
        type: 'optimize',
        title: 'Apply Optimizations',
        description: `Apply ${optimizations.length} optimization(s)`,
      },
    ],
  };
}

// Best practices suggestions
function suggestBestPractices(workflow: SimpleBlock[], context: TransactionContext): { content: string; suggestions?: AgentSuggestion[] } {
  const practices: string[] = [];
  
  practices.push('✅ **Transaction Structure:**');
  practices.push('• Use deterministic addresses (ATAs) when possible');
  practices.push('• Order instructions logically (create accounts before using them)');
  practices.push('• Validate all addresses before building');
  
  practices.push('\n✅ **Security Best Practices:**');
  practices.push('• Always verify recipient addresses');
  practices.push('• Use slippage protection for swaps');
  practices.push('• Test on devnet before mainnet');
  practices.push('• Review transaction before signing');
  
  practices.push('\n✅ **Cost Optimization:**');
  practices.push('• Batch operations when possible');
  practices.push('• Avoid unnecessary account creation');
  practices.push('• Monitor compute unit usage');
  
  practices.push('\n✅ **Solana-Specific Tips:**');
  practices.push('• ATAs are deterministic - same wallet + mint = same address');
  practices.push('• Account rent is required for new accounts');
  practices.push('• Transactions must fit in a single block');
  practices.push('• Compute units are limited (1.4M CU per transaction)');
  
  // Context-specific practices
  if (context.intent === 'token_creation') {
    practices.push('\n💡 **Token Creation Tips:**');
    practices.push('• Consider revoking mint authority after initial mint');
    practices.push('• Set freeze authority to null if you don\'t need it');
    practices.push('• Use appropriate decimals (9 is standard)');
  }
  
  if (context.intent === 'swap') {
    practices.push('\n💡 **Swap Tips:**');
    practices.push('• Always set minAmountOut for slippage protection');
    practices.push('• Verify token accounts exist before swapping');
    practices.push('• Consider using Jupiter for best rates');
  }
  
  return {
    content: `📚 **Best Practices Guide**\n\n${practices.join('\n')}\n\n` +
      `**For Your Transaction:**\n` +
      `• Intent: ${context.intent}\n` +
      `• Complexity: ${context.complexity}\n` +
      `• Blocks: ${workflow.length}\n\n` +
      `Following these practices will help ensure your transaction is secure, efficient, and successful!`,
  };
}

// Transaction analysis function (enhanced)
function analyzeTransaction(workflow: SimpleBlock[]): string {
  const analysis: string[] = [];
  const context = analyzeTransactionContext(workflow);
  
  analysis.push(`📊 **Enhanced Transaction Analysis:**\n`);
  analysis.push(`• Total blocks: ${workflow.length}`);
  analysis.push(`• Intent: ${context.intent}`);
  analysis.push(`• Complexity: ${context.complexity}`);
  analysis.push(`• Estimated cost: ${(context.estimatedCost / 1e9).toFixed(6)} SOL`);
  analysis.push(`• Estimated compute: ${context.estimatedComputeUnits.toLocaleString()} CU`);
  
  const blockTypes = workflow.reduce((acc, block) => {
    acc[block.name] = (acc[block.name] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  analysis.push(`• Block types: ${Object.keys(blockTypes).join(', ')}`);
  
  const completeBlocks = workflow.filter(b => Object.values(b.params).every(v => v && v !== ''));
  const incompleteBlocks = workflow.filter(b => Object.values(b.params).some(v => !v || v === ''));
  
  analysis.push(`• Complete: ${completeBlocks.length}`);
  analysis.push(`• Need configuration: ${incompleteBlocks.length}`);
  
  if (context.risks.length > 0) {
    analysis.push(`\n⚠️ **Risks:**`);
    context.risks.forEach(risk => analysis.push(`• ${risk}`));
  }
  
  if (context.optimizations.length > 0) {
    analysis.push(`\n💡 **Optimizations:**`);
    context.optimizations.forEach(opt => analysis.push(`• ${opt}`));
  }
  
  return analysis.join('\n');
}

