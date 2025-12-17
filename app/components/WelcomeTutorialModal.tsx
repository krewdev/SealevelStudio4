'use client';

import React, { useState } from 'react';
import { BookOpen, Wallet, Zap, Coins, Shield, ArrowRight, X, CheckCircle } from 'lucide-react';

interface WelcomeTutorialModalProps {
  onComplete: () => void;
  onSkip?: () => void;
}

const TUTORIAL_STEPS = [
  {
    id: 'wallets',
    title: 'Crypto Wallets',
    icon: Wallet,
    color: 'purple',
    content: (
      <div className="space-y-4">
        <p className="text-gray-300 leading-relaxed">
          Your wallet is your gateway to the Solana blockchain. It stores your SOL tokens and allows you to interact with decentralized applications (dApps).
        </p>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-purple-500/20">
          <p className="text-sm text-gray-400 mb-2"><strong className="text-purple-400">Pro Tip:</strong> Your wallet address is public - you can share it to receive payments. But keep your private key and passphrase secret!</p>
        </div>
      </div>
    ),
  },
  {
    id: 'transactions',
    title: 'Transactions',
    icon: Zap,
    color: 'blue',
    content: (
      <div className="space-y-4">
        <p className="text-gray-300 leading-relaxed">
          Transactions are how you interact with the blockchain. Every action - sending SOL, swapping tokens, or interacting with dApps - is a transaction.
        </p>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-blue-500/20">
          <p className="text-sm text-gray-400 mb-2"><strong className="text-blue-400">Did You Know?</strong> Solana transactions are incredibly fast - typically finalizing in under 1 second!</p>
        </div>
      </div>
    ),
  },
  {
    id: 'gas',
    title: 'Transaction Fees',
    icon: Coins,
    color: 'yellow',
    content: (
      <div className="space-y-4">
        <p className="text-gray-300 leading-relaxed">
          Every transaction on Solana requires a small fee (usually 0.000005 SOL, about $0.0001). This fee goes to validators who secure the network.
        </p>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-yellow-500/20">
          <p className="text-sm text-gray-400 mb-2"><strong className="text-yellow-400">Why So Cheap?</strong> Solana's architecture allows for very low fees compared to other blockchains like Ethereum.</p>
        </div>
      </div>
    ),
  },
  {
    id: 'security',
    title: 'Staying Safe',
    icon: Shield,
    color: 'green',
    content: (
      <div className="space-y-4">
        <p className="text-gray-300 leading-relaxed">
          Security is paramount in crypto. Always verify transaction details before signing, and never share your private keys or passphrase.
        </p>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-green-500/20">
          <p className="text-sm text-gray-400 mb-2"><strong className="text-green-400">Remember:</strong> If something seems too good to be true, it probably is. Be cautious of scams and phishing attempts.</p>
        </div>
      </div>
    ),
  },
];

export function WelcomeTutorialModal({ onComplete, onSkip }: WelcomeTutorialModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const step = TUTORIAL_STEPS[currentStep];
  const StepIcon = step.icon;
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;

  const handleNext = () => {
    setCompletedSteps(prev => {
      const next = new Set<number>();
      prev.forEach((value) => next.add(value));
      next.add(currentStep);
      return next;
    });
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    } else {
      onComplete();
    }
  };

  const colorClasses = {
    purple: {
      bg: 'bg-purple-500/20 border-purple-500/30',
      icon: 'text-purple-400',
      button: 'from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700',
      accent: 'text-purple-400',
    },
    blue: {
      bg: 'bg-blue-500/20 border-blue-500/30',
      icon: 'text-blue-400',
      button: 'from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700',
      accent: 'text-blue-400',
    },
    yellow: {
      bg: 'bg-yellow-500/20 border-yellow-500/30',
      icon: 'text-yellow-400',
      button: 'from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700',
      accent: 'text-yellow-400',
    },
    green: {
      bg: 'bg-green-500/20 border-green-500/30',
      icon: 'text-green-400',
      button: 'from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700',
      accent: 'text-green-400',
    },
  };

  const colors = colorClasses[step.color as keyof typeof colorClasses];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="max-w-2xl w-full my-auto">
        <div className="relative bg-gradient-to-br from-gray-800/95 to-gray-900/95 backdrop-blur-md border-2 border-purple-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl">
          {/* Close/Skip button */}
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="text-center mb-8">
            <div className={`inline-flex items-center justify-center w-20 h-20 ${colors.bg} rounded-full mb-6 border`}>
              <StepIcon className={`w-10 h-10 ${colors.icon}`} />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-3 bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent">
              Welcome to Sealevel Studio!
            </h1>
            <p className="text-gray-400 text-lg">
              Let's learn the basics ({currentStep + 1} of {TUTORIAL_STEPS.length})
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between mb-2">
              {TUTORIAL_STEPS.map((s, idx) => (
                <div
                  key={s.id}
                  className={`flex-1 h-2 mx-1 rounded-full transition-all ${
                    idx <= currentStep
                      ? colors.bg.replace('/20', '/50')
                      : 'bg-gray-700'
                  }`}
                />
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              {TUTORIAL_STEPS.map((s, idx) => (
                <span
                  key={s.id}
                  className={idx === currentStep ? colors.accent : ''}
                >
                  {s.title}
                </span>
              ))}
            </div>
          </div>

          {/* Step Content */}
          <div className="mb-8">
            <h2 className={`text-2xl font-semibold mb-4 ${colors.accent}`}>
              {step.title}
            </h2>
            {step.content}
          </div>

          {/* Navigation */}
          <div className="flex gap-4">
            {currentStep > 0 && (
              <button
                onClick={handlePrevious}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-colors"
              >
                Previous
              </button>
            )}
            <div className="flex-1" />
            {onSkip && (
              <button
                onClick={handleSkip}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-colors"
              >
                Skip Tutorial
              </button>
            )}
            <button
              onClick={handleNext}
              className={`px-6 py-3 bg-gradient-to-r ${colors.button} text-white rounded-lg font-semibold transition-all flex items-center gap-2 shadow-lg hover:shadow-xl`}
            >
              {isLastStep ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Get Started
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

