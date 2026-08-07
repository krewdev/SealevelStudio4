'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

type NetworkType = 'mainnet' | 'devnet' | 'testnet';

interface NetworkContextType {
  network: NetworkType;
  setNetwork: (network: NetworkType) => void;
  /** False until localStorage network is read — wait before mounting wallet adapter. */
  ready: boolean;
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
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('sealevel-network');
      if (saved === 'mainnet' || saved === 'devnet' || saved === 'testnet') {
        setNetwork(saved);
      } else {
        const fallback = envDefault();
        setNetwork(fallback);
        localStorage.setItem('sealevel-network', fallback);
      }
    } catch (error) {
      console.warn('Failed to load network preference:', error);
    }
    setReady(true);
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
    <NetworkContext.Provider value={{ network, setNetwork: handleSetNetwork, ready }}>
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
