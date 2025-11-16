'use client';

import React, { useState, useCallback } from 'react';
import {
  MessageSquare,
  Twitter,
  Play,
  Pause,
  Settings,
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  X,
  Clock,
  BarChart3,
  Edit,
  Copy
} from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { TelegramAdvertisingBot } from '../lib/advertising/telegram-bot';
import { TwitterAdvertisingBot } from '../lib/advertising/twitter-bot';
import { AdvertisingConfig } from '../lib/advertising/types';

interface AdvertisingBotsProps {
  onBack?: () => void;
}

interface BotInstance {
  id: string;
  type: 'telegram' | 'twitter';
  config: AdvertisingConfig;
  bot?: TelegramAdvertisingBot | TwitterAdvertisingBot;
  isRunning: boolean;
  stats: {
    totalPosts: number;
    errors: number;
    lastPost?: Date;
  };
}

export function AdvertisingBots({ onBack }: AdvertisingBotsProps) {
  const { publicKey } = useWallet();
  const [activeTab, setActiveTab] = useState<'telegram' | 'twitter' | 'dashboard'>('dashboard');
  const [bots, setBots] = useState<BotInstance[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Telegram Form State
  const [telegramConfig, setTelegramConfig] = useState({
    botToken: '',
    channelId: '',
    tokenAddress: '',
    tokenName: '',
    tokenSymbol: '',
    tokenDescription: '',
    interval: 60,
    messageTemplate: '🚀 New Token Launch!\n\n{tokenName} ({tokenSymbol})\n\nAddress: {tokenAddress}\n\n{tokenDescription}',
    maxPostsPerDay: 24,
  });

  // Twitter Form State
  const [twitterConfig, setTwitterConfig] = useState({
    apiKey: '',
    apiSecret: '',
    accessToken: '',
    accessTokenSecret: '',
    tokenAddress: '',
    tokenName: '',
    tokenSymbol: '',
    tokenDescription: '',
    interval: 120,
    messageTemplate: '🚀 New Token Launch!\n\n{tokenName} ({tokenSymbol})\n\nAddress: {tokenAddress}\n\n{tokenDescription}\n\n#Solana #DeFi #Crypto',
    maxTweetsPerDay: 12,
    hashtags: ['Solana', 'DeFi', 'Crypto'],
  });

  const createTelegramBot = useCallback(async () => {
    if (!telegramConfig.botToken || !telegramConfig.channelId || !telegramConfig.tokenAddress) {
      setError('Please fill in all required fields');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const config: AdvertisingConfig = {
        tokenAddress: telegramConfig.tokenAddress,
        tokenName: telegramConfig.tokenName,
        tokenSymbol: telegramConfig.tokenSymbol,
        tokenDescription: telegramConfig.tokenDescription,
        telegram: {
          botToken: telegramConfig.botToken,
          channelId: telegramConfig.channelId,
          enabled: true,
          interval: telegramConfig.interval,
          messageTemplate: telegramConfig.messageTemplate,
          maxPostsPerDay: telegramConfig.maxPostsPerDay,
        },
      };

      const bot = new TelegramAdvertisingBot(
        config.telegram!,
        {
          tokenName: config.tokenName,
          tokenSymbol: config.tokenSymbol,
          tokenAddress: config.tokenAddress,
          tokenDescription: config.tokenDescription,
        }
      );

      const botInstance: BotInstance = {
        id: `telegram-${Date.now()}`,
        type: 'telegram',
        config,
        bot,
        isRunning: false,
        stats: {
          totalPosts: 0,
          errors: 0,
        },
      };

      setBots([...bots, botInstance]);
      setSuccess('Telegram bot created successfully!');
      
      // Reset form
      setTelegramConfig({
        botToken: '',
        channelId: '',
        tokenAddress: '',
        tokenName: '',
        tokenSymbol: '',
        tokenDescription: '',
        interval: 60,
        messageTemplate: '🚀 New Token Launch!\n\n{tokenName} ({tokenSymbol})\n\nAddress: {tokenAddress}\n\n{tokenDescription}',
        maxPostsPerDay: 24,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create Telegram bot');
    } finally {
      setIsCreating(false);
    }
  }, [telegramConfig, bots]);

  const createTwitterBot = useCallback(async () => {
    if (!twitterConfig.apiKey || !twitterConfig.apiSecret || !twitterConfig.accessToken || !twitterConfig.accessTokenSecret || !twitterConfig.tokenAddress) {
      setError('Please fill in all required fields');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const config: AdvertisingConfig = {
        tokenAddress: twitterConfig.tokenAddress,
        tokenName: twitterConfig.tokenName,
        tokenSymbol: twitterConfig.tokenSymbol,
        tokenDescription: twitterConfig.tokenDescription,
        twitter: {
          apiKey: twitterConfig.apiKey,
          apiSecret: twitterConfig.apiSecret,
          accessToken: twitterConfig.accessToken,
          accessTokenSecret: twitterConfig.accessTokenSecret,
          enabled: true,
          interval: twitterConfig.interval,
          messageTemplate: twitterConfig.messageTemplate,
          maxTweetsPerDay: twitterConfig.maxTweetsPerDay,
          hashtags: twitterConfig.hashtags,
        },
      };

      const bot = new TwitterAdvertisingBot(
        config.twitter!,
        {
          tokenName: config.tokenName,
          tokenSymbol: config.tokenSymbol,
          tokenAddress: config.tokenAddress,
          tokenDescription: config.tokenDescription,
        }
      );

      const botInstance: BotInstance = {
        id: `twitter-${Date.now()}`,
        type: 'twitter',
        config,
        bot,
        isRunning: false,
        stats: {
          totalPosts: 0,
          errors: 0,
        },
      };

      setBots([...bots, botInstance]);
      setSuccess('Twitter bot created successfully!');
      
      // Reset form
      setTwitterConfig({
        apiKey: '',
        apiSecret: '',
        accessToken: '',
        accessTokenSecret: '',
        tokenAddress: '',
        tokenName: '',
        tokenSymbol: '',
        tokenDescription: '',
        interval: 120,
        messageTemplate: '🚀 New Token Launch!\n\n{tokenName} ({tokenSymbol})\n\nAddress: {tokenAddress}\n\n{tokenDescription}\n\n#Solana #DeFi #Crypto',
        maxTweetsPerDay: 12,
        hashtags: ['Solana', 'DeFi', 'Crypto'],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create Twitter bot');
    } finally {
      setIsCreating(false);
    }
  }, [twitterConfig, bots]);

  const toggleBot = async (botId: string) => {
    const bot = bots.find(b => b.id === botId);
    if (!bot) return;

    try {
      if (bot.isRunning) {
        await bot.bot?.stop();
      } else {
        await bot.bot?.start();
      }

      setBots(bots.map(b => 
        b.id === botId 
          ? { ...b, isRunning: !b.isRunning }
          : b
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle bot');
    }
  };

  const deleteBot = (botId: string) => {
    const bot = bots.find(b => b.id === botId);
    if (bot?.isRunning) {
      bot.bot?.stop();
    }
    setBots(bots.filter(b => b.id !== botId));
  };

  const telegramBots = bots.filter(b => b.type === 'telegram');
  const twitterBots = bots.filter(b => b.type === 'twitter');

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      {/* Header */}
      <div className="border-b border-gray-700 p-6 bg-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
              >
                <ArrowLeft size={18} />
                <span>Back</span>
              </button>
            )}
            <div className="flex items-center gap-2">
              <MessageSquare className="text-purple-400" size={24} />
              <h1 className="text-2xl font-bold">Advertising Bots</h1>
            </div>
          </div>
          {publicKey && (
            <div className="flex items-center gap-2 px-3 py-2 bg-green-900/30 border border-green-700/50 rounded-lg">
              <CheckCircle size={14} className="text-green-400" />
              <span className="text-sm text-green-400">Wallet Connected</span>
            </div>
          )}
        </div>
        <p className="text-sm text-gray-400 mt-2">
          Automate token promotion on Telegram and Twitter/X with customizable bots
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-700 bg-gray-800/50">
        <div className="flex gap-1 px-4">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'dashboard'
                ? 'border-purple-500 text-purple-400 bg-gray-800'
                : 'border-transparent text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'
            }`}
          >
            <BarChart3 size={18} />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('telegram')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'telegram'
                ? 'border-blue-500 text-blue-400 bg-gray-800'
                : 'border-transparent text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'
            }`}
          >
            <MessageSquare size={18} />
            Telegram ({telegramBots.length})
          </button>
          <button
            onClick={() => setActiveTab('twitter')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'twitter'
                ? 'border-cyan-500 text-cyan-400 bg-gray-800'
                : 'border-transparent text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'
            }`}
          >
            <Twitter size={18} />
            Twitter ({twitterBots.length})
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="text-sm text-gray-400 mb-2">Total Bots</div>
                <div className="text-2xl font-bold text-white">{bots.length}</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="text-sm text-gray-400 mb-2">Active Bots</div>
                <div className="text-2xl font-bold text-green-400">
                  {bots.filter(b => b.isRunning).length}
                </div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="text-sm text-gray-400 mb-2">Total Posts</div>
                <div className="text-2xl font-bold text-purple-400">
                  {bots.reduce((sum, b) => sum + b.stats.totalPosts, 0)}
                </div>
              </div>
            </div>

            {/* Bot List */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-lg font-bold mb-4">All Bots</h2>
              {bots.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <MessageSquare size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No bots created yet</p>
                  <p className="text-sm mt-2">Create a Telegram or Twitter bot to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {bots.map(bot => (
                    <div key={bot.id} className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {bot.type === 'telegram' ? (
                            <MessageSquare size={20} className="text-blue-400" />
                          ) : (
                            <Twitter size={20} className="text-cyan-400" />
                          )}
                          <div>
                            <div className="font-bold text-white">
                              {bot.config.tokenName} ({bot.config.tokenSymbol})
                            </div>
                            <div className="text-sm text-gray-400">
                              {bot.type === 'telegram' ? 'Telegram' : 'Twitter'} • {bot.stats.totalPosts} posts
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleBot(bot.id)}
                            className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${
                              bot.isRunning
                                ? 'bg-red-600 hover:bg-red-700'
                                : 'bg-green-600 hover:bg-green-700'
                            }`}
                          >
                            {bot.isRunning ? (
                              <>
                                <Pause size={16} />
                                Stop
                              </>
                            ) : (
                              <>
                                <Play size={16} />
                                Start
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => deleteBot(bot.id)}
                            className="p-2 text-red-400 hover:bg-red-900/20 rounded"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'telegram' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <MessageSquare size={24} className="text-blue-400" />
                Create Telegram Bot
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Bot Token *</label>
                  <input
                    type="text"
                    value={telegramConfig.botToken}
                    onChange={(e) => setTelegramConfig({ ...telegramConfig, botToken: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
                    placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Channel ID *</label>
                  <input
                    type="text"
                    value={telegramConfig.channelId}
                    onChange={(e) => setTelegramConfig({ ...telegramConfig, channelId: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
                    placeholder="@yourchannel or -1001234567890"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Token Address *</label>
                    <input
                      type="text"
                      value={telegramConfig.tokenAddress}
                      onChange={(e) => setTelegramConfig({ ...telegramConfig, tokenAddress: e.target.value })}
                      className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white font-mono"
                      placeholder="Token mint address"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Token Symbol *</label>
                    <input
                      type="text"
                      value={telegramConfig.tokenSymbol}
                      onChange={(e) => setTelegramConfig({ ...telegramConfig, tokenSymbol: e.target.value })}
                      className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
                      placeholder="TOKEN"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Token Name</label>
                  <input
                    type="text"
                    value={telegramConfig.tokenName}
                    onChange={(e) => setTelegramConfig({ ...telegramConfig, tokenName: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
                    placeholder="My Awesome Token"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Token Description</label>
                  <textarea
                    value={telegramConfig.tokenDescription}
                    onChange={(e) => setTelegramConfig({ ...telegramConfig, tokenDescription: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
                    rows={3}
                    placeholder="Describe your token..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Post Interval (minutes)</label>
                    <input
                      type="number"
                      min="1"
                      value={telegramConfig.interval}
                      onChange={(e) => setTelegramConfig({ ...telegramConfig, interval: parseInt(e.target.value) || 60 })}
                      className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Max Posts Per Day</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={telegramConfig.maxPostsPerDay}
                      onChange={(e) => setTelegramConfig({ ...telegramConfig, maxPostsPerDay: parseInt(e.target.value) || 24 })}
                      className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Message Template</label>
                  <textarea
                    value={telegramConfig.messageTemplate}
                    onChange={(e) => setTelegramConfig({ ...telegramConfig, messageTemplate: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white font-mono text-sm"
                    rows={6}
                    placeholder="Message template with {tokenName}, {tokenSymbol}, {tokenAddress}, {tokenDescription} placeholders"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Available placeholders: {'{tokenName}'}, {'{tokenSymbol}'}, {'{tokenAddress}'}, {'{tokenDescription}'}
                  </p>
                </div>

                <button
                  onClick={createTelegramBot}
                  disabled={isCreating}
                  className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium flex items-center justify-center gap-2"
                >
                  {isCreating ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus size={18} />
                      Create Telegram Bot
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'twitter' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Twitter size={24} className="text-cyan-400" />
                Create Twitter Bot
              </h2>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">API Key *</label>
                    <input
                      type="text"
                      value={twitterConfig.apiKey}
                      onChange={(e) => setTwitterConfig({ ...twitterConfig, apiKey: e.target.value })}
                      className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
                      placeholder="Twitter API Key"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">API Secret *</label>
                    <input
                      type="text"
                      value={twitterConfig.apiSecret}
                      onChange={(e) => setTwitterConfig({ ...twitterConfig, apiSecret: e.target.value })}
                      className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
                      placeholder="Twitter API Secret"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Access Token *</label>
                    <input
                      type="text"
                      value={twitterConfig.accessToken}
                      onChange={(e) => setTwitterConfig({ ...twitterConfig, accessToken: e.target.value })}
                      className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
                      placeholder="Access Token"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Access Token Secret *</label>
                    <input
                      type="text"
                      value={twitterConfig.accessTokenSecret}
                      onChange={(e) => setTwitterConfig({ ...twitterConfig, accessTokenSecret: e.target.value })}
                      className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
                      placeholder="Access Token Secret"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Token Address *</label>
                    <input
                      type="text"
                      value={twitterConfig.tokenAddress}
                      onChange={(e) => setTwitterConfig({ ...twitterConfig, tokenAddress: e.target.value })}
                      className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white font-mono"
                      placeholder="Token mint address"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Token Symbol *</label>
                    <input
                      type="text"
                      value={twitterConfig.tokenSymbol}
                      onChange={(e) => setTwitterConfig({ ...twitterConfig, tokenSymbol: e.target.value })}
                      className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
                      placeholder="TOKEN"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Token Name</label>
                  <input
                    type="text"
                    value={twitterConfig.tokenName}
                    onChange={(e) => setTwitterConfig({ ...twitterConfig, tokenName: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
                    placeholder="My Awesome Token"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Token Description</label>
                  <textarea
                    value={twitterConfig.tokenDescription}
                    onChange={(e) => setTwitterConfig({ ...twitterConfig, tokenDescription: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
                    rows={3}
                    placeholder="Describe your token..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Tweet Interval (minutes)</label>
                    <input
                      type="number"
                      min="1"
                      value={twitterConfig.interval}
                      onChange={(e) => setTwitterConfig({ ...twitterConfig, interval: parseInt(e.target.value) || 120 })}
                      className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Max Tweets Per Day</label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={twitterConfig.maxTweetsPerDay}
                      onChange={(e) => setTwitterConfig({ ...twitterConfig, maxTweetsPerDay: parseInt(e.target.value) || 12 })}
                      className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Hashtags (comma-separated)</label>
                  <input
                    type="text"
                    value={twitterConfig.hashtags.join(', ')}
                    onChange={(e) => setTwitterConfig({ ...twitterConfig, hashtags: e.target.value.split(',').map(h => h.trim()).filter(h => h) })}
                    className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
                    placeholder="Solana, DeFi, Crypto"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Tweet Template</label>
                  <textarea
                    value={twitterConfig.messageTemplate}
                    onChange={(e) => setTwitterConfig({ ...twitterConfig, messageTemplate: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white font-mono text-sm"
                    rows={6}
                    placeholder="Tweet template with {tokenName}, {tokenSymbol}, {tokenAddress}, {tokenDescription} placeholders"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Available placeholders: {'{tokenName}'}, {'{tokenSymbol}'}, {'{tokenAddress}'}, {'{tokenDescription}'}
                  </p>
                </div>

                <button
                  onClick={createTwitterBot}
                  disabled={isCreating}
                  className="w-full px-6 py-3 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium flex items-center justify-center gap-2"
                >
                  {isCreating ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus size={18} />
                      Create Twitter Bot
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error/Success Messages */}
        {error && (
          <div className="fixed bottom-4 right-4 p-4 bg-red-900/90 border border-red-700 rounded-lg flex items-center gap-2 max-w-md z-50">
            <AlertCircle size={18} className="text-red-400" />
            <span className="text-red-400 flex-1">{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-300"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {success && (
          <div className="fixed bottom-4 right-4 p-4 bg-green-900/90 border border-green-700 rounded-lg flex items-center gap-2 max-w-md z-50">
            <CheckCircle size={18} className="text-green-400" />
            <span className="text-green-400 flex-1">{success}</span>
            <button
              onClick={() => setSuccess(null)}
              className="text-green-400 hover:text-green-300"
            >
              <X size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

