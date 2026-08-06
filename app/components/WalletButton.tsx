'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Wallet, LogOut, Loader2 } from 'lucide-react';
import { useNetwork } from '../contexts/NetworkContext';
import { useMultiversXWallet } from '../contexts/MultiversXWalletContext';

export const WalletButton = () => {
  const { publicKey, disconnect, wallet } = useWallet();
  const { network } = useNetwork();
  
  // Get selected blockchain from localStorage and listen for changes
  const [selectedBlockchain, setSelectedBlockchain] = useState<string | null>('solana');
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const updateBlockchain = () => {
      const saved = localStorage.getItem('sealevel-blockchain');
      setSelectedBlockchain(saved || 'solana');
    };
    
    // Initial load
    updateBlockchain();
    
    // Listen for storage changes (when blockchain is changed in another tab/component)
    window.addEventListener('storage', updateBlockchain);
    
    // Also listen for custom event for same-tab updates
    const handleBlockchainChange = () => updateBlockchain();
    window.addEventListener('blockchainChanged', handleBlockchainChange);
    
    return () => {
      window.removeEventListener('storage', updateBlockchain);
      window.removeEventListener('blockchainChanged', handleBlockchainChange);
    };
  }, []);
  
  // MultiversX wallet connection
  const multiversXWallet = useMultiversXWallet();

  // Force wallet to reconnect when network changes
  const handleNetworkSwitch = async () => {
    if (wallet) {
      try {
        // Disconnect current wallet
        await disconnect();
        // The wallet should reconnect to the new network
        console.log(`Wallet should now connect to ${network}`);
      } catch (error) {
        console.error('Error switching wallet network:', error);
      }
    }
  };

  // Always keep Phantom/Solflare available. Custodial studio wallets are shown in
  // UserProfileWidget; hiding this button made the TX builder look disconnected.

  // MultiversX wallet connection UI
  if (selectedBlockchain === 'multiverx') {
    if (multiversXWallet.isConnected && multiversXWallet.address) {
      return (
        <div className="flex items-center space-x-1 sm:space-x-2">
          <div className="flex items-center space-x-1 sm:space-x-2 bg-gray-800 px-2 sm:px-4 py-2 rounded-lg text-sm font-medium text-gray-300">
            <Wallet className="h-4 w-4" />
            <span className="hidden sm:inline">
              {multiversXWallet.address.slice(0, 6)}...{multiversXWallet.address.slice(-6)}
            </span>
          </div>
          <button
            onClick={() => multiversXWallet.disconnect()}
            className="flex items-center space-x-1 sm:space-x-2 bg-red-600 hover:bg-red-700 px-2 sm:px-3 py-2 rounded-lg text-sm font-medium text-white transition-colors"
            title="Disconnect Wallet"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      );
    }

    return (
      <div className="flex items-center space-x-1 sm:space-x-2">
        <button
          onClick={() => multiversXWallet.connect()}
          disabled={multiversXWallet.isConnecting}
          className="flex items-center space-x-1 sm:space-x-2 bg-gradient-to-r from-orange-500 to-yellow-600 hover:from-orange-600 hover:to-yellow-700 transition-all rounded-lg px-2 sm:px-4 py-2 text-sm font-medium text-white border-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {multiversXWallet.isConnecting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="hidden sm:inline">Connecting...</span>
            </>
          ) : (
            <>
              <Wallet className="h-4 w-4" />
              <span>Connect MultiversX</span>
            </>
          )}
        </button>
        <span className="text-xs text-gray-400 hidden sm:inline">
          (MultiversX)
        </span>
      </div>
    );
  }

  // Solana wallet connection UI (default)
  if (publicKey) {
    return (
      <div className="flex items-center space-x-1 sm:space-x-2">
        <div className="flex items-center space-x-1 sm:space-x-2 bg-gray-800 px-2 sm:px-4 py-2 rounded-lg text-sm font-medium text-gray-300">
          <Wallet className="h-4 w-4" />
          <span className="hidden sm:inline">
            {publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}
          </span>
        </div>
        <button
          onClick={() => disconnect()}
          className="flex items-center space-x-1 sm:space-x-2 bg-red-600 hover:bg-red-700 px-2 sm:px-3 py-2 rounded-lg text-sm font-medium text-white transition-colors"
          title="Disconnect Wallet"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-1 sm:space-x-2">
      <WalletMultiButton 
        className="!bg-gradient-to-r !from-purple-500 !to-indigo-600 hover:!from-purple-600 hover:!to-indigo-700 !transition-all !rounded-lg !px-2 sm:!px-4 !py-2 !text-sm !font-medium !text-white !border-0"
      />
      <span className="text-xs text-gray-400 hidden sm:inline">
        ({network})
      </span>
    </div>
  );
};

export default WalletButton;
