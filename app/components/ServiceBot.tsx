'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  MessageSquare, 
  Send, 
  Bot, 
  User, 
  Loader2, 
  X, 
  ArrowLeft,
  Sparkles,
  Code,
  Book,
  Shield,
  Zap
} from 'lucide-react';
import { RiskAcknowledgement } from './compliance/RiskAcknowledgement';
import { useRiskConsent } from '../hooks/useRiskConsent';
import { SEAL_TOKEN_ECONOMICS } from '../lib/seal-token/config';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ServiceBotProps {
  onBack?: () => void;
  context?: Record<string, any>;
}

export function ServiceBot({ onBack, context }: ServiceBotProps) {
  const { hasConsent, initialized, accept } = useRiskConsent('service-bot');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your AI assistant for Sealevel Studio. I can help you with:\n\n• Solana development questions\n• Code explanations and debugging\n• Platform features and usage\n• Best practices and security\n\nWhat would you like to know?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-gray-400">
        <div className="animate-pulse text-sm uppercase tracking-[0.3em]">Preparing compliance checks...</div>
      </div>
    );
  }

  if (!hasConsent) {
    return (
      <RiskAcknowledgement
        featureName="Service Desk AI Bot"
        summary="This assistant can draft responses for customers and may process sensitive data. Confirm you will follow privacy law, keep transcripts secure, and acknowledge Sealevel Studio provides tooling only."
        bulletPoints={[
          'Semantic memory for tickets & docs',
          'Escalation hotkeys for humans',
          'JSON-rich responses for workflows',
        ]}
        costDetails={[
          `AI usage metered at ~${SEAL_TOKEN_ECONOMICS.pricing.ai_query.toLocaleString()} SEAL per 1k tokens`,
          'Enterprise session pricing available upon request',
        ]}
        disclaimers={[
          'Do not paste production secrets unless you own the environment.',
          'Comply with GDPR/CCPA and local privacy regulations when handling PII.',
        ]}
        accent="emerald"
        onAccept={accept}
      />
    );
  }

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const addMessage = useCallback((role: 'user' | 'assistant', content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      role,
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setError(null);
    
    // Add user message
    addMessage('user', userMessage);
    setIsLoading(true);

    try {
      // Prepare messages for API (last 10 messages for context)
      const recentMessages = messages.slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Add current user message
      recentMessages.push({
        role: 'user',
        content: userMessage
      });

      const response = await fetch('/api/openai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: recentMessages,
          model: 'gpt-4o-mini',
          temperature: 0.7,
          maxTokens: 2000,
          context: context || {}
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response from AI');
      }

      const data = await response.json();
      
      if (data.success && data.message) {
        addMessage('assistant', data.message);
      } else {
        throw new Error('Invalid response from AI service');
      }
    } catch (error) {
      console.error('Service bot error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setError(errorMessage);
      
      // Provide helpful error message for missing API key
      let userMessage = `I apologize, but I encountered an error: ${errorMessage}.`;
      if (errorMessage.includes('OpenAI API key not configured')) {
        userMessage = `⚠️ OpenAI API key is not configured.\n\nTo use the Service Bot:\n1. Get an API key from https://platform.openai.com/api-keys\n2. Add it to your .env.local file as: OPENAI_API_KEY=sk-your-key-here\n3. Restart your development server\n\nFor production, add it in Vercel project settings → Environment Variables.`;
      }
      
      addMessage('assistant', userMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickActions = [
    { icon: <Code size={16} />, text: 'Explain Solana transactions', prompt: 'Can you explain how Solana transactions work and what makes them different from other blockchains?' },
    { icon: <Shield size={16} />, text: 'Security best practices', prompt: 'What are the security best practices I should follow when developing Solana programs?' },
    { icon: <Book size={16} />, text: 'Platform features', prompt: 'What features does Sealevel Studio offer and how can I use them effectively?' },
    { icon: <Zap size={16} />, text: 'Optimization tips', prompt: 'How can I optimize my Solana programs for better performance and lower costs?' },
  ];

  const handleQuickAction = (prompt: string) => {
    setInput(prompt);
    // Auto-send after a brief delay
    setTimeout(() => {
      handleSend();
    }, 100);
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      {/* Header */}
      <div className="border-b border-gray-700 p-4 bg-gray-800">
        <div className="flex items-center gap-4 mb-2">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            >
              <ArrowLeft size={18} />
              <span className="text-sm">Back</span>
            </button>
          )}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg">
              <Sparkles className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">AI Service Bot</h1>
              <p className="text-sm text-gray-400">Intelligent assistance powered by OpenAI</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <span className="text-xs text-gray-500 mr-2">Quick actions:</span>
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={() => handleQuickAction(action.prompt)}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-md text-xs text-gray-300 hover:text-white transition-colors"
            >
              {action.icon}
              <span>{action.text}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {message.role === 'assistant' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                <Bot size={16} className="text-white" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-lg p-4 ${
                message.role === 'user'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-100 border border-gray-700'
              }`}
            >
              <div className="whitespace-pre-wrap break-words">{message.content}</div>
              <div className={`text-xs mt-2 ${
                message.role === 'user' ? 'text-purple-200' : 'text-gray-500'
              }`}>
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
            {message.role === 'user' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                <User size={16} className="text-gray-300" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
              <Bot size={16} className="text-white" />
            </div>
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center gap-2">
                <Loader2 size={16} className="animate-spin text-purple-400" />
                <span className="text-gray-400">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-700 p-4 bg-gray-800">
        <div className="flex items-end gap-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything about Solana development, Sealevel Studio, or code..."
            className="flex-1 min-h-[60px] max-h-[200px] p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            disabled={isLoading}
            rows={2}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="p-3 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all flex items-center justify-center"
          >
            {isLoading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Send size={20} />
            )}
          </button>
        </div>
        <div className="text-xs text-gray-500 mt-2">
          Press Enter to send, Shift+Enter for new line
        </div>
      </div>
    </div>
  );
}

