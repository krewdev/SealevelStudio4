'use client';

import React, { useState } from 'react';
import {
  Wallet,
  ArrowLeft,
  RefreshCw,
  Copy,
  Shield,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Mail,
  Download,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';

interface CustodialWalletToolProps {
  onBack?: () => void;
}

export function CustodialWalletTool({ onBack }: CustodialWalletToolProps) {
  const { user, createWallet, refreshBalance } = useUser();
  const [email, setEmail] = useState('');
  const [vanityPrefix, setVanityPrefix] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showKeys, setShowKeys] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportedKeys, setExportedKeys] = useState<{ privateKey?: string; recoveryPhrase?: string } | null>(null);

  const handleCopy = (value?: string) => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setMessage('Copied to clipboard');
    setTimeout(() => setMessage(null), 2000);
  };

  const handleRefreshBalance = async () => {
    if (!user?.walletAddress) return;
    setIsRefreshing(true);
    try {
      await refreshBalance(user.walletAddress);
      setMessage('Balance refreshed');
    } catch (error) {
      console.error('Balance refresh failed:', error);
      setMessage('Balance refresh failed');
    } finally {
      setTimeout(() => setMessage(null), 2500);
      setIsRefreshing(false);
    }
  };

  const handleCreateWallet = async () => {
    if (isCreating) return;
    const confirmReset = window.confirm(
      'This will replace your current custodial wallet with a new one. Ensure you have exported your existing keys.\n\nContinue?'
    );
    if (!confirmReset) return;

    setIsCreating(true);
    setMessage(null);
    try {
      await createWallet(email || undefined, vanityPrefix.trim() || undefined);
      setMessage('New wallet created successfully');
      setVanityPrefix(''); // Clear vanity prefix after successful creation
      setShowKeys(false); // Hide keys when wallet is regenerated
      setExportedKeys(null);
    } catch (error) {
      console.error('Failed to create wallet:', error);
      setMessage(error instanceof Error ? error.message : 'Failed to create wallet');
    } finally {
      setTimeout(() => setMessage(null), 5000);
      setIsCreating(false);
    }
  };

  const handleExportKeys = async () => {
    if (!user?.walletId) {
      setMessage('No wallet available to export');
      return;
    }

    setIsExporting(true);
    setMessage(null);
    try {
      const response = await fetch('/api/wallet/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletId: user.walletId }),
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to export wallet keys');
      }

      setExportedKeys({
        privateKey: data.privateKey,
        recoveryPhrase: data.recoveryPhrase,
      });
      setShowKeys(true);
      setMessage('Keys exported successfully. Keep them secure!');
    } catch (error) {
      console.error('Failed to export keys:', error);
      setMessage(error instanceof Error ? error.message : 'Failed to export keys');
    } finally {
      setIsExporting(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const handleDownloadKeys = () => {
    if (!exportedKeys || !user?.walletAddress) return;

    const keyData = {
      walletAddress: user.walletAddress,
      walletId: user.walletId,
      privateKey: exportedKeys.privateKey,
      recoveryPhrase: exportedKeys.recoveryPhrase,
      exportedAt: new Date().toISOString(),
      warning: 'Keep this file secure. Anyone with access can control your wallet.',
    };

    const blob = new Blob([JSON.stringify(keyData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wallet-keys-${user.walletAddress.slice(0, 8)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="border-b border-gray-800 p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              <ArrowLeft size={18} />
              Back
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Wallet size={24} />
              Custodial Wallet Tool
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Manage your built-in Sealevel Studio wallet, regenerate credentials, and export recovery data.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-400 mb-1">Active Wallet</p>
              <p className="font-mono text-lg break-all">{user?.walletAddress || 'Not available'}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleCopy(user?.walletAddress)}
                className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300"
                title="Copy address"
              >
                <Copy size={16} />
              </button>
              <button
                onClick={handleRefreshBalance}
                disabled={isRefreshing}
                className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh balance"
              >
                {isRefreshing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-800/50 rounded-xl p-4">
              <p className="text-sm text-gray-400 mb-1">Balance</p>
              <p className="text-2xl font-semibold">{typeof user?.balance === 'number' ? `${user.balance.toFixed(4)} SOL` : '---'}</p>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-4">
              <p className="text-sm text-gray-400 mb-1">Wallet ID</p>
              <p className="font-mono text-sm break-all">{user?.walletId || '---'}</p>
            </div>
          </div>
        </div>

        <div className="bg-yellow-900/20 border border-yellow-700/40 rounded-2xl p-6 flex gap-4">
          <AlertTriangle className="text-yellow-400 w-6 h-6 flex-shrink-0" />
          <div>
            <h3 className="text-lg font-semibold text-yellow-300 mb-2">Security Notice</h3>
            <p className="text-yellow-100 text-sm">
              This is a custodial wallet hosted by Sealevel Studio. Export your private key and recovery phrase from the Settings panel
              before rotating wallets. Regenerating your wallet will permanently replace the current keys.
            </p>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
          <div>
            <label className="text-sm text-gray-300 flex items-center gap-2 mb-2">
              <Mail size={16} />
              Email for recovery (optional)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <p className="text-xs text-gray-500 mt-2">
              If provided, the new wallet will be linked to your email for recovery. Leave blank to skip.
            </p>
          </div>

          <div>
            <label className="text-sm text-gray-300 flex items-center gap-2 mb-2">
              🎨 Vanity Address (optional - for fun!)
            </label>
            <input
              type="text"
              value={vanityPrefix}
              onChange={(e) => {
                const value = e.target.value.toUpperCase().replace(/[^1-9A-HJ-NP-Za-km-z]/g, '');
                setVanityPrefix(value);
              }}
              placeholder="Type prefix (e.g., 'SEAL', 'ABC')"
              maxLength={8}
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
            />
            <p className="text-xs text-gray-500 mt-2">
              Your wallet address will start with this prefix! Shorter prefixes (1-3 chars) are faster.
            </p>
          </div>

          <button
            onClick={handleCreateWallet}
            disabled={isCreating}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Creating Wallet...
              </>
            ) : (
              <>
                <Shield size={18} />
                Create / Reset Custodial Wallet
              </>
            )}
          </button>
        </div>

        {/* Export Keys Section */}
        {user?.walletAddress && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-1">Wallet Keys & Recovery</h3>
                <p className="text-sm text-gray-400">
                  Export your private key and recovery phrase. Keep them secure!
                </p>
              </div>
              <button
                onClick={handleExportKeys}
                disabled={isExporting}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExporting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    Export Keys
                  </>
                )}
              </button>
            </div>

            {exportedKeys && showKeys && (
              <div className="bg-gray-800/50 rounded-xl p-4 space-y-4 border border-yellow-700/30">
                <div className="flex items-center justify-between">
                  <p className="text-yellow-400 text-sm font-medium">⚠️ Keep these keys secure!</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowKeys(false)}
                      className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
                    >
                      <EyeOff size={14} />
                      Hide
                    </button>
                    <button
                      onClick={handleDownloadKeys}
                      className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
                    >
                      <Download size={14} />
                      Download
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Private Key</label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-gray-900 rounded text-xs font-mono break-all text-gray-300">
                      {exportedKeys.privateKey}
                    </code>
                    <button
                      onClick={() => handleCopy(exportedKeys.privateKey)}
                      className="p-2 rounded bg-gray-700 hover:bg-gray-600"
                      title="Copy private key"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Recovery Phrase</label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-gray-900 rounded text-xs font-mono break-all text-gray-300">
                      {exportedKeys.recoveryPhrase}
                    </code>
                    <button
                      onClick={() => handleCopy(exportedKeys.recoveryPhrase)}
                      className="p-2 rounded bg-gray-700 hover:bg-gray-600"
                      title="Copy recovery phrase"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {message && (
          <div className="bg-gray-800/70 border border-gray-700 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle size={18} className="text-green-400" />
            <span className="text-sm text-gray-200">{message}</span>
          </div>
        )}
      </div>
    </div>
  );
}


