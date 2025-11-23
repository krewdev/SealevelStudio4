import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '../contexts/UserContext';
import { Twitter, Send, LogOut, User as UserIcon, Wallet, Coins, Loader2, ChevronDown } from 'lucide-react';
import { DepositWallet } from './DepositWallet';

export function UserProfileWidget() {
  const { user, isLoading, linkTwitter, linkTelegram, logout, refreshBalance, createWallet } = useUser();
  const [isLinkingTwitter, setIsLinkingTwitter] = useState(false);
  const [isLinkingTelegram, setIsLinkingTelegram] = useState(false);
  const [showDeposit, setShowDeposit] = useState(false);
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

  if (!user) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-purple-900/50 rounded-full flex items-center justify-center">
            <Wallet className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-white">Creating your wallet...</h3>
            <p className="text-xs text-gray-400">Please wait</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Compact Header Button */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center space-x-2 rounded-lg bg-gradient-to-r from-purple-600/20 to-blue-600/20 px-3 py-2 text-sm font-medium text-gray-200 hover:from-purple-600/30 hover:to-blue-600/30 transition-all border border-purple-500/30 hover:border-purple-400/50 shadow-lg hover:shadow-purple-500/20 backdrop-blur-sm"
      >
        <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
          <UserIcon className="w-4 h-4 text-white" />
        </div>
        <div className="text-left hidden sm:block">
          <div className="text-xs font-semibold text-white">
            {user.walletAddress.slice(0, 4)}...{user.walletAddress.slice(-4)}
          </div>
          <div className="text-xs text-gray-400">
            {user.balance !== undefined ? `${user.balance.toFixed(2)} SOL` : '---'}
          </div>
        </div>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {showDropdown && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowDropdown(false)}
          />
          <div ref={dropdownRef} className="absolute right-0 mt-2 w-80 bg-gray-800/95 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-2xl z-50 overflow-hidden">
            <div className="p-4 border-b border-gray-700/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                    <UserIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      {user.walletAddress.slice(0, 8)}...{user.walletAddress.slice(-8)}
                    </h3>
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
                {showDeposit ? 'Hide Deposit' : 'Deposit SOL'}
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
            <div className="p-4">
              <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg border border-gray-700/50">
                <div className="flex items-center space-x-2">
                  <Coins className="w-4 h-4 text-yellow-500" />
                  <span className="text-xs text-gray-300">Ad Credits</span>
                </div>
                <span className="text-sm font-bold text-white">{user.credits.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

