'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Connection, PublicKey, AccountInfo } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, TokenAccountNotFoundError, getAccount, getMint } from '@solana/spl-token';
import { Search, Wrench, Play, Code, Wallet, ChevronDown, Copy, ExternalLink, AlertCircle, CheckCircle, Zap, Terminal, TrendingUp, ShieldCheck, Lock, Shield, Bot, Book, BarChart3, Brain, DollarSign, Coins, Droplet, Twitter, LineChart, MessageCircle, Layers, ArrowLeft } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import WalletButton from './components/WalletButton';
import { UnifiedTransactionBuilder } from './components/UnifiedTransactionBuilder';
import { TransactionPreview } from './components/TransactionPreview';
import { ClientOnly } from './components/ClientOnly';
import { ArbitrageScanner } from './components/ArbitrageScanner';
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
import { AdvancedRAndDConsole } from './components/AdvancedR&DConsole';
import { CybersecurityFinder } from './components/CybersecurityFinder';
import { SecurityAI } from './components/SecurityAI';
import { CybersecurityDashboard } from './components/CybersecurityDashboard';
import { DocsView } from './components/DocsView';
import { TransactionBundler } from './components/TransactionBundler';
import { AdvertisingBots } from './components/AdvertisingBots';
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
import { ChartsView } from './components/ChartsView';
import { DisclaimerAgreement } from './components/DisclaimerAgreement';
import { DeveloperCommunity } from './components/DeveloperCommunity';
import { ComingSoonBanner } from './components/ui/ComingSoonBanner';
import { SEAL_TOKEN_ECONOMICS } from './lib/seal-token/config';

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
    rpcUrl: process.env.NEXT_PUBLIC_SOLANA_RPC_MAINNET || 'https://mainnet.helius-rpc.com/?api-key=70d2a8fe-abf2-409a-98f7-3070ec200099&rebate-address=BuPbYUeqbAuujKzZR3ncpmSCPBYRvpUXQaQQnynawxDr',
    hasRebates: true,
  },
  devnet: {
    name: 'Devnet', 
    rpcUrl: process.env.NEXT_PUBLIC_SOLANA_RPC_DEVNET || 'https://devnet.helius-rpc.com/?api-key=70d2a8fe-abf2-409a-98f7-3070ec200099',
    hasRebates: false,
  },
};

// Default network from environment
const DEFAULT_NETWORK = (process.env.NEXT_PUBLIC_SOLANA_NETWORK as keyof typeof NETWORKS) || 'mainnet';

// Types for our account data
interface ParsedAccountData {
  type: 'system' | 'token' | 'program' | 'unknown';
  owner: string;
  data: any;
  rawData: Buffer;
  lamports: number;
  executable: boolean;
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
}

// Account parsing functions (moved before AccountInspectorView)
async function parseAccountData(
  connection: Connection,
  publicKey: PublicKey,
  accountInfo: AccountInfo<Buffer>
): Promise<ParsedAccountData> {
  const owner = accountInfo.owner.toString();

  // Check if it's a System Program account
  if (owner === '11111111111111111111111111111112') {
    return {
      type: 'system',
      owner,
      data: parseSystemAccount(accountInfo.data),
      rawData: accountInfo.data,
      lamports: accountInfo.lamports,
      executable: accountInfo.executable,
    };
  }

  // Check if it's a Token Program account
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
      };

      return {
        type: 'token',
        owner,
        data: tokenData,
        rawData: accountInfo.data,
        lamports: accountInfo.lamports,
        executable: accountInfo.executable,
      };
    } catch (error) {
      // If token parsing fails, return as unknown
      console.warn('Failed to parse as token account:', error);
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
      },
      rawData: accountInfo.data,
      lamports: accountInfo.lamports,
      executable: accountInfo.executable,
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
function AccountInspectorView({ connection, network, publicKey }: { connection: Connection; network: string; publicKey: PublicKey | null }) {
  const [accountId, setAccountId] = useState('');
  const [accountData, setAccountData] = useState<ParsedAccountData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);

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
    if (!publicKey) return 'Not Connected';
    // This is a simplified check - in reality you'd need to check the wallet's cluster
    // For now, we'll assume Phantom/Solflare auto-switch based on the connection
    return network; // The wallet should follow the connection network
  };

  // Now walletNetwork will always be a string
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

  // Auto-populate with connected wallet address
  const fillWalletAddress = () => {
    if (publicKey) {
      setAccountId(publicKey.toString());
      console.log('Filled wallet address:', publicKey.toString());
    } else {
      setError('Wallet not connected! Please connect your wallet first.');
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

      <div className="flex w-full max-w-2xl space-x-3 mb-6">
        <input
          type="text"
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={`Enter ${network} account address...`}
          className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
          disabled={loading}
        />
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

      {/* Example addresses */}
      <div className="mb-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
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

      {/* Account Data Display */}
      {accountData && (
        <div className="space-y-6">
          {/* Account Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-300">Account Data</h2>
            <div className="flex items-center space-x-2">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                accountData.type === 'token' ? 'bg-green-900 text-green-300' :
                accountData.type === 'system' ? 'bg-blue-900 text-blue-300' :
                accountData.type === 'program' ? 'bg-purple-900 text-purple-300' :
                'bg-gray-900 text-gray-300'
              }`}>
                {accountData.type.toUpperCase()}
              </span>
              {accountData.executable && (
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-900 text-yellow-300">
                  EXECUTABLE
                </span>
              )}
            </div>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700/50">
              <h3 className="text-sm font-medium text-gray-400 mb-2">Address</h3>
              <div className="flex items-center space-x-2">
                <code className="text-sm bg-gray-900 px-2 py-1 rounded text-gray-200 font-mono break-all">
                  {accountId}
                </code>
                <button
                  onClick={() => copyToClipboard(accountId)}
                  className="p-1 hover:bg-gray-700 rounded"
                >
                  <Copy className="h-3 w-3" />
                </button>
                {isValidSolanaAddress(accountId) && (
                  <a
                    href={`https://solscan.io/account/${accountId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 hover:bg-gray-700 rounded"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>

            <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700/50">
              <h3 className="text-sm font-medium text-gray-400 mb-2">Owner Program</h3>
              <div className="flex items-center space-x-2">
                <code className="text-sm bg-gray-900 px-2 py-1 rounded text-gray-200 font-mono break-all">
                  {accountData.owner}
                </code>
                <button
                  onClick={() => copyToClipboard(accountData.owner)}
                  className="p-1 hover:bg-gray-700 rounded"
                >
                  <Copy className="h-3 w-3" />
                </button>
              </div>
            </div>

            <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700/50">
              <h3 className="text-sm font-medium text-gray-400 mb-2">SOL Balance</h3>
              <p className="text-lg font-semibold text-green-400">
                {(accountData.lamports / 1e9).toFixed(4)} SOL
              </p>
            </div>

            <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700/50">
              <h3 className="text-sm font-medium text-gray-400 mb-2">Raw Data Size</h3>
              <p className="text-lg font-semibold text-blue-400">
                {accountData.rawData.length} bytes
              </p>
            </div>
          </div>

          {/* Parsed Data */}
          {accountData.data && (
            <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700/50">
              <h3 className="text-sm font-medium text-gray-400 mb-3">Parsed Data</h3>
              <pre className="bg-gray-900 p-3 rounded text-sm overflow-x-auto text-gray-200 font-mono">
                {JSON.stringify(accountData.data, null, 2)}
              </pre>
            </div>
          )}

          {/* Raw Data */}
          <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700/50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-400">Raw Data (Hex)</h3>
              <button
                onClick={() => copyToClipboard(accountData.rawData.toString('hex'))}
                className="flex items-center space-x-1 px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs font-medium transition-colors"
              >
                <Copy className="h-3 w-3" />
                <span>Copy Hex</span>
              </button>
            </div>
            <div className="bg-gray-900 p-3 rounded text-sm overflow-x-auto">
              <code className="text-gray-200 font-mono break-all">
                {accountData.rawData.toString('hex').match(/.{1,64}/g)?.join('\n') || accountData.rawData.toString('hex')}
              </code>
            </div>
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
    <header className="flex h-16 w-full items-center justify-between border-b border-gray-700 px-6 shrink-0">
      <div className="flex items-center space-x-4">
        {onBackToLanding && (
          <button
            onClick={onBackToLanding}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ← Back to Home
          </button>
        )}
        {/* Logo */}
        <img
          src="/sea-level-logo.png"
          alt="Sealevel Studio"
          className="h-10 w-auto"
          style={{ maxHeight: '40px' }}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
        <div className="text-xl font-bold tracking-tighter">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-500">
            Sealevel Studio
          </span>
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <button className="flex items-center space-x-2 rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors relative">
          <span>{networks[network].name}</span>
          <ChevronDown className="h-4 w-4" />
          <select
            value={network}
            onChange={(e) => setNetwork(e.target.value as keyof typeof NETWORKS)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          >
            {Object.entries(networks).map(([key, config]) => (
              <option key={key} value={key}>
                {config.name}
              </option>
            ))}
          </select>
        </button>
        {wallet}
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
    { id: 'inspector', label: 'Account Inspector', icon: <Search className="h-4 w-4" />, section: 'core' },
    { id: 'builder', label: 'Transaction Builder', icon: <Wrench className="h-4 w-4" />, section: 'core' },
    { id: 'scanner', label: 'Arbitrage Scanner', icon: <TrendingUp className="h-4 w-4" />, section: 'core' },
    { id: 'bundler', label: 'Transaction Bundler', icon: <Layers className="h-4 w-4" />, section: 'core' },
    
    // Revenue
    { id: 'presale', label: 'SEAL Presale', icon: <TrendingUp className="h-4 w-4" />, section: 'revenue', badge: 'Hot' },
    { id: 'premium', label: 'Premium Services', icon: <Zap className="h-4 w-4" />, section: 'revenue' },
    { id: 'revenue', label: 'Pricing & Revenue', icon: <DollarSign className="h-4 w-4" />, section: 'revenue' },
    
    // AI
    { id: 'cyber-playground', label: 'AI Cyber Playground', icon: <Brain className="h-4 w-4" />, section: 'ai' },
    
    // Tools Hub
    { id: 'tools', label: 'Tools Hub', icon: <Code className="h-4 w-4" />, section: 'tools' },
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

  // Premium Services has its own full-screen layout
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
  if (activeView === 'tools') {
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
      <FreeTrialBanner />
      <main className="flex-1 overflow-y-auto p-6 md:p-8">
        {activeView === 'inspector' && <AccountInspectorView connection={connection} network={network} publicKey={publicKey} />}
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
  // ALL HOOKS MUST BE CALLED AT THE TOP - BEFORE ANY CONDITIONAL RETURNS
  const [currentScreen, setCurrentScreen] = useState<'landing' | 'disclaimer' | 'tutorial' | 'app'>('landing');
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [previousView, setPreviousView] = useState<string>('');
  const [activeView, setActiveView] = useState('inspector');
  const [rdConsoleMinimized, setRdConsoleMinimized] = useState(true);
  const [selectedBlockchain, setSelectedBlockchain] = useState<BlockchainType | null>('solana');
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
  // Also check for disclaimer agreement on initial load
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sealevel-blockchain');
      if (saved && ['polkadot', 'solana', 'ethereum', 'polygon', 'avalanche', 'base', 'arbitrum', 'optimism', 'sui', 'aptos'].includes(saved)) {
        setSelectedBlockchain(saved as BlockchainType);
      } else {
        // Default to Solana if nothing saved
        setSelectedBlockchain('solana');
      }
      
      // Check if disclaimer needs to be shown on initial load
      const disclaimerAgreed = localStorage.getItem('sealevel-disclaimer-agreed');
      if (!disclaimerAgreed && currentScreen === 'landing') {
        // Set disclaimer screen if user hasn't agreed yet
        setCurrentScreen('disclaimer');
      }
    }
  }, []);

  const handleGetStarted = (blockchain?: BlockchainType) => {
    if (blockchain) {
      setSelectedBlockchain(blockchain);
      // Polkadot and Solana are fully supported
      if (blockchain === 'polkadot' || blockchain === 'solana') {
        // Continue with selected blockchain - both are functional
      } else {
        // Show coming soon message for other blockchains
        alert(`${blockchain.charAt(0).toUpperCase() + blockchain.slice(1)} support is coming soon! For now, you can use Polkadot or Solana which have full feature support.`);
        setSelectedBlockchain('solana');
      }
    } else {
      // Default to Solana if no selection
      setSelectedBlockchain('solana');
    }
    
    // Check if disclaimer needs to be shown
    if (typeof window !== 'undefined') {
      const disclaimerAgreed = localStorage.getItem('sealevel-disclaimer-agreed');
      if (!disclaimerAgreed) {
        setCurrentScreen('disclaimer');
        return;
      }
    }
    
    // Proceed to tutorial or app
    setIsPageLoading(true);
    if (shouldShowTutorial('accountInspector') || shouldShowTutorial('instructionAssembler')) {
      setCurrentScreen('tutorial');
    } else {
      setCurrentScreen('app');
    }
  };

  const handleDisclaimerAgree = () => {
    setIsPageLoading(true);
    if (shouldShowTutorial('accountInspector') || shouldShowTutorial('instructionAssembler')) {
      setCurrentScreen('tutorial');
    } else {
      setCurrentScreen('app');
    }
  };

  const handleBackToLanding = () => {
    setIsPageLoading(true); // Show loading animation when going back to landing
    setCurrentScreen('landing');
  };

  let content: React.ReactNode;

  if (currentScreen === 'landing') {
    content = <LandingPage onGetStarted={handleGetStarted} />;
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
    const isFullScreenView = activeView === 'builder' || activeView === 'scanner' || activeView === 'premium' || activeView === 'web2' || activeView === 'wallets' || activeView === 'cybersecurity' || activeView === 'docs' || activeView === 'admin' || activeView === 'bundler' || activeView === 'advertising' || activeView === 'social' || activeView === 'service-bot' || activeView === 'presale' || activeView === 'cyber-playground' || activeView === 'tools' || activeView === 'revenue' || activeView === 'rent-reclaimer' || activeView === 'faucet' || activeView === 'twitter-bot' || activeView === 'substack-bot' || activeView === 'telegram-bot' || activeView === 'charts';

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

    content = (
      <ClientOnly>
        {/* Feature Highlight Loader Overlay */}
        <FeatureHighlightLoader
          isLoading={isPageLoading}
          duration={4000}
          onAnimationComplete={() => setIsPageLoading(false)}
          currentFeature={getCurrentFeatureId(activeView)}
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
          onEnterApp={() => {
            // Stay on current view when entering
            setIsPageLoading(false);
          }}
        />
        
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