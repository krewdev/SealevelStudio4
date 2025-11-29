'use client';

import React, { useState, useEffect } from 'react';
import {
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import {
  ArrowLeft,
  Droplet,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  DollarSign,
  CreditCard,
  Wallet as WalletIcon,
} from 'lucide-react';
import { useNetwork } from '../contexts/NetworkContext';
import { useUser } from '../contexts/UserContext';
import { CopyButton } from './CopyButton';

interface DevnetFaucetProps {
  onBack?: () => void;
}

interface FaucetStatus {
  lastRequest: number | null;
  requestsToday: number;
  canRequest: boolean;
  cooldownSeconds: number;
}

const FAUCET_COOLDOWN = 60 * 1000; // 1 minute in milliseconds
const MAX_REQUESTS_PER_DAY = 10;
const MIN_FAUCET_AMOUNT = 0.001; // Minimum 0.001 SOL
const MAX_FAUCET_AMOUNT = 1; // Maximum 1 SOL (chain limit)

/**
 * Generate a random faucet amount between MIN_FAUCET_AMOUNT and MAX_FAUCET_AMOUNT
 * @returns Random amount in SOL
 */
function getRandomFaucetAmount(): number {
  return Math.random() * (MAX_FAUCET_AMOUNT - MIN_FAUCET_AMOUNT) + MIN_FAUCET_AMOUNT;
}

export function DevnetFaucet({ onBack }: DevnetFaucetProps) {
  const { connection } = useConnection();
  const { publicKey: externalWallet, signTransaction, sendTransaction } = useWallet();
  const { network } = useNetwork();
  const { user, refreshBalance, createWallet } = useUser();
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [useCustodial, setUseCustodial] = useState(true); // Default to custodial wallet
  const [currentFaucetAmount, setCurrentFaucetAmount] = useState<number | null>(null);
  const [lastTransactionSignature, setLastTransactionSignature] = useState<string | null>(null);
  const [faucetStatus, setFaucetStatus] = useState<FaucetStatus>({
    lastRequest: null,
    requestsToday: 0,
    canRequest: true,
    cooldownSeconds: 0,
  });

  // Load faucet status from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const lastRequest = localStorage.getItem('faucet_last_request');
      const requestsToday = parseInt(localStorage.getItem('faucet_requests_today') || '0', 10);
      const lastRequestDate = localStorage.getItem('faucet_last_request_date');
      
      const today = new Date().toDateString();
      const storedDate = lastRequestDate || '';
      
      // Reset daily count if it's a new day
      let actualRequestsToday = requestsToday;
      if (storedDate !== today) {
        actualRequestsToday = 0;
        localStorage.setItem('faucet_requests_today', '0');
        localStorage.setItem('faucet_last_request_date', today);
      }

      const lastRequestTime = lastRequest ? parseInt(lastRequest, 10) : null;
      const now = Date.now();
      const cooldownRemaining = lastRequestTime 
        ? Math.max(0, Math.floor((FAUCET_COOLDOWN - (now - lastRequestTime)) / 1000))
        : 0;
      
      setFaucetStatus({
        lastRequest: lastRequestTime,
        requestsToday: actualRequestsToday,
        canRequest: cooldownRemaining === 0 && actualRequestsToday < MAX_REQUESTS_PER_DAY,
        cooldownSeconds: cooldownRemaining,
      });
    }
  }, []);

  // Update cooldown timer
  useEffect(() => {
    if (faucetStatus.cooldownSeconds > 0) {
      const timer = setInterval(() => {
        setFaucetStatus(prev => {
          const newCooldown = Math.max(0, prev.cooldownSeconds - 1);
          return {
            ...prev,
            cooldownSeconds: newCooldown,
            canRequest: newCooldown === 0 && prev.requestsToday < MAX_REQUESTS_PER_DAY,
          };
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [faucetStatus.cooldownSeconds]);

  // Determine which wallet to use
  const activeWallet = useCustodial && user?.walletAddress 
    ? new PublicKey(user.walletAddress)
    : externalWallet;

  // Fetch balance
  useEffect(() => {
    if (activeWallet && network === 'devnet') {
      fetchBalance();
    }
  }, [activeWallet, network]);

  const fetchBalance = async () => {
    if (!activeWallet) return;
    
    try {
      const balance = await connection.getBalance(activeWallet);
      setBalance(balance / LAMPORTS_PER_SOL);
      
      // If using custodial wallet, also update user context
      if (useCustodial && user?.walletAddress) {
        await refreshBalance(user.walletAddress);
      }
    } catch (err) {
      console.error('Failed to fetch balance:', err);
    }
  };

  const requestAirdrop = async () => {
    // Auto-create custodial wallet if needed
    if (useCustodial && !user?.walletAddress) {
      setRequesting(true);
      setError(null);
      try {
        await createWallet();
        setSuccess('Custodial wallet created! Please click "Request SOL" again.');
        setRequesting(false);
        return;
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to create wallet');
        setRequesting(false);
        return;
      }
    }

    if (!activeWallet) {
      if (!useCustodial && !externalWallet) {
        setError('Please connect your external wallet or use your custodial wallet');
      }
      return;
    }

    if (network !== 'devnet') {
      setError('Faucet is only available on devnet');
      return;
    }

    if (!faucetStatus.canRequest) {
      if (faucetStatus.cooldownSeconds > 0) {
        setError(`Please wait ${faucetStatus.cooldownSeconds} seconds before requesting again`);
      } else if (faucetStatus.requestsToday >= MAX_REQUESTS_PER_DAY) {
        setError('Daily limit reached. Please try again tomorrow.');
      }
      return;
    }

    setRequesting(true);
    setError(null);
    setSuccess(null);

    try {
      // Generate random faucet amount between 0.001 and 1 SOL
      const faucetAmount = getRandomFaucetAmount();
      setCurrentFaucetAmount(faucetAmount);
      
      // Request airdrop from Solana devnet
      const signature = await connection.requestAirdrop(
        activeWallet,
        faucetAmount * LAMPORTS_PER_SOL
      );

      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');
      setLastTransactionSignature(signature);

      // Update faucet status
      const now = Date.now();
      const today = new Date().toDateString();
      const lastRequestDate = localStorage.getItem('faucet_last_request_date') || '';
      const requestsToday = lastRequestDate === today 
        ? parseInt(localStorage.getItem('faucet_requests_today') || '0', 10) + 1
        : 1;

      localStorage.setItem('faucet_last_request', now.toString());
      localStorage.setItem('faucet_requests_today', requestsToday.toString());
      localStorage.setItem('faucet_last_request_date', today);

      setFaucetStatus({
        lastRequest: now,
        requestsToday,
        canRequest: requestsToday < MAX_REQUESTS_PER_DAY,
        cooldownSeconds: Math.floor(FAUCET_COOLDOWN / 1000),
      });

      setSuccess(`Successfully received ${faucetAmount.toFixed(4)} SOL!`);
      
      // Refresh balance
      setTimeout(() => {
        fetchBalance();
      }, 2000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to request airdrop';
      setError(errorMessage);
      
      // If it's a rate limit error, update cooldown
      if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
        const now = Date.now();
        localStorage.setItem('faucet_last_request', now.toString());
        setFaucetStatus(prev => ({
          ...prev,
          lastRequest: now,
          cooldownSeconds: Math.floor(FAUCET_COOLDOWN / 1000),
          canRequest: false,
        }));
      }
    } finally {
      setRequesting(false);
    }
  };

  const isDevnet = network === 'devnet';

  return (
    <div className="min-h-screen animated-bg text-white relative">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Header */}
      <div className="relative z-10 border-b border-slate-800/50 glass p-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
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
                <Droplet className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gradient-primary">Devnet Faucet</h1>
                <p className="text-sm text-gray-400 mt-1">Request free SOL for testing on devnet</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-8">
        {/* Network Warning */}
        {!isDevnet && (
          <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-400 font-medium">Switch to Devnet</p>
              <p className="text-sm text-gray-400 mt-1">
                The faucet is only available on devnet. Please switch your network to devnet to request SOL.
              </p>
            </div>
          </div>
        )}

        {/* Wallet Selection */}
        <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <p className="text-blue-400 font-medium">Select Wallet</p>
            <div className="flex gap-2">
              <button
                onClick={() => setUseCustodial(true)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  useCustodial
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <WalletIcon size={16} className="inline mr-2" />
                Custodial Wallet
              </button>
              <button
                onClick={() => setUseCustodial(false)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  !useCustodial
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <WalletIcon size={16} className="inline mr-2" />
                External Wallet
              </button>
            </div>
          </div>
          {useCustodial ? (
            <div>
              {user?.walletAddress ? (
                <div className="flex items-center gap-2">
                  <p className="text-sm text-white">
                    Using custodial wallet: <span className="font-mono text-sm text-white font-semibold">{user.walletAddress}</span>
                  </p>
                  <CopyButton text={user.walletAddress} size={14} />
                </div>
              ) : (
                <p className="text-sm text-yellow-400">
                  No custodial wallet found. A wallet will be created automatically when you request SOL.
                </p>
              )}
            </div>
          ) : (
            <div>
              {externalWallet ? (
                <p className="text-sm text-gray-300">
                  Using external wallet: <span className="font-mono text-xs">{externalWallet.toString().slice(0, 8)}...{externalWallet.toString().slice(-8)}</span>
                </p>
              ) : (
                <p className="text-sm text-yellow-400">
                  Please connect your external wallet to use this option.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Main Card */}
        <div className="card-modern p-8 mb-6">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 mb-4">
              <Droplet className="w-10 h-10 text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Request Devnet SOL</h2>
            <p className="text-gray-400">
              Get {currentFaucetAmount ? `${currentFaucetAmount.toFixed(4)}` : '0.001-1.0'} SOL for free to test your applications
            </p>
          </div>

          {/* Balance Display */}
          {activeWallet && balance !== null && (
            <div className="mb-6 p-4 bg-gray-800/50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Current Balance</span>
                <span className="text-2xl font-bold text-white">
                  {balance.toFixed(4)} SOL
                </span>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-400 font-medium">Error</p>
                <p className="text-sm text-gray-300 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-green-400 font-medium">Success</p>
                <p className="text-sm text-gray-300 mt-1">{success}</p>
                {lastTransactionSignature && (
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs text-gray-400">Transaction:</span>
                    <span className="font-mono text-xs text-white">{lastTransactionSignature}</span>
                    <CopyButton text={lastTransactionSignature} size={12} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Request Button */}
          <button
            onClick={requestAirdrop}
            disabled={!isDevnet || !activeWallet || requesting || !faucetStatus.canRequest}
            className="w-full btn-modern px-6 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg font-semibold"
          >
            {requesting ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Requesting...
              </>
            ) : faucetStatus.cooldownSeconds > 0 ? (
              <>
                <Clock className="w-5 h-5" />
                Wait {faucetStatus.cooldownSeconds}s
              </>
            ) : faucetStatus.requestsToday >= MAX_REQUESTS_PER_DAY ? (
              <>
                <AlertCircle className="w-5 h-5" />
                Daily Limit Reached
              </>
            ) : (
              <>
                <Droplet className="w-5 h-5" />
                Request SOL (0.001-1.0)
              </>
            )}
          </button>

          {/* Status Info */}
          <div className="mt-6 space-y-3 text-sm text-gray-400">
            <div className="flex items-center justify-between">
              <span>Requests Today</span>
              <span className="text-white font-semibold">
                {faucetStatus.requestsToday} / {MAX_REQUESTS_PER_DAY}
              </span>
            </div>
            {faucetStatus.cooldownSeconds > 0 && (
              <div className="flex items-center justify-between">
                <span>Cooldown</span>
                <span className="text-yellow-400 font-semibold">
                  {faucetStatus.cooldownSeconds}s remaining
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Info Section */}
        <div className="card-modern p-6">
          <h3 className="text-lg font-semibold mb-4">About Devnet Faucet</h3>
          <div className="space-y-3 text-sm text-gray-400">
            <p>
              The devnet faucet provides free SOL for testing and development. This SOL has no real value and can only be used on the Solana devnet.
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Each request gives you a random amount between {MIN_FAUCET_AMOUNT} and {MAX_FAUCET_AMOUNT} SOL</li>
              <li>Maximum {MAX_REQUESTS_PER_DAY} requests per day</li>
              <li>{Math.floor(FAUCET_COOLDOWN / 1000)} second cooldown between requests</li>
              <li>Only available on devnet network</li>
              <li>SOL received has no real value</li>
              <li>Use for testing and development only</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

