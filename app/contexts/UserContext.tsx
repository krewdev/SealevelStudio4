import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface UserProfile {
  walletAddress: string;
  walletId: string;
  balance?: number;
  twitterHandle?: string;
  telegramHandle?: string;
  isTwitterLinked: boolean;
  isTelegramLinked: boolean;
  credits: number; // For paying fees
  campaigns: Campaign[];
}

export interface Campaign {
  id: string;
  tokenSymbol: string;
  mode: 'fomo' | 'fear' | 'greed' | 'build' | 'promote';
  status: 'active' | 'paused' | 'completed';
  messagesSent: number;
  budget: number; // In SOL
}

interface UserContextType {
  user: UserProfile | null;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => void;
  linkTwitter: () => Promise<void>;
  linkTelegram: () => Promise<void>;
  updateCredits: (amount: number) => void;
  addCampaign: (campaign: Campaign) => void;
  refreshBalance: (walletAddress?: string) => Promise<void>;
  createWallet: (email?: string, vanityPrefix?: string) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Auto-create or load wallet on mount
  useEffect(() => {
    initializeUser();
  }, []);

  const initializeUser = async () => {
    setIsLoading(true);
    try {
      // Check if user has a wallet in localStorage
      const storedWalletId = localStorage.getItem('wallet_id');
      const storedProfile = localStorage.getItem('user_profile');

      if (storedProfile && storedWalletId) {
        const profile = JSON.parse(storedProfile);
        setUser(profile);
        // Refresh balance - pass walletAddress directly to avoid state timing issue
        await refreshBalance(profile.walletAddress);
      } else {
        // Create a new wallet
        await createWallet();
      }
    } catch (error) {
      console.error('Failed to initialize user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Create a custodial wallet
   * ⚠️ NOTE: This is a development/mock implementation.
   * - Creates real Solana wallet addresses
   * - Can receive funds and display balance
   * - ✅ Can sign transactions via /api/wallet/sign endpoint
   * - Note: For production, consider using a proper key management service
   */
  const createWallet = async (email?: string, vanityPrefix?: string) => {
    try {
      // Generate a session ID for this user
      let sessionId = localStorage.getItem('session_id');
      if (!sessionId) {
        sessionId = crypto.randomUUID();
        localStorage.setItem('session_id', sessionId);
      }

      const response = await fetch('/api/wallet/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, email, vanityPrefix }),
      });

      const data = await response.json();
      
      if (!data.success || !data.wallet) {
        throw new Error(data.error || 'Failed to create wallet');
      }

      const newUser: UserProfile = {
        walletAddress: data.wallet.address,
        walletId: data.wallet.walletId,
        balance: 0,
        isTwitterLinked: false,
        isTelegramLinked: false,
        credits: 0,
        campaigns: []
      };

      setUser(newUser);
      saveProfile(newUser);
      localStorage.setItem('wallet_id', data.wallet.walletId);
    } catch (error) {
      console.error('Failed to create wallet:', error);
      throw error;
    }
  };

  const loadProfile = (profile: UserProfile) => {
    setUser(profile);
    saveProfile(profile);
  };

  const saveProfile = (profile: UserProfile) => {
    localStorage.setItem('user_profile', JSON.stringify(profile));
    setUser(profile);
  };

  const refreshBalance = async (walletAddress?: string) => {
    // Use provided walletAddress or fall back to user state
    const address = walletAddress || user?.walletAddress;
    if (!address) return;
    
    try {
      const response = await fetch(`/api/wallet/info?address=${address}`);
      const data = await response.json();
      
      if (data.success && data.wallet) {
        // If we have a user state, update it; otherwise just return the balance
        if (user) {
          const updated = { ...user, balance: data.wallet.balance };
          setUser(updated);
          saveProfile(updated);
        } else {
          // If called during initialization, we'll need to update the profile that was just loaded
          // This will be handled by the caller
          return data.wallet.balance;
        }
      }
    } catch (error) {
      console.error('Failed to refresh balance:', error);
    }
  };

  const login = async () => {
    // With custodial wallets, login is automatic
    // But we can refresh the balance
    await refreshBalance();
  };

  const logout = () => {
    setUser(null);
  };

  const linkTwitter = async () => {
    if (!user) return;
    
    try {
      // Initiate OAuth flow
      const response = await fetch('/api/auth/twitter/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: user.walletAddress }),
      });

      const data = await response.json();
      
      if (!data.success || !data.authUrl) {
        const errorMsg = data.error || 'Failed to initiate Twitter OAuth';
        if (data.requiresConfiguration || errorMsg.includes('not configured')) {
          const useManual = confirm(
            'Twitter OAuth is not configured.\n\n' +
            'To use OAuth, you need to:\n' +
            '1. Go to https://developer.twitter.com/en/portal/dashboard\n' +
            '2. Create a new app\n' +
            '3. Get Client ID and Client Secret\n' +
            '4. Add them to your .env.local file\n\n' +
            'Would you like to manually enter your Twitter handle for now?\n\n' +
            '(Click OK to enter manually, Cancel to close)'
          );
          
          if (useManual) {
            const handle = prompt("Enter your Twitter handle (without @):", "");
            if (handle) {
              const updated = { 
                ...user, 
                twitterHandle: handle.startsWith('@') ? handle : `@${handle}`,
                isTwitterLinked: true 
              };
              saveProfile(updated);
            }
          }
          return;
        }
        throw new Error(errorMsg);
      }

      // Open OAuth popup window (centered and properly sized)
      // Calculate position to center on screen
      const width = 600;
      const height = 700;
      
      // Get screen dimensions
      const screenWidth = window.screen.width || window.screen.availWidth;
      const screenHeight = window.screen.height || window.screen.availHeight;
      
      // Center the popup
      const left = Math.round((screenWidth - width) / 2);
      const top = Math.round((screenHeight - height) / 2);
      
      // Open popup with explicit positioning
      const popup = window.open(
        data.authUrl,
        'TwitterOAuth',
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes,location=yes,status=yes,alwaysRaised=yes`
      );

      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        // Popup was blocked - offer to open in same window or show instructions
        const useSameWindow = confirm(
          'Popup was blocked by your browser.\n\n' +
          'Would you like to open Twitter OAuth in this window instead?\n\n' +
          '(Click Cancel to allow popups and try again)'
        );
        
        if (useSameWindow) {
          window.location.href = data.authUrl;
          return;
        } else {
          throw new Error('Popup blocked. Please allow popups for this site in your browser settings and try again.');
        }
      }

      // Ensure popup is visible and focused
      try {
        popup.focus();
        // Check if popup is actually open after a brief delay
        setTimeout(() => {
          if (popup.closed) {
            console.warn('Popup was closed immediately');
          }
        }, 100);
      } catch (e) {
        console.warn('Could not focus popup:', e);
      }

      // Listen for OAuth callback message
      const messageHandler = (event: MessageEvent) => {
        // Verify origin
        if (event.origin !== window.location.origin) return;

        if (event.data.type === 'TWITTER_OAUTH_SUCCESS') {
          const username = event.data.username || '@user';
          const updated = { 
            ...user, 
            twitterHandle: username.startsWith('@') ? username : `@${username}`,
            isTwitterLinked: true 
          };
          saveProfile(updated);
          window.removeEventListener('message', messageHandler);
          popup.close();
        } else if (event.data.type === 'TWITTER_OAUTH_ERROR') {
          console.error('Twitter OAuth error:', event.data.error);
          alert(`Twitter OAuth failed: ${event.data.error}`);
          window.removeEventListener('message', messageHandler);
          popup.close();
        }
      };

      window.addEventListener('message', messageHandler);

      // Cleanup if popup is closed manually
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', messageHandler);
        }
      }, 1000);
    } catch (error) {
      console.error('Twitter OAuth error:', error);
      alert(`Failed to connect Twitter: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const linkTelegram = async () => {
    if (!user) return;
    
    try {
      // Telegram uses Bot API, not user OAuth
      // For user profile linking, we'll use Telegram Login Widget
      // This requires a bot token to be configured
      const botToken = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN;
      
      if (!botToken) {
        // Fallback: prompt for Telegram username (for now)
        const handle = prompt("Enter your Telegram username (without @):", "");
        if (handle) {
          const updated = { 
            ...user, 
            telegramHandle: handle.startsWith('@') ? handle : `@${handle}`,
            isTelegramLinked: true 
          };
          saveProfile(updated);
        }
        return;
      }

      // Use Telegram Login Widget
      // Create a popup with Telegram Login Widget
      const width = 500;
      const height = 600;
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;
      
      // Telegram Login Widget URL
      const widgetUrl = `https://oauth.telegram.org/auth?bot_id=${botToken}&origin=${encodeURIComponent(window.location.origin)}&request_access=write`;
      
      const popup = window.open(
        widgetUrl,
        'Telegram OAuth',
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
      );

      if (!popup) {
        throw new Error('Popup blocked. Please allow popups for this site.');
      }

      // Listen for Telegram OAuth callback
      const messageHandler = (event: MessageEvent) => {
        if (event.origin !== 'https://oauth.telegram.org') return;

        if (event.data.type === 'telegram-auth') {
          const authData = event.data;
          if (authData.username) {
            const updated = { 
              ...user, 
              telegramHandle: authData.username.startsWith('@') ? authData.username : `@${authData.username}`,
              isTelegramLinked: true 
            };
            saveProfile(updated);
            window.removeEventListener('message', messageHandler);
            popup.close();
          }
        }
      };

      window.addEventListener('message', messageHandler);

      // Cleanup if popup is closed manually
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', messageHandler);
        }
      }, 1000);
    } catch (error) {
      console.error('Telegram OAuth error:', error);
      // Fallback to prompt
      const handle = prompt("Enter your Telegram username (without @):", "");
      if (handle) {
        const updated = { 
          ...user, 
          telegramHandle: handle.startsWith('@') ? handle : `@${handle}`,
          isTelegramLinked: true 
        };
        saveProfile(updated);
      }
    }
  };

  const updateCredits = (amount: number) => {
    if (!user) return;
    const updated = { ...user, credits: user.credits + amount };
    saveProfile(updated);
  };

  const addCampaign = (campaign: Campaign) => {
    if (!user) return;
    const updated = { ...user, campaigns: [...user.campaigns, campaign] };
    saveProfile(updated);
  };

  return (
    <UserContext.Provider value={{ 
      user,
      isLoading,
      login, 
      logout, 
      linkTwitter, 
      linkTelegram,
      updateCredits,
      addCampaign,
      refreshBalance,
      createWallet
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

