'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

type NetworkType = 'mainnet' | 'devnet';

interface NetworkContextType {
  network: NetworkType;
  setNetwork: (network: NetworkType) => void;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [network, setNetwork] = useState<NetworkType>('mainnet');

  // Persist network choice
  useEffect(() => {
    const saved = localStorage.getItem('sealevel-network');
    if (saved === 'mainnet' || saved === 'devnet') {
      setNetwork(saved);
    }
  }, []);

  const handleSetNetwork = (newNetwork: NetworkType) => {
    setNetwork(newNetwork);
    localStorage.setItem('sealevel-network', newNetwork);
    // Force page reload to ensure wallet reconnects to new network
    window.location.reload();
  };

  return (
    <NetworkContext.Provider value={{ 
      network, 
      setNetwork: handleSetNetwork 
    }}>
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
