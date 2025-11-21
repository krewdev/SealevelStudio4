'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  MessageCircle,
  LogIn,
  LogOut,
  Send,
  Plus,
  Trash2,
  X,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Calendar,
  ArrowLeft,
  Play,
  Pause,
  Hash,
} from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { RiskAcknowledgement } from './compliance/RiskAcknowledgement';
import { useRiskConsent } from '../hooks/useRiskConsent';
import { SEAL_TOKEN_ECONOMICS } from '../lib/seal-token/config';

interface TelegramMessage {
  id: string;
  chatId: string;
  chatType: 'channel' | 'group' | 'private';
  content: string;
  sentAt?: Date;
  status: 'sent' | 'failed' | 'scheduled';
  scheduledFor?: Date;
}

interface TelegramBotProps {
  onBack?: () => void;
}

export function TelegramBot({ onBack }: TelegramBotProps) {
  const { hasConsent, initialized, accept } = useRiskConsent('telegram-bot');
  const { publicKey } = useWallet();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [botInfo, setBotInfo] = useState<{ username?: string; firstName?: string; id?: string } | null>(null);
  const [messages, setMessages] = useState<TelegramMessage[]>([]);
  const [draftContent, setDraftContent] = useState('');
  const [chatId, setChatId] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'compose' | 'sent' | 'scheduled' | 'analytics' | 'agent'>('compose');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [agentRunning, setAgentRunning] = useState(false);
  const [agentActivities, setAgentActivities] = useState<any[]>([]);
  const [isStartingAgent, setIsStartingAgent] = useState(false);
  const [botToken, setBotToken] = useState('');
  const [agentChatIds, setAgentChatIds] = useState<string[]>(['']);

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
        featureName="Telegram Automation Bot"
        summary="This tool can broadcast to channels, respond in groups, and run autonomous scripts via your BotFather token. Confirm you will respect all telecom and spam laws."
        bulletPoints={[
          'Schedule announcements across groups or channels',
          'Autonomous responder for FAQs and warm leads',
          'Multi-chat orchestration with audit logs',
        ]}
        costDetails={[
          `Setup: ${SEAL_TOKEN_ECONOMICS.pricing.telegram_bot_setup.toLocaleString()} SEAL`,
          `Monthly: ${SEAL_TOKEN_ECONOMICS.pricing.telegram_bot_monthly.toLocaleString()} SEAL`,
          `Per broadcast: ${SEAL_TOKEN_ECONOMICS.pricing.telegram_bot_post.toLocaleString()} SEAL`,
        ]}
        disclaimers={[
          'Store your BotFather token securely—never share it in recorded sessions.',
          'You are solely responsible for ensuring messages comply with regional marketing law.',
        ]}
        accent="teal"
        onAccept={accept}
      />
    );
  }

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
    loadMessages();
  }, []);

  // Monitor agent when authenticated
  useEffect(() => {
    if (isAuthenticated && botInfo) {
      checkAgentStatus();
      const interval = setInterval(checkAgentStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, botInfo]);

  const checkAgentStatus = async () => {
    if (!isAuthenticated) return;
    
    try {
      const response = await fetch('/api/telegram/agent?botId=' + (botInfo?.id || 'default'));
      if (response.ok) {
        const data = await response.json();
        setAgentRunning(data.isRunning || false);
        setAgentActivities(data.activities || []);
        if (data.chatIds) {
          setAgentChatIds(data.chatIds.length > 0 ? data.chatIds : ['']);
        }
      }
    } catch (error) {
      console.error('Error checking agent status:', error);
    }
  };

  const handleStartAgent = async () => {
    setIsStartingAgent(true);
    setError(null);
    
    // Filter out empty chat IDs
    const validChatIds = agentChatIds.filter(id => id.trim() !== '');
    
    if (validChatIds.length === 0) {
      setError('At least one chat ID is required');
      setIsStartingAgent(false);
      return;
    }
    
    try {
      const response = await fetch('/api/telegram/agent?action=start&botId=' + (botInfo?.id || 'default'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatIds: validChatIds }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to start agent');
      }
      
      const data = await response.json();
      setAgentRunning(true);
      setSuccess('Agent started successfully!');
      await checkAgentStatus();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to start agent');
    } finally {
      setIsStartingAgent(false);
    }
  };

  const handleStopAgent = async () => {
    try {
      const response = await fetch('/api/telegram/agent?action=stop&botId=' + (botInfo?.id || 'default'), {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to stop agent');
      }
      
      setAgentRunning(false);
      setSuccess('Agent stopped successfully');
      await checkAgentStatus();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to stop agent');
    }
  };

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/telegram/auth');
      if (response.ok) {
        const data = await response.json();
        setIsAuthenticated(data.authenticated);
        if (data.authenticated && data.bot) {
          setBotInfo(data.bot);
        }
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    }
  };

  const loadMessages = async () => {
    try {
      const response = await fetch('/api/telegram/messages');
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleLogin = async () => {
    setIsAuthenticating(true);
    setError(null);

    try {
      const response = await fetch('/api/telegram/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: botToken || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to login to Telegram');
      }

      const data = await response.json();
      setIsAuthenticated(true);
      setBotInfo(data.bot);
      setSuccess('Successfully logged in to Telegram!');
      await checkAuthStatus();
      setBotToken('');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to login to Telegram');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/telegram/auth', { method: 'DELETE' });
      setIsAuthenticated(false);
      setBotInfo(null);
      setSuccess('Logged out successfully');
    } catch (error) {
      setError('Failed to logout');
    }
  };

  const handleSend = async (content: string, chatIdParam: string, scheduleFor?: Date) => {
    if (!content.trim() || !chatIdParam.trim()) {
      setError('Content and Chat ID are required');
      return;
    }

    setIsSending(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/telegram/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: chatIdParam,
          content,
          scheduledFor: scheduleFor?.toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }

      const data = await response.json();
      
      if (scheduleFor) {
        setSuccess(`Message scheduled for ${scheduleFor.toLocaleString()}`);
      } else {
        setSuccess('Message sent successfully!');
      }

      setDraftContent('');
      setChatId('');
      setScheduledDate('');
      setScheduledTime('');
      await loadMessages();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleSchedule = () => {
    if (!scheduledDate || !scheduledTime) {
      setError('Please select both date and time');
      return;
    }

    const scheduledFor = new Date(`${scheduledDate}T${scheduledTime}`);
    if (scheduledFor < new Date()) {
      setError('Scheduled time must be in the future');
      return;
    }

    handleSend(draftContent, chatId, scheduledFor);
  };

  const addAgentChatId = () => {
    setAgentChatIds([...agentChatIds, '']);
  };

  const removeAgentChatId = (index: number) => {
    setAgentChatIds(agentChatIds.filter((_, i) => i !== index));
  };

  const updateAgentChatId = (index: number, value: string) => {
    const updated = [...agentChatIds];
    updated[index] = value;
    setAgentChatIds(updated);
  };

  const scheduledMessages = messages.filter(m => m.status === 'scheduled');
  const sentMessages = messages.filter(m => m.status === 'sent').slice(0, 20);

  return (
    <div className="min-h-screen animated-bg text-white relative">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Header */}
      <div className="relative z-10 border-b border-slate-800/50 glass p-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              >
                <ArrowLeft size={18} />
                <span className="text-sm">Back</span>
              </button>
            )}
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20">
                <MessageCircle className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gradient-primary">Telegram Bot</h1>
                <p className="text-sm text-gray-400 mt-1">Create and manage Telegram messages</p>
              </div>
            </div>
          </div>

          {/* Auth Status */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                {botInfo && (
                  <div className="text-right">
                    <p className="text-sm font-medium">@{botInfo.username}</p>
                    <p className="text-xs text-gray-400">{botInfo.firstName || 'Telegram Bot'}</p>
                  </div>
                )}
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-2"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </>
            ) : (
              <button
                onClick={handleLogin}
                disabled={isAuthenticating}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isAuthenticating ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <LogIn size={16} />
                    Login
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-8">
        {/* Error/Success Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-400 font-medium">Error</p>
              <p className="text-sm text-gray-300 mt-1">{error}</p>
            </div>
            <button onClick={() => setError(null)}>
              <X size={16} className="text-gray-400 hover:text-white" />
            </button>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-green-400 font-medium">Success</p>
              <p className="text-sm text-gray-300 mt-1">{success}</p>
            </div>
            <button onClick={() => setSuccess(null)}>
              <X size={16} className="text-gray-400 hover:text-white" />
            </button>
          </div>
        )}

        {!isAuthenticated ? (
          /* Login Form */
          <div className="card-modern p-12">
            <MessageCircle className="w-16 h-16 text-blue-400 mx-auto mb-6" />
            <h2 className="text-2xl font-bold mb-4 text-center">Connect Your Telegram Bot</h2>
            <p className="text-gray-400 mb-8 max-w-md mx-auto text-center">
              Enter your Telegram bot token to get started. Create a bot via @BotFather on Telegram.
            </p>
            
            <div className="max-w-md mx-auto space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Bot Token</label>
                <input
                  type="password"
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
                  className="input-modern w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Get your bot token from @BotFather on Telegram
                </p>
              </div>

              <button
                onClick={handleLogin}
                disabled={isAuthenticating || !botToken.trim()}
                className="btn-modern px-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 flex items-center gap-3 w-full justify-center"
              >
                {isAuthenticating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    Login to Telegram
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-gray-700">
              {(['compose', 'sent', 'scheduled', 'analytics', 'agent'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-3 font-medium transition-colors border-b-2 ${
                    activeTab === tab
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-gray-400 hover:text-white'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  {tab === 'scheduled' && scheduledMessages.length > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-blue-600 rounded-full text-xs">
                      {scheduledMessages.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Compose Tab */}
            {activeTab === 'compose' && (
              <div className="card-modern p-6">
                <h2 className="text-xl font-bold mb-6">Send Message</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Chat ID</label>
                    <input
                      type="text"
                      value={chatId}
                      onChange={(e) => setChatId(e.target.value)}
                      placeholder="@channel_username or -1001234567890 (group ID)"
                      className="input-modern w-full"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Use @username for channels, or numeric ID for groups/users
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Message Content</label>
                    <textarea
                      value={draftContent}
                      onChange={(e) => setDraftContent(e.target.value)}
                      placeholder="Type your message here..."
                      className="input-modern w-full h-32 resize-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Supports HTML formatting
                    </p>
                  </div>

                  {/* Schedule Options */}
                  <div className="border-t border-gray-700 pt-4">
                    <div className="flex items-center gap-4 mb-4">
                      <input
                        type="checkbox"
                        id="schedule"
                        checked={!!scheduledDate && !!scheduledTime}
                        onChange={(e) => {
                          if (!e.target.checked) {
                            setScheduledDate('');
                            setScheduledTime('');
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <label htmlFor="schedule" className="flex items-center gap-2 cursor-pointer">
                        <Calendar size={16} />
                        Schedule Message
                      </label>
                    </div>
                    {(scheduledDate || scheduledTime) && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Date</label>
                          <input
                            type="date"
                            value={scheduledDate}
                            onChange={(e) => setScheduledDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className="input-modern w-full"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Time</label>
                          <input
                            type="time"
                            value={scheduledTime}
                            onChange={(e) => setScheduledTime(e.target.value)}
                            className="input-modern w-full"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => handleSend(draftContent, chatId)}
                      disabled={isSending || !draftContent.trim() || !chatId.trim()}
                      className="btn-modern px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isSending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Send Now
                        </>
                      )}
                    </button>
                    {(scheduledDate && scheduledTime) && (
                      <button
                        onClick={handleSchedule}
                        disabled={isSending || !draftContent.trim() || !chatId.trim()}
                        className="btn-modern px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        <Clock className="w-4 h-4" />
                        Schedule
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Sent Messages Tab */}
            {activeTab === 'sent' && (
              <div className="card-modern p-6">
                <h2 className="text-xl font-bold mb-6">Sent Messages</h2>
                {sentMessages.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No messages sent yet</p>
                ) : (
                  <div className="space-y-4">
                    {sentMessages.map(msg => (
                      <div key={msg.id} className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          <span className="text-sm text-gray-400">
                            Sent to {msg.chatId} {msg.sentAt?.toLocaleString()}
                          </span>
                        </div>
                        <p className="text-white">{msg.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Scheduled Messages Tab */}
            {activeTab === 'scheduled' && (
              <div className="card-modern p-6">
                <h2 className="text-xl font-bold mb-6">Scheduled Messages</h2>
                {scheduledMessages.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No scheduled messages</p>
                ) : (
                  <div className="space-y-4">
                    {scheduledMessages.map(msg => (
                      <div key={msg.id} className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-yellow-400" />
                            <span className="text-sm text-gray-400">
                              Scheduled for {msg.scheduledFor?.toLocaleString()}
                            </span>
                          </div>
                          <button className="text-red-400 hover:text-red-300">
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <p className="text-white">{msg.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <div className="card-modern p-6">
                <h2 className="text-xl font-bold mb-6">Analytics</h2>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-gray-800/50 rounded-lg">
                    <p className="text-sm text-gray-400 mb-1">Total Messages</p>
                    <p className="text-2xl font-bold">{sentMessages.length}</p>
                  </div>
                  <div className="p-4 bg-gray-800/50 rounded-lg">
                    <p className="text-sm text-gray-400 mb-1">Scheduled</p>
                    <p className="text-2xl font-bold">{scheduledMessages.length}</p>
                  </div>
                  <div className="p-4 bg-gray-800/50 rounded-lg">
                    <p className="text-sm text-gray-400 mb-1">Success Rate</p>
                    <p className="text-2xl font-bold">100%</p>
                  </div>
                </div>
              </div>
            )}

            {/* Agent Tab */}
            {activeTab === 'agent' && (
              <div className="card-modern p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold">Autonomous Agent</h2>
                  <div className="flex items-center gap-3">
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      agentRunning 
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                        : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                    }`}>
                      {agentRunning ? '● Running' : '○ Stopped'}
                    </div>
                    {agentRunning ? (
                      <button
                        onClick={handleStopAgent}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-2"
                      >
                        <Pause size={16} />
                        Stop Agent
                      </button>
                    ) : (
                      <button
                        onClick={handleStartAgent}
                        disabled={isStartingAgent}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                      >
                        {isStartingAgent ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            Starting...
                          </>
                        ) : (
                          <>
                            <Play size={16} />
                            Start Agent
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Agent Info */}
                  <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <h3 className="font-semibold text-blue-400 mb-2">Agent Capabilities</h3>
                    <ul className="text-sm text-gray-300 space-y-1 list-disc list-inside">
                      <li>Posts periodically (every 2 hours by default)</li>
                      <li>Monitors mentions and auto-replies</li>
                      <li>Monitors direct messages and responds</li>
                      <li>Runs autonomously once started</li>
                    </ul>
                  </div>

                  {/* Chat IDs Configuration */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Chat IDs to Post To</label>
                    <p className="text-xs text-gray-500 mb-3">
                      Add channel usernames (e.g., @mychannel) or group IDs (e.g., -1001234567890)
                    </p>
                    <div className="space-y-2">
                      {agentChatIds.map((chatId, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={chatId}
                            onChange={(e) => updateAgentChatId(index, e.target.value)}
                            placeholder="@channel_username or -1001234567890"
                            className="input-modern flex-1"
                          />
                          {agentChatIds.length > 1 && (
                            <button
                              onClick={() => removeAgentChatId(index)}
                              className="p-2 text-red-400 hover:bg-red-900/20 rounded"
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        onClick={addAgentChatId}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg flex items-center gap-2 text-sm"
                      >
                        <Plus size={16} />
                        Add Chat ID
                      </button>
                    </div>
                  </div>

                  {/* Activity Log */}
                  <div>
                    <h3 className="font-semibold mb-3">Activity Log</h3>
                    <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                      {agentActivities.length === 0 ? (
                        <p className="text-gray-400 text-center py-8">No activity yet. Start the agent to see activity.</p>
                      ) : (
                        agentActivities.map((activity) => (
                          <div
                            key={activity.id}
                            className={`p-3 rounded-lg border ${
                              activity.success
                                ? 'bg-green-500/10 border-green-500/30'
                                : 'bg-red-500/10 border-red-500/30'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                    activity.type === 'message' ? 'bg-blue-500/20 text-blue-400' :
                                    activity.type === 'reply' || activity.type === 'mention_reply' ? 'bg-purple-500/20 text-purple-400' :
                                    'bg-gray-500/20 text-gray-400'
                                  }`}>
                                    {activity.type}
                                  </span>
                                  {activity.success ? (
                                    <CheckCircle size={14} className="text-green-400" />
                                  ) : (
                                    <AlertCircle size={14} className="text-red-400" />
                                  )}
                                  {activity.chatId && (
                                    <span className="text-xs text-gray-500">({activity.chatId})</span>
                                  )}
                                </div>
                                <p className="text-sm text-white">{activity.message}</p>
                                <p className="text-xs text-gray-400 mt-1">
                                  {new Date(activity.timestamp).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

