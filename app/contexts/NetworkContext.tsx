'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

type NetworkType = 'mainnet' | 'devnet' | 'testnet';

interface NetworkContextType {
  network: NetworkType;
  setNetwork: (network: NetworkType) => void;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export function NetworkProvider({ children }: { children: ReactNode }) {
  // Force devnet-only access
  const [network, setNetwork] = useState<NetworkType>('devnet');

  // Persist network choice (client-side only) - but only allow devnet
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('sealevel-network');
        // Only allow devnet or testnet, never mainnet
        if (saved === 'devnet' || saved === 'testnet') {
          setNetwork(saved);
        } else {
          // Force devnet if mainnet was saved
          setNetwork('devnet');
          localStorage.setItem('sealevel-network', 'devnet');
        }
      } catch (error) {
        console.warn('Failed to load network preference:', error);
        setNetwork('devnet');
      }
    }
  }, []);

  const handleSetNetwork = (newNetwork: NetworkType) => {
    // Block mainnet access - only allow devnet or testnet
    if (newNetwork === 'mainnet') {
      console.warn('Mainnet access is disabled. This site is devnet-only.');
      return;
    }
    
    setNetwork(newNetwork);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('sealevel-network', newNetwork);
        // Force page reload to ensure wallet reconnects to new network
        window.location.reload();
      } catch (error) {
        console.warn('Failed to save network preference:', error);
      }
    }
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
