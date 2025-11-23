// Autonomous Substack Agent
// Handles periodic posting, comment monitoring, and auto-replies

export interface SubstackAgentConfig {
  apiKey: string;
  publicationId: string;
  email: string;
}

export interface SubstackPost {
  id: string;
  title: string;
  subtitle?: string;
  body: string;
  scheduledFor?: Date;
  publishedAt?: Date;
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  url?: string;
}

export interface SubstackComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: Date;
  replied: boolean;
}

export interface AgentActivity {
  id: string;
  type: 'post' | 'comment_reply' | 'error' | 'agent_start' | 'agent_stop' | 'comment_check';
  message: string;
  timestamp: Date;
  success: boolean;
  details?: any;
}

export class SubstackAgent {
  private config: SubstackAgentConfig;
  private activities: AgentActivity[] = [];
  private isRunning: boolean = false;
  private intervalId?: NodeJS.Timeout;
  private commentCheckInterval?: NodeJS.Timeout;

  constructor(config: SubstackAgentConfig) {
    this.config = config;
  }

  /**
   * Start the autonomous agent
   */
  async start(options: {
    periodicPostInterval?: number; // hours
    commentCheckInterval?: number; // minutes
    autoReplyEnabled?: boolean;
    periodicPostEnabled?: boolean;
  } = {}) {
    if (this.isRunning) {
      throw new Error('Agent is already running');
    }

    this.isRunning = true;
    const {
      periodicPostInterval = 24, // Default: 24 hours (daily)
      commentCheckInterval = 15, // Default: 15 minutes
      autoReplyEnabled = true,
      periodicPostEnabled = true,
    } = options;

    this.logActivity('agent_start', 'Agent started', true);

    // Start periodic posting
    if (periodicPostEnabled) {
      this.intervalId = setInterval(async () => {
        await this.processScheduledPosts();
      }, periodicPostInterval * 60 * 60 * 1000);
      
      // Process immediately
      await this.processScheduledPosts();
    }

    // Start comment monitoring
    if (autoReplyEnabled) {
      this.commentCheckInterval = setInterval(async () => {
        await this.checkComments();
      }, commentCheckInterval * 60 * 1000);
      
      // Check immediately
      await this.checkComments();
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
    if (this.commentCheckInterval) {
      clearInterval(this.commentCheckInterval);
    }

    this.logActivity('agent_stop', 'Agent stopped', true);
  }

  /**
   * Process scheduled posts
   */
  private async processScheduledPosts() {
    try {
      // In production, fetch from database
      const scheduledPosts: SubstackPost[] = [];
      
      for (const post of scheduledPosts) {
        if (post.scheduledFor && post.scheduledFor <= new Date() && post.status === 'scheduled') {
          await this.publishPost(post);
          post.status = 'published';
          post.publishedAt = new Date();
          
          this.logActivity('post', `Published: ${post.title}`, true, {
            postId: post.id,
          });
        }
      }
    } catch (error) {
      this.logActivity('error', `Error processing scheduled posts: ${error instanceof Error ? error.message : 'Unknown error'}`, false);
    }
  }

  /**
   * Check for comments and auto-reply
   */
  private async checkComments() {
    try {
      // Substack API to get comments
      // In production, use Substack API
      this.logActivity('comment_check', 'Checked for comments', true);
    } catch (error) {
      this.logActivity('error', `Error checking comments: ${error instanceof Error ? error.message : 'Unknown error'}`, false);
    }
  }

  /**
   * Publish a post to Substack
   */
  async publishPost(post: SubstackPost): Promise<string> {
    try {
      // Substack API call
      // POST https://substack.com/api/v1/publications/{publicationId}/posts
      // Headers: Authorization: Bearer {apiKey}
      
      this.logActivity('post', `Published post: ${post.title}`, true, {
        postId: post.id,
      });
      
      return post.id;
    } catch (error) {
      this.logActivity('error', `Error publishing post: ${error instanceof Error ? error.message : 'Unknown error'}`, false);
      throw error;
    }
  }

  /**
   * Generate reply based on context
   */
  private async generateReply(originalText: string): Promise<string | null> {
    // In production, use AI to generate contextual replies
    const lowerText = originalText.toLowerCase();
    
    if (lowerText.includes('question') || lowerText.includes('?')) {
      return `Thanks for your question! I'll get back to you with a detailed answer soon.`;
    }
    
    if (lowerText.includes('thanks') || lowerText.includes('thank you')) {
      return `You're welcome! Glad I could help.`;
    }
    
    // Default reply
    return `Thanks for your comment! I appreciate your engagement.`;
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

