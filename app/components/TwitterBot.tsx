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
} from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';

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
  const { publicKey } = useWallet();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [userInfo, setUserInfo] = useState<{ username?: string; name?: string } | null>(null);
  const [posts, setPosts] = useState<TwitterPost[]>([]);
  const [draftPost, setDraftPost] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'compose' | 'scheduled' | 'history' | 'analytics'>('compose');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [characterCount, setCharacterCount] = useState(0);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [hashtagInput, setHashtagInput] = useState('');

  const maxCharacters = 280;

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
    loadPosts();
  }, []);

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

  const handleLogin = async () => {
    setIsAuthenticating(true);
    setError(null);

    try {
      // Initiate OAuth flow
      const response = await fetch('/api/twitter/auth/initiate', {
        method: 'POST',
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
              Log in with Twitter to create and schedule posts. Your credentials are securely stored and never shared.
            </p>
            <button
              onClick={handleLogin}
              disabled={isAuthenticating}
              className="btn-modern px-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 flex items-center gap-3 mx-auto"
            >
              {isAuthenticating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Login with Twitter
                </>
              )}
            </button>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-gray-700">
              {(['compose', 'scheduled', 'history', 'analytics'] as const).map(tab => (
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
          </>
        )}
      </div>
    </div>
  );
}

