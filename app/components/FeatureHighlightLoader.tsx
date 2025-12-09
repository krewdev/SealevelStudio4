'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { SealAnimation } from './SealAnimation';
import {
  Wrench,
  Zap,
  ShieldCheck,
  BarChart3,
  Brain,
  Code,
  TrendingUp,
  MessageCircle,
  Layers,
  Play,
  ArrowRight,
  CheckCircle,
  X,
  DollarSign,
  Info
} from 'lucide-react';

interface Feature {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  features: string[];
}

interface LoaderContext {
  featureName?: string;
  description?: string;
  directions?: string[];
  cost?: string;
  disclaimer?: string;
  extraNote?: string;
}

interface FeatureHighlightLoaderProps {
  isLoading: boolean;
  duration?: number;
  onAnimationComplete?: () => void;
  onFeatureClick?: (featureId: string) => void;
  onEnterApp?: () => void;
  currentFeature?: string; // The specific feature/page being loaded
  context?: LoaderContext; // Context info about the page being loaded
}

const FEATURES: Feature[] = [
  {
    id: 'transaction-builder',
    title: 'Transaction Builder',
    description: 'Build complex Solana transactions with our visual instruction assembler',
    icon: <Wrench className="h-6 w-6" />,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10 border-blue-500/30',
    features: [
      'Visual instruction composer',
      'Multi-step transaction support',
      'Account validation & error checking',
      'Priority fees & memo fields'
    ]
  },
  {
    id: 'ai-agents',
    title: 'AI Cyber Agents',
    description: 'Autonomous AI agents for trading, analysis, and market monitoring',
    icon: <Brain className="h-6 w-6" />,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10 border-purple-500/30',
    features: [
      'Autonomous trading strategies',
      'Real-time market analysis',
      'Risk management protocols',
      'Multi-exchange integration'
    ]
  },
  {
    id: 'decentralized-exchange',
    title: 'DEX Integration',
    description: 'Seamless integration with Jupiter and other decentralized exchanges',
    icon: <Zap className="h-6 w-6" />,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10 border-yellow-500/30',
    features: [
      'Jupiter swap integration',
      'Best price routing',
      'MEV protection',
      'Cross-chain bridging'
    ]
  },
  {
    id: 'security-tools',
    title: 'Security & Auditing',
    description: 'Comprehensive security tools and smart contract auditing',
    icon: <ShieldCheck className="h-6 w-6" />,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10 border-green-500/30',
    features: [
      'Real-time vulnerability scanning',
      'Smart contract verification',
      'Transaction simulation',
      'Risk assessment tools'
    ]
  },
  {
    id: 'market-analytics',
    title: 'Market Analytics',
    description: 'Advanced market data, charts, and trading insights',
    icon: <BarChart3 className="h-6 w-6" />,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10 border-cyan-500/30',
    features: [
      'Real-time price feeds',
      'Technical analysis tools',
      'Volume & liquidity analysis',
      'On-chain metrics'
    ]
  },
  {
    id: 'social-features',
    title: 'Social Integration',
    description: 'Connect and automate your social media presence',
    icon: <MessageCircle className="h-6 w-6" />,
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/10 border-pink-500/30',
    features: [
      'Automated social posting',
      'Community engagement tools',
      'Cross-platform integration',
      'Content scheduling'
    ]
  },
  {
    id: 'token-launcher',
    title: 'Token Launcher',
    description: 'Launch rugless tokens with automated social broadcasting',
    icon: <Zap className="h-6 w-6" />,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10 border-orange-500/30',
    features: [
      'Quick launch in under 60 seconds',
      'Rugless launch protection',
      'Auto-broadcast to Twitter & Telegram',
      'Transaction signature sharing'
    ]
  },
  {
    id: 'quick-launch',
    title: 'Quick Launch',
    description: 'Rapid token deployment with default settings',
    icon: <Zap className="h-6 w-6" />,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10 border-yellow-500/30',
    features: [
      'One-click token creation',
      'AI-generated token images',
      'Automatic social media posts',
      'Transaction broadcast everywhere'
    ]
  },
  {
    id: 'rugless-launchpad',
    title: 'Rugless Launchpad',
    description: 'Advanced token launch with full customization',
    icon: <ShieldCheck className="h-6 w-6" />,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10 border-green-500/30',
    features: [
      'Custom supply and liquidity',
      'SEAL token staking',
      '7-day liquidity lock',
      'Full transaction broadcasting'
    ]
  }
];

export function FeatureHighlightLoader({
  isLoading,
  duration = 5000,
  onAnimationComplete,
  onFeatureClick,
  onEnterApp,
  currentFeature: currentFeatureId = 'transaction-builder',
  context
}: FeatureHighlightLoaderProps) {
  const [showLoader, setShowLoader] = useState(false);
  const [progress, setProgress] = useState(0);
  const [userReady, setUserReady] = useState(false);

  const handleEnterApp = useCallback(() => {
    setUserReady(true);
    setTimeout(() => {
      setShowLoader(false);
      if (onAnimationComplete) {
        onAnimationComplete();
      }
      if (onEnterApp) {
        onEnterApp();
      }
    }, 500);
  }, [onAnimationComplete, onEnterApp]);

  useEffect(() => {
    if (isLoading) {
      setShowLoader(true);
      setProgress(0);
      setUserReady(false);

      // Prevent body scroll when loader is active
      document.body.style.overflow = 'hidden';

      // Animate progress bar
      const startTime = Date.now();
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const newProgress = Math.min((elapsed / duration) * 100, 100);
        setProgress(newProgress);

        if (elapsed >= duration) {
          clearInterval(interval);
          // Auto-advance after a short delay
          setTimeout(() => {
            handleEnterApp();
          }, 500);
        }
      }, 16);

      return () => {
        clearInterval(interval);
        document.body.style.overflow = '';
      };
    } else {
      setShowLoader(false);
      document.body.style.overflow = '';
    }
  }, [isLoading, duration, handleEnterApp]);

  // Handle Enter key press
  useEffect(() => {
    if (!showLoader) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && (progress >= 100 || userReady)) {
        handleEnterApp();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showLoader, progress, userReady, handleEnterApp]);

  const handleFeatureClick = (featureId: string) => {
    if (onFeatureClick) {
      onFeatureClick(featureId);
    }
    // Auto-enter for supported features
    if (['transaction-builder', 'quick-launch', 'rugless-launchpad', 'token-launcher'].includes(featureId)) {
      handleEnterApp();
    }
  };

  if (!showLoader) return null;

  // Find the current feature being loaded
  const currentFeature = FEATURES.find(f => f.id === currentFeatureId) || FEATURES[0];

  return (
    <div
      className="fixed inset-0 bg-gray-900/95 backdrop-blur-sm z-[9999] transition-opacity duration-300 overflow-y-auto"
      style={{
        opacity: showLoader ? 1 : 0,
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && (progress >= 100 || userReady)) {
          handleEnterApp();
        }
      }}
      tabIndex={-1}
    >
      <div className="min-h-screen flex flex-col items-center justify-start md:justify-center py-8 px-4 pb-32">
      {/* Skip Button - Subtle */}
      <button
        onClick={handleEnterApp}
        className="absolute top-6 right-6 z-20 px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-800/50 border border-gray-700/50 hover:border-gray-600/50 flex items-center gap-2"
        title="Skip loading (Enter)"
      >
        <X className="h-4 w-4" />
        <span>Skip</span>
      </button>

      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10 overflow-hidden">
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute top-40 right-32 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute bottom-32 left-40 w-72 h-72 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse" style={{animationDelay: '4s'}}></div>
      </div>

      {/* Sea Lion Animation */}
      <div className="mb-8 relative z-10">
        <SealAnimation size={200} />
      </div>

      {/* Main Title */}
      <div className="text-center mb-8 relative z-10">
        <h1 className="text-4xl font-bold text-white mb-4">
          Loading {context?.featureName || currentFeature.title}
        </h1>
        <p className="text-xl text-gray-300 mb-2">
          {context?.description || currentFeature.description}
        </p>
        <p className="text-gray-400">
          Preparing your Solana development environment...
        </p>
      </div>

      {/* Current Feature Showcase */}
      <div className="w-full max-w-4xl mb-8 relative z-10">
        <div className="bg-gray-800/60 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-8 shadow-2xl">
          {/* Feature Header */}
          <div className="flex items-center gap-4 mb-6">
            <div className={`p-4 rounded-xl ${currentFeature.bgColor} ${currentFeature.color}`}>
              {currentFeature.icon}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">
                {context?.featureName || currentFeature.title}
              </h2>
              <p className="text-gray-300">
                {context?.description || currentFeature.description}
              </p>
            </div>
          </div>

          {/* Feature Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Key Features</h3>
              <ul className="space-y-3">
                {currentFeature.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Loading Status</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-gray-300">Initializing components...</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
                  <span className="text-gray-300">Loading dependencies...</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
                  <span className="text-gray-300">Connecting to Solana...</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" style={{animationDelay: '1.5s'}}></div>
                  <span className="text-gray-300">Preparing interface...</span>
                </div>
              </div>
            </div>
          </div>

          {/* How to Use & Cost Information */}
          {(context?.directions || context?.cost) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {context.directions && context.directions.length > 0 && (
                <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/30">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-white font-medium mb-2">How to Use</h4>
                      <ul className="space-y-2">
                        {context.directions.map((direction, idx) => (
                          <li key={idx} className="text-gray-300 text-sm flex items-start gap-2">
                            <span className="text-blue-400 mt-1">•</span>
                            <span>{direction}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
              
              {context.cost && (
                <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/30">
                  <div className="flex items-start gap-3">
                    <DollarSign className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-white font-medium mb-2">Cost</h4>
                      <p className="text-gray-300 text-sm">{context.cost}</p>
                      {context.disclaimer && (
                        <p className="text-gray-500 text-xs mt-2 italic">{context.disclaimer}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Fun Fact or Tip */}
          <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/30">
            <div className="flex items-start gap-3">
              <div className="text-yellow-400 mt-0.5">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h4 className="text-white font-medium mb-1">About {context?.featureName || currentFeature.title}</h4>
                <p className="text-gray-300 text-sm">
                  {context?.description || (
                    <>
                      {currentFeature.id === 'transaction-builder' && "Sealevel Studio can handle complex multi-instruction transactions that would normally require custom scripts!"}
                      {currentFeature.id === 'ai-agents' && "Our AI agents can autonomously trade, analyze markets, and manage risk 24/7 without human intervention!"}
                      {currentFeature.id === 'decentralized-exchange' && "The platform integrates with Jupiter for optimal swap routing across multiple DEXs simultaneously!"}
                      {currentFeature.id === 'security-tools' && "Advanced smart contract verification can detect vulnerabilities before they cost you money!"}
                      {currentFeature.id === 'market-analytics' && "Real-time on-chain metrics provide insights that traditional exchanges can't offer!"}
                      {currentFeature.id === 'social-features' && "Automated social posting helps maintain consistent community engagement across platforms!"}
                      {currentFeature.id === 'token-launcher' && "Every token launch automatically broadcasts the transaction signature to Twitter and Telegram for maximum visibility!"}
                      {currentFeature.id === 'quick-launch' && "Launch tokens in under 60 seconds with automatic social media broadcasting of your transaction!"}
                      {currentFeature.id === 'rugless-launchpad' && "Advanced token launches with rugless protection and automatic transaction broadcasting to all platforms!"}
                    </>
                  )}
                </p>
                {context?.extraNote && (
                  <p className="text-gray-400 text-xs mt-2 italic">{context.extraNote}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-80 max-w-[90vw] h-2 bg-gray-800 rounded-full overflow-hidden shadow-lg mb-4 relative z-10">
        <div
          className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500 rounded-full transition-all duration-100 ease-out relative"
          style={{
            width: `${progress}%`,
          }}
        >
          {/* Shimmer effect */}
          <div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"
            style={{
              animation: 'shimmer 1.5s infinite',
            }}
          />
        </div>
      </div>

      {/* Progress Info */}
      <div className="text-center mb-6 relative z-10">
        <p className="text-gray-400 text-sm">
          Initializing {context?.featureName || currentFeature.title}... {Math.round(progress)}%
        </p>
      </div>

      {/* Enter App Button */}
      <div className="relative z-10">
        <button
          onClick={handleEnterApp}
          disabled={progress < 100 && !userReady}
          className={`px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 ${
            progress >= 100 || userReady
              ? `${currentFeature.bgColor} hover:opacity-90 text-white shadow-lg hover:shadow-xl transform hover:scale-105 border border-opacity-50`
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
        >
          {progress >= 100 || userReady ? (
            <span className="flex items-center gap-3">
              {currentFeature.icon}
              Launch {context?.featureName || currentFeature.title}
              <ArrowRight className="h-5 w-5" />
            </span>
          ) : (
            <span className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-gray-500 border-t-current rounded-full animate-spin"></div>
              Loading {context?.featureName || currentFeature.title}...
            </span>
          )}
        </button>

        <p className="text-gray-500 text-xs text-center mt-3 max-w-md">
          {progress >= 100 || userReady
            ? `Ready to explore ${context?.featureName || currentFeature.title}! Press Enter to continue`
            : "Setting up your personalized Solana development environment..."
          }
        </p>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center relative z-10">
        <p className="text-gray-600 text-xs">
          Built for the Solana ecosystem • Open source • Community driven •{' '}
          <a 
            href="https://discord.gg/8a7FrYCEEc" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Join Discord @sealevelstudios
          </a>
        </p>
      </div>
      </div>
    </div>
  );
}