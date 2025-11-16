/**
 * Telegram Advertising Bot
 * Posts token information to Telegram channels
 */

import { AdvertisingConfig, AdvertisingMessage, AdvertisingStats } from './types';

// Note: In production, use node-telegram-bot-api package
// For now, using fetch API directly

export class TelegramAdvertisingBot {
  private config: AdvertisingConfig['telegram'];
  private stats: AdvertisingStats;
  private postingInterval?: NodeJS.Timeout;
  private isRunning: boolean = false;

  constructor(config: AdvertisingConfig['telegram']) {
    if (!config?.botToken) {
      throw new Error('Telegram bot token required');
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
    
    // Post initial message
    await this.postMessage();
    
    // Schedule regular posts
    const interval = (this.config.interval || 60) * 60 * 1000; // Convert to ms
    this.postingInterval = setInterval(() => {
      this.postMessage();
    }, interval);
    
    console.log('Telegram advertising bot started');
  }

  /**
   * Stop the bot
   */
  async stop() {
    this.isRunning = false;
    
    if (this.postingInterval) {
      clearInterval(this.postingInterval);
    }
    
    console.log('Telegram advertising bot stopped');
  }

  /**
   * Get statistics
   */
  getStats(): AdvertisingStats {
    return { ...this.stats };
  }

  /**
   * Post message to Telegram
   */
  private async postMessage() {
    if (!this.config?.channelId || !this.config?.botToken) {
      return;
    }

    // Check rate limits
    if (this.config.maxPostsPerDay && this.stats.telegramPosts >= this.config.maxPostsPerDay) {
      console.warn('Daily post limit reached');
      return;
    }

    const message = this.generateMessage();
    
    try {
      // Use Telegram Bot API
      const response = await fetch(
        `https://api.telegram.org/bot${this.config.botToken}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: this.config.channelId,
            text: message,
            parse_mode: 'Markdown',
            disable_web_page_preview: false,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.description || 'Failed to post message');
      }

      this.stats.totalPosts++;
      this.stats.telegramPosts++;
      this.stats.lastPost = new Date();
      
      console.log('Telegram message posted successfully');
    } catch (error) {
      this.stats.errors++;
      console.error('Failed to post Telegram message:', error);
    }
  }

  /**
   * Generate message content
   */
  private generateMessage(): string {
    const template = this.config?.messageTemplate || 
      `🚀 *New Token Launch!*\n\n` +
      `*Token:* ${this.config?.tokenName || 'Unknown'}\n` +
      `*Symbol:* ${this.config?.tokenSymbol || 'UNKNOWN'}\n` +
      `*Address:* \`${this.config?.tokenAddress || 'N/A'}\`\n\n` +
      `Get in early! 🎯\n\n` +
      `#Solana #DeFi #Crypto`;
    
    return template;
  }
}

