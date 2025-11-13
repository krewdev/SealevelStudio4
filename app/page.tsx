'use client';

import React, { useState, useEffect } from 'react';
import { Connection, PublicKey, AccountInfo } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, TokenAccountNotFoundError, getAccount, getMint } from '@solana/spl-token';
import { Search, Wrench, Play, Code, Wallet, ChevronDown, Copy, ExternalLink, AlertCircle, CheckCircle, Zap } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import WalletButton from './components/WalletButton';
import { InstructionAssembler } from './components/InstructionAssembler';
import { TransactionPreview } from './components/TransactionPreview';
import { ClientOnly } from './components/ClientOnly';
import { useNetwork } from './contexts/NetworkContext';
import { useTutorial } from './contexts/TutorialContext';
import { TutorialFlow } from './components/TutorialFlow';

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
function AccountInspectorView({ connection, network, publicKey }) {
  const [accountId, setAccountId] = useState('');
  const [accountData, setAccountData] = useState<ParsedAccountData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);

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
      setError(`❌ Connection failed: ${err.message}`);
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
  const exampleAddresses = {
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
    <div>
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
                <a
                  href={`https://solscan.io/account/${accountId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 hover:bg-gray-700 rounded"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
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
  network: string;
  setNetwork: (network: string) => void;
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
function Sidebar({ activeView, setActiveView }) {
  const navItems = [
    { id: 'inspector', label: 'Account Inspector', icon: <Search className="h-4 w-4" /> },
    { id: 'assembler', label: 'Instruction Assembler', icon: <Wrench className="h-4 w-4" /> },
    { id: 'simulation', label: 'Simulation', icon: <Play className="h-4 w-4" /> },
    { id: 'exporter', label: 'Code Exporter', icon: <Code className="h-4 w-4" /> },
  ];

  return (
    <nav className="flex w-64 flex-col border-r border-gray-700 bg-gray-900/50 p-4 shrink-0">
      <ul className="flex-1 space-y-2">
        {navItems.map((item) => (
          <li key={item.id}>
            <button
              onClick={() => setActiveView(item.id)}
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
    </nav>
  );
}

// 3. Main Content Area Component
function MainContent({ activeView, connection, network, publicKey }) {
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

  // For assembler view, use split layout
  if (activeView === 'assembler') {
  return (
      <>
        <div className="flex-1 flex overflow-hidden">
          {/* Main Instruction Assembler */}
    <main className="flex-1 overflow-y-auto p-6 md:p-8">
            <InstructionAssembler onTransactionBuilt={handleTransactionBuilt} />
    </main>

          {/* Sidebar with Wallet and Transaction Clipboard */}
          <aside className="w-80 border-l border-gray-700 bg-gray-900/50 overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Wallet Section */}
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <Wallet className="h-5 w-5 mr-2 text-purple-400" />
                  Wallet
                </h3>
                
                <div className="space-y-3">
                  <div className="text-sm">
                    <span className="text-gray-400">Network:</span>
                    <span className="ml-2 text-white font-medium">{network.toUpperCase()}</span>
                  </div>
                  
                  <div className="text-sm">
                    <span className="text-gray-400">Address:</span>
                    <div className="mt-1">
                      {publicKey ? (
                        <div className="flex items-center space-x-2">
                      
                        <code className="text-xs bg-gray-900 px-2 py-1 rounded text-gray-200 font-mono break-all flex-1">
                            {publicKey.toString()}
                          </code>
                          <button
                            onClick={() => navigator.clipboard.writeText(publicKey.toString())}
                            className="p-1 hover:bg-gray-700 rounded"
                            title="Copy address"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-red-400">Not connected</span>
                      )}
                    </div>
                  </div>

                  <div className="pt-2">
                    <WalletButton />
                  </div>
                </div>
              </div>

              {/* Transaction Clipboard */}
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <Code className="h-5 w-5 mr-2 text-blue-400" />
                  Transaction Clipboard
                </h3>
                
                <div className="space-y-3">
                  {transactionPreview ? (
                    <div className="space-y-3">
                      <div className="text-sm">
                        <span className="text-gray-400">Instructions:</span>
                        <span className="ml-2 text-white font-medium">
                          {transactionPreview.transaction?.instructions?.length || 0}
                        </span>
                      </div>
                      
                      <div className="text-sm">
                        <span className="text-gray-400">Estimated Cost:</span>
                        <span className="ml-2 text-green-400 font-medium">
                          {transactionPreview.cost ? `${(transactionPreview.cost / 1e9).toFixed(6)} SOL` : 'Calculating...'}
                        </span>
                      </div>

                      <div className="flex space-x-2 pt-2">
                        <button
                          onClick={handleTransactionExecute}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
                        >
                          Execute Transaction
                        </button>
        <button
                          onClick={() => {
                            const txData = JSON.stringify(transactionPreview.transaction, null, 2);
                            navigator.clipboard.writeText(txData);
                          }}
                          className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm font-medium transition-colors"
                          title="Copy transaction JSON"
                        >
                          <Copy className="h-4 w-4" />
        </button>
      </div>

                      <button
                        onClick={handlePreviewClose}
                        className="w-full bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Code className="h-12 w-12 text-gray-600 mx-auto mb-2" />
                      <p className="text-gray-400 text-sm">
                        Build a transaction to see details here
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Transactions or Quick Actions could go here */}
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <Zap className="h-5 w-5 mr-2 text-yellow-400" />
                  Quick Actions
                </h3>
                
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      // Reset transaction draft
                      setTransactionPreview(null);
                    }}
                    className="w-full bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded text-sm font-medium transition-colors text-left"
                  >
                    New Transaction
                  </button>
                  
                  <button
                    onClick={() => {
                      // Could implement save/load functionality
                      console.log('Save transaction template');
                    }}
                    className="w-full bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded text-sm font-medium transition-colors text-left"
                  >
                    Save Template
                  </button>
        </div>
      </div>
    </div>
          </aside>
        </div>

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

  // Default single-column layout for other views
  return (
    <>
      <main className="flex-1 overflow-y-auto p-6 md:p-8">
        {activeView === 'inspector' && <AccountInspectorView connection={connection} network={network} publicKey={publicKey} />}
        {activeView === 'simulation' && <SimulationView transactionDraft={transactionPreview?.transaction} />}
        {activeView === 'exporter' && <ExporterView />}
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
    <div>
      <h1 className="text-2xl font-bold text-white mb-4">Simulation</h1>
      <p className="text-gray-400">
        Feature coming soon. This is where the "before and after" state diff will be shown.
      </p>
      {transactionDraft && (
        <div className="mt-6 p-4 bg-blue-900/20 border border-blue-700 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-300 mb-2">Transaction Draft</h3>
          <pre className="bg-blue-800/50 p-3 rounded text-sm overflow-x-auto text-blue-200 font-mono">
            {JSON.stringify(transactionDraft, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

function ExporterView() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-4">Code Exporter</h1>
      <p className="text-gray-400">
        Feature coming soon. This is where you will get your copy-paste code snippets.
      </p>
    </div>
  );
}

// Landing Page Component
function LandingPage({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-900">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4">Welcome to Sealevel Studio</h1>
        <p className="text-gray-400 mb-6">
          A powerful tool for inspecting Solana accounts, building transactions, and exploring the blockchain.
        </p>
        <button
          onClick={onGetStarted}
          className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg text-lg font-medium text-white transition-colors"
        >
          Get Started
        </button>
      </div>
    </div>
  );
}

// Main App Component
export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'landing' | 'tutorial' | 'app'>('landing');
  const [activeView, setActiveView] = useState('inspector');
  const { publicKey } = useWallet();
  const { network, connection, setNetwork } = useNetwork();
  const { shouldShowTutorial, completeTutorial } = useTutorial();

  const handleGetStarted = () => {
    if (shouldShowTutorial('accountInspector') || shouldShowTutorial('instructionAssembler')) {
      setCurrentScreen('tutorial');
    } else {
      setCurrentScreen('app');
    }
  };

  const handleBackToLanding = () => {
    setCurrentScreen('landing');
  };

  if (currentScreen === 'landing') {
    return <LandingPage onGetStarted={handleGetStarted} />;
  }

  if (currentScreen === 'tutorial') {
    return (
      <TutorialFlow 
        onComplete={() => setCurrentScreen('app')} 
        onSkip={() => setCurrentScreen('app')}
      />
    );
  }

  // Main app interface
  return (
    <ClientOnly>
      <div className="h-screen flex flex-col bg-gray-900">
        <Header 
          network={network} 
          setNetwork={setNetwork} 
          networks={NETWORKS} 
          wallet={<WalletButton />}
          onBackToLanding={handleBackToLanding}
        />
        
        <div className="flex-1 flex overflow-hidden">
          <Sidebar activeView={activeView} setActiveView={setActiveView} />
          <MainContent 
            activeView={activeView} 
            connection={connection} 
            network={network} 
            publicKey={publicKey} 
          />
        </div>
      </div>
    </ClientOnly>
  );
}