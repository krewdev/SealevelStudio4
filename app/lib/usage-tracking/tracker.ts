// Usage Tracker
// Tracks feature usage and calculates costs

import { FeatureType, UsageRecord, UsageStats, FreeTrialStatus } from './types';
import { SEAL_TOKEN_ECONOMICS } from '../seal-token/config';

// In-memory storage (in production, use database)
// Exported for admin analytics access
export const usageRecords: Map<string, UsageRecord[]> = new Map();
export const freeTrials: Map<string, FreeTrialStatus> = new Map();

// Free trial configuration
const FREE_TRIAL_DAYS = 7; // 7-day free trial
const FREE_TRIAL_FEATURES: Record<FeatureType, number> = {
  scanner_scan: 50, // 50 free scans
  scanner_auto_refresh: 10, // 10 hours of auto-refresh
  simulation: 30, // 30 free simulations
  ai_query: 100, // 100 free AI queries
  code_export: 20, // 20 free exports
  advanced_transaction: 50, // 50 free advanced transactions
  // Premium services are NOT included in free trial (0 = not available)
  bundler_multi_send: 0,
  bundler_recipient: 0,
  market_maker_setup: 0,
  market_maker_monthly: 0,
  market_maker_trade: 0,
  telegram_bot_setup: 0,
  telegram_bot_monthly: 0,
  telegram_bot_post: 0,
  twitter_bot_setup: 0,
  twitter_bot_monthly: 0,
  twitter_bot_tweet: 0,
};

/**
 * Get or create free trial for a user
 */
export function getOrCreateFreeTrial(userId: string): FreeTrialStatus {
  // Check if user already has a free trial
  const existing = freeTrials.get(userId);
  if (existing && existing.isActive) {
    const now = new Date();
    const remainingDays = Math.max(0, Math.ceil((existing.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    
    // Update remaining days
    // Ensure all premium service fields exist (for backward compatibility)
    const updatedFeaturesUsed = {
      ...existing.featuresUsed,
      bundler_multi_send: existing.featuresUsed.bundler_multi_send || 0,
      bundler_recipient: existing.featuresUsed.bundler_recipient || 0,
      market_maker_setup: existing.featuresUsed.market_maker_setup || 0,
      market_maker_monthly: existing.featuresUsed.market_maker_monthly || 0,
      market_maker_trade: existing.featuresUsed.market_maker_trade || 0,
      telegram_bot_setup: existing.featuresUsed.telegram_bot_setup || 0,
      telegram_bot_monthly: existing.featuresUsed.telegram_bot_monthly || 0,
      telegram_bot_post: existing.featuresUsed.telegram_bot_post || 0,
      twitter_bot_setup: existing.featuresUsed.twitter_bot_setup || 0,
      twitter_bot_monthly: existing.featuresUsed.twitter_bot_monthly || 0,
      twitter_bot_tweet: existing.featuresUsed.twitter_bot_tweet || 0,
    };
    
    return {
      ...existing,
      remainingDays,
      isActive: remainingDays > 0,
      featuresUsed: updatedFeaturesUsed,
    };
  }
  
  // Create new free trial
  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + FREE_TRIAL_DAYS);
  
  const trial: FreeTrialStatus = {
    userId,
    isActive: true,
    startDate,
    endDate,
    remainingDays: FREE_TRIAL_DAYS,
    featuresUsed: {
      scanner_scan: 0,
      scanner_auto_refresh: 0,
      simulation: 0,
      ai_query: 0,
      code_export: 0,
      advanced_transaction: 0,
      // Premium services (not in free trial, but must be initialized)
      bundler_multi_send: 0,
      bundler_recipient: 0,
      market_maker_setup: 0,
      market_maker_monthly: 0,
      market_maker_trade: 0,
      telegram_bot_setup: 0,
      telegram_bot_monthly: 0,
      telegram_bot_post: 0,
      twitter_bot_setup: 0,
      twitter_bot_monthly: 0,
      twitter_bot_tweet: 0,
    },
    totalUsage: 0,
  };
  
  freeTrials.set(userId, trial);
  return trial;
}

/**
 * Check if user is in free trial period
 */
export function isInFreeTrial(userId: string): boolean {
  const trial = freeTrials.get(userId);
  if (!trial) return false;
  
  const now = new Date();
  const isActive = now < trial.endDate;
  
  if (!isActive && trial.isActive) {
    // Trial expired, update status
    trial.isActive = false;
    freeTrials.set(userId, trial);
  }
  
  return isActive;
}

/**
 * Check if user can use a feature (within free trial limits)
 */
export function canUseFeature(userId: string, feature: FeatureType): { allowed: boolean; reason?: string } {
  const trial = getOrCreateFreeTrial(userId);
  
  if (!trial.isActive) {
    // Trial expired, check subscription or payment
    // For now, during development, allow usage (payment collection disabled)
    return { allowed: true, reason: 'Payment collection disabled during development' };
  }
  
  // Check if feature usage is within free trial limits
  const used = trial.featuresUsed[feature];
  const limit = FREE_TRIAL_FEATURES[feature];
  
  // Premium services (limit = 0) are not included in free trial
  if (limit === 0) {
    return { 
      allowed: false, 
      reason: `${feature} is a premium service and not included in the free trial` 
    };
  }
  
  if (limit === -1) {
    return { allowed: true }; // Unlimited
  }
  
  if (used >= limit) {
    return { 
      allowed: false, 
      reason: `Free trial limit reached for ${feature}. Limit: ${limit}` 
    };
  }
  
  return { allowed: true };
}

/**
 * Track feature usage
 * IMPORTANT: This function checks limits BEFORE tracking to prevent exceeding limits
 */
export function trackUsage(
  userId: string,
  feature: FeatureType,
  metadata?: Record<string, any>
): UsageRecord {
  const trial = getOrCreateFreeTrial(userId);
  const isTrialActive = isInFreeTrial(userId);
  
  // Calculate cost (0 during free trial)
  const baseCost = SEAL_TOKEN_ECONOMICS.pricing[feature] || 0;
  const cost = isTrialActive ? 0 : baseCost;
  
  // Premium services are NOT included in free trial
  const premiumServices: FeatureType[] = [
    'bundler_multi_send',
    'bundler_recipient',
    'market_maker_setup',
    'market_maker_monthly',
    'market_maker_trade',
    'telegram_bot_setup',
    'telegram_bot_monthly',
    'telegram_bot_post',
    'twitter_bot_setup',
    'twitter_bot_monthly',
    'twitter_bot_tweet',
  ];
  
  const isPremiumService = premiumServices.includes(feature);
  
  // Premium services require payment (not in free trial)
  if (isPremiumService && isTrialActive) {
    throw new Error(
      `${feature} is a premium service and not included in the free trial. ` +
      `Payment required: ${baseCost} SEAL tokens.`
    );
  }
  
  // Check if usage is allowed BEFORE tracking (for non-premium features)
  if (!isPremiumService && isTrialActive) {
    const canUse = canUseFeature(userId, feature);
    if (!canUse.allowed) {
      throw new Error(canUse.reason || 'Feature usage not allowed');
    }
    
    // Double-check: Verify we haven't exceeded the limit
    const used = trial.featuresUsed[feature] || 0;
    const limit = FREE_TRIAL_FEATURES[feature];
    if (limit > 0 && used >= limit) {
      throw new Error(
        `Free trial limit reached for ${feature}. Used: ${used}/${limit}`
      );
    }
  }
  
  // Create usage record
  const record: UsageRecord = {
    id: `${userId}-${feature}-${Date.now()}`,
    userId,
    feature,
    timestamp: new Date(),
    metadata,
    cost,
    paid: false, // Payment collection disabled during development
  };
  
  // Store record
  if (!usageRecords.has(userId)) {
    usageRecords.set(userId, []);
  }
  usageRecords.get(userId)!.push(record);
  
  // Update free trial usage AFTER successful tracking
  if (isTrialActive) {
    // Ensure feature counter exists
    if (trial.featuresUsed[feature] === undefined) {
      trial.featuresUsed[feature] = 0;
    }
    trial.featuresUsed[feature]++;
    trial.totalUsage++;
    freeTrials.set(userId, trial);
  }
  
  return record;
}

/**
 * Get usage statistics for a user
 */
export function getUsageStats(
  userId: string,
  period: 'daily' | 'weekly' | 'monthly' | 'all_time' = 'all_time'
): UsageStats {
  const records = usageRecords.get(userId) || [];
  
  const now = new Date();
  let startDate: Date;
  let endDate = now;
  
  switch (period) {
    case 'daily':
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'weekly':
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 7);
      break;
    case 'monthly':
      startDate = new Date(now);
      startDate.setMonth(startDate.getMonth() - 1);
      break;
    case 'all_time':
      startDate = records.length > 0 
        ? records[0].timestamp 
        : new Date();
      break;
  }
  
  // Filter records by period
  const periodRecords = records.filter(r => 
    r.timestamp >= startDate && r.timestamp <= endDate
  );
  
  // Count features
  const features: UsageStats['features'] = {
    scanner_scan: 0,
    scanner_auto_refresh: 0,
    simulation: 0,
    ai_query: 0,
    code_export: 0,
    advanced_transaction: 0,
    // Premium services
    bundler_multi_send: 0,
    bundler_recipient: 0,
    market_maker_setup: 0,
    market_maker_monthly: 0,
    market_maker_trade: 0,
    telegram_bot_setup: 0,
    telegram_bot_monthly: 0,
    telegram_bot_post: 0,
    twitter_bot_setup: 0,
    twitter_bot_monthly: 0,
    twitter_bot_tweet: 0,
  };
  
  let totalCost = 0;
  let totalPaid = 0;
  
  periodRecords.forEach(record => {
    features[record.feature]++;
    totalCost += record.cost;
    if (record.paid) {
      totalPaid += record.cost;
    }
  });
  
  return {
    userId,
    period,
    startDate,
    endDate,
    features,
    totalCost,
    totalPaid,
  };
}

/**
 * Get free trial status for a user
 */
export function getFreeTrialStatus(userId: string): FreeTrialStatus | null {
  return freeTrials.get(userId) || null;
}

/**
 * Get all usage records for a user
 */
export function getUserUsageRecords(userId: string): UsageRecord[] {
  return usageRecords.get(userId) || [];
}

/**
 * Clear usage records (for testing/development)
 */
export function clearUsageRecords(userId?: string): void {
  if (userId) {
    usageRecords.delete(userId);
    freeTrials.delete(userId);
  } else {
    usageRecords.clear();
    freeTrials.clear();
  }
}

