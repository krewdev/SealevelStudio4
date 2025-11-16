/**
 * Advertising Bots Types
 * Telegram and Twitter/X advertising bots
 */

export interface AdvertisingConfig {
  tokenAddress: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDescription?: string;
  
  // Telegram
  telegram?: {
    botToken: string;
    channelId: string;
    enabled: boolean;
    interval?: number; // Minutes between posts
    messageTemplate?: string;
    maxPostsPerDay?: number;
  };
  
  // Twitter/X
  twitter?: {
    apiKey: string;
    apiSecret: string;
    accessToken: string;
    accessTokenSecret: string;
    enabled: boolean;
    interval?: number; // Minutes between tweets
    messageTemplate?: string;
    maxTweetsPerDay?: number;
    hashtags?: string[]; // Custom hashtags
  };
  
  // General
  rateLimit?: number; // Posts per hour
  startDate?: Date;
  endDate?: Date;
}

export interface AdvertisingMessage {
  platform: 'telegram' | 'twitter';
  content: string;
  timestamp: Date;
  posted: boolean;
  signature?: string; // Transaction signature if on-chain
  error?: string;
}

export interface AdvertisingStats {
  totalPosts: number;
  telegramPosts: number;
  twitterPosts: number;
  errors: number;
  lastPost?: Date;
  nextPost?: Date;
}

