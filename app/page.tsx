'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Connection, PublicKey, AccountInfo } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, TokenAccountNotFoundError, getAccount, getMint } from '@solana/spl-token';
import { Search, Wrench, Play, Code, Wallet, ChevronDown, Copy, ExternalLink, AlertCircle, CheckCircle, Zap, Terminal, TrendingUp, ShieldCheck, Lock, Shield, Bot, Book, BarChart3, Brain, DollarSign, Coins, Droplet, Twitter, LineChart, MessageCircle, Layers, ArrowLeft, Rocket, History, Download, Star, RefreshCw, Eye, EyeOff, FileJson, FileText } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import WalletButton from './components/WalletButton';
import { UnifiedTransactionBuilder } from './components/UnifiedTransactionBuilder';
import { TransactionPreview } from './components/TransactionPreview';
import { ClientOnly } from './components/ClientOnly';
const ArbitrageScanner = dynamic(() => import('./components/ArbitrageScanner').then(mod => ({ default: mod.ArbitrageScanner })), {
  loading: () => <div className="flex items-center justify-center h-64"><div className="text-gray-400">Loading scanner...</div></div>,
  ssr: false
});
import { FreeTrialBanner } from './components/FreeTrialBanner';
import { UnifiedAIAgents } from './components/UnifiedAIAgents';
import { useNetwork } from './contexts/NetworkContext';
import { useTutorial } from './contexts/TutorialContext';
import { TutorialFlow } from './components/TutorialFlow';
import { VeriSolAttestation } from './components/VeriSolAttestation';
import { LandingPage, BlockchainType } from './components/LandingPage';
import { PremiumServices } from './components/PremiumServices';
import { Web2Tools } from './components/Web2Tools';
import { WalletManager } from './components/WalletManager';
const AdvancedRAndDConsole = dynamic(() => import('./components/AdvancedR&DConsole').then(mod => ({ default: mod.AdvancedRAndDConsole })), {
  loading: () => <div className="flex items-center justify-center h-64"><div className="text-gray-400">Loading console...</div></div>,
  ssr: false
});
import { CybersecurityFinder } from './components/CybersecurityFinder';
import { SecurityAI } from './components/SecurityAI';
import { CybersecurityDashboard } from './components/CybersecurityDashboard';
import { DocsView } from './components/DocsView';
import { TransactionBundler } from './components/TransactionBundler';
import { AdvertisingBots } from './components/AdvertisingBots';
import { DashboardView } from './components/DashboardView';
import { SocialFeatures } from './components/SocialFeatures';
import { ServiceBot } from './components/ServiceBot';
import { FeatureHighlightLoader } from './components/FeatureHighlightLoader';
import { AdminAnalytics } from './components/AdminAnalytics';
import { SealPresale } from './components/SealPresale';
import { AICyberPlayground } from './components/AICyberPlayground';
import { RevenueLanding } from './components/RevenueLanding';
import { RentReclaimer } from './components/RentReclaimer';
import { DevnetFaucet } from './components/DevnetFaucet';
import { ToolsHub } from './components/ToolsHub';
import { TwitterBot } from './components/TwitterBot';
import { SubstackBot } from './components/SubstackBot';
import { TelegramBot } from './components/TelegramBot';
import dynamic from 'next/dynamic';
const ChartsView = dynamic(() => import('./components/ChartsView').then(mod => ({ default: mod.ChartsView })), {
  loading: () => <div className="flex items-center justify-center h-64"><div className="text-gray-400">Loading charts...</div></div>,
  ssr: false
});
import { DisclaimerAgreement } from './components/DisclaimerAgreement';
import { DeveloperCommunity } from './components/DeveloperCommunity';
import { DeveloperDashboard } from './components/DeveloperDashboard';
import { ComingSoonBanner } from './components/ui/ComingSoonBanner';
import { SEAL_TOKEN_ECONOMICS } from './lib/seal-token/config';
import { UserProvider, useUser } from './contexts/UserContext';
import { UserProfileWidget } from './components/UserProfileWidget';
import { LoginGate } from './components/LoginGate';
import { RecentTransactions } from './components/RecentTransactions';
import { SocialConnectButton } from './components/SocialConnectButton';
import { QuickLaunch } from './components/QuickLaunch';
import { MarketingBot } from './components/MarketingBot';
import { RuglessLaunchpad } from './components/RuglessLaunchpad';
import { PumpFunSniper } from './components/PumpFunSniper';
import { BleedingEdgeWrapper } from './components/BleedingEdgeWrapper';
import { PricingBanner } from './components/PricingBanner';
import { CustodialWalletTool } from './components/CustodialWalletTool';

// Suppress hydration warnings during development
if (typeof window !== 'undefined') {
  const originalError = console.error;
  console.error = (...args) => {
    if (typeof args[0] === 'string' && (
      args[0].includes('Warning: Expected server HTML') ||
      args[0].includes('Hydration failed') ||
      args[0].includes('minified React error')
    )) {
      return;
    }
    originalError.call(console, ...args);
  };
}

// Network configuration
const NETWORKS = {
  mainnet: {
    name: 'Mainnet Beta',
    rpcUrl: process.env.NEXT_PUBLIC_SOLANA_RPC_MAINNET || 'https://api.mainnet-beta.solana.com',
    hasRebates: false,
  },
  devnet: {
    name: 'Devnet', 
    rpcUrl: process.env.NEXT_PUBLIC_SOLANA_RPC_DEVNET || 'https://api.devnet.solana.com',
    hasRebates: false,
  },
  testnet: {
    name: 'Testnet',
    rpcUrl: process.env.NEXT_PUBLIC_SOLANA_RPC_TESTNET || 'https://api.testnet.solana.com',
    hasRebates: false,
  },
};

// Default network from environment
const DEFAULT_NETWORK = (process.env.NEXT_PUBLIC_SOLANA_NETWORK as keyof typeof NETWORKS) || 'devnet';

// Types for our account data
interface ParsedAccountData {
  type: 'system' | 'token' | 'token-2022' | 'program' | 'mint' | 'metadata' | 'unknown';
  owner: string;
  data: any;
  rawData: Buffer;
  lamports: number;
  executable: boolean;
  rentEpoch?: number;
  rentExempt?: boolean;
  rentExemptMinimum?: number;
  metadata?: any;
  relatedAccounts?: RelatedAccount[];
}

interface TokenAccountData {
  mint: string;
  owner: string;
  amount: string;
  decimals: number;
  uiAmount: number;
  delegate?: string;
  delegatedAmount?: string;
  closeAuthority?: string;
  mintAuthority?: string;
  supply?: string;
  isInitialized?: boolean;
  tokenProgram?: 'spl-token' | 'token-2022';
}

interface RelatedAccount {
  address: string;
  relationship: string;
  type: string;
}

interface TransactionInfo {
  signature: string;
  slot: number;
  blockTime: number | null;
  fee: number;
  status: 'success' | 'failed';
}

// Calculate rent exemption minimum
function calculateRentExemptMinimum(dataLength: number): number {
  // Rent exemption formula: account_size + 128 bytes overhead
  const accountSize = dataLength;
  const overhead = 128;
  const rentPerByteYear = 0.00000348; // SOL per byte per year (approximate)
  const rentExemptMinimum = Math.ceil((accountSize + overhead) * rentPerByteYear * 2); // 2 years worth
  return rentExemptMinimum * 1e9; // Convert to lamports
}

// Account parsing functions (moved before AccountInspectorView)
async function parseAccountData(
  connection: Connection,
  publicKey: PublicKey,
  accountInfo: AccountInfo<Buffer>
): Promise<ParsedAccountData> {
  const owner = accountInfo.owner.toString();
  const rentExemptMinimum = calculateRentExemptMinimum(accountInfo.data.length);
  const rentExempt = accountInfo.lamports >= rentExemptMinimum;

  // Check if it's a System Program account
  if (owner === '11111111111111111111111111111112') {
    return {
      type: 'system',
      owner,
      data: parseSystemAccount(accountInfo.data),
      rawData: accountInfo.data,
      lamports: accountInfo.lamports,
      executable: accountInfo.executable,
      rentEpoch: accountInfo.rentEpoch,
      rentExempt,
      rentExemptMinimum,
    };
  }

  // Check if it's a Token-2022 Program account
  if (owner === TOKEN_2022_PROGRAM_ID.toString()) {
    try {
      const tokenAccount = await getAccount(connection, publicKey, 'confirmed', TOKEN_2022_PROGRAM_ID);
      const mint = await getMint(connection, tokenAccount.mint, 'confirmed', TOKEN_2022_PROGRAM_ID);

      const tokenData: TokenAccountData = {
        mint: tokenAccount.mint.toString(),
        owner: tokenAccount.owner.toString(),
        amount: tokenAccount.amount.toString(),
        decimals: mint.decimals,
        uiAmount: Number(tokenAccount.amount) / Math.pow(10, mint.decimals),
        delegate: tokenAccount.delegate?.toString(),
        delegatedAmount: tokenAccount.delegatedAmount?.toString(),
        closeAuthority: tokenAccount.closeAuthority?.toString(),
        tokenProgram: 'token-2022',
        isInitialized: true,
      };

      const relatedAccounts: RelatedAccount[] = [
        { address: tokenAccount.mint.toString(), relationship: 'Mint', type: 'mint' },
        { address: tokenAccount.owner.toString(), relationship: 'Owner', type: 'wallet' },
      ];

      if (tokenAccount.delegate) {
        relatedAccounts.push({
          address: tokenAccount.delegate.toString(),
          relationship: 'Delegate',
          type: 'wallet',
        });
      }

      return {
        type: 'token-2022',
        owner,
        data: tokenData,
        rawData: accountInfo.data,
        lamports: accountInfo.lamports,
        executable: accountInfo.executable,
        rentEpoch: accountInfo.rentEpoch,
        rentExempt,
        rentExemptMinimum,
        relatedAccounts,
      };
    } catch (error) {
      // Try to check if it's a mint instead
      try {
        const mint = await getMint(connection, publicKey, 'confirmed', TOKEN_2022_PROGRAM_ID);
        return {
          type: 'mint',
          owner,
          data: {
            decimals: mint.decimals,
            mintAuthority: mint.mintAuthority?.toString(),
            supply: mint.supply.toString(),
            uiSupply: Number(mint.supply) / Math.pow(10, mint.decimals),
            isInitialized: mint.mintAuthority !== null,
            tokenProgram: 'token-2022',
          },
          rawData: accountInfo.data,
          lamports: accountInfo.lamports,
          executable: accountInfo.executable,
          rentEpoch: accountInfo.rentEpoch,
          rentExempt,
          rentExemptMinimum,
        };
      } catch (mintError) {
        console.warn('Failed to parse as Token-2022 account:', error);
      }
    }
  }

  // Check if it's a standard Token Program account
  if (owner === TOKEN_PROGRAM_ID.toString()) {
    try {
      const tokenAccount = await getAccount(connection, publicKey);
      const mint = await getMint(connection, tokenAccount.mint);

      const tokenData: TokenAccountData = {
        mint: tokenAccount.mint.toString(),
        owner: tokenAccount.owner.toString(),
        amount: tokenAccount.amount.toString(),
        decimals: mint.decimals,
        uiAmount: Number(tokenAccount.amount) / Math.pow(10, mint.decimals),
        delegate: tokenAccount.delegate?.toString(),
        delegatedAmount: tokenAccount.delegatedAmount?.toString(),
        closeAuthority: tokenAccount.closeAuthority?.toString(),
        tokenProgram: 'spl-token',
        isInitialized: true,
      };

      const relatedAccounts: RelatedAccount[] = [
        { address: tokenAccount.mint.toString(), relationship: 'Mint', type: 'mint' },
        { address: tokenAccount.owner.toString(), relationship: 'Owner', type: 'wallet' },
      ];

      if (tokenAccount.delegate) {
        relatedAccounts.push({
          address: tokenAccount.delegate.toString(),
          relationship: 'Delegate',
          type: 'wallet',
        });
      }

      return {
        type: 'token',
        owner,
        data: tokenData,
        rawData: accountInfo.data,
        lamports: accountInfo.lamports,
        executable: accountInfo.executable,
        rentEpoch: accountInfo.rentEpoch,
        rentExempt,
        rentExemptMinimum,
        relatedAccounts,
      };
    } catch (error) {
      // Try to check if it's a mint instead
      try {
        const mint = await getMint(connection, publicKey);
        return {
          type: 'mint',
          owner,
          data: {
            decimals: mint.decimals,
            mintAuthority: mint.mintAuthority?.toString(),
            supply: mint.supply.toString(),
            uiSupply: Number(mint.supply) / Math.pow(10, mint.decimals),
            isInitialized: mint.mintAuthority !== null,
            tokenProgram: 'spl-token',
          },
          rawData: accountInfo.data,
          lamports: accountInfo.lamports,
          executable: accountInfo.executable,
          rentEpoch: accountInfo.rentEpoch,
          rentExempt,
          rentExemptMinimum,
        };
      } catch (mintError) {
        console.warn('Failed to parse as token account:', error);
      }
    }
  }

  // Check if it's an executable program
  if (accountInfo.executable) {
    return {
      type: 'program',
      owner,
      data: {
        executable: true,
        programData: accountInfo.data.length > 0 ? 'Has program data' : 'No program data',
        programSize: accountInfo.data.length,
      },
      rawData: accountInfo.data,
      lamports: accountInfo.lamports,
      executable: accountInfo.executable,
      rentEpoch: accountInfo.rentEpoch,
      rentExempt,
      rentExemptMinimum,
    };
  }

  // Unknown account type
  return {
    type: 'unknown',
    owner,
    data: null,
    rawData: accountInfo.data,
    lamports: accountInfo.lamports,
    executable: accountInfo.executable,
    rentEpoch: accountInfo.rentEpoch,
    rentExempt,
    rentExemptMinimum,
  };
}

// Parse system account data (basic implementation)
function parseSystemAccount(data: Buffer) {
  if (data.length === 0) {
    return { type: 'system', data: 'Empty system account' };
  }

  // Basic system account parsing - you can expand this
  const lamports = data.readBigUInt64LE(0);
  return {
    lamports: lamports.toString(),
    dataLength: data.length,
    // Add more system account parsing as needed
  };
}

// ### Account Inspector View ###
// This is the core feature we're building now
function AccountInspectorView({ connection, network, publicKey, initialSearchQuery }: { connection: Connection; network: string; publicKey: PublicKey | null; initialSearchQuery?: string }) {
  const { user } = useUser();
  const [accountId, setAccountId] = useState(initialSearchQuery || '');
  const [accountData, setAccountData] = useState<ParsedAccountData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'data' | 'transactions' | 'related'>('overview');
  const [transactionHistory, setTransactionHistory] = useState<TransactionInfo[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showRawData, setShowRawData] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Validate if the entered string is a possible Solana address
  function isValidSolanaAddress(address: string): boolean {
    try {
      // Solana addresses are base58 and 32 bytes (44 chars)
      // new PublicKey will throw if invalid
      if (!address || address.length < 32 || address.length > 44) return false;
      new PublicKey(address);
      return true;
    } catch (e) {
      return false;
    }
  }

  // Show rebate info for mainnet
  const showRebateInfo = network === 'mainnet';

  // Check if wallet network matches inspector network
  const getWalletNetwork = () => {
    const walletAddress = publicKey?.toString() || user?.walletAddress;
    if (!walletAddress) return null;
    // This is a simplified check - in reality you'd need to check the wallet's cluster
    // For now, we'll assume Phantom/Solflare auto-switch based on the connection
    return network; // The wallet should follow the connection network
  };

  // Now walletNetwork will be a string or null
  const walletNetwork = getWalletNetwork();
  const networkMismatch = walletNetwork && walletNetwork !== network;

  // Debug information
  useEffect(() => {
    const debug = [
      `Network: ${network}`,
      `RPC URL: ${connection?.rpcEndpoint}`,
      `Wallet Connected: ${!!publicKey}`,
      `Wallet Address: ${publicKey?.toString() || 'None'}`,
      `Connection Ready: ${!!connection}`
    ].join('\n');
    // Removed debugInfo state and setDebugInfo call since debug panel was removed
  }, [network, connection, publicKey]);

  // Auto-populate with initial search query if provided
  useEffect(() => {
    if (initialSearchQuery && initialSearchQuery !== accountId) {
      setAccountId(initialSearchQuery);
    }
  }, [initialSearchQuery]);

  // Auto-populate with initial search query if provided
  useEffect(() => {
    if (initialSearchQuery && initialSearchQuery !== accountId) {
      setAccountId(initialSearchQuery);
      // Auto-search if valid address
      if (isValidSolanaAddress(initialSearchQuery)) {
        const validation = validateAccountAddress(initialSearchQuery);
        if (validation.isValid) {
          handleSearch();
        }
      }
    }
  }, [initialSearchQuery]);

  // Auto-populate with connected wallet address
  const fillWalletAddress = () => {
    const walletAddress = publicKey?.toString() || user?.walletAddress;
    if (walletAddress) {
      setAccountId(walletAddress);
      console.log('Filled wallet address:', walletAddress);
    } else {
      setError('Please generate a wallet first using the Generate Wallet button in the header.');
    }
  };

  // Test connection
  const testConnection = async () => {
    if (!connection) {
      setError('No connection to Solana network');
      return;
    }
    
    try {
      const version = await connection.getVersion();
      console.log('Connection test successful:', version);
      setError(`✅ Connection working! RPC: ${connection.rpcEndpoint}`);
    } catch (err) {
      console.error('Connection test failed:', err);
      setError(`❌ Connection failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Validate account address format
  const validateAccountAddress = (address: string): { isValid: boolean; error?: string } => {
    if (!address.trim()) {
      return { isValid: false, error: 'Please enter an account address' };
    }

    // Check length (Solana addresses are 32 bytes, base58 encoded to ~44 characters)
    if (address.length < 32 || address.length > 50) {
      return { isValid: false, error: 'Invalid address length. Solana addresses are ~44 characters long.' };
    }

    // Try to create PublicKey to validate format
    try {
      new PublicKey(address.trim());
      return { isValid: true };
    } catch {
      return { isValid: false, error: 'Invalid base58 format. Please check the address.' };
    }
  };

  const handleSearch = async () => {
    const validation = validateAccountAddress(accountId);
    if (!validation.isValid) {
      setError(validation.error || 'Invalid account address');
      setSuggestions([]);
      return;
    }

    // Check if connection is available
    if (!connection) {
      setError('Connection not available. Please wait for the connection to initialize or check your network settings.');
      setSuggestions(['🔄 Try refreshing the page', '🌐 Check your internet connection']);
      return;
    }

    setLoading(true);
    setError(null);
    setAccountData(null);
    setSuggestions([]);

    try {
      console.log('Searching for account:', accountId.trim());
      console.log('Using RPC:', connection.rpcEndpoint);
      
      const pubkey = new PublicKey(accountId.trim());
      console.log('PublicKey created successfully');
      
      const accountInfo = await connection.getAccountInfo(pubkey);
      console.log('Account info response:', accountInfo);

      if (!accountInfo) {
        // Account not found - provide network-specific suggestions
        const suggestionsList: string[] = [];
        
        if (network === 'mainnet') {
          suggestionsList.push('🔴 Try switching to devnet - many accounts exist there for testing');
          suggestionsList.push('Check if this account exists on mainnet (it may be devnet-only)');
        } else {
          suggestionsList.push('🟠 Try switching to mainnet - this might be a mainnet account');
          suggestionsList.push('Some devnet accounts are temporary and may not exist');
        }
        
        suggestionsList.push('Verify you copied the full address (no extra spaces)');
        suggestionsList.push('Check the address format - should be ~44 characters');
        
        // If it's the user's wallet address, suggest network switch
        if (publicKey && accountId.trim() === publicKey.toString()) {
          suggestionsList.unshift('💡 Your wallet is connected to a different network than the inspector');
          suggestionsList.unshift('🔄 Try switching networks in the header');
        }
        
        setSuggestions(suggestionsList);
        throw new Error(`Account not found on ${network}`);
      }

      // Parse the account data
      const parsedData = await parseAccountData(connection, pubkey, accountInfo);
      setAccountData(parsedData);
      console.log('Account parsed successfully:', parsedData);
    } catch (err) {
      console.error('Error fetching account:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch account data';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Fetch transaction history
  const fetchTransactionHistory = async (address: string) => {
    if (!connection || !address) return;
    
    setLoadingTransactions(true);
    try {
      const pubkey = new PublicKey(address);
      const signatures = await connection.getSignaturesForAddress(pubkey, { limit: 20 });
      
      const transactions: TransactionInfo[] = await Promise.all(
        signatures.map(async (sig) => {
          try {
            const tx = await connection.getParsedTransaction(sig.signature);
            return {
              signature: sig.signature,
              slot: sig.slot,
              blockTime: sig.blockTime,
              fee: tx?.meta?.fee || 0,
              status: tx?.meta?.err ? 'failed' : 'success',
            };
          } catch {
            return {
              signature: sig.signature,
              slot: sig.slot,
              blockTime: sig.blockTime,
              fee: 0,
              status: 'success' as const,
            };
          }
        })
      );
      
      setTransactionHistory(transactions);
    } catch (err) {
      console.error('Error fetching transaction history:', err);
    } finally {
      setLoadingTransactions(false);
    }
  };

  // Export account data
  const exportAccountData = (format: 'json' | 'csv') => {
    if (!accountData) return;
    
    const exportData = {
      address: accountId,
      network,
      timestamp: new Date().toISOString(),
      type: accountData.type,
      owner: accountData.owner,
      lamports: accountData.lamports,
      solBalance: (accountData.lamports / 1e9).toFixed(9),
      executable: accountData.executable,
      rentEpoch: accountData.rentEpoch,
      rentExempt: accountData.rentExempt,
      rentExemptMinimum: accountData.rentExemptMinimum,
      data: accountData.data,
      rawDataSize: accountData.rawData.length,
    };

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `account-${accountId.slice(0, 8)}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      // CSV format (simplified)
      const csv = `Address,Network,Type,Owner,SOL Balance,Lamports,Executable,Rent Exempt,Data Size\n${accountId},${network},${accountData.type},${accountData.owner},${(accountData.lamports / 1e9).toFixed(9)},${accountData.lamports},${accountData.executable},${accountData.rentExempt},${accountData.rawData.length}`;
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `account-${accountId.slice(0, 8)}-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // Add to search history
  const addToSearchHistory = (address: string) => {
    if (!address || !isValidSolanaAddress(address)) return;
    setSearchHistory((prev) => {
      const filtered = prev.filter((addr) => addr !== address);
      return [address, ...filtered].slice(0, 10); // Keep last 10
    });
  };

  // Load search history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('accountInspectorHistory');
    if (saved) {
      try {
        setSearchHistory(JSON.parse(saved));
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  // Save search history to localStorage
  useEffect(() => {
    if (searchHistory.length > 0) {
      localStorage.setItem('accountInspectorHistory', JSON.stringify(searchHistory));
    }
  }, [searchHistory]);

  // Fetch transaction history when account data is loaded
  useEffect(() => {
    if (accountData && accountId) {
      fetchTransactionHistory(accountId);
      addToSearchHistory(accountId);
    }
  }, [accountData, accountId]);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh || !accountId || !connection) return;
    
    const refreshAccount = async () => {
      if (!accountId || !connection) return;
      try {
        const pubkey = new PublicKey(accountId.trim());
        const accountInfo = await connection.getAccountInfo(pubkey);
        if (accountInfo) {
          const parsedData = await parseAccountData(connection, pubkey, accountInfo);
          setAccountData(parsedData);
          fetchTransactionHistory(accountId);
        }
      } catch (err) {
        console.error('Auto-refresh error:', err);
      }
    };
    
    const interval = setInterval(refreshAccount, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [autoRefresh, accountId, connection]);

  // Example addresses for testing
  const exampleAddresses: Record<string, string[]> = {
    mainnet: [
      '11111111111111111111111111111112', // System Program
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC Mint
    ],
    devnet: [
      '11111111111111111111111111111112', // System Program
      'So11111111111111111111111111111111111111112', // Wrapped SOL
    ]
  };

  return (
    <div className="relative">
      {/* Background Logo */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{ zIndex: 0 }}
      >
        <img
          src="/sea-level-logo.png"
          alt="Sealevel Studio Background"
          className="absolute inset-0 w-full h-full object-contain opacity-[0.05] filter hue-rotate-[90deg] saturate-75 brightness-110"
          style={{
            objectPosition: 'center right',
            transform: 'scale(0.6) rotate(-5deg)',
          }}
          onError={(e) => {
            console.warn('Background logo not found');
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      </div>

      <div style={{ zIndex: 1, position: 'relative' }}>
        <h1 className="text-2xl font-bold text-white mb-4">Account Inspector</h1>
      
      {/* Network Mismatch Warning */}
      {networkMismatch && 
        <div className="mb-4 p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-yellow-400" />
            <div>
              <p className="text-yellow-300 font-medium">Network Mismatch Detected</p>
              <p className="text-yellow-200 text-sm">
                Your wallet is connected to {walletNetwork} but you're inspecting {network}. 
                <button 
                  onClick={() => {/* Trigger wallet network switch */}}
                  className="underline ml-1 hover:text-yellow-100"
                >
                  Switch wallet network
                </button>
              </p>
            </div>
          </div>
        </div>
      }
      
      {/* Network Status */}
      <div className="mb-4 p-3 bg-blue-900/20 border border-blue-700/50 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${network === 'mainnet' ? 'bg-green-400' : 'bg-orange-400'}`}></div>
              <span className="text-sm text-blue-300">
                Inspecting accounts on <strong>{network.toUpperCase()}</strong>
              </span>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={testConnection}
                className="px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-xs font-medium text-white transition-colors"
              >
                Test RPC
              </button>
              {publicKey && (
                <button
                  onClick={fillWalletAddress}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs font-medium text-white transition-colors"
                >
                  Inspect My Wallet
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <p className="text-gray-400 mb-6">
        Paste any on-chain account address to fetch, deserialize, and display its data.
        Works with wallets, tokens, programs, and more.
      </p>

      {showRebateInfo && (
        <div className="mb-4 p-3 bg-green-900/20 border border-green-700/50 rounded-lg">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <span className="text-sm text-green-400">
              🎉 Connected to Mainnet with SOL rebates enabled
            </span>
          </div>
        </div>
      )}

      <div className="flex w-full max-w-2xl space-x-3 mb-6 relative">
        <div className="flex-1 relative">
          <input
            type="text"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            onKeyPress={handleKeyPress}
            onFocus={() => {
              // Could show search history dropdown here
            }}
            placeholder={`Enter ${network} account address...`}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            disabled={loading}
          />
          {/* Search history suggestions could go here */}
        </div>
        <button
          onClick={handleSearch}
          disabled={loading || !accountId.trim()}
          className="flex items-center space-x-2 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 px-5 py-2 text-sm font-medium text-white hover:from-purple-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            <Search className="h-4 w-4" />
          )}
          <span>{loading ? 'Searching...' : 'Search'}</span>
        </button>
      </div>

      {/* Quick Access: Example addresses and Search History */}
      <div className="mb-6 space-y-3">
        {searchHistory.length > 0 && (
          <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
            <h3 className="text-sm font-medium text-gray-300 mb-2 flex items-center">
              <History className="h-4 w-4 mr-2" />
              Recent Searches
            </h3>
            <div className="flex flex-wrap gap-2">
              {searchHistory.slice(0, 5).map((address, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setAccountId(address);
                    handleSearch();
                  }}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs font-mono text-gray-200 hover:text-white transition-colors flex items-center space-x-1"
                >
                  <span>{address.slice(0, 8)}...{address.slice(-8)}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        
        <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
          <h3 className="text-sm font-medium text-gray-300 mb-2">Example {network} addresses to try:</h3>
          <div className="flex flex-wrap gap-2">
            {exampleAddresses[network].map((address, index) => (
              <button
                key={index}
                onClick={() => setAccountId(address)}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs font-mono text-gray-200 hover:text-white transition-colors"
              >
                {address.slice(0, 8)}...{address.slice(-8)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-700 rounded-lg">
          <div className="flex items-center space-x-2 mb-3">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
            <span className="text-red-400 font-medium">{error}</span>
          </div>
          
          {suggestions.length > 0 && (
            <div>
              <h4 className="text-red-300 font-medium mb-2">Suggestions:</h4>
              <ul className="text-red-200 text-sm space-y-1">
                {suggestions.map((suggestion, index) => (
                  <li key={index}>• {suggestion}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Account Data Display with Enhanced Tabs */}
      {accountData && (
        <div className="space-y-6">
          {/* Account Header with Actions */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center space-x-3">
              <h2 className="text-xl font-bold text-white">Account Details</h2>
              <div className="flex items-center space-x-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  accountData.type === 'token' ? 'bg-green-900 text-green-300' :
                  accountData.type === 'token-2022' ? 'bg-emerald-900 text-emerald-300' :
                  accountData.type === 'mint' ? 'bg-cyan-900 text-cyan-300' :
                  accountData.type === 'system' ? 'bg-blue-900 text-blue-300' :
                  accountData.type === 'program' ? 'bg-purple-900 text-purple-300' :
                  'bg-gray-900 text-gray-300'
                }`}>
                  {accountData.type.replace('-', ' ').toUpperCase()}
                </span>
                {accountData.executable && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-900 text-yellow-300">
                    EXECUTABLE
                  </span>
                )}
                {accountData.rentExempt && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-900 text-green-300">
                    RENT EXEMPT
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  autoRefresh 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
                title="Auto-refresh every 10 seconds"
              >
                <RefreshCw className={`h-3 w-3 inline mr-1 ${autoRefresh ? 'animate-spin' : ''}`} />
                Auto
              </button>
              <button
                onClick={() => handleSearch()}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs font-medium text-white transition-colors"
                title="Refresh account data"
              >
                <RefreshCw className="h-3 w-3 inline mr-1" />
                Refresh
              </button>
              <div className="relative group">
                <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs font-medium text-white transition-colors flex items-center">
                  <Download className="h-3 w-3 mr-1" />
                  Export
                </button>
                <div className="absolute right-0 mt-2 w-32 bg-gray-800 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                  <button
                    onClick={() => exportAccountData('json')}
                    className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-gray-700 rounded-t-lg flex items-center"
                  >
                    <FileJson className="h-3 w-3 mr-2" />
                    JSON
                  </button>
                  <button
                    onClick={() => exportAccountData('csv')}
                    className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-gray-700 rounded-b-lg flex items-center"
                  >
                    <FileText className="h-3 w-3 mr-2" />
                    CSV
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-1 border-b border-gray-700">
            {(['overview', 'data', 'transactions', 'related'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === tab
                    ? 'border-purple-500 text-purple-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {tab === 'transactions' && transactionHistory.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-purple-900 text-purple-300 rounded-full text-xs">
                    {transactionHistory.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="min-h-[400px]">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700/50">
                    <h3 className="text-xs font-medium text-gray-400 mb-2">Address</h3>
                    <div className="flex items-center space-x-2">
                      <code className="text-sm bg-gray-900 px-2 py-1 rounded text-gray-200 font-mono break-all flex-1">
                        {accountId}
                      </code>
                      <button
                        onClick={() => copyToClipboard(accountId)}
                        className="p-1 hover:bg-gray-700 rounded"
                        title="Copy address"
                      >
                        <Copy className="h-4 w-4 text-gray-400" />
                      </button>
                      <a
                        href={`https://solscan.io/account/${encodeURIComponent(accountId)}?cluster=${network}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 hover:bg-gray-700 rounded"
                        title="View on Solscan"
                      >
                        <ExternalLink className="h-4 w-4 text-gray-400" />
                      </a>
                    </div>
                  </div>

                  <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700/50">
                    <h3 className="text-xs font-medium text-gray-400 mb-2">SOL Balance</h3>
                    <p className="text-2xl font-bold text-green-400">
                      {(accountData.lamports / 1e9).toFixed(9)} SOL
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {accountData.lamports.toLocaleString()} lamports
                    </p>
                  </div>

                  <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700/50">
                    <h3 className="text-xs font-medium text-gray-400 mb-2">Owner Program</h3>
                    <div className="flex items-center space-x-2">
                      <code className="text-xs bg-gray-900 px-2 py-1 rounded text-gray-300 font-mono break-all flex-1">
                        {accountData.owner.slice(0, 8)}...{accountData.owner.slice(-8)}
                      </code>
                      <button
                        onClick={() => copyToClipboard(accountData.owner)}
                        className="p-1 hover:bg-gray-700 rounded"
                        title="Copy owner"
                      >
                        <Copy className="h-4 w-4 text-gray-400" />
                      </button>
                    </div>
                  </div>

                  <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700/50">
                    <h3 className="text-xs font-medium text-gray-400 mb-2">Rent Status</h3>
                    <div className="space-y-1">
                      <p className={`text-lg font-semibold ${accountData.rentExempt ? 'text-green-400' : 'text-yellow-400'}`}>
                        {accountData.rentExempt ? 'Exempt' : 'Not Exempt'}
                      </p>
                      {accountData.rentExemptMinimum && (
                        <p className="text-xs text-gray-500">
                          Minimum: {(accountData.rentExemptMinimum / 1e9).toFixed(9)} SOL
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700/50">
                    <h3 className="text-xs font-medium text-gray-400 mb-2">Data Size</h3>
                    <p className="text-lg font-semibold text-blue-400">
                      {accountData.rawData.length.toLocaleString()} bytes
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {(accountData.rawData.length / 1024).toFixed(2)} KB
                    </p>
                  </div>

                  {accountData.rentEpoch && (
                    <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700/50">
                      <h3 className="text-xs font-medium text-gray-400 mb-2">Rent Epoch</h3>
                      <p className="text-lg font-semibold text-purple-400">
                        {accountData.rentEpoch.toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>

                {/* Account-Specific Data */}
                {accountData.data && (
                  <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700/50">
                    <h3 className="text-sm font-medium text-gray-300 mb-3">Account Information</h3>
                    {(accountData.type === 'token' || accountData.type === 'token-2022') && accountData.data && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {accountData.data.mint && (
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Mint</p>
                            <code className="text-xs font-mono text-gray-300 break-all">
                              {accountData.data.mint.slice(0, 8)}...{accountData.data.mint.slice(-8)}
                            </code>
                          </div>
                        )}
                        {accountData.data.uiAmount !== undefined && (
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Balance</p>
                            <p className="text-sm font-semibold text-green-400">
                              {accountData.data.uiAmount.toLocaleString(undefined, { maximumFractionDigits: accountData.data.decimals })}
                            </p>
                          </div>
                        )}
                        {accountData.data.decimals !== undefined && (
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Decimals</p>
                            <p className="text-sm font-semibold text-gray-300">{accountData.data.decimals}</p>
                          </div>
                        )}
                        {accountData.data.tokenProgram && (
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Token Program</p>
                            <p className="text-sm font-semibold text-purple-400">{accountData.data.tokenProgram}</p>
                          </div>
                        )}
                      </div>
                    )}
                    {accountData.type === 'mint' && accountData.data && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {accountData.data.uiSupply !== undefined && (
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Total Supply</p>
                            <p className="text-sm font-semibold text-green-400">
                              {accountData.data.uiSupply.toLocaleString(undefined, { maximumFractionDigits: accountData.data.decimals })}
                            </p>
                          </div>
                        )}
                        {accountData.data.decimals !== undefined && (
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Decimals</p>
                            <p className="text-sm font-semibold text-gray-300">{accountData.data.decimals}</p>
                          </div>
                        )}
                        {accountData.data.mintAuthority && (
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Mint Authority</p>
                            <code className="text-xs font-mono text-gray-300 break-all">
                              {accountData.data.mintAuthority.slice(0, 8)}...{accountData.data.mintAuthority.slice(-8)}
                            </code>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Data Tab */}
            {activeTab === 'data' && (
              <div className="space-y-4">
                {accountData.data && (
                  <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700/50">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-medium text-gray-300">Parsed Data</h3>
                      <button
                        onClick={() => copyToClipboard(JSON.stringify(accountData.data, null, 2))}
                        className="flex items-center space-x-1 px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs font-medium transition-colors"
                      >
                        <Copy className="h-3 w-3" />
                        <span>Copy JSON</span>
                      </button>
                    </div>
                    <pre className="bg-gray-900 p-4 rounded text-sm overflow-x-auto text-gray-200 font-mono max-h-[500px] overflow-y-auto">
                      {JSON.stringify(accountData.data, null, 2)}
                    </pre>
                  </div>
                )}

                <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700/50">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-gray-300">Raw Data</h3>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setShowRawData(!showRawData)}
                        className="flex items-center space-x-1 px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs font-medium transition-colors"
                      >
                        {showRawData ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        <span>{showRawData ? 'Hide' : 'Show'}</span>
                      </button>
                      <button
                        onClick={() => copyToClipboard(accountData.rawData.toString('hex'))}
                        className="flex items-center space-x-1 px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs font-medium transition-colors"
                      >
                        <Copy className="h-3 w-3" />
                        <span>Copy Hex</span>
                      </button>
                    </div>
                  </div>
                  {showRawData && (
                    <div className="bg-gray-900 p-4 rounded text-xs overflow-x-auto max-h-[500px] overflow-y-auto">
                      <code className="text-gray-300 font-mono break-all whitespace-pre">
                        {accountData.rawData.toString('hex').match(/.{1,64}/g)?.map((line, i) => (
                          <div key={i} className="flex">
                            <span className="text-gray-500 mr-4 w-16 text-right">{i * 32}</span>
                            <span className="text-gray-300">{line.match(/.{1,2}/g)?.join(' ')}</span>
                          </div>
                        ))}
                      </code>
                    </div>
                  )}
                  {!showRawData && (
                    <p className="text-sm text-gray-500 text-center py-8">Click "Show" to view raw hex data</p>
                  )}
                </div>
              </div>
            )}

            {/* Transactions Tab */}
            {activeTab === 'transactions' && (
              <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700/50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-300">Transaction History</h3>
                  <button
                    onClick={() => fetchTransactionHistory(accountId)}
                    disabled={loadingTransactions}
                    className="flex items-center space-x-1 px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs font-medium transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3 w-3 ${loadingTransactions ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>
                {loadingTransactions ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
                    <p className="text-gray-400 mt-2">Loading transactions...</p>
                  </div>
                ) : transactionHistory.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No transactions found</p>
                ) : (
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {transactionHistory.map((tx, index) => (
                      <div
                        key={tx.signature}
                        className="bg-gray-900/50 p-3 rounded border border-gray-700/50 hover:border-gray-600 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <code className="text-xs font-mono text-gray-300 truncate flex-1">
                                {tx.signature}
                              </code>
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                tx.status === 'success' 
                                  ? 'bg-green-900 text-green-300' 
                                  : 'bg-red-900 text-red-300'
                              }`}>
                                {tx.status}
                              </span>
                            </div>
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              <span>Slot: {tx.slot.toLocaleString()}</span>
                              {tx.blockTime && (
                                <span>{new Date(tx.blockTime * 1000).toLocaleString()}</span>
                              )}
                              <span>Fee: {(tx.fee / 1e9).toFixed(9)} SOL</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            <button
                              onClick={() => copyToClipboard(tx.signature)}
                              className="p-1 hover:bg-gray-700 rounded"
                              title="Copy signature"
                            >
                              <Copy className="h-3 w-3 text-gray-400" />
                            </button>
                            <a
                              href={`https://solscan.io/tx/${tx.signature}?cluster=${network}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 hover:bg-gray-700 rounded"
                              title="View on Solscan"
                            >
                              <ExternalLink className="h-3 w-3 text-gray-400" />
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Related Accounts Tab */}
            {activeTab === 'related' && (
              <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700/50">
                <h3 className="text-sm font-medium text-gray-300 mb-4">Related Accounts</h3>
                {accountData.relatedAccounts && accountData.relatedAccounts.length > 0 ? (
                  <div className="space-y-2">
                    {accountData.relatedAccounts.map((related, index) => (
                      <div
                        key={index}
                        className="bg-gray-900/50 p-3 rounded border border-gray-700/50 hover:border-gray-600 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-400 mb-1">{related.relationship}</p>
                            <code className="text-sm font-mono text-gray-300 break-all">
                              {related.address}
                            </code>
                            <span className="ml-2 px-2 py-0.5 bg-gray-700 text-gray-400 rounded text-xs">
                              {related.type}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            <button
                              onClick={() => copyToClipboard(related.address)}
                              className="p-1 hover:bg-gray-700 rounded"
                              title="Copy address"
                            >
                              <Copy className="h-4 w-4 text-gray-400" />
                            </button>
                            <button
                              onClick={() => {
                                setAccountId(related.address);
                                handleSearch();
                              }}
                              className="p-1 hover:bg-gray-700 rounded"
                              title="Inspect this account"
                            >
                              <Search className="h-4 w-4 text-gray-400" />
                            </button>
                            <a
                              href={`https://solscan.io/account/${related.address}?cluster=${network}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 hover:bg-gray-700 rounded"
                              title="View on Solscan"
                            >
                              <ExternalLink className="h-4 w-4 text-gray-400" />
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No related accounts found</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {!accountData && !loading && !error && (
        <div className="mt-8">
          <div className="min-h-[200px] w-full max-w-2xl rounded-lg border border-dashed border-gray-700 bg-gray-800/50 flex items-center justify-center">
            <div className="text-center">
              <Search className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">Enter an account address and click Search to inspect its data</p>
              <p className="text-gray-600 text-sm">Try one of the example addresses above to get started!</p>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

// 1. Header Component
function Header({ 
  network,
  setNetwork,
  networks,
  wallet,
  onBackToLanding
}: {
  network: keyof typeof NETWORKS;
  setNetwork: (network: keyof typeof NETWORKS) => void;
  networks: typeof NETWORKS;
  wallet: React.ReactNode;
  onBackToLanding?: () => void;
}) {
  return (
    <header className="flex h-16 w-full items-center justify-between border-b border-gray-700/50 bg-gray-900/80 backdrop-blur-xl px-3 sm:px-6 shrink-0 shadow-lg shadow-purple-500/5">
      <div className="flex items-center space-x-2 sm:space-x-4">
        {onBackToLanding && (
          <button
            onClick={onBackToLanding}
            className="text-gray-400 hover:text-white transition-colors text-sm sm:text-base"
          >
            <span className="hidden sm:inline">← Back to Home</span>
            <span className="sm:hidden">←</span>
          </button>
        )}
        {/* Logo */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <img
            src="/sea-level-logo.png"
            alt="Sealevel Studio"
            className="h-8 sm:h-10 w-auto"
            style={{ maxHeight: '40px' }}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <div className="text-lg sm:text-xl font-bold tracking-tighter">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-500 animate-gradient hidden sm:inline">
              Sealevel Studio
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center space-x-1.5 sm:space-x-3">
        {/* Social Connect - Compact */}
        <SocialConnectButton />
        
        {/* Network Selector - Enhanced - Icons only on mobile */}
        <button className="flex items-center space-x-1 sm:space-x-2 rounded-lg bg-gradient-to-r from-gray-800 to-gray-700/50 px-2 sm:px-4 py-2 text-sm font-medium text-gray-200 hover:from-gray-700 hover:to-gray-600/50 transition-all border border-gray-600/50 hover:border-purple-500/50 shadow-lg hover:shadow-purple-500/20 relative group">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="hidden sm:inline">{networks[network].name}</span>
          <ChevronDown className="h-4 w-4 group-hover:text-purple-400 transition-colors" />
          <select
            value={network}
            onChange={(e) => {
              const newNetwork = e.target.value as keyof typeof NETWORKS;
              // Block mainnet access
              if (newNetwork === 'mainnet') {
                console.warn('Mainnet access is disabled. This site is devnet-only.');
                return;
              }
              setNetwork(newNetwork);
            }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          >
            {Object.entries(networks)
              .filter(([key]) => key !== 'mainnet') // Hide mainnet option
              .map(([key, config]) => (
                <option key={key} value={key}>
                  {config.name}
                </option>
              ))}
          </select>
        </button>
        
        {/* Wallet Button */}
        <div className="flex items-center">
          {wallet}
        </div>
        
        {/* User Profile - Compact Dropdown */}
        <UserProfileWidget />
      </div>
    </header>
  );
}

// 2. Sidebar Component
function Sidebar({ 
  activeView, 
  setActiveView,
  onViewChange 
}: { 
  activeView: string; 
  setActiveView: (view: string) => void;
  onViewChange?: () => void;
}) {
  const navItems = [
    // Core Tools
    { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 className="h-4 w-4" />, section: 'core' },
    { id: 'inspector', label: 'Account Inspector', icon: <Search className="h-4 w-4" />, section: 'core' },
    { id: 'builder', label: 'Transaction Builder', icon: <Wrench className="h-4 w-4" />, section: 'core' },
    { id: 'scanner', label: 'Arbitrage Scanner', icon: <TrendingUp className="h-4 w-4" />, section: 'core' },
    { id: 'bundler', label: 'Transaction Bundler', icon: <Layers className="h-4 w-4" />, section: 'core' },
    { id: 'quick-launch', label: 'Quick Launch', icon: <Rocket className="h-4 w-4" />, section: 'core', badge: 'New' },
    { id: 'pumpfun-sniper', label: 'Pump.fun Sniper', icon: <Zap className="h-4 w-4" />, section: 'core', badge: 'AI' },
    { id: 'marketing-bot', label: 'Marketing Bot', icon: <Zap className="h-4 w-4" />, section: 'core', badge: 'AI' },
    
    // Revenue
    { id: 'presale', label: 'SEAL Presale', icon: <TrendingUp className="h-4 w-4" />, section: 'revenue', badge: 'Hot' },
    { id: 'premium', label: 'Premium Services', icon: <Zap className="h-4 w-4" />, section: 'revenue' },
    { id: 'revenue', label: 'Pricing & Revenue', icon: <DollarSign className="h-4 w-4" />, section: 'revenue' },
    
    // AI
    { id: 'cyber-playground', label: 'AI Cyber Playground', icon: <Brain className="h-4 w-4" />, section: 'ai' },
    
    // Tools Hub
    { id: 'tools', label: 'Developer Dashboard', icon: <Code className="h-4 w-4" />, section: 'tools', badge: 'Pro' },
    { id: 'rent-reclaimer', label: 'Rent Reclaimer', icon: <Coins className="h-4 w-4" />, section: 'tools' },
    { id: 'faucet', label: 'Devnet Faucet', icon: <Droplet className="h-4 w-4" />, section: 'tools' },
    
    // Legacy/Other
    { id: 'simulation', label: 'Simulation', icon: <Play className="h-4 w-4" />, section: 'other' },
    { id: 'exporter', label: 'Code Exporter', icon: <Code className="h-4 w-4" />, section: 'other' },
    { id: 'attestation', label: 'VeriSol Attestation', icon: <ShieldCheck className="h-4 w-4" />, section: 'other' },
    { id: 'web2', label: 'Web2 Tools', icon: <Terminal className="h-4 w-4" /> },
    { id: 'twitter-bot', label: 'Twitter Bot', icon: <Twitter className="h-4 w-4" />, section: 'social' },
    { id: 'substack-bot', label: 'Substack Bot', icon: <Book className="h-4 w-4" />, section: 'social' },
    { id: 'telegram-bot', label: 'Telegram Bot', icon: <MessageCircle className="h-4 w-4" />, section: 'social' },
    { id: 'charts', label: 'Charts & Visualizations', icon: <LineChart className="h-4 w-4" />, section: 'tools' },
    { id: 'wallets', label: 'Wallet Manager', icon: <Wallet className="h-4 w-4" /> },
    { id: 'rd-console', label: 'R&D Console', icon: <Lock className="h-4 w-4" /> },
    { id: 'cybersecurity', label: 'Cybersecurity Dashboard', icon: <Shield className="h-4 w-4" /> },
    { id: 'docs', label: 'Documentation', icon: <Book className="h-4 w-4" /> },
    { id: 'admin', label: 'Admin Analytics', icon: <BarChart3 className="h-4 w-4" /> },
  ];

  const coreItems = navItems.filter(item => item.section === 'core');
  const revenueItems = navItems.filter(item => item.section === 'revenue');
  const aiItems = navItems.filter(item => item.section === 'ai');
  const toolsItems = navItems.filter(item => item.section === 'tools');
  const otherItems = navItems.filter(item => !item.section || item.section === 'other');

  return (
    <nav className="flex w-64 flex-col border-r border-gray-700 bg-gray-900/50 p-4 shrink-0 custom-scrollbar overflow-y-auto">
      <ul className="flex-1 space-y-6">
        {/* Core Tools */}
        {coreItems.length > 0 && (
          <li>
            <div className="text-xs font-semibold text-gray-500 uppercase mb-2 px-3">Core</div>
            <ul className="space-y-1">
              {coreItems.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => {
                      if (item.id !== activeView) {
                        if (onViewChange) onViewChange();
                      }
                      setActiveView(item.id);
                    }}
                    className={`
                      flex w-full items-center space-x-3 rounded-md px-3 py-2 text-left text-sm font-medium
                      transition-colors
                      ${
                        activeView === item.id
                          ? 'bg-purple-600/20 text-purple-300'
                          : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                      }
                    `}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </li>
        )}

        {/* Revenue */}
        {revenueItems.length > 0 && (
          <li>
            <div className="text-xs font-semibold text-gray-500 uppercase mb-2 px-3">Revenue</div>
            <ul className="space-y-1">
              {revenueItems.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => {
                      if (item.id !== activeView) {
                        if (onViewChange) onViewChange();
                      }
                      setActiveView(item.id);
                    }}
                    className={`
                      flex w-full items-center space-x-3 rounded-md px-3 py-2 text-left text-sm font-medium
                      transition-colors
                      ${
                        activeView === item.id
                          ? 'bg-purple-600/20 text-purple-300'
                          : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                      }
                    `}
                  >
                    {item.icon}
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span className="text-xs bg-gradient-to-r from-orange-500 to-red-500 text-white px-2 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </li>
        )}

        {/* AI */}
        {aiItems.length > 0 && (
          <li>
            <div className="text-xs font-semibold text-gray-500 uppercase mb-2 px-3">AI</div>
            <ul className="space-y-1">
              {aiItems.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => {
                      if (item.id !== activeView) {
                        if (onViewChange) onViewChange();
                      }
                      setActiveView(item.id);
                    }}
                    className={`
                      flex w-full items-center space-x-3 rounded-md px-3 py-2 text-left text-sm font-medium
                      transition-colors
                      ${
                        activeView === item.id
                          ? 'bg-purple-600/20 text-purple-300'
                          : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                      }
                    `}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </li>
        )}

        {/* Tools Hub */}
        {toolsItems.length > 0 && (
          <li>
            <div className="text-xs font-semibold text-gray-500 uppercase mb-2 px-3">Tools</div>
            <ul className="space-y-1">
              {toolsItems.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => {
                      if (item.id !== activeView) {
                        if (onViewChange) onViewChange();
                      }
                      setActiveView(item.id);
                    }}
                    className={`
                      flex w-full items-center space-x-3 rounded-md px-3 py-2 text-left text-sm font-medium
                      transition-colors
                      ${
                        activeView === item.id
                          ? 'bg-purple-600/20 text-purple-300'
                          : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                      }
                    `}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </li>
        )}

        {/* Social */}
        {navItems.filter(item => item.section === 'social').length > 0 && (
          <li>
            <div className="text-xs font-semibold text-gray-500 uppercase mb-2 px-3">Social</div>
            <ul className="space-y-1">
              {navItems.filter(item => item.section === 'social').map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => {
                      if (item.id !== activeView) {
                        if (onViewChange) onViewChange();
                      }
                      setActiveView(item.id);
                    }}
                    className={`
                      flex w-full items-center space-x-3 rounded-md px-3 py-2 text-left text-sm font-medium
                      transition-colors
                      ${
                        activeView === item.id
                          ? 'bg-purple-600/20 text-purple-300'
                          : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                      }
                    `}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </li>
        )}

        {/* Other */}
        {otherItems.length > 0 && (
          <li>
            <div className="text-xs font-semibold text-gray-500 uppercase mb-2 px-3">Other</div>
            <ul className="space-y-1">
              {otherItems.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => {
                      if (item.id !== activeView) {
                        if (onViewChange) onViewChange();
                      }
                      setActiveView(item.id);
                    }}
                    className={`
                      flex w-full items-center space-x-3 rounded-md px-3 py-2 text-left text-sm font-medium
                      transition-colors
                      ${
                        activeView === item.id
                          ? 'bg-purple-600/20 text-purple-300'
                          : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                      }
                    `}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </li>
        )}
      </ul>
      {/* Opaque Logo */}
      <div className="mt-auto pt-8 pb-4 flex justify-center">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="h-16 w-auto opacity-10"
          style={{ maxHeight: '64px' }}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        >
          <source src="/logo-video.mp4" type="video/mp4" />
          <source src="/logo-video.webm" type="video/webm" />
        </video>
      </div>
    </nav>
  );
}

// 3. Main Content Area Component
function MainContent({ activeView, setActiveView, connection, network, publicKey }: { activeView: string; setActiveView: (view: string) => void; connection: Connection; network: keyof typeof NETWORKS; publicKey: PublicKey | null }) {
  const [transactionPreview, setTransactionPreview] = useState<{
    transaction: any;
    cost: any;
  } | null>(null);
  const [inspectorSearchQuery, setInspectorSearchQuery] = useState<string>('');

  const handleTransactionBuilt = (transaction: any, cost: any) => {
    setTransactionPreview({ transaction, cost });
  };

  const handleTransactionExecute = async () => {
    if (!transactionPreview) return;
    // Execute transaction logic here
    console.log('Executing transaction...');
  };

  const handlePreviewClose = () => {
    setTransactionPreview(null);
  };

  const handleArbitrageBuild = (opportunity: any) => {
    // Switch to builder view and pass opportunity
    setActiveView('builder');
    // The opportunity will be handled by the builder
    console.log('Building transaction for opportunity:', opportunity);
  };

  // Transaction Builder has its own full-screen layout
  if (activeView === 'builder') {
    return <UnifiedTransactionBuilder onTransactionBuilt={handleTransactionBuilt} onBack={() => setActiveView('inspector')} />;
  }

  // Scanner has its own full-screen layout
  if (activeView === 'scanner') {
    return <ArbitrageScanner onBuildTransaction={handleArbitrageBuild} onBack={() => setActiveView('inspector')} />;
  }

  // Developer Dashboard has its own full-screen layout
  if (activeView === 'tools') {
    return <DeveloperDashboard onBack={() => setActiveView('inspector')} />;
  }

  // Rugless Launchpad has its own full-screen layout
  if (activeView === 'launchpad') {
    return <RuglessLaunchpad onBack={() => setActiveView('inspector')} />;
  }

  // Pump.fun AI Sniper has its own full-screen layout
  if (activeView === 'pumpfun-sniper') {
    return <PumpFunSniper onBack={() => setActiveView('inspector')} />;
  }

  if (activeView === 'premium') {
    return <PremiumServices 
      onBack={() => setActiveView('inspector')} 
      onNavigateToWalletManager={() => setActiveView('wallets')}
      onNavigateToBundler={() => setActiveView('bundler')}
      onNavigateToAdvertising={() => setActiveView('advertising')}
      onNavigateToServiceBot={() => setActiveView('service-bot')}
    />;
  }

  // Transaction Bundler has its own full-screen layout
  if (activeView === 'bundler') {
    return <TransactionBundler onBack={() => setActiveView('inspector')} />;
  }

  // Quick Launch has its own layout
  if (activeView === 'quick-launch') {
    return (
      <div className="max-w-4xl mx-auto">
        <button onClick={() => setActiveView('inspector')} className="mb-4 text-gray-400 hover:text-white">← Back</button>
        <QuickLaunch onSuccess={(mint) => console.log('Launched:', mint)} />
      </div>
    );
  }

  // Marketing Bot has its own layout
  if (activeView === 'marketing-bot') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6 overflow-y-auto max-h-[calc(100vh-4rem)]">
        <button onClick={() => setActiveView('inspector')} className="mb-4 text-gray-400 hover:text-white">← Back</button>
        <MarketingBot />
      </div>
    );
  }

  // Advertising Bots has its own full-screen layout
  if (activeView === 'advertising') {
    return <AdvertisingBots onBack={() => setActiveView('premium')} />;
  }

  // Service Bot has its own full-screen layout
  if (activeView === 'service-bot') {
    return <ServiceBot onBack={() => setActiveView('premium')} />;
  }

  // Web2 Tools has its own full-screen layout
  if (activeView === 'web2') {
    return <Web2Tools 
      onBack={() => setActiveView('inspector')}
      onNavigateToSocial={() => setActiveView('social')}
    />;
  }

  // Social Features has its own full-screen layout
  if (activeView === 'social') {
    return <SocialFeatures onBack={() => setActiveView('web2')} />;
  }

  // Wallet Manager has its own full-screen layout
  if (activeView === 'wallets') {
    return <WalletManager onBack={() => setActiveView('inspector')} />;
  }

  if (activeView === 'custodial-wallet') {
    return <CustodialWalletTool onBack={() => setActiveView('tools-hub')} />;
  }

  // R&D Console is a floating component, always available
  // Navigation item is for reference - console can be opened from anywhere

  // Cybersecurity Dashboard has its own full-screen layout
  if (activeView === 'cybersecurity') {
    return <CybersecurityDashboard onBack={() => setActiveView('inspector')} />;
  }

  // Documentation has its own full-screen layout
  if (activeView === 'docs') {
    return <DocsView onBack={() => setActiveView('inspector')} />;
  }

  // Admin Analytics has its own full-screen layout
  if (activeView === 'admin') {
    return <AdminAnalytics onBack={() => setActiveView('inspector')} />;
  }

  // SEAL Presale has its own full-screen layout
  if (activeView === 'presale') {
    return <SealPresale onBack={() => setActiveView('inspector')} />;
  }

  // Revenue Landing has its own full-screen layout
  if (activeView === 'revenue') {
    return (
      <RevenueLanding
        onBack={() => setActiveView('inspector')}
        onNavigateToPresale={() => setActiveView('presale')}
        onNavigateToPremium={() => setActiveView('premium')}
        onNavigateToVeriSol={() => setActiveView('attestation')}
      />
    );
  }

  // AI Cyber Playground has its own full-screen layout
  if (activeView === 'cyber-playground') {
    return <AICyberPlayground onBack={() => setActiveView('inspector')} />;
  }

  // Rent Reclaimer has its own full-screen layout
  if (activeView === 'rent-reclaimer') {
    return <RentReclaimer onBack={() => setActiveView('inspector')} />;
  }

  // Devnet Faucet has its own full-screen layout
  if (activeView === 'faucet') {
    return <DevnetFaucet onBack={() => setActiveView('inspector')} />;
  }

  // Tools Hub has its own full-screen layout
  if (activeView === 'tools-hub') {
    return <ToolsHub onBack={() => setActiveView('inspector')} onNavigateToTool={(toolId) => setActiveView(toolId)} />;
  }

  // Twitter Bot has its own full-screen layout
  if (activeView === 'twitter-bot') {
    return <TwitterBot onBack={() => setActiveView('inspector')} />;
  }

  // Substack Bot has its own full-screen layout
  if (activeView === 'substack-bot') {
    return <SubstackBot onBack={() => setActiveView('inspector')} />;
  }

  // Telegram Bot has its own full-screen layout
  if (activeView === 'telegram-bot') {
    return <TelegramBot onBack={() => setActiveView('inspector')} />;
  }

  // Charts View has its own full-screen layout
  if (activeView === 'charts') {
    return <ChartsView onBack={() => setActiveView('inspector')} />;
  }

  // Developer Community has its own full-screen layout
  if (activeView === 'freelance-devs') {
    return <DeveloperCommunity onBack={() => setActiveView('inspector')} />;
  }

  // Default single-column layout for other views
  return (
    <>
      <PricingBanner onNavigateToPricing={() => setActiveView('revenue')} />
      <FreeTrialBanner />
      <main className="flex-1 overflow-y-auto p-6 md:p-8">
        {activeView === 'dashboard' && (
          <DashboardView 
            onSearchAddress={(address) => {
              setInspectorSearchQuery(address);
              setActiveView('inspector');
            }}
            onNavigateToInspector={() => setActiveView('inspector')}
          />
        )}
        {activeView === 'inspector' && (
          <div className="flex flex-col h-full">
            <AccountInspectorView 
              connection={connection} 
              network={network} 
              publicKey={publicKey}
              initialSearchQuery={inspectorSearchQuery}
            />
            <div className="mt-6 px-6 pb-6">
              <RecentTransactions featureName="account-inspector" limit={5} />
            </div>
          </div>
        )}
        {activeView === 'simulation' && <SimulationView transactionDraft={transactionPreview?.transaction} />}
        {activeView === 'exporter' && <ExporterView />}
        {activeView === 'attestation' && <VeriSolAttestation connection={connection} />}
      </main>

      {transactionPreview && (
        <TransactionPreview
          transaction={transactionPreview.transaction}
          cost={transactionPreview.cost}
          onExecute={handleTransactionExecute}
          onClose={handlePreviewClose}
        />
      )}
    </>
  );
}

// ### Other Views (Placeholders) ###

function SimulationView({ transactionDraft }: { transactionDraft: any }) {
  return (
    <div className="relative">
      <img
        src="/sea-level-logo.png"
        alt="Sealevel Studio Background"
        className="absolute inset-0 w-full h-full object-contain opacity-[0.04] pointer-events-none"
        style={{
          objectPosition: 'center right',
          transform: 'scale(0.65) rotate(-4deg)',
          zIndex: 0,
        }}
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
      <div style={{ zIndex: 1, position: 'relative' }} className="space-y-6">
        <ComingSoonBanner
          title="State-Diff Simulator"
          description="We are polishing the Solana state diff visualizer. Soon you will be able to compare before/after states, account deltas, and emitted logs in a single pane."
          highlights={[
            'Visual balance changes, rent impacts, and CPI cascades',
            'Simulate across devnet/mainnet forks with deterministic snapshots',
            'Share signed simulation bundles with teammates',
          ]}
          checklist={[
            'Finalizing compute unit historians',
            'Adding fault isolation for failed CUs',
            'Hardening transaction guards & caching',
          ]}
          accent="blue"
        >
          <p className="text-sm text-gray-300">
            While we finish the simulator, you can still capture draft instructions below and share them with QA.
          </p>
          {transactionDraft && (
            <div className="mt-4 p-4 bg-blue-900/20 border border-blue-700 rounded-2xl">
              <h3 className="text-lg font-semibold text-blue-200 mb-2">Current Transaction Draft</h3>
              <pre className="bg-blue-950/60 p-3 rounded text-sm overflow-x-auto text-blue-100 font-mono">
                {JSON.stringify(transactionDraft, null, 2)}
              </pre>
            </div>
          )}
        </ComingSoonBanner>
      </div>
    </div>
  );
}

function ExporterView() {
  return (
    <div className="relative">
      <img
        src="/sea-level-logo.png"
        alt="Sealevel Studio Background"
        className="absolute inset-0 w-full h-full object-contain opacity-[0.04] pointer-events-none"
        style={{
          objectPosition: 'center right',
          transform: 'scale(0.65) rotate(2deg)',
          zIndex: 0,
        }}
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
      <div style={{ zIndex: 1, position: 'relative' }}>
        <ComingSoonBanner
          title="Copy-Paste Code Exporter"
          description="Automatic client, server, and script generation is wrapping up. You'll soon export fully typed SDK snippets for JS, Rust, Python, and Anchor without leaving the IDE."
          highlights={[
            'Generates Anchor, web3.js, helius, and validator-ready scripts',
            'Context-aware comments & guardrails baked in',
          ]}
          checklist={[
            'Finishing transaction recipe templating',
            'Adding pricing transparency for bulk exports',
          ]}
          accent="purple"
        />
      </div>
    </div>
  );
}

interface LoaderContextInfo {
  featureName: string;
  description: string;
  directions?: string[];
  cost?: string;
  disclaimer?: string;
  extraNote?: string;
}

// Landing Page Component is now imported from ./components/LandingPage

// Main App Component
export default function App() {
  return (
    <UserProvider>
      <AppContent />
    </UserProvider>
  );
}

function AppContent() {
  // ALL HOOKS MUST BE CALLED AT THE TOP - BEFORE ANY CONDITIONAL RETURNS
  const [currentScreen, setCurrentScreen] = useState<'landing' | 'feature-loader' | 'wallet-connect' | 'disclaimer' | 'tutorial' | 'app'>('landing');
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [previousView, setPreviousView] = useState<string>('');
  const [activeView, setActiveView] = useState('dashboard');
  
  // Listen for presale navigation from popup
  useEffect(() => {
    const handlePresaleNavigation = () => {
      setActiveView('presale');
    };
    
    window.addEventListener('navigate-to-presale', handlePresaleNavigation);
    return () => {
      window.removeEventListener('navigate-to-presale', handlePresaleNavigation);
    };
  }, []);
  const [rdConsoleMinimized, setRdConsoleMinimized] = useState(true);
  const [selectedBlockchain, setSelectedBlockchain] = useState<BlockchainType | null>('solana');
  const bleedingEdgeEnabled = process.env.NEXT_PUBLIC_BLEEDING_EDGE_ENABLED === 'true';
  const { publicKey } = useWallet();
  const { network, setNetwork } = useNetwork();
  const { shouldShowTutorial, completeTutorial } = useTutorial();
  
  // Create connection based on network
  const connection = useMemo(() => {
    return new Connection(NETWORKS[network].rpcUrl, 'confirmed');
  }, [network]);

  // Open console when nav item is clicked
  useEffect(() => {
    if (activeView === 'rd-console') {
      setRdConsoleMinimized(false);
    }
  }, [activeView]);

  // Store selected blockchain in localStorage
  useEffect(() => {
    if (selectedBlockchain && typeof window !== 'undefined') {
      localStorage.setItem('sealevel-blockchain', selectedBlockchain);
    }
  }, [selectedBlockchain]);

  // Load selected blockchain from localStorage, default to Solana
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sealevel-blockchain');
      if (saved && ['polkadot', 'solana', 'ethereum', 'polygon', 'avalanche', 'base', 'arbitrum', 'optimism', 'sui', 'aptos'].includes(saved)) {
        setSelectedBlockchain(saved as BlockchainType);
      } else {
        // Default to Solana if nothing saved
        setSelectedBlockchain('solana');
      }
    }
  }, []);

  // Stable callbacks for loader to prevent re-renders - MUST be before any conditional returns
  const handleLoaderComplete = useCallback(() => {
    setIsPageLoading(false);
    // After feature loader completes, go to wallet connect
    if (currentScreen === 'feature-loader') {
      setCurrentScreen('wallet-connect');
    }
  }, [currentScreen]);

  const handleLoaderEnter = useCallback(() => {
    // Stay on current view when entering
    setIsPageLoading(false);
  }, []);

  const handleGetStarted = (blockchain?: BlockchainType) => {
    // Wrap everything in a try-catch to catch any errors
    try {
      // Ensure we're on the client side
      if (typeof window === 'undefined') {
        return;
      }
      
      console.log('handleGetStarted called', { blockchain });
      
      // Set blockchain first
      const targetBlockchain = blockchain || 'solana';
      if (targetBlockchain !== 'polkadot' && targetBlockchain !== 'solana') {
        // Note: Toast notification should be shown by the component
        console.info(`${targetBlockchain.charAt(0).toUpperCase() + targetBlockchain.slice(1)} support is coming soon! For now, you can use Polkadot or Solana which have full feature support.`);
        setSelectedBlockchain('solana');
      } else {
        setSelectedBlockchain(targetBlockchain);
      }
      
      // Show feature loader first
      setIsPageLoading(true);
      setCurrentScreen('feature-loader');
      
    } catch (error) {
      console.error('Error in handleGetStarted:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      
      // Show user-friendly error message
      // Note: Toast notification should be shown by the component
      console.error('Something went wrong. Please try again or refresh the page.');
      
      // Fallback: try to navigate to app
      try {
        setCurrentScreen('app');
        setIsPageLoading(false);
      } catch (fallbackError) {
        console.error('Fallback navigation failed:', fallbackError);
        // Last resort: reload the page
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      }
    }
  };

  const handleDisclaimerAgree = () => {
    try {
      // Save disclaimer agreement to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('sealevel-disclaimer-agreed', 'true');
      }
      
      // Safely check tutorial status with fallback
      let showTutorial = false;
      
      try {
        if (shouldShowTutorial && typeof shouldShowTutorial === 'function') {
          showTutorial = shouldShowTutorial('accountInspector') || shouldShowTutorial('instructionAssembler');
        }
      } catch (tutorialError) {
        console.error('Error checking tutorial:', tutorialError);
        showTutorial = false;
      }
      
      // Navigate to appropriate screen
      setCurrentScreen(showTutorial ? 'tutorial' : 'app');
      
    } catch (error) {
      console.error('Error in handleDisclaimerAgree:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      // Fallback to app screen
      setCurrentScreen('app');
      setIsPageLoading(false);
    }
  };

  const handleBackToLanding = () => {
    setIsPageLoading(true); // Show loading animation when going back to landing
    setCurrentScreen('landing');
  };

  // Check if user has wallet (for wallet-connect screen)
  const { user } = useUser();

  // Effect to handle wallet connection completion
  useEffect(() => {
    if (currentScreen === 'wallet-connect' && user) {
      // User just connected wallet
      // The LoginGate component will handle showing the welcome tutorial
      // After tutorial is complete, proceed to disclaimer or app
      const disclaimerAgreed = typeof window !== 'undefined' ? localStorage.getItem('sealevel-disclaimer-agreed') : null;
      const tutorialCompleted = typeof window !== 'undefined' ? localStorage.getItem('sealevel-welcome-tutorial-completed') : null;
      
      // Only proceed if tutorial is completed (LoginGate handles showing it)
      if (tutorialCompleted) {
        if (!disclaimerAgreed) {
          setCurrentScreen('disclaimer');
        } else {
          // Check if we need to show the feature tutorial
          let showTutorial = false;
          try {
            if (shouldShowTutorial && typeof shouldShowTutorial === 'function') {
              showTutorial = shouldShowTutorial('accountInspector') || shouldShowTutorial('instructionAssembler');
            }
          } catch (tutorialError) {
            console.error('Error checking tutorial:', tutorialError);
            showTutorial = false;
          }
          
          // Navigate to appropriate screen
          setCurrentScreen(showTutorial ? 'tutorial' : 'app');
        }
      }
    }
  }, [currentScreen, user, shouldShowTutorial]);

  let content: React.ReactNode;

  if (currentScreen === 'landing') {
    content = <LandingPage onGetStarted={handleGetStarted} />;
  } else if (currentScreen === 'feature-loader') {
    // Show feature loader
    content = (
      <FeatureHighlightLoader
        isLoading={true}
        duration={4000}
        onAnimationComplete={handleLoaderComplete}
        currentFeature="sealevel-studio"
        context={{
          featureName: 'Sealevel Studio',
          description: 'Welcome to Sealevel Studio - Your Solana Development Platform',
          directions: [
            'Explore powerful transaction building tools',
            'Connect your wallet to get started',
            'Access AI agents and arbitrage scanners',
          ],
        }}
      />
    );
  } else if (currentScreen === 'wallet-connect') {
    // Show wallet connect (LoginGate) - it will show until user connects
    // Prepare app content to pass to LoginGate - it will render once authenticated
    const appContent = (
      <div className="flex h-screen bg-gray-900">
        <Sidebar activeView={activeView} setActiveView={setActiveView} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header
            network={network}
            setNetwork={setNetwork}
            networks={NETWORKS}
            wallet={<WalletButton />}
            onBackToLanding={handleBackToLanding}
          />
          <MainContent
            activeView={activeView}
            setActiveView={setActiveView}
            connection={connection}
            network={network}
            publicKey={publicKey}
          />
        </div>
      </div>
    );
    content = <LoginGate>{appContent}</LoginGate>;
  } else if (currentScreen === 'disclaimer') {
    content = (
      <div className="min-h-screen bg-gray-900">
        <DisclaimerAgreement onAgree={handleDisclaimerAgree} />
      </div>
    );
  } else if (currentScreen === 'tutorial') {
    content = (
      <TutorialFlow 
        onComplete={() => setCurrentScreen('app')} 
      />
    );
  } else {
    // Main app interface
    const isFullScreenView = activeView === 'builder' || activeView === 'scanner' || activeView === 'tools' || activeView === 'premium' || activeView === 'web2' || activeView === 'wallets' || activeView === 'cybersecurity' || activeView === 'docs' || activeView === 'admin' || activeView === 'bundler' || activeView === 'advertising' || activeView === 'social' || activeView === 'service-bot' || activeView === 'presale' || activeView === 'cyber-playground' || activeView === 'tools-hub' || activeView === 'revenue' || activeView === 'rent-reclaimer' || activeView === 'faucet' || activeView === 'launchpad' || activeView === 'pumpfun-sniper' || activeView === 'twitter-bot' || activeView === 'substack-bot' || activeView === 'telegram-bot' || activeView === 'charts' || activeView === 'custodial-wallet';

    // Get loading quote based on destination view
    const getLoadingQuote = () => {
      switch (activeView) {
        case 'inspector':
          return { text: "In crypto, you're not buying a security, you're buying into a community.", author: "Naval Ravikant" };
        case 'builder':
          return { text: "Code is law.", author: "Ethereum Community" };
        case 'scanner':
          return { text: "The blockchain is an incorruptible digital ledger.", author: "Don Tapscott" };
        case 'presale':
          return { text: "The future of money is programmable.", author: "Vitalik Buterin" };
        case 'cyber-playground':
          return { text: "Web3 is about restoring power to people.", author: "Web3 Advocates" };
        default:
          return { text: "Innovation distinguishes between a leader and a follower.", author: "Steve Jobs" };
      }
    };

    const getLoadingContext = (): LoaderContextInfo => {
      const bundlerCost = `${SEAL_TOKEN_ECONOMICS.pricing.bundler_multi_send.toLocaleString()} SEAL per bundle + ${SEAL_TOKEN_ECONOMICS.pricing.bundler_recipient} SEAL per recipient`;
      const twitterCost = `${SEAL_TOKEN_ECONOMICS.pricing.twitter_bot_setup.toLocaleString()} SEAL setup / ${SEAL_TOKEN_ECONOMICS.pricing.twitter_bot_monthly.toLocaleString()} SEAL monthly`;
      const telegramCost = `${SEAL_TOKEN_ECONOMICS.pricing.telegram_bot_setup.toLocaleString()} SEAL setup / ${SEAL_TOKEN_ECONOMICS.pricing.telegram_bot_monthly.toLocaleString()} SEAL monthly`;
      const builderCost = `${SEAL_TOKEN_ECONOMICS.pricing.advanced_transaction.toLocaleString()} SEAL per advanced build`;
      const scannerCost = `${SEAL_TOKEN_ECONOMICS.pricing.scanner_scan.toLocaleString()} SEAL per scan`;

      const baseContext: LoaderContextInfo = {
        featureName: 'Sealevel Studio',
        description: 'Spinning up your workspace with wallet, network, and AI assistants.',
        directions: [
          'Connect a wallet or stay in read-only mode',
          'Select Devnet or Mainnet RPC access',
        ],
        cost: 'Free tier usage (limits apply)',
        disclaimer: 'Experimental tooling. Verify all addresses before signing.',
      };

      const contextMap: Record<string, LoaderContextInfo> = {
        inspector: {
          featureName: 'Account Inspector',
          description: 'Fetching account data, lamport balances, and token state.',
          directions: [
            'Paste or select an address',
            'Use history panel to compare snapshots',
          ],
          disclaimer: 'Data is fetched directly from Solana RPC endpoints.',
        },
        builder: {
          featureName: 'Instruction Builder',
          description: 'Preparing programmable transaction templates with guardrails.',
          directions: [
            'Select a program + instruction',
            'Fill required accounts & args, then export or simulate',
          ],
          cost: builderCost,
          disclaimer: 'Transactions execute on-chain; double check keys before sending.',
        },
        scanner: {
          featureName: 'Arbitrage Scanner',
          description: 'Booting price oracles, MEV defenses, and liquidity watchers.',
          directions: [
            'Select pools or let AI suggest routes',
            'Configure alert thresholds & auto-trading rules',
          ],
          cost: scannerCost,
          disclaimer: 'Signals are informational, not trading advice.',
        },
        bundler: {
          featureName: 'Transaction Bundler',
          description: 'Loading multi-send builder with size estimator and wallet registry.',
          directions: [
            'Connect wallet & paste recipient list',
            'Estimate size before broadcast',
          ],
          cost: bundlerCost,
          disclaimer: 'Multi-sends are irreversible. Ensure you comply with sanctions & AML laws.',
        },
        'twitter-bot': {
          featureName: 'Twitter Automation Bot',
          description: 'Linking OAuth session, scheduling queue, and AI agent policies.',
          directions: [
            'Authenticate with Twitter and scope permissions',
            'Draft content or configure autonomous agent cadence',
          ],
          cost: twitterCost,
          disclaimer: 'Respect platform policies and local communications law; logs are locally stored.',
        },
        'telegram-bot': {
          featureName: 'Telegram Command Center',
          description: 'Bootstrapping bot token storage and responder flows.',
          directions: [
            'Provide BotFather token securely',
            'Map commands to playbooks before activating',
          ],
          cost: telegramCost,
          disclaimer: 'Never spam or violate telecom regulations. You are responsible for distribution.',
        },
        'service-bot': {
          featureName: 'AI Service Desk',
          description: 'Preparing customer support macros and compliance guardrails.',
          directions: [
            'Select tone + escalation rules',
            'Feed FAQs or knowledge base links',
          ],
          cost: 'Usage billed per resolved session (quote on request)',
          disclaimer: 'Ensure responses respect privacy laws (GDPR/CCPA etc.).',
        },
        'substack-bot': {
          featureName: 'Substack Growth Bot',
          description: 'Linking newsletter API tokens and drafting drip sequences.',
          directions: [
            'Connect Substack API key',
            'Review queue before enabling auto-post',
          ],
          cost: 'Included in bot beta; SEAL usage billed later',
          disclaimer: 'Content must obey jurisdictional advertising law.',
        },
        presale: {
          featureName: 'Presale Portal',
          description: 'Validating wallet allowlist and vesting schedule preview.',
          directions: [
            'Connect wallet and pass KYC/region gates',
            'Select tranche and confirm token lockups',
          ],
          cost: 'Presale allocations vary per tranche',
          disclaimer: 'Not an offer to sell securities. Always comply with your local regulations.',
          extraNote: 'Countdown widget stays visible globally so you never miss go-live.',
        },
        docs: {
          featureName: 'Docs & Change Logs',
          description: 'Fetching latest on-chain references and integration guides.',
          directions: [
            'Use search to filter by stack',
            'Bookmark frequently used runbooks',
          ],
          cost: 'Free access',
          disclaimer: 'Documentation may describe beta features subject to change.',
        },
        web2: {
          featureName: 'Web2 Integrations',
          description: 'Loading CRM, analytics, and webhook blueprints.',
          directions: [
            'Store secrets in your self-hosted vault',
            'Review rate limits before syncing',
          ],
          cost: 'Usage billed per connector (coming soon)',
          disclaimer: 'Never paste production API keys into shared demos.',
        },
        launchpad: {
          featureName: 'Rugless Launchpad',
          description: 'Initializing token launch platform with fair launch mechanics and liquidity matching.',
          directions: [
            'Enter token details and supply',
            'Configure liquidity pool and launch parameters',
            'Review and execute launch transaction',
          ],
          cost: 'Platform fee + network transaction costs',
          disclaimer: 'Ensure you have proper authority and comply with local regulations.',
        },
        'pumpfun-sniper': {
          featureName: 'Pump.fun AI Sniper',
          description: 'Real-time token launch detection with AI-powered analysis and automated sniping.',
          directions: [
            'Start the stream to detect new token launches',
            'AI analyzes each token for sniping opportunities',
            'Configure auto-snipe settings or manually snipe tokens',
            'Monitor sniped tokens and track performance',
          ],
          cost: 'Transaction fees only (gas costs for snipes)',
          disclaimer: 'Sniping involves risk. Only invest what you can afford to lose. AI analysis is not financial advice.',
        },
        tools: {
          featureName: 'Developer Dashboard',
          description: 'Loading developer tools, token management, and automation features.',
          directions: [
            'Navigate between launch, management, and analytics tabs',
            'Use token manager for freeze/thaw/burn operations',
            'Configure automation bots for marketing',
          ],
          cost: 'Free tier available; premium features require SEAL tokens',
          disclaimer: 'Developer tools require appropriate token authority.',
        },
        premium: {
          featureName: 'Premium Services',
          description: 'Accessing premium features including wallet management, bundler, and advertising tools.',
          directions: [
            'Browse available premium services',
            'Connect wallet for SEAL token payments',
            'Activate services as needed',
          ],
          cost: 'Varies by service; see pricing page',
          disclaimer: 'Premium services require SEAL token balance.',
        },
        wallets: {
          featureName: 'Wallet Manager',
          description: 'Loading wallet management interface for multi-wallet operations.',
          directions: [
            'Import or create new wallets',
            'Manage wallet permissions and access',
            'Export wallet information securely',
          ],
          cost: 'Free for basic wallet management',
          disclaimer: 'Never share private keys. Store securely offline.',
        },
        advertising: {
          featureName: 'Advertising Bots',
          description: 'Initializing automated advertising and marketing campaign tools.',
          directions: [
            'Configure campaign parameters',
            'Set budget and targeting options',
            'Monitor campaign performance',
          ],
          cost: 'Campaign-based pricing; see premium services',
          disclaimer: 'Ensure compliance with advertising regulations.',
        },
        social: {
          featureName: 'Social Features',
          description: 'Loading social media integration and community management tools.',
          directions: [
            'Connect social media accounts',
            'Configure posting schedules',
            'Monitor engagement metrics',
          ],
          cost: 'Included in premium subscription',
          disclaimer: 'Respect platform terms of service.',
        },
        cybersecurity: {
          featureName: 'Cybersecurity Dashboard',
          description: 'Initializing security tools, audit scanners, and vulnerability detection.',
          directions: [
            'Run security scans on smart contracts',
            'Review audit reports and recommendations',
            'Configure security alerts',
          ],
          cost: 'Free for basic scans; advanced audits require payment',
          disclaimer: 'Security tools are informational; conduct professional audits for production.',
        },
        'cyber-playground': {
          featureName: 'AI Cyber Playground',
          description: 'Booting AI agents, autonomous trading systems, and intelligent automation.',
          directions: [
            'Configure AI agent strategies',
            'Set risk parameters and limits',
            'Monitor agent performance in real-time',
          ],
          cost: 'Usage-based pricing; see AI services section',
          disclaimer: 'AI agents execute real transactions. Set appropriate limits.',
        },
        admin: {
          featureName: 'Admin Analytics',
          description: 'Loading administrative dashboard with platform metrics and user analytics.',
          directions: [
            'View platform usage statistics',
            'Monitor system health and performance',
            'Access administrative controls',
          ],
          cost: 'Admin access only',
          disclaimer: 'Administrative access requires proper authorization.',
        },
        'rent-reclaimer': {
          featureName: 'Rent Reclaimer',
          description: 'Initializing tool to reclaim rent from closed accounts and optimize SOL usage.',
          directions: [
            'Scan for accounts eligible for rent reclamation',
            'Review potential SOL recovery',
            'Execute batch reclamation transactions',
          ],
          cost: 'Transaction fees only',
          disclaimer: 'Reclaiming rent closes accounts permanently. Verify before executing.',
        },
        faucet: {
          featureName: 'Devnet Faucet',
          description: 'Connecting to Solana devnet faucet for test SOL distribution.',
          directions: [
            'Enter your devnet wallet address',
            'Request test SOL for development',
            'Wait for confirmation and check balance',
          ],
          cost: 'Free (devnet only)',
          disclaimer: 'Devnet SOL has no real value. Use only for testing.',
        },
        'tools-hub': {
          featureName: 'Tools Hub',
          description: 'Loading centralized hub for all developer tools and utilities.',
          directions: [
            'Browse available tools and services',
            'Navigate to specific tools from the hub',
            'Access quick actions and shortcuts',
          ],
          cost: 'Free access',
          disclaimer: 'Tools may have individual usage costs.',
        },
        charts: {
          featureName: 'Charts & Visualizations',
          description: 'Loading market analytics, price charts, and on-chain data visualizations.',
          directions: [
            'Select tokens or pools to analyze',
            'Customize chart timeframes and metrics',
            'Export data for further analysis',
          ],
          cost: 'Free for basic charts; premium data requires subscription',
          disclaimer: 'Charts are for informational purposes only.',
        },
        revenue: {
          featureName: 'Pricing & Revenue',
          description: 'Loading pricing information, revenue dashboard, and subscription management.',
          directions: [
            'View service pricing and tiers',
            'Check subscription status and usage',
            'Manage payment methods and billing',
          ],
          cost: 'Varies by service tier',
          disclaimer: 'Pricing subject to change. Check current rates.',
        },
        'quick-launch': {
          featureName: 'Quick Launch',
          description: 'Initializing simplified token launch interface for rapid deployment.',
          directions: [
            'Enter token name and symbol',
            'Upload or generate token image',
            'Review launch details',
            'Execute launch - transaction auto-broadcasts to Twitter & Telegram',
          ],
          cost: 'Platform fee + network costs',
          disclaimer: 'Quick launch uses default settings. Transaction signature is automatically broadcast to all social platforms.',
          extraNote: '🚀 Transaction address is broadcast everywhere automatically!',
        },
        'rugless-launchpad': {
          featureName: 'Rugless Launchpad',
          description: 'Loading advanced token launchpad with full customization and protection.',
          directions: [
            'Configure token parameters (supply, liquidity, SEAL stake)',
            'Upload token image or use AI generation',
            'Review launch economics and protection',
            'Launch - transaction signature broadcasts to Twitter & Telegram automatically',
          ],
          cost: 'Platform fee + SOL lock + SEAL stake',
          disclaimer: 'Liquidity is locked for 7 days. Transaction signature is automatically shared on all social platforms.',
          extraNote: '🔒 Rugless protection + 📢 Auto-broadcast enabled',
        },
        'token-launcher': {
          featureName: 'Token Launcher',
          description: 'Loading token launch tools with automated social media broadcasting.',
          directions: [
            'Choose Quick Launch or Rugless Launchpad',
            'Configure your token',
            'Launch and watch transaction broadcast everywhere',
            'Transaction signature automatically posted to Twitter & Telegram',
          ],
          cost: 'Varies by launch type',
          disclaimer: 'All launches automatically broadcast transaction signatures to configured social platforms.',
          extraNote: '📢 Every launch transaction is broadcast automatically!',
        },
        'marketing-bot': {
          featureName: 'Marketing Bot',
          description: 'Loading AI-powered marketing automation with multi-platform posting.',
          directions: [
            'Select campaign mood and frequency',
            'Connect social media accounts',
            'Start automated posting campaign',
          ],
          cost: 'Credits per post; see pricing',
          disclaimer: 'Ensure social accounts are properly configured before starting.',
        },
        simulation: {
          featureName: 'Transaction Simulator',
          description: 'Preparing state-diff simulator for transaction testing and validation.',
          directions: [
            'Load transaction draft',
            'Run simulation and review state changes',
            'Export simulation results',
          ],
          cost: 'Free for basic simulations',
          disclaimer: 'Simulations are estimates; actual execution may vary.',
        },
        exporter: {
          featureName: 'Code Exporter',
          description: 'Loading code generation tools for exporting transactions to various formats.',
          directions: [
            'Select export format (JS, Rust, Python, etc.)',
            'Configure code generation options',
            'Copy or download generated code',
          ],
          cost: 'Free for basic exports',
          disclaimer: 'Generated code should be reviewed before use in production.',
        },
        attestation: {
          featureName: 'VeriSol Attestation',
          description: 'Initializing smart contract verification and attestation tools.',
          directions: [
            'Upload contract source code',
            'Run verification checks',
            'Generate attestation certificates',
          ],
          cost: 'Free for basic verification',
          disclaimer: 'Attestations are not a substitute for professional audits.',
        },
        'rd-console': {
          featureName: 'R&D Console',
          description: 'Opening research and development console for advanced experimentation.',
          directions: [
            'Access experimental features',
            'Run custom scripts and commands',
            'Monitor system logs and diagnostics',
          ],
          cost: 'Free access',
          disclaimer: 'R&D features may be unstable. Use with caution.',
        },
        'freelance-devs': {
          featureName: 'Developer Community',
          description: 'Loading developer marketplace and freelance developer directory.',
          directions: [
            'Browse available developers',
            'Post project requirements',
            'Connect with developers',
          ],
          cost: 'Platform fees apply',
          disclaimer: 'Verify developer credentials before engaging.',
        },
      };

      return contextMap[activeView] ?? baseContext;
    };

  // Map activeView to feature ID for loading screen
  const getCurrentFeatureId = (view: string): string => {
      switch (view) {
        case 'builder':
          return 'transaction-builder';
        case 'ai-agents':
          return 'ai-agents';
        case 'charts':
          return 'market-analytics';
        case 'cybersecurity':
        case 'cyber-playground':
          return 'security-tools';
        case 'twitter-bot':
        case 'telegram-bot':
        case 'substack-bot':
        case 'social':
          return 'social-features';
        case 'inspector':
        default:
          return 'transaction-builder'; // Default to transaction builder
      }
    };

    const appLayout = (
      <div className="h-screen flex flex-col bg-gray-900">
        {!isFullScreenView && (
          <Header 
            network={network} 
            setNetwork={setNetwork} 
            networks={NETWORKS} 
            wallet={<WalletButton />}
            onBackToLanding={handleBackToLanding}
          />
        )}
        
        <div className="flex-1 flex overflow-hidden">
          {!isFullScreenView && (
            <Sidebar 
              activeView={activeView} 
              setActiveView={setActiveView}
              onViewChange={() => setIsPageLoading(true)}
            />
          )}
          <MainContent 
            activeView={activeView}
            setActiveView={setActiveView}
            connection={connection} 
            network={network} 
            publicKey={publicKey} 
          />
        </div>
      </div>
    );

    content = (
      <ClientOnly>
        {/* Feature Highlight Loader Overlay */}
        <FeatureHighlightLoader
          isLoading={isPageLoading}
          duration={4000}
          onAnimationComplete={handleLoaderComplete}
          currentFeature={getCurrentFeatureId(activeView)}
          context={getLoadingContext()}
          onFeatureClick={(featureId) => {
            if (featureId === 'transaction-builder') {
              setActiveView('builder');
            } else if (featureId === 'ai-agents') {
              setActiveView('ai-agents');
            } else if (featureId === 'decentralized-exchange') {
              setActiveView('charts'); // DEX features in charts view
            } else if (featureId === 'security-tools') {
              setActiveView('cybersecurity');
            } else if (featureId === 'market-analytics') {
              setActiveView('charts');
            } else if (featureId === 'social-features') {
              setActiveView('twitter-bot'); // Start with Twitter bot
            }
          }}
          onEnterApp={handleLoaderEnter}
        />
        
        {bleedingEdgeEnabled ? (
          <BleedingEdgeWrapper enabled>{appLayout}</BleedingEdgeWrapper>
        ) : (
          appLayout
        )}
        
        {/* R&D Console - Floating (always available) */}
        <AdvancedRAndDConsole 
          initialMinimized={rdConsoleMinimized}
          onToggle={setRdConsoleMinimized}
        />
      </ClientOnly>
    );
  }

  return content;
}