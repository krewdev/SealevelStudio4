'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  FileText,
  LogIn,
  LogOut,
  Send,
  Plus,
  Trash2,
  Edit,
  X,
  Clock,
  BarChart3,
  CheckCircle,
  AlertCircle,
  Loader2,
  Calendar,
  ArrowLeft,
  Play,
  Pause,
} from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { RiskAcknowledgement } from './compliance/RiskAcknowledgement';
import { useRiskConsent } from '../hooks/useRiskConsent';

interface SubstackPost {
  id: string;
  title: string;
  body: string;
  status: 'draft' | 'published' | 'scheduled';
  publishedAt?: Date;
  scheduledFor?: Date;
}

interface SubstackBotProps {
  onBack?: () => void;
}

export function SubstackBot({ onBack }: SubstackBotProps) {
  const { hasConsent, initialized, accept } = useRiskConsent('substack-bot');
  const { publicKey } = useWallet();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [userInfo, setUserInfo] = useState<{ email?: string; name?: string; publicationId?: string } | null>(null);
  const [posts, setPosts] = useState<SubstackPost[]>([]);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftBody, setDraftBody] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'compose' | 'published' | 'drafts' | 'analytics' | 'agent'>('compose');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [agentRunning, setAgentRunning] = useState(false);
  const [agentActivities, setAgentActivities] = useState<any[]>([]);
  const [isStartingAgent, setIsStartingAgent] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

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
        featureName="Substack Automation Bot"
        summary="This writer bot can publish to your subscribers, schedule newsletters, and run autonomous drip campaigns. Confirm that you own the content and respect local communication laws."
        bulletPoints={[
          'OAuth secrets stored locally—never on our servers',
          'Autonomous cadence with manual approval toggles',
          'Templates for paid/free issues and referral boosts',
        ]}
        costDetails={[
          'Beta testers: included with your SEAL airdrop',
          'Future pricing: billed per campaign export',
        ]}
        disclaimers={[
          'Content must not be misleading financial advice.',
          'You remain responsible for CAN-SPAM/GDPR compliance.',
        ]}
        accent="amber"
        onAccept={accept}
      />
    );
  }

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
    loadPosts();
  }, []);

  // Monitor agent when authenticated
  useEffect(() => {
    if (isAuthenticated && userInfo) {
      checkAgentStatus();
      const interval = setInterval(checkAgentStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, userInfo]);

  const checkAgentStatus = async () => {
    if (!isAuthenticated) return;
    
    try {
      const response = await fetch('/api/substack/agent?userId=' + (userInfo?.publicationId || 'default'));
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
      const response = await fetch('/api/substack/agent?action=start&userId=' + (userInfo?.publicationId || 'default'), {
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
      const response = await fetch('/api/substack/agent?action=stop&userId=' + (userInfo?.publicationId || 'default'), {
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
      const response = await fetch('/api/substack/auth');
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
      const response = await fetch('/api/substack/posts');
      if (response.ok) {
        const data = await response.json();
        setPosts(data.posts || []);
      }
    } catch (error) {
      console.error('Error loading posts:', error);
    }
  };

  const handleLogin = async () => {
    setIsAuthenticating(true);
    setError(null);

    try {
      const response = await fetch('/api/substack/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: apiKey || undefined,
          email: email || undefined,
          password: password || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to login to Substack');
      }

      const data = await response.json();
      setIsAuthenticated(true);
      setSuccess('Successfully logged in to Substack!');
      await checkAuthStatus();
      setApiKey('');
      setEmail('');
      setPassword('');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to login to Substack');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/substack/auth', { method: 'DELETE' });
      setIsAuthenticated(false);
      setUserInfo(null);
      setSuccess('Logged out successfully');
    } catch (error) {
      setError('Failed to logout');
    }
  };

  const handlePost = async (title: string, body: string, scheduleFor?: Date) => {
    if (!title.trim() || !body.trim()) {
      setError('Title and body are required');
      return;
    }

    setIsPosting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/substack/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          body,
          status: scheduleFor ? 'draft' : 'published',
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

      setDraftTitle('');
      setDraftBody('');
      setScheduledDate('');
      setScheduledTime('');
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

    handlePost(draftTitle, draftBody, scheduledFor);
  };

  const publishedPosts = posts.filter(p => p.status === 'published');
  const draftPosts = posts.filter(p => p.status === 'draft');

  return (
    <div className="min-h-screen animated-bg text-white relative">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
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
              <div className="p-3 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20">
                <FileText className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gradient-primary">Substack Bot</h1>
                <p className="text-sm text-gray-400 mt-1">Create and manage Substack posts</p>
              </div>
            </div>
          </div>

          {/* Auth Status */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                {userInfo && (
                  <div className="text-right">
                    <p className="text-sm font-medium">{userInfo.email}</p>
                    <p className="text-xs text-gray-400">{userInfo.name || 'Substack User'}</p>
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
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
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
            <FileText className="w-16 h-16 text-green-400 mx-auto mb-6" />
            <h2 className="text-2xl font-bold mb-4 text-center">Connect Your Substack Account</h2>
            <p className="text-gray-400 mb-8 max-w-md mx-auto text-center">
              Log in with your Substack API key or email/password to create and manage posts.
            </p>
            
            <div className="max-w-md mx-auto space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">API Key (Recommended)</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Your Substack API key"
                  className="input-modern w-full"
                />
                <p className="text-xs text-gray-500 mt-1">Or use email/password below</p>
              </div>
              
              <div className="border-t border-gray-700 pt-4">
                <p className="text-sm text-gray-400 mb-4 text-center">Or use email/password</p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="input-modern w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Your password"
                      className="input-modern w-full"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handleLogin}
                disabled={isAuthenticating || (!apiKey && (!email || !password))}
                className="btn-modern px-8 py-4 bg-green-600 hover:bg-green-700 disabled:opacity-50 flex items-center gap-3 w-full justify-center"
              >
                {isAuthenticating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    Login to Substack
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-gray-700">
              {(['compose', 'published', 'drafts', 'analytics', 'agent'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-3 font-medium transition-colors border-b-2 ${
                    activeTab === tab
                      ? 'border-green-500 text-green-400'
                      : 'border-transparent text-gray-400 hover:text-white'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Compose Tab */}
            {activeTab === 'compose' && (
              <div className="card-modern p-6">
                <h2 className="text-xl font-bold mb-6">Create New Post</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Title</label>
                    <input
                      type="text"
                      value={draftTitle}
                      onChange={(e) => setDraftTitle(e.target.value)}
                      placeholder="Post title..."
                      className="input-modern w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Content</label>
                    <textarea
                      value={draftBody}
                      onChange={(e) => setDraftBody(e.target.value)}
                      placeholder="Write your post content here..."
                      className="input-modern w-full h-64 resize-none"
                    />
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
                      onClick={() => handlePost(draftTitle, draftBody)}
                      disabled={isPosting || !draftTitle.trim() || !draftBody.trim()}
                      className="btn-modern px-6 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isPosting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Publishing...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Publish Now
                        </>
                      )}
                    </button>
                    {(scheduledDate && scheduledTime) && (
                      <button
                        onClick={handleSchedule}
                        disabled={isPosting || !draftTitle.trim() || !draftBody.trim()}
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

            {/* Published Posts Tab */}
            {activeTab === 'published' && (
              <div className="card-modern p-6">
                <h2 className="text-xl font-bold mb-6">Published Posts</h2>
                {publishedPosts.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No published posts</p>
                ) : (
                  <div className="space-y-4">
                    {publishedPosts.map(post => (
                      <div key={post.id} className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          <span className="text-sm text-gray-400">
                            Published {post.publishedAt?.toLocaleString()}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">{post.title}</h3>
                        <p className="text-gray-300">{post.body.substring(0, 200)}...</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Drafts Tab */}
            {activeTab === 'drafts' && (
              <div className="card-modern p-6">
                <h2 className="text-xl font-bold mb-6">Drafts</h2>
                {draftPosts.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No drafts</p>
                ) : (
                  <div className="space-y-4">
                    {draftPosts.map(post => (
                      <div key={post.id} className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                        <h3 className="text-lg font-bold text-white mb-2">{post.title}</h3>
                        <p className="text-gray-300">{post.body.substring(0, 200)}...</p>
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
                    <p className="text-2xl font-bold">{publishedPosts.length}</p>
                  </div>
                  <div className="p-4 bg-gray-800/50 rounded-lg">
                    <p className="text-sm text-gray-400 mb-1">Drafts</p>
                    <p className="text-2xl font-bold">{draftPosts.length}</p>
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
                  <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <h3 className="font-semibold text-green-400 mb-2">Agent Capabilities</h3>
                    <ul className="text-sm text-gray-300 space-y-1 list-disc list-inside">
                      <li>Posts periodically (every 24 hours by default)</li>
                      <li>Monitors comments and auto-replies</li>
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
                                    activity.type === 'post' ? 'bg-green-500/20 text-green-400' :
                                    activity.type === 'comment_reply' ? 'bg-purple-500/20 text-purple-400' :
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

