// Free Trial Banner Component
// Displays free trial status and remaining usage

'use client';

import React from 'react';
import { Gift, Clock, Zap, AlertCircle } from 'lucide-react';
import { useUsageTracking } from '../hooks/useUsageTracking';
import { formatSealAmount } from '../lib/seal-token/config';

export function FreeTrialBanner() {
  const { getTrialStatus, isTrialActive } = useUsageTracking();
  const trialStatus = getTrialStatus();
  const isActive = isTrialActive();

  if (!trialStatus) {
    return null;
  }

  if (!isActive) {
    return (
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 rounded-lg mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Gift size={20} />
          <div>
            <p className="font-semibold">Free Trial Expired</p>
            <p className="text-sm opacity-90">
              Your 7-day free trial has ended. Upgrade to continue using premium features.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Calculate accurate total usage and max possible usage
  const FREE_TRIAL_FEATURES = {
    scanner_scan: 50,
    scanner_auto_refresh: 10,
    simulation: 30,
    ai_query: 100,
    code_export: 20,
    advanced_transaction: 50,
  };
  
  const maxPossibleUsage = Object.values(FREE_TRIAL_FEATURES).reduce((sum, limit) => sum + limit, 0);
  const usagePercent = (trialStatus.totalUsage / maxPossibleUsage) * 100;

  return (
    <div className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white p-4 rounded-lg mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <Gift size={20} />
          <div>
            <p className="font-semibold">Free Trial Active</p>
            <p className="text-sm opacity-90">
              {trialStatus.remainingDays} day{trialStatus.remainingDays !== 1 ? 's' : ''} remaining
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Clock size={16} />
          <span>Ends: {trialStatus.endDate.toLocaleDateString()}</span>
        </div>
      </div>

      {/* Usage Progress */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-sm mb-1">
          <span>Trial Usage</span>
          <span>{trialStatus.totalUsage} / {maxPossibleUsage} features</span>
        </div>
        <div className="w-full bg-white/20 rounded-full h-2">
          <div
            className="bg-white rounded-full h-2 transition-all"
            style={{ width: `${Math.min(usagePercent, 100)}%` }}
          />
        </div>
      </div>

      {/* Feature Usage Breakdown */}
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <div className="bg-white/10 p-2 rounded">
          <div className="flex items-center gap-1 mb-1">
            <Zap size={12} />
            <span className="font-semibold">Scans</span>
          </div>
          <span>{trialStatus.featuresUsed.scanner_scan} / 50</span>
        </div>
        <div className="bg-white/10 p-2 rounded">
          <div className="flex items-center gap-1 mb-1">
            <Zap size={12} />
            <span className="font-semibold">Simulations</span>
          </div>
          <span>{trialStatus.featuresUsed.simulation} / 30</span>
        </div>
        <div className="bg-white/10 p-2 rounded">
          <div className="flex items-center gap-1 mb-1">
            <Zap size={12} />
            <span className="font-semibold">AI Queries</span>
          </div>
          <span>{trialStatus.featuresUsed.ai_query} / 100</span>
        </div>
      </div>

      {/* Payment Collection Notice */}
      <div className="mt-3 pt-3 border-t border-white/20">
        <div className="flex items-center gap-2 text-xs opacity-90">
          <AlertCircle size={14} />
          <span>
            Payment collection is disabled during development. All features are free to use.
          </span>
        </div>
      </div>
    </div>
  );
}

