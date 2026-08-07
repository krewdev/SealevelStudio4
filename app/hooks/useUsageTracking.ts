// React Hook for Usage Tracking
// Provides easy access to usage tracking functionality

import { useCallback } from 'react';
import { useActiveWallet } from './useActiveWallet';
import {
  trackUsage,
  getUsageStats,
  getFreeTrialStatus,
  canUseFeature,
  isInFreeTrial,
  FeatureType,
  UsageRecord,
  UsageStats,
  FreeTrialStatus,
} from '../lib/usage-tracking';

export function useUsageTracking() {
  const { publicKey } = useActiveWallet();
  
  const userId = publicKey?.toString() || '';
  
  const trackFeatureUsage = useCallback(
    (feature: FeatureType, metadata?: Record<string, any>): UsageRecord | null => {
      if (!userId) return null;
      
      try {
        return trackUsage(userId, feature, metadata);
      } catch (error) {
        console.error('Failed to track usage:', error);
        return null;
      }
    },
    [userId]
  );
  
  const getStats = useCallback(
    (period: 'daily' | 'weekly' | 'monthly' | 'all_time' = 'all_time'): UsageStats | null => {
      if (!userId) return null;
      return getUsageStats(userId, period);
    },
    [userId]
  );
  
  const getTrialStatus = useCallback((): FreeTrialStatus | null => {
    if (!userId) return null;
    return getFreeTrialStatus(userId);
  }, [userId]);
  
  const checkFeatureAccess = useCallback(
    (feature: FeatureType): { allowed: boolean; reason?: string } => {
      if (!userId) {
        return { allowed: false, reason: 'Wallet not connected' };
      }
      return canUseFeature(userId, feature);
    },
    [userId]
  );
  
  const isTrialActive = useCallback((): boolean => {
    if (!userId) return false;
    return isInFreeTrial(userId);
  }, [userId]);
  
  return {
    trackFeatureUsage,
    getStats,
    getTrialStatus,
    checkFeatureAccess,
    isTrialActive,
    userId,
  };
}

