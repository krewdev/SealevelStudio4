'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import { useWallet } from '@solana/wallet-adapter-react';
import { Wallet, Loader2, Sparkles, ArrowRight, Copy, Download, AlertTriangle, Check, X, Eye, EyeOff, Mail, Shield } from 'lucide-react';
import { CopyButton } from './CopyButton';
import { WalletPassphraseModal } from './WalletPassphraseModal';
import { WalletEducationModal } from './WalletEducationModal';
import { WelcomeTutorialModal } from './WelcomeTutorialModal';

interface LoginGateProps {
  children: React.ReactNode;
}

export function LoginGate({ children }: LoginGateProps) {
  const { user, isLoading, createWallet, enterDemoMode } = useUser();
  const { publicKey, connect, disconnect, connecting, connected } = useWallet();
  const [isCreating, setIsCreating] = useState(false);
  const [email, setEmail] = useState('');
  const [emailVerificationToken, setEmailVerificationToken] = useState('');
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [showWalletEducation, setShowWalletEducation] = useState(false);
  const [showWelcomeTutorial, setShowWelcomeTutorial] = useState(false);
  const [vanityPrefix, setVanityPrefix] = useState('');
  const [walletMode, setWalletMode] = useState<'custodial' | 'hot' | null>(null);
  const [walletCreationResult, setWalletCreationResult] = useState<{ passphrase: string; privateKey?: string; walletAddress: string } | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Check if demo mode is active
  useEffect(() => {
    const demoMode = localStorage.getItem('demo_mode') === 'true';
    setIsDemoMode(demoMode);
  }, []);

  // Show loading state while checking for user
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading your wallet...</p>
        </div>
      </div>
    );
  }

  // If user is logged in or hot wallet connected, show children
  // BUT if we just created a wallet and need to show passphrase or tutorial, show modals first
  if ((user || (connected && publicKey)) && !walletCreationResult && !showWelcomeTutorial) {
    return <>{children}</>;
  }

  // Handle email submission and verification
  const handleEmailSubmit = async () => {
    if (!email || !email.includes('@')) {
      alert('Please enter a valid email address');
      return;
    }

    setIsCreating(true);
    try {
      // Request email verification
      const response = await fetch('/api/wallet/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to send verification email');
      }

      // Show email verification input
      setShowEmailVerification(true);
      if (data.token) {
        // In development, show token for testing
        setEmailVerificationToken(data.token);
      }
    } catch (error) {
      console.error('Failed to send verification email:', error);
      alert(error instanceof Error ? error.message : 'Failed to send verification email. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  // Verify email token
  const handleVerifyEmail = async () => {
    if (!emailVerificationToken.trim()) {
      alert('Please enter the verification code from your email');
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch('/api/wallet/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token: emailVerificationToken.trim() }),
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Invalid verification code');
      }

      setEmailVerified(true);
      setShowEmailVerification(false);
      // Now create the wallet
      await handleCreateWallet();
    } catch (error) {
      console.error('Failed to verify email:', error);
      alert(error instanceof Error ? error.message : 'Invalid verification code. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  // Show login/wallet creation screen
  const handleCreateWallet = async () => {
    if (isCreating) return;

    if (!email || !email.includes('@')) {
      alert('Email is required for wallet recovery');
      return;
    }

    if (!emailVerified) {
      alert('Please verify your email first');
      return;
    }

    setIsCreating(true);
    try {
      // Use UserContext createWallet which returns the passphrase/private key
      const result = await createWallet(
        email,
        vanityPrefix.trim() || undefined
      );

      if (result) {
        // Show passphrase modal
        setWalletCreationResult(result);
      }
    } catch (error) {
      console.error('Failed to create wallet:', error);
      alert(error instanceof Error ? error.message : 'Failed to create wallet. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleConnectHotWallet = async () => {
    try {
      await connect();
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      alert('Failed to connect wallet. Please try again.');
    }
  };

  const handlePassphraseContinue = () => {
    // Clear passphrase modal and show welcome tutorial
    setWalletCreationResult(null);
    setShowWelcomeTutorial(true);
  };

  const handleWelcomeTutorialComplete = () => {
    setShowWelcomeTutorial(false);
    // Mark tutorial as completed
    if (typeof window !== 'undefined') {
      localStorage.setItem('sealevel-welcome-tutorial-completed', 'true');
    }
    // User is now logged in and tutorial is complete
  };

  const handleEnterDemoMode = async () => {
    try {
      await enterDemoMode();
      setIsDemoMode(true);
    } catch (error) {
      console.error('Failed to enter demo mode:', error);
      alert('Failed to enter demo mode. Please try again.');
    }
  };

  const handleWalletEducationContinue = () => {
    setShowWalletEducation(false);
    // Show email input after education
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-slate-900 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="max-w-md w-full my-auto">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <div className="relative bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-md border-2 border-purple-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 rounded-full mb-3 sm:mb-4 border border-purple-500/30">
              <Wallet className="w-6 h-6 sm:w-8 sm:h-8 text-purple-400" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2 bg-gradient-to-r from-purple-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
              Welcome to Sea Level Studio
            </h1>
            <p className="text-gray-400 text-sm sm:text-base">
              Connect your wallet or create a new one
            </p>
          </div>

          {/* Wallet Mode Selection */}
          {!walletMode && (
            <div className="space-y-3 mb-6">
              <button
                onClick={() => setWalletMode('hot')}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                <Wallet className="w-5 h-5" />
                Connect Hot Wallet (Phantom, Solflare, etc.)
              </button>
              <button
                onClick={() => {
                  if (!isDemoMode) {
                    setWalletMode('custodial');
                    setShowWalletEducation(true);
                  }
                }}
                disabled={isDemoMode}
                className={`w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 ${
                  isDemoMode ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                title={isDemoMode ? 'Wallet creation disabled in demo mode' : ''}
              >
                <Sparkles className="w-5 h-5" />
                Create Custodial Wallet {isDemoMode && '(Disabled)'}
              </button>
              <button
                onClick={handleEnterDemoMode}
                className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 border-2 border-green-400/50"
              >
                <Sparkles className="w-5 h-5" />
                Enter Demo Mode
              </button>
              {isDemoMode && (
                <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <p className="text-xs text-green-300 text-center">
                    🎮 Demo mode active - Using prefunded devnet wallet
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Hot Wallet Connection */}
          {walletMode === 'hot' && (
            <div className="space-y-4">
              <button
                onClick={() => setWalletMode(null)}
                className="text-gray-400 hover:text-white transition-colors text-sm flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Back
              </button>
              <button
                onClick={handleConnectHotWallet}
                disabled={connecting}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {connecting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Wallet className="w-5 h-5" />
                    Connect Wallet
                  </>
                )}
              </button>
              <p className="text-xs text-gray-400 text-center">
                Connect using Phantom, Solflare, or any Solana wallet extension
              </p>
            </div>
          )}

          {/* Custodial Wallet Creation */}
          {walletMode === 'custodial' && !showEmailVerification && (
            <div className="space-y-4">
              <button
                onClick={() => setWalletMode(null)}
                className="text-gray-400 hover:text-white transition-colors text-sm flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Back
              </button>

              {/* Email Input (Required) */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                    Email Address <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white text-sm sm:text-base placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Required for wallet recovery. We'll send a verification code to this email.
                  </p>
                </div>

                {/* Vanity Address Generation (Optional) */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                    🎨 Vanity Address (Optional - for fun!)
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
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white text-sm sm:text-base placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Your wallet address will start with this prefix! Shorter prefixes (1-3 chars) are faster.
                  </p>
                </div>
              </div>

              {/* Submit Email Button */}
              <button
                onClick={handleEmailSubmit}
                disabled={isCreating || !email || !email.includes('@') || isDemoMode}
                className={`w-full py-3 sm:py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl hover:shadow-purple-500/50 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 text-sm sm:text-base ${
                  isDemoMode ? 'opacity-30' : ''
                }`}
                title={isDemoMode ? 'Wallet creation disabled in demo mode' : ''}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                    <span>Sending Verification...</span>
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>Verify Email & Create Wallet {isDemoMode && '(Disabled)'}</span>
                    <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                  </>
                )}
              </button>
            </div>
          )}

          {/* Email Verification Input */}
          {showEmailVerification && (
            <div className="space-y-4">
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-blue-300 font-semibold mb-1">Verification Email Sent!</p>
                    <p className="text-xs text-blue-200">
                      We've sent a verification code to <strong>{email}</strong>. Please check your inbox and enter the code below.
                    </p>
                    {emailVerificationToken && (
                      <p className="text-xs text-yellow-300 mt-2">
                        <strong>Dev Mode:</strong> Your verification code is: <code className="bg-gray-800 px-2 py-1 rounded">{emailVerificationToken}</code>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                  Verification Code
                </label>
                <input
                  type="text"
                  value={emailVerificationToken}
                  onChange={(e) => setEmailVerificationToken(e.target.value)}
                  placeholder="Enter code from email"
                  className="w-full px-4 py-2.5 sm:py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white text-sm sm:text-base placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-center"
                  maxLength={64}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowEmailVerification(false);
                    setEmailVerificationToken('');
                  }}
                  className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleVerifyEmail}
                  disabled={isCreating || !emailVerificationToken.trim() || isDemoMode}
                  className={`flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                    isDemoMode ? 'opacity-30' : ''
                  }`}
                  title={isDemoMode ? 'Wallet creation disabled in demo mode' : ''}
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4" />
                      Verify & Create Wallet {isDemoMode && '(Disabled)'}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Info */}
          {!walletMode && (
            <div className="mt-4 sm:mt-6 space-y-3">
              <div className="p-3 sm:p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-xs sm:text-sm text-blue-300">
                  <strong className="text-blue-200">🔒 Secure:</strong> Your wallet is created securely and stored server-side. 
                  You can access it anytime by logging in.
                </p>
              </div>
              <div className="p-3 sm:p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-lg">
                <a
                  href="https://discord.gg/8a7FrYCEEc"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs sm:text-sm text-indigo-300 hover:text-indigo-200 transition-colors"
                >
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                  </svg>
                  <span><strong className="text-indigo-200">💬 Join Discord:</strong> Connect with @sealevelstudios community</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Wallet Education Modal */}
      {showWalletEducation && (
        <WalletEducationModal
          onContinue={handleWalletEducationContinue}
          onSkip={handleWalletEducationContinue}
        />
      )}

      {/* Wallet Passphrase Modal */}
      {walletCreationResult && (
        <WalletPassphraseModal
          passphrase={walletCreationResult.passphrase}
          walletAddress={walletCreationResult.walletAddress}
          privateKey={walletCreationResult.privateKey}
          onContinue={handlePassphraseContinue}
        />
      )}

      {/* Welcome Tutorial Modal */}
      {showWelcomeTutorial && (
        <WelcomeTutorialModal
          onComplete={handleWelcomeTutorialComplete}
          onSkip={handleWelcomeTutorialComplete}
        />
      )}
    </div>
  );
}
