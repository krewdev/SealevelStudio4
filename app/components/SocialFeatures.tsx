'use client';

import React, { useState } from 'react';
import {
  Share2,
  User,
  FileText,
  Heart,
  MessageSquare,
  TrendingUp,
  Copy,
  CheckCircle,
  ArrowLeft,
  Download,
  Upload,
  Search,
  Star,
  Users,
  Globe,
  Link as LinkIcon,
  X
} from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';

interface SocialFeaturesProps {
  onBack?: () => void;
}

interface TransactionTemplate {
  id: string;
  name: string;
  description: string;
  author: string;
  authorAddress: string;
  category: string;
  instructions: any[];
  likes: number;
  uses: number;
  createdAt: Date;
  tags: string[];
}

interface PublicProfile {
  address: string;
  username?: string;
  bio?: string;
  avatar?: string;
  templates: number;
  followers: number;
  following: number;
  verified: boolean;
}

export function SocialFeatures({ onBack }: SocialFeaturesProps) {
  const { publicKey } = useWallet();
  const [activeTab, setActiveTab] = useState<'share' | 'profile' | 'marketplace' | 'community'>('share');
  const [templates, setTemplates] = useState<TransactionTemplate[]>([]);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const tabs = [
    { id: 'share', label: 'Share', icon: <Share2 size={18} /> },
    { id: 'profile', label: 'Profile', icon: <User size={18} /> },
    { id: 'marketplace', label: 'Templates', icon: <FileText size={18} /> },
    { id: 'community', label: 'Community', icon: <Users size={18} /> },
  ];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(text);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const generateShareLink = (transactionData: any) => {
    // In production, this would upload to IPFS or a server
    const shareId = `share-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const url = `${window.location.origin}/share/${shareId}`;
    setShareUrl(url);
    copyToClipboard(url);
  };

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
              <Share2 className="text-purple-400" size={24} />
              <h1 className="text-2xl font-bold">Social Features</h1>
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
          Share transactions, build your profile, and discover community templates
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-700 bg-gray-800/50">
        <div className="flex gap-1 px-4">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-purple-500 text-purple-400 bg-gray-800'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'share' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Share2 size={24} className="text-purple-400" />
                Share Transaction
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Transaction Data (JSON)</label>
                  <textarea
                    className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white font-mono text-sm"
                    rows={10}
                    placeholder="Paste transaction JSON here..."
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="includeInstructions"
                    defaultChecked
                    className="w-4 h-4"
                  />
                  <label htmlFor="includeInstructions" className="text-sm text-gray-300">
                    Include instruction details
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="makePublic"
                    defaultChecked
                    className="w-4 h-4"
                  />
                  <label htmlFor="makePublic" className="text-sm text-gray-300">
                    Make public (visible in marketplace)
                  </label>
                </div>

                <button
                  onClick={() => generateShareLink({})}
                  className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium flex items-center justify-center gap-2"
                >
                  <Share2 size={18} />
                  Generate Share Link
                </button>

                {shareUrl && (
                  <div className="p-4 bg-gray-900 rounded border border-gray-700">
                    <div className="flex items-center gap-2 mb-2">
                      <LinkIcon size={16} className="text-gray-400" />
                      <span className="text-sm text-gray-400">Share Link</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={shareUrl}
                        readOnly
                        className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm font-mono"
                      />
                      <button
                        onClick={() => copyToClipboard(shareUrl)}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded flex items-center gap-2"
                      >
                        {copiedLink === shareUrl ? (
                          <>
                            <CheckCircle size={16} className="text-green-400" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy size={16} />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Share Options */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-bold mb-4">Share Options</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button className="p-4 bg-blue-600/20 hover:bg-blue-600/30 rounded-lg border border-blue-700/50 flex flex-col items-center gap-2">
                  <Globe size={24} className="text-blue-400" />
                  <span className="text-sm">Copy Link</span>
                </button>
                <button className="p-4 bg-cyan-600/20 hover:bg-cyan-600/30 rounded-lg border border-cyan-700/50 flex flex-col items-center gap-2">
                  <MessageSquare size={24} className="text-cyan-400" />
                  <span className="text-sm">Telegram</span>
                </button>
                <button className="p-4 bg-sky-600/20 hover:bg-sky-600/30 rounded-lg border border-sky-700/50 flex flex-col items-center gap-2">
                  <Share2 size={24} className="text-sky-400" />
                  <span className="text-sm">Twitter</span>
                </button>
                <button className="p-4 bg-purple-600/20 hover:bg-purple-600/30 rounded-lg border border-purple-700/50 flex flex-col items-center gap-2">
                  <Download size={24} className="text-purple-400" />
                  <span className="text-sm">Export</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Profile Header */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-full bg-purple-600 flex items-center justify-center text-3xl font-bold">
                  {publicKey ? publicKey.toString().slice(0, 2).toUpperCase() : '??'}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h2 className="text-2xl font-bold">
                      {publicKey ? `${publicKey.toString().slice(0, 8)}...${publicKey.toString().slice(-8)}` : 'Not Connected'}
                    </h2>
                    {publicKey && (
                      <button
                        onClick={() => copyToClipboard(publicKey.toString())}
                        className="p-1 text-gray-400 hover:text-white"
                      >
                        {copiedLink === publicKey.toString() ? (
                          <CheckCircle size={16} className="text-green-400" />
                        ) : (
                          <Copy size={16} />
                        )}
                      </button>
                    )}
                  </div>
                  <p className="text-gray-400 mb-4">
                    {profile?.bio || 'No bio set. Click edit to add one.'}
                  </p>
                  <div className="flex items-center gap-6 text-sm">
                    <div>
                      <span className="text-gray-400">Templates:</span>
                      <span className="text-white font-bold ml-2">{profile?.templates || 0}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Followers:</span>
                      <span className="text-white font-bold ml-2">{profile?.followers || 0}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Following:</span>
                      <span className="text-white font-bold ml-2">{profile?.following || 0}</span>
                    </div>
                  </div>
                </div>
                <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg">
                  Edit Profile
                </button>
              </div>
            </div>

            {/* My Templates */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-bold mb-4">My Templates</h3>
              {templates.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <FileText size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No templates yet</p>
                  <p className="text-sm mt-2">Create and share transaction templates</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {templates.map(template => (
                    <div key={template.id} className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-bold text-white">{template.name}</div>
                          <div className="text-sm text-gray-400">{template.description}</div>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span>{template.likes} likes</span>
                            <span>{template.uses} uses</span>
                            <span>{template.category}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button className="p-2 text-gray-400 hover:text-red-400">
                            <Heart size={16} />
                          </button>
                          <button className="p-2 text-gray-400 hover:text-blue-400">
                            <Share2 size={16} />
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

        {activeTab === 'marketplace' && (
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Search */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center gap-2">
                <Search size={20} className="text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search templates..."
                  className="flex-1 bg-gray-900 border border-gray-700 rounded px-4 py-2 text-white"
                />
              </div>
            </div>

            {/* Categories */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {['All', 'DeFi', 'NFT', 'Staking', 'Swap', 'Token Creation'].map(cat => (
                <button
                  key={cat}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm whitespace-nowrap"
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Templates Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-purple-500 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-bold text-white">Template {i}</h4>
                      <p className="text-sm text-gray-400">By 0x1234...5678</p>
                    </div>
                    <Star size={16} className="text-yellow-400" />
                  </div>
                  <p className="text-sm text-gray-300 mb-4">
                    Example transaction template description
                  </p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Heart size={12} />
                        {Math.floor(Math.random() * 100)}
                      </span>
                      <span className="flex items-center gap-1">
                        <TrendingUp size={12} />
                        {Math.floor(Math.random() * 50)} uses
                      </span>
                    </div>
                    <button className="text-purple-400 hover:text-purple-300">
                      Use →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'community' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Users size={24} className="text-purple-400" />
                Community
              </h2>
              
              {/* Discord Link */}
              <div className="mb-6 p-4 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 rounded-lg border border-indigo-500/30">
                <a
                  href="https://discord.gg/sealevelstudios"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-white hover:text-indigo-300 transition-colors group"
                >
                  <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center group-hover:bg-indigo-500 transition-colors">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Join Our Discord</h3>
                    <p className="text-sm text-gray-300">Connect with the Sealevel Studio community @sealevelstudios</p>
                  </div>
                  <Globe className="w-5 h-5 ml-auto opacity-50 group-hover:opacity-100 transition-opacity" />
                </a>
              </div>
              
              <div className="space-y-4">
                <div className="p-4 bg-gray-900 rounded border border-gray-700">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                      U1
                    </div>
                    <div>
                      <div className="font-bold text-white">User123</div>
                      <div className="text-xs text-gray-400">2 hours ago</div>
                    </div>
                  </div>
                  <p className="text-gray-300 mb-2">
                    Just created an amazing arbitrage template! Check it out in the marketplace.
                  </p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <button className="flex items-center gap-1 hover:text-red-400">
                      <Heart size={14} />
                      Like
                    </button>
                    <button className="flex items-center gap-1 hover:text-blue-400">
                      <MessageSquare size={14} />
                      Comment
                    </button>
                    <button className="flex items-center gap-1 hover:text-purple-400">
                      <Share2 size={14} />
                      Share
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-gray-900 rounded border border-gray-700">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center">
                      U2
                    </div>
                    <div>
                      <div className="font-bold text-white">DeFiMaster</div>
                      <div className="text-xs text-gray-400">5 hours ago</div>
                    </div>
                  </div>
                  <p className="text-gray-300 mb-2">
                    New token launch template available! Includes full metadata setup and initial distribution.
                  </p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <button className="flex items-center gap-1 hover:text-red-400">
                      <Heart size={14} />
                      Like
                    </button>
                    <button className="flex items-center gap-1 hover:text-blue-400">
                      <MessageSquare size={14} />
                      Comment
                    </button>
                    <button className="flex items-center gap-1 hover:text-purple-400">
                      <Share2 size={14} />
                      Share
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

