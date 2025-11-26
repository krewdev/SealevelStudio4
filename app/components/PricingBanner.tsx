'use client';

import React, { useState, useEffect } from 'react';
import { X, Zap, Crown, Gift } from 'lucide-react';

interface PricingBannerProps {
  onNavigateToPricing: () => void;
}

export function PricingBanner({ onNavigateToPricing }: PricingBannerProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if banner was dismissed
    const dismissed = localStorage.getItem('sealevel-pricing-banner-dismissed');
    // Also check if we've shown it recently (optional, but simple check for now)
    if (!dismissed) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('sealevel-pricing-banner-dismissed', 'true');
  };

  if (!isVisible) return null;

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-indigo-900/90 via-purple-900/90 to-indigo-900/90 border-b border-purple-500/30 shadow-lg">
      {/* Background Accents */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl"></div>
        <div className="absolute top-0 right-0 w-60 h-60 bg-blue-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8 relative z-10">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0 bg-gradient-to-br from-yellow-400 to-orange-500 p-1.5 rounded-lg shadow-inner">
              <Crown className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
              <span className="font-medium text-white truncate">
                Unlock Sealevel Studio Pro
              </span>
              <span className="hidden sm:inline-block h-4 w-px bg-gray-600"></span>
              <span className="text-sm text-purple-200 flex items-center gap-1">
                <Zap className="h-3 w-3" />
                Unlimited Scans & AI Agents
              </span>
              <span className="hidden sm:inline-block h-4 w-px bg-gray-600"></span>
              <span className="text-sm text-green-300 flex items-center gap-1">
                <Gift className="h-3 w-3" />
                7-Day Free Trial Available
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onNavigateToPricing}
              className="whitespace-nowrap rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-purple-900 shadow-sm hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white transition-colors"
            >
              View Pricing
            </button>
            <button
              onClick={handleDismiss}
              className="p-1 rounded-full text-purple-200 hover:text-white hover:bg-purple-800/50 transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

