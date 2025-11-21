'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Crown,
  Star,
  Flame,
  Rocket,
  Target,
  Award,
  Vote,
  PiggyBank,
  TrendingDown,
  Activity,
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

interface BuyNotification {
  id: string;
  amount: number;
  sealTokens: number;
  wallet: string;
  timestamp: Date;
}

interface SealPresaleProps {
  onBack?: () => void;
}

export function SealPresale({ onBack }: SealPresaleProps) {
  const { publicKey, sendTransaction, connected } = useWallet();
  const { connection } = useConnection();

  const [config, setConfig] = useState<PresaleConfig>({
    ...DEFAULT_PRESALE_CONFIG,
    treasuryWallet: publicKey || PublicKey.default, // Set to user's wallet
  });
  const [solAmount, setSolAmount] = useState<string>('1');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [stats, setStats] = useState(getPresaleStats(DEFAULT_PRESALE_CONFIG));
  const [buyNotifications, setBuyNotifications] = useState<BuyNotification[]>([]);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const intervalRef = useRef<NodeJS.Timeout>();

  // Countdown timer
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date().getTime();
      const endTime = config.endTime.getTime();
      const distance = endTime - now;

      if (distance > 0) {
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        setTimeLeft({ days, hours, minutes, seconds });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    updateCountdown();
    intervalRef.current = setInterval(updateCountdown, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [config.endTime]);

  // Mock buy notifications
  useEffect(() => {
    const generateMockBuy = () => {
      const amounts = [0.5, 1, 2, 5, 10, 25, 50];
      const amount = amounts[Math.floor(Math.random() * amounts.length)];
      const { totalTokens } = calculateSealTokens(amount, config);

      const notification: BuyNotification = {
        id: Date.now().toString(),
        amount,
        sealTokens: totalTokens,
        wallet: `${Math.random().toString(36).substring(2, 8)}...${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date(),
      };

      setBuyNotifications(prev => [notification, ...prev.slice(0, 4)]); // Keep only 5 notifications
    };

    // Generate initial notifications
    for (let i = 0; i < 3; i++) {
      setTimeout(() => generateMockBuy(), i * 2000);
    }

    // Generate new notifications periodically
    const mockInterval = setInterval(generateMockBuy, 8000 + Math.random() * 12000);

    return () => clearInterval(mockInterval);
  }, [config]);

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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-6 relative overflow-hidden overflow-y-auto scrollbar-thin scrollbar-track-slate-800 scrollbar-thumb-purple-600">
      {/* Animated Background */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-20 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute -bottom-8 left-40 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse" style={{animationDelay: '4s'}}></div>
      </div>

      {/* Buy Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {buyNotifications.map((notification) => (
          <div
            key={notification.id}
            className="bg-green-600/90 backdrop-blur-sm border border-green-500 rounded-lg p-3 shadow-lg max-w-sm transform translate-x-full animate-slide-in"
            style={{
              animation: 'slideIn 0.5s ease-out forwards'
            }}
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <div className="text-xs font-medium">
                <span className="text-white">{notification.wallet}</span>
                <span className="text-green-200 ml-1">bought {notification.amount} SOL</span>
              </div>
            </div>
            <div className="text-xs text-green-200 mt-1">
              +{formatTokens(notification.sealTokens)} SEAL tokens
            </div>
          </div>
        ))}
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <img
              src="/sea-level-logo.png"
              alt="SEAL Token"
              className="w-16 h-16 rounded-full border-2 border-yellow-400"
            />
            <div>
              <h1 className="text-5xl font-bold bg-gradient-to-r from-yellow-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
                SEAL PRESALE
              </h1>
              <p className="text-gray-400 text-lg">Unlock the Future of DeFi Trading</p>
            </div>
          </div>

          {/* Countdown Timer */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-6 max-w-md mx-auto mb-8">
            <h2 className="text-xl font-bold mb-4 flex items-center justify-center gap-2">
              <Clock className="text-yellow-400" size={24} />
              Presale Ends In
            </h2>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-400">{timeLeft.days}</div>
                <div className="text-xs text-gray-400">Days</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-400">{timeLeft.hours}</div>
                <div className="text-xs text-gray-400">Hours</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-400">{timeLeft.minutes}</div>
                <div className="text-xs text-gray-400">Min</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-400">{timeLeft.seconds}</div>
                <div className="text-xs text-gray-400">Sec</div>
              </div>
            </div>
          </div>

          {onBack && (
            <button
              onClick={onBack}
              className="absolute top-4 left-4 px-4 py-2 bg-gray-800/80 hover:bg-gray-700 rounded-lg transition-colors"
            >
              ← Back
            </button>
          )}
        </div>

        {/* High-Tech Progress Bar */}
        <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 mb-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold mb-2">Presale Progress</h2>
            <p className="text-gray-400">300,000,000 SEAL tokens available</p>
          </div>

          {/* Skeleton Progress Bar */}
          <div className="relative mb-6">
            <div className="h-6 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-yellow-400 via-purple-500 to-blue-500 rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
                style={{ width: `${Math.min(stats.progressPercent, 100)}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
              </div>
            </div>
            <div className="flex justify-between text-sm mt-2">
              <span className="text-gray-400">0 SEAL</span>
              <span className="text-yellow-400 font-bold">{formatTokens(stats.tokensSold)} / {formatTokens(config.presaleSupply)} SEAL</span>
              <span className="text-gray-400">300M SEAL</span>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
              <DollarSign className="text-green-400 w-8 h-8 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-400">{formatSOL(stats.totalRaised)} SOL</div>
              <div className="text-xs text-gray-400">Raised</div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
              <Users className="text-blue-400 w-8 h-8 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-400">{stats.totalContributors}</div>
              <div className="text-xs text-gray-400">Contributors</div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
              <Target className="text-purple-400 w-8 h-8 mx-auto mb-2" />
              <div className="text-2xl font-bold text-purple-400">{stats.progressPercent.toFixed(1)}%</div>
              <div className="text-xs text-gray-400">Complete</div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
              <TrendingUp className="text-yellow-400 w-8 h-8 mx-auto mb-2" />
              <div className="text-2xl font-bold text-yellow-400">{formatSOL(config.pricePerSeal * 100000)} SOL</div>
              <div className="text-xs text-gray-400">per 100k SEAL</div>
            </div>
          </div>
        </div>

        {/* Features & Benefits */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-purple-900/50 to-blue-900/50 border border-purple-700/50 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Crown className="text-yellow-400 w-8 h-8" />
              <h3 className="text-xl font-bold">Premium Access</h3>
            </div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <CheckCircle className="text-green-400 w-4 h-4 flex-shrink-0" />
                <span>Advanced Transaction Builder</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="text-green-400 w-4 h-4 flex-shrink-0" />
                <span>Real-time Arbitrage Scanner</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="text-green-400 w-4 h-4 flex-shrink-0" />
                <span>AI-Powered Trading Agents</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="text-green-400 w-4 h-4 flex-shrink-0" />
                <span>Unlimited Simulations</span>
              </li>
            </ul>
          </div>

          <div className="bg-gradient-to-br from-green-900/50 to-emerald-900/50 border border-green-700/50 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <PiggyBank className="text-green-400 w-8 h-8" />
              <h3 className="text-xl font-bold">Staking Rewards</h3>
            </div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Star className="text-yellow-400 w-4 h-4 flex-shrink-0" />
                <span>15% APY Base Rewards</span>
              </li>
              <li className="flex items-center gap-2">
                <Star className="text-yellow-400 w-4 h-4 flex-shrink-0" />
                <span>Platform Fee Sharing</span>
              </li>
              <li className="flex items-center gap-2">
                <Star className="text-yellow-400 w-4 h-4 flex-shrink-0" />
                <span>Governance Voting Power</span>
              </li>
              <li className="flex items-center gap-2">
                <Star className="text-yellow-400 w-4 h-4 flex-shrink-0" />
                <span>Exclusive Community Access</span>
              </li>
            </ul>
          </div>

          <div className="bg-gradient-to-br from-orange-900/50 to-red-900/50 border border-orange-700/50 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Vote className="text-orange-400 w-8 h-8" />
              <h3 className="text-xl font-bold">DAO Governance</h3>
            </div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Award className="text-purple-400 w-4 h-4 flex-shrink-0" />
                <span>Vote on Platform Features</span>
              </li>
              <li className="flex items-center gap-2">
                <Award className="text-purple-400 w-4 h-4 flex-shrink-0" />
                <span>Protocol Parameter Control</span>
              </li>
              <li className="flex items-center gap-2">
                <Award className="text-purple-400 w-4 h-4 flex-shrink-0" />
                <span>Revenue Distribution Votes</span>
              </li>
              <li className="flex items-center gap-2">
                <Award className="text-purple-400 w-4 h-4 flex-shrink-0" />
                <span>Community Fund Allocation</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Vesting Information */}
        <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700 rounded-2xl p-6 mb-8">
          <h2 className="text-2xl font-bold text-center mb-6">Token Vesting Schedule</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-slate-800/50 rounded-xl border border-slate-700">
              <Clock className="text-blue-400 w-12 h-12 mx-auto mb-3" />
              <h3 className="font-bold text-lg mb-2">Week 1</h3>
              <p className="text-gray-400 text-sm">25% tokens unlocked immediately</p>
            </div>
            <div className="text-center p-4 bg-slate-800/50 rounded-xl border border-slate-700">
              <Clock className="text-purple-400 w-12 h-12 mx-auto mb-3" />
              <h3 className="font-bold text-lg mb-2">Week 3</h3>
              <p className="text-gray-400 text-sm">Additional 25% unlocked</p>
            </div>
            <div className="text-center p-4 bg-slate-800/50 rounded-xl border border-slate-700">
              <Clock className="text-green-400 w-12 h-12 mx-auto mb-3" />
              <h3 className="font-bold text-lg mb-2">Month 1</h3>
              <p className="text-gray-400 text-sm">Final 50% fully vested</p>
            </div>
          </div>
        </div>

        {/* Contribution Interface */}
        <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700 rounded-2xl p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2">Join the SEAL Revolution</h2>
            <p className="text-gray-400">Secure your discounted membership and unlock premium DeFi tools</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Contribution Form */}
            <div className="space-y-6">
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Wallet className="text-purple-400" size={24} />
                  Make Your Contribution
                </h3>

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
                      Min: {formatSOL(config.minPurchase)} SOL | Max: {formatSOL(config.maxPurchase)} SOL per wallet
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
                        <div>Base: {formatTokens(tokenCalculation.baseTokens)} SEAL</div>
                        {tokenCalculation.bonusPercent > 0 && (
                          <div className="text-green-400">
                            Bonus ({tokenCalculation.bonusPercent}%): +{formatTokens(tokenCalculation.bonusTokens)} SEAL
                          </div>
                        )}
                        <div>Price: {config.pricePerSeal} SOL per SEAL</div>
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
                    disabled={!connected || !config.isActive || isProcessing || !solAmount || parseFloat(solAmount) <= 0 || (!whitelisted && config.whitelistEnabled)}
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

              {/* Presale Info */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Info className="text-blue-400" size={24} />
                  Presale Details
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-400">Duration</div>
                    <div className="font-medium">5 Months</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Total Tokens</div>
                    <div className="font-medium">300M SEAL</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Price</div>
                    <div className="font-medium">{config.pricePerSeal} SOL/SEAL</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Min Purchase</div>
                    <div className="font-medium">{formatSOL(config.minPurchase)} SOL</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Vesting & Benefits */}
            <div className="space-y-6">
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Shield className="text-green-400" size={24} />
                  Secure Treasury Vault
                </h3>
                <div className="text-sm text-gray-300 space-y-2">
                  <p>Funds are securely managed in a robust treasury vault with:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Multi-signature protection</li>
                    <li>Time-locked withdrawals</li>
                    <li>Audit-ready smart contracts</li>
                    <li>Community governance oversight</li>
                  </ul>
                </div>
              </div>

              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <TrendingDown className="text-orange-400" size={24} />
                  Dynamic Tax System
                </h3>
                <div className="text-sm text-gray-300 space-y-2">
                  <p>Smart tax system that decreases over time:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Initial tax: 5% per transaction</li>
                    <li>Decreases by 0.1% daily</li>
                    <li>Minimum tax: 1%</li>
                    <li>Funds distributed to: Treasury (50%), Liquidity (30%), Staking (20%)</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


