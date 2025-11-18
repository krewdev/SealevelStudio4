'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, Lightbulb } from 'lucide-react';
import { AgentMessage, AgentSuggestion } from '../lib/agents/types';

interface AgentChatProps {
  agentName: string;
  agentIcon?: React.ReactNode;
  initialMessage: string;
  onSend: (message: string) => Promise<{ content: string; suggestions?: AgentSuggestion[] }>;
  onSuggestion?: (suggestion: AgentSuggestion) => void;
  autoMessages?: Array<{ delay: number; content: string; suggestions?: AgentSuggestion[] }>;
  className?: string;
}

export function AgentChat({
  agentName,
  agentIcon,
  initialMessage,
  onSend,
  onSuggestion,
  autoMessages = [],
  className = '',
}: AgentChatProps) {
  const [messages, setMessages] = useState<AgentMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: initialMessage,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-messages
  useEffect(() => {
    autoMessages.forEach(({ delay, content, suggestions }) => {
      const timer = setTimeout(() => {
        addMessage('assistant', content, suggestions);
      }, delay);
      return () => clearTimeout(timer);
    });
  }, []);

  const addMessage = useCallback(
    (role: 'user' | 'assistant', content: string, suggestions?: AgentSuggestion[]) => {
      const newMessage: AgentMessage = {
        id: Date.now().toString(),
        role,
        content,
        timestamp: new Date(),
        suggestions,
      };
      setMessages((prev) => [...prev, newMessage]);
    },
    []
  );

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage = input.trim();
    setInput('');
    addMessage('user', userMessage);

    setIsTyping(true);
    try {
      const response = await onSend(userMessage);
      addMessage('assistant', response.content, response.suggestions);
    } catch (error) {
      addMessage(
        'assistant',
        `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setIsTyping(false);
    }
  };

  const handleSuggestion = (suggestion: AgentSuggestion) => {
    if (suggestion.action) {
      suggestion.action();
    }
    if (onSuggestion) {
      onSuggestion(suggestion);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
                {agentIcon || <Bot size={16} className="text-white" />}
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
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                <User size={16} className="text-white" />
              </div>
            )}
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center">
              {agentIcon || <Bot size={16} className="text-white" />}
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

      {/* Input */}
      <div className="border-t border-gray-700 p-4">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`Ask ${agentName}...`}
            className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
            disabled={isTyping}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg transition-colors flex items-center gap-2"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

