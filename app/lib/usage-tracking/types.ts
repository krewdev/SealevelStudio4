// Usage Tracking Types
// Types for tracking feature usage and calculating costs

export type FeatureType = 
  | 'scanner_scan'
  | 'scanner_auto_refresh'
  | 'simulation'
  | 'ai_query'
  | 'code_export'
  | 'advanced_transaction'
  // Premium services (not in freemium)
  | 'bundler_multi_send'
  | 'bundler_recipient'
  | 'market_maker_setup'
  | 'market_maker_monthly'
  | 'market_maker_trade'
  | 'telegram_bot_setup'
  | 'telegram_bot_monthly'
  | 'telegram_bot_post'
  | 'twitter_bot_setup'
  | 'twitter_bot_monthly'
  | 'twitter_bot_tweet';

export interface UsageRecord {
  id: string;
  userId: string; // Wallet address
  feature: FeatureType;
  timestamp: Date;
  metadata?: Record<string, any>; // Additional context (e.g., scan results, query length)
  cost: number; // Cost in SEAL tokens (0 during free trial)
  paid: boolean; // Whether payment was collected (false during free trial)
}

export interface UsageStats {
  userId: string;
  period: 'daily' | 'weekly' | 'monthly' | 'all_time';
  startDate: Date;
  endDate: Date;
  features: {
    scanner_scan: number;
    scanner_auto_refresh: number;
    simulation: number;
    ai_query: number;
    code_export: number;
    advanced_transaction: number;
    // Premium services
    bundler_multi_send: number;
    bundler_recipient: number;
    market_maker_setup: number;
    market_maker_monthly: number;
    market_maker_trade: number;
    telegram_bot_setup: number;
    telegram_bot_monthly: number;
    telegram_bot_post: number;
    twitter_bot_setup: number;
    twitter_bot_monthly: number;
    twitter_bot_tweet: number;
  };
  totalCost: number; // Total cost in SEAL (0 during free trial)
  totalPaid: number; // Total actually paid (0 during free trial)
}

export interface FreeTrialStatus {
  userId: string;
  isActive: boolean;
  startDate: Date;
  endDate: Date;
  remainingDays: number;
  featuresUsed: {
    scanner_scan: number;
    scanner_auto_refresh: number;
    simulation: number;
    ai_query: number;
    code_export: number;
    advanced_transaction: number;
    // Premium services (not in free trial)
    bundler_multi_send: number;
    bundler_recipient: number;
    market_maker_setup: number;
    market_maker_monthly: number;
    market_maker_trade: number;
    telegram_bot_setup: number;
    telegram_bot_monthly: number;
    telegram_bot_post: number;
    twitter_bot_setup: number;
    twitter_bot_monthly: number;
    twitter_bot_tweet: number;
  };
  totalUsage: number;
}

export interface SubscriptionTier {
  id: 'free' | 'basic' | 'pro';
  name: string;
  price: number; // Monthly price in SEAL
  features: {
    scanner_scan: number; // -1 for unlimited
    scanner_auto_refresh: number;
    simulation: number;
    ai_query: number;
    code_export: number;
    advanced_transaction: number;
  };
}

