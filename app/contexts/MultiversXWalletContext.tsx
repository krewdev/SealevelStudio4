'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

interface MultiversXWalletContextType {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  signTransaction: (transaction: any) => Promise<any>;
}

const MultiversXWalletContext = createContext<MultiversXWalletContextType | undefined>(undefined);

export function MultiversXWalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Check if MultiversX extension is available
  const getExtension = useCallback(() => {
    if (typeof window === 'undefined') return null;
    
    // Check for MultiversX extension (elrondWallet, defiWallet, or xPortal)
    const extension = (window as any).elrondWallet || 
                     (window as any).defiWallet || 
                     (window as any).xPortal;
    return extension;
  }, []);

  // Check connection status on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkConnection = async () => {
      try {
        const extension = getExtension();
        if (extension && extension.getAccount) {
          const account = await extension.getAccount();
          if (account && account.address) {
            setAddress(account.address);
            // Store in localStorage for persistence
            localStorage.setItem('multiversx_wallet_address', account.address);
          }
        }
      } catch (error) {
        // Not connected or extension not available
        console.log('MultiversX wallet not connected:', error);
      }
    };

    // Check localStorage first
    const storedAddress = localStorage.getItem('multiversx_wallet_address');
    if (storedAddress) {
      setAddress(storedAddress);
    }

    // Then check extension
    checkConnection();
  }, [getExtension]);

  const connect = useCallback(async () => {
    if (typeof window === 'undefined') {
      throw new Error('Wallet connection is only available in the browser');
    }

    setIsConnecting(true);
    try {
      const extension = getExtension();
      
      if (!extension) {
        // Try to open extension download page
        const install = confirm(
          'MultiversX wallet extension not found!\n\n' +
          'Please install xPortal (formerly Maiar) or DeFi Wallet extension.\n\n' +
          'Would you like to open the download page?'
        );
        if (install) {
          window.open('https://xportal.com/', '_blank');
        }
        throw new Error('MultiversX wallet extension not found. Please install xPortal or DeFi Wallet extension.');
      }

      // Request connection - different extensions have different APIs
      let account;
      if (extension.login) {
        // xPortal/DeFi Wallet extension
        const success = await extension.login();
        if (success) {
          account = await extension.getAccount();
        }
      } else if (extension.getAccount) {
        // Direct getAccount call
        account = await extension.getAccount();
      } else {
        throw new Error('Unsupported MultiversX wallet extension');
      }

      if (account && account.address) {
        setAddress(account.address);
        localStorage.setItem('multiversx_wallet_address', account.address);
      } else {
        throw new Error('Failed to connect wallet - no address returned');
      }
    } catch (error) {
      console.error('MultiversX wallet connection error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect MultiversX wallet';
      alert(`Connection failed: ${errorMessage}`);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  }, [getExtension]);

  const disconnect = useCallback(async () => {
    try {
      const extension = getExtension();
      if (extension && extension.logout) {
        await extension.logout();
      }
    } catch (error) {
      console.error('Error during wallet logout:', error);
    } finally {
      setAddress(null);
      // Clear any stored connection state
      if (typeof window !== 'undefined') {
        localStorage.removeItem('multiversx_wallet_address');
      }
    }
  }, [getExtension]);

  const signTransaction = useCallback(async (transaction: any) => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    const extension = getExtension();
    if (!extension) {
      throw new Error('MultiversX wallet extension not found');
    }

    try {
      // Sign transaction using extension
      const signedTx = await extension.signTransaction(transaction);
      return signedTx;
    } catch (error) {
      console.error('Transaction signing error:', error);
      throw error;
    }
  }, [address, getExtension]);

  return (
    <MultiversXWalletContext.Provider
      value={{
        address,
        isConnected: !!address,
        isConnecting,
        connect,
        disconnect,
        signTransaction,
      }}
    >
      {children}
    </MultiversXWalletContext.Provider>
  );
}

export function useMultiversXWallet() {
  const context = useContext(MultiversXWalletContext);
  if (context === undefined) {
    throw new Error('useMultiversXWallet must be used within a MultiversXWalletProvider');
  }
  return context;
}
