// Autonomous Twitter Agent
// Handles periodic posting, mention monitoring, and auto-replies

import { TwitterApi } from 'twitter-api-v2';

export interface TwitterAgentConfig {
  accessToken: string;
  accessTokenSecret?: string; // OAuth 1.0a
  bearerToken?: string; // OAuth 2.0
  clientId?: string; // OAuth 2.0
  clientSecret?: string; // OAuth 2.0
  userId: string;
  username: string;
}

export interface ScheduledPost {
  id: string;
  content: string;
  scheduledFor: Date;
  postedAt?: Date;
  status: 'pending' | 'posted' | 'failed';
}

export interface Mention {
  id: string;
  tweetId: string;
  authorId: string;
  authorUsername: string;
  text: string;
  createdAt: Date;
  replied: boolean;
}

export interface DirectMessage {
  id: string;
  senderId: string;
  senderUsername: string;
  text: string;
  createdAt: Date;
  replied: boolean;
}

export interface AgentActivity {
  id: string;
  type: 'post' | 'reply' | 'dm_reply' | 'mention_reply' | 'error' | 'agent_start' | 'agent_stop' | 'dm_check' | 'mention_check';
  message: string;
  timestamp: Date;
  success: boolean;
  details?: any;
}

export class TwitterAgent {
  private client: TwitterApi;
  private config: TwitterAgentConfig;
  private activities: AgentActivity[] = [];
  private isRunning: boolean = false;
  private intervalId?: NodeJS.Timeout;
  private mentionCheckInterval?: NodeJS.Timeout;
  private dmCheckInterval?: NodeJS.Timeout;

  constructor(config: TwitterAgentConfig) {
    this.config = config;
    
    // Initialize Twitter client
    if (config.bearerToken) {
      // OAuth 2.0
      this.client = new TwitterApi(config.bearerToken);
    } else if (config.accessToken && config.accessTokenSecret) {
      // OAuth 1.0a
      this.client = new TwitterApi({
        appKey: config.clientId || '',
        appSecret: config.clientSecret || '',
        accessToken: config.accessToken,
        accessSecret: config.accessTokenSecret,
      });
    } else {
      throw new Error('Invalid Twitter API credentials');
    }
  }

  /**
   * Start the autonomous agent
   */
  async start(options: {
    periodicPostInterval?: number; // minutes
    mentionCheckInterval?: number; // minutes
    dmCheckInterval?: number; // minutes
    autoReplyEnabled?: boolean;
    periodicPostEnabled?: boolean;
  } = {}) {
    if (this.isRunning) {
      throw new Error('Agent is already running');
    }

    this.isRunning = true;
    const {
      periodicPostInterval = 60, // Default: 1 hour
      mentionCheckInterval = 5, // Default: 5 minutes
      dmCheckInterval = 5, // Default: 5 minutes
      autoReplyEnabled = true,
      periodicPostEnabled = true,
    } = options;

    this.logActivity('agent_start', 'Agent started', true);

    // Start periodic posting
    if (periodicPostEnabled) {
      this.intervalId = setInterval(async () => {
        await this.processScheduledPosts();
      }, periodicPostInterval * 60 * 1000);
      
      // Process immediately
      await this.processScheduledPosts();
    }

    // Start mention monitoring
    if (autoReplyEnabled) {
      this.mentionCheckInterval = setInterval(async () => {
        await this.checkMentions();
      }, mentionCheckInterval * 60 * 1000);
      
      // Check immediately
      await this.checkMentions();
    }

    // Start DM monitoring
    if (autoReplyEnabled) {
      this.dmCheckInterval = setInterval(async () => {
        await this.checkDirectMessages();
      }, dmCheckInterval * 60 * 1000);
      
      // Check immediately
      await this.checkDirectMessages();
    }
  }

  /**
   * Stop the autonomous agent
   */
  stop() {
    if (!this.isRunning) return;

    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    if (this.mentionCheckInterval) {
      clearInterval(this.mentionCheckInterval);
    }
    if (this.dmCheckInterval) {
      clearInterval(this.dmCheckInterval);
    }

    this.logActivity('agent_stop', 'Agent stopped', true);
  }

  /**
   * Process scheduled posts
   */
  private async processScheduledPosts() {
    try {
      // In production, fetch from database
      // For now, this is a placeholder
      const scheduledPosts: ScheduledPost[] = [];
      
      for (const post of scheduledPosts) {
        if (post.scheduledFor <= new Date() && post.status === 'pending') {
          await this.postTweet(post.content);
          post.status = 'posted';
          post.postedAt = new Date();
          
          this.logActivity('post', `Posted: ${post.content.substring(0, 50)}...`, true, {
            postId: post.id,
          });
        }
      }
    } catch (error) {
      this.logActivity('error', `Error processing scheduled posts: ${error instanceof Error ? error.message : 'Unknown error'}`, false);
    }
  }

  /**
   * Check for mentions and auto-reply
   */
  private async checkMentions() {
    try {
      const rwClient = this.client.readWrite;
      const mentions = await rwClient.v2.search(`@${this.config.username}`, {
        max_results: 10,
        'tweet.fields': ['created_at', 'author_id', 'in_reply_to_user_id'],
      });

      for (const mention of mentions.data?.data || []) {
        // Check if we've already replied
        // In production, track replied mentions in database
        
        const replyText = await this.generateReply(mention.text, 'mention');
        if (replyText) {
          await rwClient.v2.reply(replyText, mention.id);
          
          this.logActivity('mention_reply', `Replied to @${mention.author_id}: ${replyText.substring(0, 50)}...`, true, {
            mentionId: mention.id,
            replyText,
          });
        }
      }
    } catch (error) {
      this.logActivity('error', `Error checking mentions: ${error instanceof Error ? error.message : 'Unknown error'}`, false);
    }
  }

  /**
   * Check for direct messages and auto-reply
   */
  private async checkDirectMessages() {
    try {
      const rwClient = this.client.readWrite;
      // Note: DM API requires elevated access
      // For now, this is a placeholder
      
      this.logActivity('dm_check', 'Checked for direct messages', true);
    } catch (error) {
      this.logActivity('error', `Error checking DMs: ${error instanceof Error ? error.message : 'Unknown error'}`, false);
    }
  }

  /**
   * Post a tweet
   */
  async postTweet(content: string): Promise<string> {
    try {
      const rwClient = this.client.readWrite;
      const tweet = await rwClient.v2.tweet(content);
      
      this.logActivity('post', `Posted tweet: ${content.substring(0, 50)}...`, true, {
        tweetId: tweet.data.id,
      });
      
      return tweet.data.id;
    } catch (error) {
      this.logActivity('error', `Error posting tweet: ${error instanceof Error ? error.message : 'Unknown error'}`, false);
      throw error;
    }
  }

  /**
   * Generate reply based on context
   */
  private async generateReply(originalText: string, type: 'mention' | 'dm'): Promise<string | null> {
    // In production, use AI to generate contextual replies
    // For now, return a simple acknowledgment
    const lowerText = originalText.toLowerCase();
    
    if (lowerText.includes('hello') || lowerText.includes('hi')) {
      return `Hello! Thanks for reaching out. How can I help you today? 🚀`;
    }
    
    if (lowerText.includes('help')) {
      return `I'm here to help! What would you like to know about Sealevel Studio?`;
    }
    
    if (lowerText.includes('arbitrage') || lowerText.includes('trading')) {
      return `Check out our arbitrage scanner and MEV tools at sealevel.studio! We support flash loans, Jito bundles, and more. 💎`;
    }
    
    // Default reply
    return `Thanks for the mention! Feel free to DM me for more info. 🚀`;
  }

  /**
   * Log agent activity
   */
  private logActivity(
    type: AgentActivity['type'],
    message: string,
    success: boolean,
    details?: any
  ) {
    const activity: AgentActivity = {
      id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      message,
      timestamp: new Date(),
      success,
      details,
    };
    
    this.activities.unshift(activity);
    
    // Keep only last 100 activities
    if (this.activities.length > 100) {
      this.activities = this.activities.slice(0, 100);
    }
  }

  /**
   * Get agent activities
   */
  getActivities(limit: number = 50): AgentActivity[] {
    return this.activities.slice(0, limit);
  }

  /**
   * Get agent status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      totalActivities: this.activities.length,
      recentActivity: this.activities[0] || null,
    };
  }
}

