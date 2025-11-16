/**
 * AI Access Control and Payment System
 * Manages access to AI features with payment integration
 */

export interface AIAccessTier {
  id: string;
  name: string;
  price: number; // In SEAL tokens
  features: {
    securityScans: number; // Per month
    codeAnalysis: number; // Per month
    truthValidation: boolean;
    prioritySupport: boolean;
    apiAccess: boolean;
  };
}

export interface AIUsage {
  userId: string;
  tier: string;
  usage: {
    securityScans: number;
    codeAnalysis: number;
    truthValidations: number;
  };
  limits: {
    securityScans: number;
    codeAnalysis: number;
    truthValidations: number;
  };
  expiresAt: Date;
  paymentStatus: 'active' | 'expired' | 'pending';
}

export const AI_ACCESS_TIERS: AIAccessTier[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    features: {
      securityScans: 5,
      codeAnalysis: 3,
      truthValidation: false,
      prioritySupport: false,
      apiAccess: false,
    }
  },
  {
    id: 'basic',
    name: 'Basic',
    price: 100, // SEAL tokens
    features: {
      securityScans: 50,
      codeAnalysis: 30,
      truthValidation: true,
      prioritySupport: false,
      apiAccess: false,
    }
  },
  {
    id: 'pro',
    name: 'Professional',
    price: 500, // SEAL tokens
    features: {
      securityScans: 500,
      codeAnalysis: 300,
      truthValidation: true,
      prioritySupport: true,
      apiAccess: true,
    }
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 2000, // SEAL tokens
    features: {
      securityScans: -1, // Unlimited
      codeAnalysis: -1, // Unlimited
      truthValidation: true,
      prioritySupport: true,
      apiAccess: true,
    }
  }
];

export class AIAccessControl {
  private storageKey = 'ai_access_control';

  /**
   * Check if user has access to a feature
   */
  async checkAccess(userId: string, feature: 'securityScan' | 'codeAnalysis' | 'truthValidation'): Promise<{
    allowed: boolean;
    reason?: string;
    remaining?: number;
  }> {
    const usage = this.getUsage(userId);
    
    if (!usage || usage.paymentStatus !== 'active') {
      return {
        allowed: false,
        reason: 'No active subscription'
      };
    }

    const tier = AI_ACCESS_TIERS.find(t => t.id === usage.tier);
    if (!tier) {
      return {
        allowed: false,
        reason: 'Invalid tier'
      };
    }

    switch (feature) {
      case 'securityScan':
        if (tier.features.securityScans === -1) {
          return { allowed: true };
        }
        const remainingScans = tier.features.securityScans - usage.usage.securityScans;
        return {
          allowed: remainingScans > 0,
          remaining: remainingScans,
          reason: remainingScans <= 0 ? 'Monthly scan limit reached' : undefined
        };
      
      case 'codeAnalysis':
        if (tier.features.codeAnalysis === -1) {
          return { allowed: true };
        }
        const remainingAnalysis = tier.features.codeAnalysis - usage.usage.codeAnalysis;
        return {
          allowed: remainingAnalysis > 0,
          remaining: remainingAnalysis,
          reason: remainingAnalysis <= 0 ? 'Monthly analysis limit reached' : undefined
        };
      
      case 'truthValidation':
        return {
          allowed: tier.features.truthValidation,
          reason: !tier.features.truthValidation ? 'Truth validation not available in your tier' : undefined
        };
      
      default:
        return { allowed: false, reason: 'Unknown feature' };
    }
  }

  /**
   * Record usage of a feature
   */
  recordUsage(userId: string, feature: 'securityScan' | 'codeAnalysis' | 'truthValidation'): void {
    const usage = this.getUsage(userId);
    if (!usage) return;

    switch (feature) {
      case 'securityScan':
        usage.usage.securityScans++;
        break;
      case 'codeAnalysis':
        usage.usage.codeAnalysis++;
        break;
      case 'truthValidation':
        usage.usage.truthValidations++;
        break;
    }

    this.saveUsage(usage);
  }

  /**
   * Get user's current usage
   */
  getUsage(userId: string): AIUsage | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const stored = localStorage.getItem(`${this.storageKey}_${userId}`);
      if (!stored) {
        // Create default free tier usage
        return {
          userId,
          tier: 'free',
          usage: {
            securityScans: 0,
            codeAnalysis: 0,
            truthValidations: 0,
          },
          limits: {
            securityScans: AI_ACCESS_TIERS[0].features.securityScans,
            codeAnalysis: AI_ACCESS_TIERS[0].features.codeAnalysis,
            truthValidations: 0,
          },
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          paymentStatus: 'active'
        };
      }
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }

  /**
   * Save usage data
   */
  private saveUsage(usage: AIUsage): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(`${this.storageKey}_${usage.userId}`, JSON.stringify(usage));
    } catch (e) {
      console.error('Failed to save AI usage:', e);
    }
  }

  /**
   * Upgrade to a tier (payment would be handled separately)
   */
  async upgradeTier(userId: string, tierId: string, paymentTx?: string): Promise<boolean> {
    const tier = AI_ACCESS_TIERS.find(t => t.id === tierId);
    if (!tier) return false;

    const usage = this.getUsage(userId) || {
      userId,
      tier: 'free',
      usage: { securityScans: 0, codeAnalysis: 0, truthValidations: 0 },
      limits: { securityScans: 0, codeAnalysis: 0, truthValidations: 0 },
      expiresAt: new Date(),
      paymentStatus: 'pending' as const
    };

    usage.tier = tierId;
    usage.limits = {
      securityScans: tier.features.securityScans,
      codeAnalysis: tier.features.codeAnalysis,
      truthValidations: tier.features.truthValidation ? -1 : 0,
    };
    usage.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    usage.paymentStatus = paymentTx ? 'active' : 'pending';

    this.saveUsage(usage);
    return true;
  }

  /**
   * Get available tiers
   */
  getTiers(): AIAccessTier[] {
    return AI_ACCESS_TIERS;
  }
}

