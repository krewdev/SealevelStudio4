'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

type NetworkType = 'mainnet' | 'devnet' | 'testnet';

interface NetworkContextType {
  network: NetworkType;
  setNetwork: (network: NetworkType) => void;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

function envDefault(): NetworkType {
  const fromEnv = (process.env.NEXT_PUBLIC_SOLANA_NETWORK || '').toLowerCase();
  if (fromEnv === 'mainnet' || fromEnv === 'mainnet-beta') return 'mainnet';
  if (fromEnv === 'testnet') return 'testnet';
  return 'devnet';
}

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [network, setNetwork] = useState<NetworkType>(envDefault());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem('sealevel-network');
      if (saved === 'mainnet' || saved === 'devnet' || saved === 'testnet') {
        setNetwork(saved);
        return;
      }
      const fallback = envDefault();
      setNetwork(fallback);
      localStorage.setItem('sealevel-network', fallback);
    } catch (error) {
      console.warn('Failed to load network preference:', error);
    }
  }, []);

  const handleSetNetwork = (newNetwork: NetworkType) => {
    setNetwork(newNetwork);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('sealevel-network', newNetwork);
        window.location.reload();
      } catch (error) {
        console.warn('Failed to save network preference:', error);
      }
    }
  };

  return (
    <NetworkContext.Provider value={{ network, setNetwork: handleSetNetwork }}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  const context = useContext(NetworkContext);
  if (context === undefined) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
}
