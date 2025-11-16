/**
 * Twitter/X Advertising Bot
 * Posts token information to Twitter/X
 */

import { AdvertisingConfig, AdvertisingMessage, AdvertisingStats } from './types';

// Note: In production, use twitter-api-v2 package
// For now, using simplified implementation

export class TwitterAdvertisingBot {
  private config: AdvertisingConfig['twitter'];
  private stats: AdvertisingStats;
  private postingInterval?: NodeJS.Timeout;
  private isRunning: boolean = false;

  constructor(config: AdvertisingConfig['twitter']) {
    if (!config?.apiKey || !config?.apiSecret) {
      throw new Error('Twitter API credentials required');
    }
    
    this.config = config;
    this.stats = {
      totalPosts: 0,
      telegramPosts: 0,
      twitterPosts: 0,
      errors: 0,
    };
  }

  /**
   * Start the bot
   */
  async start() {
    if (!this.config?.enabled || this.isRunning) {
      return;
    }

    this.isRunning = true;
    
    // Post initial tweet
    await this.postTweet();
    
    // Schedule regular posts
    const interval = (this.config.interval || 60) * 60 * 1000;
    this.postingInterval = setInterval(() => {
      this.postTweet();
    }, interval);
    
    console.log('Twitter advertising bot started');
  }

  /**
   * Stop the bot
   */
  async stop() {
    this.isRunning = false;
    
    if (this.postingInterval) {
      clearInterval(this.postingInterval);
    }
    
    console.log('Twitter advertising bot stopped');
  }

  /**
   * Get statistics
   */
  getStats(): AdvertisingStats {
    return { ...this.stats };
  }

  /**
   * Post tweet
   */
  private async postTweet() {
    if (!this.config) {
      return;
    }

    // Check rate limits
    if (this.config.maxTweetsPerDay && this.stats.twitterPosts >= this.config.maxTweetsPerDay) {
      console.warn('Daily tweet limit reached');
      return;
    }

    const message = this.generateMessage();
    
    try {
      // Use Twitter API v2
      // Note: This is a simplified implementation
      // In production, use twitter-api-v2 package with proper OAuth 1.0a
      
      const response = await fetch('https://api.twitter.com/2/tweets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`, // Simplified
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: message,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to post tweet');
      }

      this.stats.totalPosts++;
      this.stats.twitterPosts++;
      this.stats.lastPost = new Date();
      
      console.log('Tweet posted successfully');
    } catch (error) {
      this.stats.errors++;
      console.error('Failed to post tweet:', error);
    }
  }

  /**
   * Generate tweet content
   */
  private generateMessage(): string {
    const hashtags = this.config?.hashtags || ['Solana', 'DeFi', 'Crypto'];
    const hashtagString = hashtags.map(h => `#${h}`).join(' ');
    
    const template = this.config?.messageTemplate || 
      `🚀 New Token Launch!\n\n` +
      `Token: ${this.config?.tokenName || 'Unknown'}\n` +
      `Symbol: ${this.config?.tokenSymbol || 'UNKNOWN'}\n` +
      `Address: ${this.config?.tokenAddress || 'N/A'}\n\n` +
      `Get in early! 🎯\n\n` +
      hashtagString;
    
    // Twitter character limit
    const maxLength = 280;
    if (template.length > maxLength) {
      return template.slice(0, maxLength - 3) + '...';
    }
    
    return template;
  }
}

