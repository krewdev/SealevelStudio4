'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Wallet,
  TrendingUp,
  Clock,
  Users,
  DollarSign,
  Gift,
  CheckCircle,
  AlertCircle,
  Loader2,
  Zap,
  Shield,
  BarChart3,
  Info,
} from 'lucide-react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import {
  DEFAULT_PRESALE_CONFIG,
  PresaleConfig,
  calculateSealTokens,
  validateContribution,
  createPresaleContribution,
  getPresaleStats,
  getWalletContribution,
  isWhitelisted,
} from '../lib/seal-token/presale';
import { SEAL_TOKEN_CONFIG } from '../lib/seal-token/config';

interface SealPresaleProps {
  onBack?: () => void;
}

export function SealPresale({ onBack }: SealPresaleProps) {
  const { publicKey, sendTransaction, connected } = useWallet();
  const { connection } = useConnection();
  
  const [config, setConfig] = useState<PresaleConfig>(DEFAULT_PRESALE_CONFIG);
  const [solAmount, setSolAmount] = useState<string>('1');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [stats, setStats] = useState(getPresaleStats(DEFAULT_PRESALE_CONFIG));

  // Update stats when config changes
  useEffect(() => {
    setStats(getPresaleStats(config));
  }, [config]);

  // Calculate tokens for current input
  const tokenCalculation = solAmount
    ? calculateSealTokens(parseFloat(solAmount) || 0, config)
    : { baseTokens: 0, bonusTokens: 0, totalTokens: 0, bonusPercent: 0 };

  // Get wallet contribution info
  const walletInfo = publicKey
    ? getWalletContribution(publicKey, config)
    : { contributed: 0, sealTokens: 0, canContribute: false, remainingAllowance: 0 };

  // Check whitelist status
  const whitelisted = publicKey ? isWhitelisted(publicKey, config) : true;

  // Handle contribution
  const handleContribute = useCallback(async () => {
    if (!publicKey || !connected) {
      setError('Please connect your wallet');
      return;
    }

    const amount = parseFloat(solAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid SOL amount');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      // Validate contribution
      const validation = validateContribution(publicKey, amount, config);
      if (!validation.valid) {
        setError(validation.error || 'Invalid contribution');
        setIsProcessing(false);
        return;
      }

      // Create transaction
      const { transaction, sealAmount } = await createPresaleContribution(
        connection,
        publicKey,
        amount,
        config
      );

      // Get recent blockhash
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      // Send transaction
      const signature = await sendTransaction(transaction, connection, {
        skipPreflight: false,
        maxRetries: 3,
      });

      // Wait for confirmation
      await connection.confirmTransaction(
        {
          blockhash,
          lastValidBlockHeight,
          signature,
        },
        'confirmed'
      );

      // Update config (in a real app, this would come from on-chain data)
      const updatedConfig = { ...config };
      const existing = updatedConfig.contributions.get(publicKey.toString()) || 0;
      updatedConfig.contributions.set(publicKey.toString(), existing + amount);
      updatedConfig.totalRaised += amount;
      if (existing === 0) {
        updatedConfig.totalContributors += 1;
      }
      setConfig(updatedConfig);

      const sealAmountFormatted = (sealAmount / Math.pow(10, 9)).toLocaleString();
      setSuccess(
        `Successfully contributed ${amount} SOL! You received ${sealAmountFormatted} SEAL tokens.`
      );
      setSolAmount('');

      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transaction failed');
    } finally {
      setIsProcessing(false);
    }
  }, [publicKey, connected, solAmount, config, connection, sendTransaction]);

  // Format date
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  };

  // Format SOL amount
  const formatSOL = (amount: number) => {
    return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  };

  // Format token amount
  const formatTokens = (amount: number) => {
    return amount.toLocaleString(undefined, { maximumFractionDigits: 0 });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
              <Zap className="text-yellow-400" size={40} />
              SEAL Token Presale
            </h1>
            <p className="text-gray-400">Sealevel Studios Native Token</p>
          </div>
          {onBack && (
            <button
              onClick={onBack}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              Back
            </button>
          )}
        </div>

        {/* Status Banner */}
        {!config.isActive && (
          <div className="mb-6 p-4 bg-yellow-900/30 border border-yellow-700 rounded-lg flex items-center gap-3">
            <AlertCircle className="text-yellow-400" size={20} />
            <div>
              <div className="font-semibold">Presale Not Active</div>
              <div className="text-sm text-gray-400">
                Starts: {formatDate(config.startTime)}
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="text-green-400" size={20} />
              <span className="text-gray-400 text-sm">Total Raised</span>
            </div>
            <div className="text-2xl font-bold">{formatSOL(stats.totalRaised)} SOL</div>
            <div className="text-xs text-gray-500 mt-1">
              of {formatSOL(config.totalRaiseCap)} SOL cap
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="text-blue-400" size={20} />
              <span className="text-gray-400 text-sm">Contributors</span>
            </div>
            <div className="text-2xl font-bold">{stats.totalContributors}</div>
            <div className="text-xs text-gray-500 mt-1">
              Avg: {formatSOL(stats.averageContribution)} SOL
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="text-purple-400" size={20} />
              <span className="text-gray-400 text-sm">Tokens Sold</span>
            </div>
            <div className="text-2xl font-bold">{formatTokens(stats.tokensSold)}</div>
            <div className="text-xs text-gray-500 mt-1">
              {formatTokens(stats.tokensRemaining)} remaining
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="text-yellow-400" size={20} />
              <span className="text-gray-400 text-sm">Progress</span>
            </div>
            <div className="text-2xl font-bold">{stats.progressPercent.toFixed(1)}%</div>
            <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
              <div
                className="bg-yellow-400 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(stats.progressPercent, 100)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Contribution Card */}
          <div className="lg:col-span-2">
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Wallet className="text-purple-400" size={24} />
                Contribute to Presale
              </h2>

              {!connected && (
                <div className="p-4 bg-yellow-900/30 border border-yellow-700 rounded-lg mb-4">
                  <div className="flex items-center gap-2 text-yellow-400">
                    <AlertCircle size={20} />
                    <span>Please connect your wallet to contribute</span>
                  </div>
                </div>
              )}

              {connected && !whitelisted && config.whitelistEnabled && (
                <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg mb-4">
                  <div className="flex items-center gap-2 text-red-400">
                    <AlertCircle size={20} />
                    <span>Your wallet is not whitelisted for this presale</span>
                  </div>
                </div>
              )}

              {walletInfo.contributed > 0 && (
                <div className="p-4 bg-blue-900/30 border border-blue-700 rounded-lg mb-4">
                  <div className="flex items-center gap-2 text-blue-400 mb-2">
                    <CheckCircle size={20} />
                    <span className="font-semibold">Your Contribution</span>
                  </div>
                  <div className="text-sm">
                    <div>Contributed: {formatSOL(walletInfo.contributed)} SOL</div>
                    <div>SEAL Tokens: {formatTokens(walletInfo.sealTokens)}</div>
                    <div>Remaining Allowance: {formatSOL(walletInfo.remainingAllowance)} SOL</div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    SOL Amount
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={solAmount}
                      onChange={(e) => setSolAmount(e.target.value)}
                      min={config.minPurchase}
                      max={Math.min(config.maxPurchase, walletInfo.remainingAllowance || config.maxPurchase)}
                      step="0.1"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder={`Min: ${config.minPurchase} SOL`}
                      disabled={!connected || isProcessing || !config.isActive}
                    />
                    <span className="absolute right-4 top-3 text-gray-400">SOL</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Min: {formatSOL(config.minPurchase)} SOL | Max:{' '}
                    {formatSOL(config.maxPurchase)} SOL per wallet
                  </div>
                </div>

                {/* Token Calculation Preview */}
                {solAmount && parseFloat(solAmount) > 0 && (
                  <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
                    <div className="text-sm text-gray-400 mb-2">You will receive:</div>
                    <div className="text-2xl font-bold text-yellow-400 mb-2">
                      {formatTokens(tokenCalculation.totalTokens)} SEAL
                    </div>
                    <div className="text-xs text-gray-500 space-y-1">
                      <div>
                        Base: {formatTokens(tokenCalculation.baseTokens)} SEAL
                      </div>
                      {tokenCalculation.bonusPercent > 0 && (
                        <div className="text-green-400">
                          Bonus ({tokenCalculation.bonusPercent}%): +{' '}
                          {formatTokens(tokenCalculation.bonusTokens)} SEAL
                        </div>
                      )}
                      <div>
                        Price: {config.pricePerSeal} SOL per SEAL
                      </div>
                    </div>
                  </div>
                )}

                {/* Error/Success Messages */}
                {error && (
                  <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg">
                    <div className="flex items-center gap-2 text-red-400">
                      <AlertCircle size={20} />
                      <span>{error}</span>
                    </div>
                  </div>
                )}

                {success && (
                  <div className="p-4 bg-green-900/30 border border-green-700 rounded-lg">
                    <div className="flex items-center gap-2 text-green-400">
                      <CheckCircle size={20} />
                      <span>{success}</span>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleContribute}
                  disabled={
                    !connected ||
                    !config.isActive ||
                    isProcessing ||
                    !solAmount ||
                    parseFloat(solAmount) <= 0 ||
                    (!whitelisted && config.whitelistEnabled)
                  }
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Zap size={20} />
                      Contribute {solAmount ? `${solAmount} SOL` : ''}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Info Sidebar */}
          <div className="space-y-6">
            {/* Presale Details */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Info className="text-blue-400" size={20} />
                Presale Details
              </h3>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-gray-400">Start Time</div>
                  <div className="font-medium">{formatDate(config.startTime)}</div>
                </div>
                <div>
                  <div className="text-gray-400">End Time</div>
                  <div className="font-medium">{formatDate(config.endTime)}</div>
                </div>
                <div>
                  <div className="text-gray-400">Price</div>
                  <div className="font-medium">
                    {config.pricePerSeal} SOL per SEAL
                  </div>
                </div>
                <div>
                  <div className="text-gray-400">Total Supply</div>
                  <div className="font-medium">
                    {config.presaleSupply.toLocaleString()} SEAL
                  </div>
                </div>
              </div>
            </div>

            {/* Bonus Tiers */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Gift className="text-yellow-400" size={20} />
                Bonus Tiers
              </h3>
              <div className="space-y-2">
                {config.bonusTiers.map((tier, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 bg-slate-900/50 rounded"
                  >
                    <span className="text-sm">
                      {formatSOL(tier.amount)}+ SOL
                    </span>
                    <span className="text-green-400 font-semibold">
                      +{tier.bonusPercent}% Bonus
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Token Info */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Shield className="text-purple-400" size={20} />
                About SEAL
              </h3>
              <div className="text-sm text-gray-300 space-y-2">
                <p>
                  SEAL is the native utility token for Sealevel Studios. Use SEAL tokens to
                  access premium features and unlock the full potential of the platform.
                </p>
                <div className="pt-2 border-t border-slate-700">
                  <div className="text-gray-400">Symbol</div>
                  <div className="font-medium">{SEAL_TOKEN_CONFIG.symbol}</div>
                </div>
                <div>
                  <div className="text-gray-400">Decimals</div>
                  <div className="font-medium">{SEAL_TOKEN_CONFIG.decimals}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

