import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

export interface UserProfile {
  walletAddress: string;
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
  login: () => Promise<void>;
  logout: () => void;
  linkTwitter: () => Promise<void>;
  linkTelegram: () => Promise<void>;
  updateCredits: (amount: number) => void;
  addCampaign: (campaign: Campaign) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const { publicKey, connected } = useWallet();
  const [user, setUser] = useState<UserProfile | null>(null);

  // Auto-login when wallet connects if profile exists
  useEffect(() => {
    if (connected && publicKey) {
      loadProfile(publicKey.toBase58());
    } else {
      setUser(null);
    }
  }, [connected, publicKey]);

  const loadProfile = (address: string) => {
    // In a real app, fetch from backend DB
    // For now, load from localStorage or create new
    const stored = localStorage.getItem(`user_${address}`);
    if (stored) {
      setUser(JSON.parse(stored));
    } else {
      const newUser: UserProfile = {
        walletAddress: address,
        isTwitterLinked: false,
        isTelegramLinked: false,
        credits: 0,
        campaigns: []
      };
      setUser(newUser);
      saveProfile(newUser);
    }
  };

  const saveProfile = (profile: UserProfile) => {
    localStorage.setItem(`user_${profile.walletAddress}`, JSON.stringify(profile));
    setUser(profile);
  };

  const login = async () => {
    if (!publicKey) return;
    loadProfile(publicKey.toBase58());
  };

  const logout = () => {
    setUser(null);
  };

  const linkTwitter = async () => {
    if (!user) return;
    // Simulate OAuth flow
    // In real app: Redirect to /api/auth/twitter
    const mockHandle = prompt("Enter your Twitter handle (mock OAuth):", "@");
    if (mockHandle) {
      const updated = { ...user, twitterHandle: mockHandle, isTwitterLinked: true };
      saveProfile(updated);
    }
  };

  const linkTelegram = async () => {
    if (!user) return;
    // Simulate Telegram Widget flow
    const mockHandle = prompt("Enter your Telegram handle:", "@");
    if (mockHandle) {
      const updated = { ...user, telegramHandle: mockHandle, isTelegramLinked: true };
      saveProfile(updated);
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
      login, 
      logout, 
      linkTwitter, 
      linkTelegram,
      updateCredits,
      addCampaign
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

