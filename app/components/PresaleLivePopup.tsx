'use client';

import React, { useState, useEffect } from 'react';
import { X, Zap, Shield, TrendingUp, Users, DollarSign, ArrowRight } from 'lucide-react';

export function PresaleLivePopup() {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if user has dismissed the popup
    if (typeof window !== 'undefined') {
      const dismissed = localStorage.getItem('sealevel-presale-popup-dismissed');
      if (dismissed) {
        setIsDismissed(true);
        return;
      }
      
      // Show popup after a short delay for better UX
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sealevel-presale-popup-dismissed', 'true');
    }
    setIsDismissed(true);
  };

  const handleGoToPresale = () => {
    // Dispatch custom event that the main app can listen to
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('navigate-to-presale'));
    }
    handleDismiss();
  };

  if (isDismissed || !isVisible) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-full max-w-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-2 border-yellow-500/50 rounded-2xl shadow-2xl shadow-yellow-500/20 animate-in zoom-in-95 duration-300">
        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-2 hover:bg-gray-700/50 rounded-lg transition-colors z-10"
          aria-label="Close popup"
        >
          <X className="w-5 h-5 text-gray-400 hover:text-white" />
        </button>

        {/* Content */}
        <div className="p-8">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-yellow-500/20 blur-xl rounded-full"></div>
              <div className="relative bg-gradient-to-br from-yellow-400 to-yellow-600 p-4 rounded-full">
                <Zap className="w-8 h-8 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 bg-green-500/20 border border-green-500/50 rounded-full text-green-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  LIVE NOW
                </span>
              </div>
              <h2 className="text-3xl font-bold text-white mb-1">
                SEAL Token Presale is Live!
              </h2>
              <p className="text-gray-400">
                Join the presale and get exclusive bonuses
              </p>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Base Price</p>
                  <p className="text-lg font-bold text-white">50,000 SEAL/SOL</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-yellow-500/20 rounded-lg">
                  <Zap className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Max Bonus</p>
                  <p className="text-lg font-bold text-white">Up to 30%</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Users className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Total Raise</p>
                  <p className="text-lg font-bold text-white">10,000 SOL</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <Shield className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Security</p>
                  <p className="text-lg font-bold text-white">Audited</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bonus Tiers */}
          <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-4 mb-6">
            <p className="text-sm font-semibold text-gray-300 mb-3">Tiered Bonus Structure:</p>
            <div className="grid grid-cols-5 gap-2 text-center">
              <div className="p-2 bg-gray-700/30 rounded-lg">
                <p className="text-xs text-gray-400">1+ SOL</p>
                <p className="text-sm font-bold text-green-400">10%</p>
              </div>
              <div className="p-2 bg-gray-700/30 rounded-lg">
                <p className="text-xs text-gray-400">10+ SOL</p>
                <p className="text-sm font-bold text-green-400">15%</p>
              </div>
              <div className="p-2 bg-gray-700/30 rounded-lg">
                <p className="text-xs text-gray-400">50+ SOL</p>
                <p className="text-sm font-bold text-green-400">20%</p>
              </div>
              <div className="p-2 bg-gray-700/30 rounded-lg">
                <p className="text-xs text-gray-400">100+ SOL</p>
                <p className="text-sm font-bold text-green-400">25%</p>
              </div>
              <div className="p-2 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
                <p className="text-xs text-gray-300">500+ SOL</p>
                <p className="text-sm font-bold text-yellow-400">30%</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleGoToPresale}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg shadow-yellow-500/30 hover:shadow-yellow-500/50"
            >
              <Zap className="w-5 h-5" />
              Participate Now
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={handleDismiss}
              className="px-6 py-4 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-xl transition-colors"
            >
              Maybe Later
            </button>
          </div>

          {/* Disclaimer */}
          <p className="text-xs text-gray-500 mt-4 text-center">
            Participation is optional and subject to local regulations. Please review the audit report before contributing.
          </p>
        </div>
      </div>
    </div>
  );
}

