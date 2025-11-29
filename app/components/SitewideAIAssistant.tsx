'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Send,
  Brain,
  ChevronDown,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { parseIntent } from '../lib/ai/intent-parser';
import { executeIntent, ExecutionResult } from '../lib/ai/action-executor';
import { getAllStakingProviders } from '../lib/staking/staking-providers';
import { saveContact } from '../lib/send/send-executor';
import { checkLMStudioAvailable, getAIResponseWithContext } from '../lib/ai/lm-studio-client';
import { getAIResponseWithMCPContext } from '../lib/ai/mcp-enhanced-client';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: string[];
  executionResult?: ExecutionResult;
}

interface AIAssistantProps {
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
}

export function SitewideAIAssistant({ isMinimized = false, onToggleMinimize }: AIAssistantProps) {
  const { publicKey, connected, wallet } = useWallet();
  const { connection } = useConnection();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "👋 Hi! I'm your Sealevel AI Assistant. I can execute Solana operations through natural language!\n\n**Try commands like:**\n• \"stake 200 sol\"\n• \"send 5 sol to jimmy\"\n• \"airdrop 10 sol on devnet\"\n• \"show contacts\"\n\nWhat would you like to build today?",
      timestamp: new Date(),
      suggestions: [
        "stake 200 sol",
        "send 5 sol to alice",
        "airdrop 10 sol on devnet",
        "show contacts"
      ]
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [pendingAction, setPendingAction] = useState<any>(null);
  const [lmStudioAvailable, setLmStudioAvailable] = useState<boolean | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check LM Studio availability on mount
  useEffect(() => {
    checkLMStudioAvailable().then(setLmStudioAvailable);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isMinimized]);

  const handleSendMessage = async (messageText?: string) => {
    const textToSend = messageText || input.trim();
    if (!textToSend) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      // Try to use LM Studio with MCP enhancement for better understanding if available
      let aiResponse: string | null = null;
      let mcpResourcesUsed = false;
      if (lmStudioAvailable) {
        try {
          // Try MCP-enhanced first (enriched with dataset and transaction examples)
          const mcpResult = await getAIResponseWithMCPContext(textToSend, {
            userWallet: publicKey?.toString(),
            network: connection.rpcEndpoint.includes('devnet') ? 'devnet' : 'mainnet',
          });
          aiResponse = mcpResult.content;
          mcpResourcesUsed = mcpResult.mcpResourcesUsed;

          // Fallback to regular if MCP fails
          if (!aiResponse) {
            aiResponse = await getAIResponseWithContext(textToSend, {
              userWallet: publicKey?.toString(),
              network: connection.rpcEndpoint.includes('devnet') ? 'devnet' : 'mainnet',
            });
          }
        } catch (error) {
          console.warn('LM Studio query failed, falling back to rule-based:', error);
          // Try regular client as fallback
          try {
            aiResponse = await getAIResponseWithContext(textToSend, {
              userWallet: publicKey?.toString(),
              network: connection.rpcEndpoint.includes('devnet') ? 'devnet' : 'mainnet',
            });
          } catch (fallbackError) {
            console.warn('Fallback LM Studio query also failed:', fallbackError);
          }
        }
      }

      // Parse intent
      const intent = parseIntent(textToSend);

      // Check if wallet is needed
      if (intent.type !== 'help' && intent.type !== 'contact' && intent.type !== 'unknown' && !connected) {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: '⚠️ Please connect your wallet first to execute this operation.',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
        setIsTyping(false);
        return;
      }

      // If it's a help query or unknown intent, use AI response if available
      if ((intent.type === 'help' || intent.type === 'unknown') && aiResponse) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: aiResponse,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
        setIsTyping(false);
        return;
      }

      // Execute intent
      const result = await executeIntent(intent, connection, { publicKey, connected, wallet } as any);

      // Handle result
      if (result.requiresUserAction) {
        if (result.actionType === 'select_provider') {
          // Show provider selection
          setPendingAction({
            type: 'select_provider',
            data: result.actionData,
            originalIntent: intent,
          });

          const providerMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: result.message,
            timestamp: new Date(),
            executionResult: result,
          };
          setMessages(prev => [...prev, providerMessage]);
        } else if (result.actionType === 'provide_contact_info') {
          // Prompt for contact info
          setPendingAction({
            type: 'provide_contact_info',
            data: result.actionData,
            originalIntent: intent,
          });

          const contactMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: result.message + '\n\nPlease provide their wallet address or email:',
            timestamp: new Date(),
            executionResult: result,
          };
          setMessages(prev => [...prev, contactMessage]);
        } else if (result.actionType === 'navigate') {
          // Navigation action
          const navMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: result.message,
            timestamp: new Date(),
            executionResult: result,
          };
          setMessages(prev => [...prev, navMessage]);
        }
      } else {
        // Regular response
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: result.message,
          timestamp: new Date(),
          executionResult: result,
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('AI Response error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Sorry, I'm having trouble responding right now. Please try again or check your connection.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleProviderSelection = async (providerId: string) => {
    if (!pendingAction || pendingAction.type !== 'select_provider') return;

    const { data, originalIntent } = pendingAction;
    setPendingAction(null);

    // Update intent with selected provider
    originalIntent.parameters.provider = providerId;

    setIsTyping(true);
    try {
      const result = await executeIntent(originalIntent, connection, { publicKey, connected, wallet } as any);

      const message: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: result.message,
        timestamp: new Date(),
        executionResult: result,
      };
      setMessages(prev => [...prev, message]);
    } catch (error) {
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleContactInfo = async (info: string) => {
    if (!pendingAction || pendingAction.type !== 'provide_contact_info') return;

    const { data, originalIntent } = pendingAction;

    // Determine if info is wallet address or email
    const isWallet = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(info);
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(info);

    if (!isWallet && !isEmail) {
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Please provide a valid wallet address or email address.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }

    setPendingAction(null);
    setIsTyping(true);

    try {
      // Save contact
      const contactResult = await saveContact(
        data.contactName,
        isWallet ? info : undefined,
        isEmail ? info : undefined
      );

      if (!contactResult.success) {
        throw new Error(contactResult.error);
      }

      // Now execute the send
      originalIntent.parameters.recipient = data.contactName;
      const result = await executeIntent(originalIntent, connection, { publicKey, connected, wallet } as any);

      const message: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `✅ Contact "${data.contactName}" saved!\n\n${result.message}`,
        timestamp: new Date(),
        executionResult: result,
      };
      setMessages(prev => [...prev, message]);
    } catch (error) {
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    handleSendMessage(suggestion);
  };

  if (isMinimized) {
    return null;
  }

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 left-6 z-50 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-200"
          title="AI Assistant"
        >
          <Brain className="w-6 h-6" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 left-6 z-50 w-96 max-w-[calc(100vw-3rem)] bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold">AI Assistant</h3>
                <p className="text-white/80 text-sm">
                  {lmStudioAvailable === true ? '🤖 Powered by LM Studio' : 'Sealevel Studio Helper'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onToggleMinimize}
                className="text-white/80 hover:text-white p-1"
                title="Minimize"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/80 hover:text-white p-1"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="h-96 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-200 border border-gray-700'
                }`}>
                  <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                  {message.executionResult?.success && message.executionResult.data?.signature && (
                    <div className="mt-2 text-xs text-green-400">
                      <CheckCircle className="w-3 h-3 inline mr-1" />
                      Transaction: {message.executionResult.data.signature.slice(0, 8)}...
                    </div>
                  )}
                  {message.executionResult && !message.executionResult.success && (
                    <div className="mt-2 text-xs text-red-400">
                      <XCircle className="w-3 h-3 inline mr-1" />
                      {message.executionResult.message}
                    </div>
                  )}
                  <div className="text-xs opacity-70 mt-2">
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                  {message.suggestions && (
                    <div className="mt-3 space-y-2">
                      {message.suggestions.map((suggestion, i) => (
                        <button
                          key={i}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="block w-full text-left text-xs bg-gray-700 hover:bg-gray-600 rounded-lg px-3 py-2 transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Provider Selection UI */}
            {pendingAction?.type === 'select_provider' && (
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 space-y-2">
                <div className="text-sm font-semibold text-gray-200 mb-2">Select Staking Provider:</div>
                {pendingAction.data.providers.map((provider: any, i: number) => (
                  <button
                    key={i}
                    onClick={() => handleProviderSelection(provider.id)}
                    className="w-full text-left text-xs bg-gray-700 hover:bg-gray-600 rounded-lg px-3 py-2 transition-colors"
                  >
                    {provider.displayText}
                  </button>
                ))}
              </div>
            )}

            {/* Contact Info Input */}
            {pendingAction?.type === 'provide_contact_info' && (
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
                <div className="text-sm font-semibold text-gray-200 mb-2">
                  Enter wallet address or email for "{pendingAction.data.contactName}":
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Wallet address or email"
                    className="flex-1 bg-gray-700 text-white text-xs px-2 py-1 rounded"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleContactInfo(e.currentTarget.value);
                        e.currentTarget.value = '';
                      }
                    }}
                    autoFocus
                  />
                  <button
                    onClick={(e) => {
                      const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                      if (input) {
                        handleContactInfo(input.value);
                        input.value = '';
                      }
                    }}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-xs"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}

            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-800 border border-gray-700 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                    <span className="text-gray-400 text-sm">Processing...</span>
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
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="WHAT ARE WE BUILDING TODAY?"
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={!input.trim() || isTyping}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white p-2 rounded-lg transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2 mt-3 flex-wrap">
              <button
                onClick={() => handleSendMessage("stake 200 sol")}
                className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1 rounded-full transition-colors"
              >
                Stake SOL
              </button>
              <button
                onClick={() => handleSendMessage("send 5 sol to alice")}
                className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1 rounded-full transition-colors"
              >
                Send SOL
              </button>
              <button
                onClick={() => handleSendMessage("airdrop 10 sol on devnet")}
                className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1 rounded-full transition-colors"
              >
                Airdrop
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
