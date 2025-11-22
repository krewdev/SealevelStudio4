'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  Twitter,
  LogIn,
  LogOut,
  Send,
  Plus,
  Trash2,
  Edit,
  Save,
  X,
  Clock,
  BarChart3,
  CheckCircle,
  AlertCircle,
  Loader2,
  Calendar,
  Image as ImageIcon,
  Hash,
  AtSign,
  ArrowLeft,
  Play,
  Pause,
} from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { RiskAcknowledgement } from './compliance/RiskAcknowledgement';
import { useRiskConsent } from '../hooks/useRiskConsent';
import { SEAL_TOKEN_ECONOMICS } from '../lib/seal-token/config';

interface TwitterPost {
  id: string;
  content: string;
  scheduledFor?: Date;
  postedAt?: Date;
  status: 'draft' | 'scheduled' | 'posted' | 'failed';
  mediaUrls?: string[];
}

interface TwitterBotProps {
  onBack?: () => void;
}

export function TwitterBot({ onBack }: TwitterBotProps) {
  const { hasConsent, initialized, accept } = useRiskConsent('twitter-bot');
  const { publicKey } = useWallet();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [userInfo, setUserInfo] = useState<{ username?: string; name?: string } | null>(null);
  const [posts, setPosts] = useState<TwitterPost[]>([]);
  const [draftPost, setDraftPost] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'compose' | 'scheduled' | 'history' | 'analytics' | 'agent'>('compose');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [characterCount, setCharacterCount] = useState(0);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [hashtagInput, setHashtagInput] = useState('');
  const [agentRunning, setAgentRunning] = useState(false);
  const [agentActivities, setAgentActivities] = useState<any[]>([]);
  const [isStartingAgent, setIsStartingAgent] = useState(false);

  const maxCharacters = 280;

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
        featureName="Twitter Automation Bot"
        summary="This tool can schedule, post, and run autonomous agents on your Twitter account. Confirm that you will comply with platform rules and local marketing regulations before continuing."
        bulletPoints={[
          'OAuth login keeps secrets client-side',
          'Autonomous agent can reply, post, and monitor DMs',
          'Analytics panel highlights performance + failures',
        ]}
        costDetails={[
          `Setup: ${SEAL_TOKEN_ECONOMICS.pricing.twitter_bot_setup.toLocaleString()} SEAL`,
          `Monthly: ${SEAL_TOKEN_ECONOMICS.pricing.twitter_bot_monthly.toLocaleString()} SEAL`,
          `Per Tweet: ${SEAL_TOKEN_ECONOMICS.pricing.twitter_bot_tweet.toLocaleString()} SEAL`,
        ]}
        disclaimers={[
          'Never automate manipulative or unlawful content.',
          'You assume full responsibility for account safety and regional compliance.',
        ]}
        accent="blue"
        onAccept={accept}
      />
    );
  }

  // Check authentication status on mount and handle OAuth callback
  useEffect(() => {
    // Check for OAuth callback success/error
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const error = urlParams.get('error');
    
    if (success === 'auth_complete') {
      setSuccess('Successfully logged in to Twitter!');
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
      checkAuthStatus();
    } else if (error) {
      setError(`Twitter login failed: ${error}`);
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
    
    checkAuthStatus();
    loadPosts();
  }, []);

  // Monitor agent when authenticated
  useEffect(() => {
    if (isAuthenticated && userInfo) {
      checkAgentStatus();
      // Poll agent activities every 5 seconds
      const interval = setInterval(checkAgentStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, userInfo]);

  const checkAgentStatus = async () => {
    if (!isAuthenticated) return;
    
    try {
      const response = await fetch('/api/twitter/agent?userId=' + (userInfo?.username || 'default'));
      if (response.ok) {
        const data = await response.json();
        setAgentRunning(data.isRunning || false);
        setAgentActivities(data.activities || []);
      }
    } catch (error) {
      console.error('Error checking agent status:', error);
    }
  };

  const handleStartAgent = async () => {
    setIsStartingAgent(true);
    setError(null);
    
    try {
      const response = await fetch('/api/twitter/agent?action=start&userId=' + (userInfo?.username || 'default'), {
        method: 'POST',
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
      const response = await fetch('/api/twitter/agent?action=stop&userId=' + (userInfo?.username || 'default'), {
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
      const response = await fetch('/api/twitter/auth/status');
      if (response.ok) {
        const data = await response.json();
        setIsAuthenticated(data.authenticated);
        if (data.authenticated && data.user) {
          setUserInfo(data.user);
        }
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    }
  };

  const loadPosts = async () => {
    try {
      const response = await fetch('/api/twitter/posts');
      if (response.ok) {
        const data = await response.json();
        setPosts(data.posts || []);
      }
    } catch (error) {
      console.error('Error loading posts:', error);
    }
  };

  const handleLogin = async (useDirectAuth = false) => {
    setIsAuthenticating(true);
    setError(null);

    try {
      // Initiate OAuth flow or direct authentication
      const response = await fetch('/api/twitter/auth/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ useDirectAuth }),
      });

      if (!response.ok) {
        throw new Error('Failed to initiate Twitter login');
      }

      const data = await response.json();
      
      // Redirect to Twitter OAuth
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to login to Twitter');
      setIsAuthenticating(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/twitter/auth/logout', { method: 'POST' });
      setIsAuthenticated(false);
      setUserInfo(null);
      setSuccess('Logged out successfully');
    } catch (error) {
      setError('Failed to logout');
    }
  };

  const handlePost = async (content: string, scheduleFor?: Date) => {
    if (!content.trim()) {
      setError('Post content cannot be empty');
      return;
    }

    if (content.length > maxCharacters) {
      setError(`Post exceeds ${maxCharacters} characters`);
      return;
    }

    setIsPosting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/twitter/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          scheduledFor: scheduleFor?.toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create post');
      }

      const data = await response.json();
      
      if (scheduleFor) {
        setSuccess(`Post scheduled for ${scheduleFor.toLocaleString()}`);
      } else {
        setSuccess('Post published successfully!');
      }

      setDraftPost('');
      setScheduledDate('');
      setScheduledTime('');
      setHashtags([]);
      await loadPosts();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to post');
    } finally {
      setIsPosting(false);
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

    handlePost(draftPost, scheduledFor);
  };

  const addHashtag = () => {
    if (hashtagInput.trim() && !hashtagInput.includes(' ')) {
      const tag = hashtagInput.startsWith('#') ? hashtagInput : `#${hashtagInput}`;
      if (!hashtags.includes(tag) && hashtags.length < 5) {
        setHashtags([...hashtags, tag]);
        setHashtagInput('');
        updateDraftWithHashtags([...hashtags, tag]);
      }
    }
  };

  const removeHashtag = (tag: string) => {
    const newHashtags = hashtags.filter(h => h !== tag);
    setHashtags(newHashtags);
    updateDraftWithHashtags(newHashtags);
  };

  const updateDraftWithHashtags = (tags: string[]) => {
    // Remove existing hashtags from draft
    const withoutHashtags = draftPost.replace(/#\w+/g, '').trim();
    // Add new hashtags
    const hashtagString = tags.length > 0 ? `\n\n${tags.join(' ')}` : '';
    setDraftPost(withoutHashtags + hashtagString);
  };

  useEffect(() => {
    setCharacterCount(draftPost.length);
  }, [draftPost]);

  const scheduledPosts = posts.filter(p => p.status === 'scheduled');
  const postedHistory = posts.filter(p => p.status === 'posted').slice(0, 20);

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
                <Twitter className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gradient-primary">Twitter Bot</h1>
                <p className="text-sm text-gray-400 mt-1">Create and schedule Twitter posts</p>
              </div>
            </div>
          </div>

          {/* Auth Status */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                {userInfo && (
                  <div className="text-right">
                    <p className="text-sm font-medium">@{userInfo.username}</p>
                    <p className="text-xs text-gray-400">{userInfo.name}</p>
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
                    Login with Twitter
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
          /* Login Prompt */
          <div className="card-modern p-12 text-center">
            <Twitter className="w-16 h-16 text-blue-400 mx-auto mb-6" />
            <h2 className="text-2xl font-bold mb-4">Connect Your Twitter Account</h2>
            <p className="text-gray-400 mb-8 max-w-md mx-auto">
              Choose your authentication method. OAuth is recommended for production, while direct access tokens are for development/testing.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6">
              {/* OAuth Login */}
              <button
                onClick={() => handleLogin(false)}
                disabled={isAuthenticating}
                className="btn-modern px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 flex items-center gap-3"
              >
                {isAuthenticating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    OAuth Login
                  </>
                )}
              </button>

              {/* Direct Access Token Login */}
              <button
                onClick={() => handleLogin(true)}
                disabled={isAuthenticating}
                className="btn-modern px-6 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 flex items-center gap-3"
              >
                {isAuthenticating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    <Key className="w-5 h-5" />
                    Direct Token
                  </>
                )}
              </button>
            </div>

            <div className="text-xs text-gray-500 max-w-lg mx-auto">
              <p className="mb-2"><strong>OAuth Login:</strong> Secure, recommended for production</p>
              <p><strong>Direct Token:</strong> For development/testing only. Configure TWITTER_ACCESS_TOKEN in .env.local</p>
            </div>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-gray-700">
              {(['compose', 'scheduled', 'history', 'analytics', 'agent'] as const).map(tab => (
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
                  {tab === 'scheduled' && scheduledPosts.length > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-blue-600 rounded-full text-xs">
                      {scheduledPosts.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Compose Tab */}
            {activeTab === 'compose' && (
              <div className="card-modern p-6">
                <h2 className="text-xl font-bold mb-6">Create New Post</h2>
                
                <div className="space-y-4">
                  {/* Post Editor */}
                  <div>
                    <textarea
                      value={draftPost}
                      onChange={(e) => setDraftPost(e.target.value)}
                      placeholder="What's happening?"
                      className="input-modern w-full h-32 resize-none"
                      maxLength={maxCharacters}
                    />
                    <div className="flex items-center justify-between mt-2">
                      <span className={`text-sm ${
                        characterCount > maxCharacters * 0.9 
                          ? 'text-yellow-400' 
                          : characterCount > maxCharacters 
                            ? 'text-red-400' 
                            : 'text-gray-400'
                      }`}>
                        {characterCount} / {maxCharacters}
                      </span>
                    </div>
                  </div>

                  {/* Hashtags */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Hashtags</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={hashtagInput}
                        onChange={(e) => setHashtagInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addHashtag()}
                        placeholder="Add hashtag..."
                        className="input-modern flex-1"
                      />
                      <button
                        onClick={addHashtag}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg flex items-center gap-2"
                      >
                        <Hash size={16} />
                        Add
                      </button>
                    </div>
                    {hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {hashtags.map(tag => (
                          <span
                            key={tag}
                            className="px-3 py-1 bg-blue-600/20 text-blue-400 rounded-full text-sm flex items-center gap-2"
                          >
                            {tag}
                            <button onClick={() => removeHashtag(tag)}>
                              <X size={14} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
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
                        Schedule Post
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
                      onClick={() => handlePost(draftPost)}
                      disabled={isPosting || !draftPost.trim() || characterCount > maxCharacters}
                      className="btn-modern px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isPosting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Posting...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Post Now
                        </>
                      )}
                    </button>
                    {(scheduledDate && scheduledTime) && (
                      <button
                        onClick={handleSchedule}
                        disabled={isPosting || !draftPost.trim() || characterCount > maxCharacters}
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

            {/* Scheduled Posts Tab */}
            {activeTab === 'scheduled' && (
              <div className="card-modern p-6">
                <h2 className="text-xl font-bold mb-6">Scheduled Posts</h2>
                {scheduledPosts.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No scheduled posts</p>
                ) : (
                  <div className="space-y-4">
                    {scheduledPosts.map(post => (
                      <div key={post.id} className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-yellow-400" />
                            <span className="text-sm text-gray-400">
                              Scheduled for {post.scheduledFor?.toLocaleString()}
                            </span>
                          </div>
                          <button className="text-red-400 hover:text-red-300">
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <p className="text-white">{post.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <div className="card-modern p-6">
                <h2 className="text-xl font-bold mb-6">Post History</h2>
                {postedHistory.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No posts yet</p>
                ) : (
                  <div className="space-y-4">
                    {postedHistory.map(post => (
                      <div key={post.id} className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          <span className="text-sm text-gray-400">
                            Posted {post.postedAt?.toLocaleString()}
                          </span>
                        </div>
                        <p className="text-white">{post.content}</p>
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
                    <p className="text-sm text-gray-400 mb-1">Total Posts</p>
                    <p className="text-2xl font-bold">{postedHistory.length}</p>
                  </div>
                  <div className="p-4 bg-gray-800/50 rounded-lg">
                    <p className="text-sm text-gray-400 mb-1">Scheduled</p>
                    <p className="text-2xl font-bold">{scheduledPosts.length}</p>
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
                      <li>Posts periodically (every 60 minutes by default)</li>
                      <li>Monitors mentions and auto-replies</li>
                      <li>Monitors direct messages and responds</li>
                      <li>Runs autonomously once started</li>
                    </ul>
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
                                    activity.type === 'post' ? 'bg-blue-500/20 text-blue-400' :
                                    activity.type === 'reply' || activity.type === 'mention_reply' ? 'bg-purple-500/20 text-purple-400' :
                                    activity.type === 'dm_reply' ? 'bg-cyan-500/20 text-cyan-400' :
                                    'bg-gray-500/20 text-gray-400'
                                  }`}>
                                    {activity.type}
                                  </span>
                                  {activity.success ? (
                                    <CheckCircle size={14} className="text-green-400" />
                                  ) : (
                                    <AlertCircle size={14} className="text-red-400" />
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

