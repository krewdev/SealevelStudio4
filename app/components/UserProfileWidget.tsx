import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '../contexts/UserContext';
import { Twitter, Send, LogOut, User as UserIcon, Wallet, Coins, Loader2, ChevronDown, Mail, Sparkles, Settings } from 'lucide-react';
import { DepositWallet } from './DepositWallet';
import { Settings as SettingsComponent } from './Settings';
import { CopyButton } from './CopyButton';

export function UserProfileWidget() {
  const { user, isLoading, linkTwitter, linkTelegram, logout, refreshBalance, createWallet } = useUser();
  const [isLinkingTwitter, setIsLinkingTwitter] = useState(false);
  const [isLinkingTelegram, setIsLinkingTelegram] = useState(false);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [email, setEmail] = useState('');
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);
  // Compact header version - social connect is handled by SocialConnectButton in header
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  if (isLoading) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        <div className="flex items-center justify-center space-x-3">
          <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
          <span className="text-sm text-gray-400">Loading wallet...</span>
        </div>
      </div>
    );
  }

  const handleGenerateWallet = async () => {
    if (!email || !email.includes('@')) {
      alert('Please enter a valid email address');
      return;
    }

    setIsCreatingWallet(true);
    try {
      await createWallet(email);
      setShowEmailModal(false);
      setEmail('');
    } catch (error) {
      console.error('Failed to create wallet:', error);
      alert('Failed to create wallet. Please try again.');
    } finally {
      setIsCreatingWallet(false);
    }
  };

  if (!user) {
    return (
      <>
        <button
          onClick={() => setShowEmailModal(true)}
          className="flex items-center space-x-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 px-4 py-2.5 text-sm font-semibold text-white transition-all shadow-lg hover:shadow-purple-500/30"
        >
          <Sparkles className="w-5 h-5" />
          <span>Generate Wallet</span>
          <span className="px-2 py-0.5 bg-white/20 text-xs rounded-full">Required</span>
        </button>

        {/* Email Collection Modal */}
        {showEmailModal && (
          <>
            <div 
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
              onClick={() => setShowEmailModal(false)}
            >
              <div 
                className="bg-gray-800 border border-gray-700 rounded-xl p-6 max-w-md w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
                    <Wallet className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Create Your Wallet</h3>
                    <p className="text-xs text-gray-400">Link your wallet to your email</p>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      onKeyPress={(e) => e.key === 'Enter' && handleGenerateWallet()}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Your wallet will be securely linked to this email address
                  </p>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowEmailModal(false)}
                    className="flex-1 py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                    disabled={isCreatingWallet}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleGenerateWallet}
                    disabled={isCreatingWallet || !email || !email.includes('@')}
                    className="flex-1 py-2 px-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {isCreatingWallet ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Creating...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Generate Wallet</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </>
    );
  }

  return (
    <div className="relative">
      {/* Compact Header Button */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center space-x-1 sm:space-x-2 rounded-lg bg-gradient-to-r from-purple-600/20 to-blue-600/20 px-2 sm:px-3 py-2 text-sm font-medium text-gray-200 hover:from-purple-600/30 hover:to-blue-600/30 transition-all border border-purple-500/30 hover:border-purple-400/50 shadow-lg hover:shadow-purple-500/20 backdrop-blur-sm"
      >
        <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
          <UserIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
        </div>
        <div className="text-left hidden sm:block">
          <div className="text-xs font-semibold text-white">
            {user.walletAddress.slice(0, 4)}...{user.walletAddress.slice(-4)}
          </div>
          <div className="text-xs text-gray-400">
            {user.balance !== undefined ? `${user.balance.toFixed(2)} SOL` : '---'}
          </div>
        </div>
        <ChevronDown className={`h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {showDropdown && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowDropdown(false)}
          />
          <div ref={dropdownRef} className="absolute right-0 mt-2 w-80 bg-gray-900/95 backdrop-blur-md border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
            <div className="p-4 border-b border-gray-700/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                    <UserIcon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-white font-mono">
                        {user.walletAddress}
                      </h3>
                      <CopyButton text={user.walletAddress} size={12} />
                    </div>
                    <p className="text-xs text-gray-400">
                      {user.balance !== undefined ? `${user.balance.toFixed(4)} SOL` : 'Loading balance...'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={logout}
                  className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Wallet Balance & Deposit */}
            <div className="p-4 border-b border-gray-700/50">
              <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg border border-gray-700/50 mb-3">
                <div className="flex items-center space-x-2">
                  <Wallet className="w-4 h-4 text-purple-400" />
                  <span className="text-xs text-gray-300">Balance</span>
                </div>
                <span className="text-sm font-bold text-white">
                  {user.balance !== undefined ? `${user.balance.toFixed(4)} SOL` : '---'}
                </span>
              </div>
              <button
                onClick={() => setShowDeposit(!showDeposit)}
                className="w-full py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-lg font-medium text-xs transition-all"
              >
                {showDeposit ? 'Hide Deposit' : 'Fund Wallet'}
              </button>
              {showDeposit && (
                <div className="mt-3">
                  <DepositWallet 
                    walletAddress={user.walletAddress}
                    balance={user.balance}
                    onRefresh={refreshBalance}
                  />
                </div>
              )}
            </div>

            {/* Credits / Status */}
            <div className="p-4 border-b border-gray-700/50">
              <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg border border-gray-700/50">
                <div className="flex items-center space-x-2">
                  <Coins className="w-4 h-4 text-yellow-500" />
                  <span className="text-xs text-gray-300">Ad Credits</span>
                </div>
                <span className="text-sm font-bold text-white">{user.credits.toLocaleString()}</span>
              </div>
            </div>

            {/* Settings Button */}
            <div className="p-4">
              <button
                onClick={() => {
                  setShowSettings(true);
                  setShowDropdown(false);
                }}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium text-sm transition-colors"
              >
                <Settings className="w-4 h-4" />
                Settings
              </button>
            </div>
          </div>
        </>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsComponent onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}

