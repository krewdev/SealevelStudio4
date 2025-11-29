'use client';

import React, { useState, useEffect } from 'react';
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  getAccount,
  createCloseAccountInstruction,
  getAssociatedTokenAddress,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import {
  ArrowLeft,
  Coins,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Search,
  Trash2,
  DollarSign,
  Wallet as WalletIcon,
  List,
  X,
} from 'lucide-react';
import { useNetwork } from '../contexts/NetworkContext';
import { useUser } from '../contexts/UserContext';

interface RentReclaimerProps {
  onBack?: () => void;
}

interface AccountInfo {
  address: string;
  type: 'system' | 'token' | 'program' | 'unknown';
  lamports: number;
  rentExempt: boolean;
  reclaimable: boolean;
  owner?: string;
  mint?: string;
  amount?: string;
}

interface TokenAccount {
  address: string;
  mint: string;
  amount: bigint;
  lamports: number;
  owner: string;
  closeAuthority?: string;
}

export function RentReclaimer({ onBack }: RentReclaimerProps) {
  const { connection } = useConnection();
  const { publicKey: externalWallet, signTransaction, sendTransaction } = useWallet();
  const { network } = useNetwork();
  const { user, refreshBalance, createWallet } = useUser();
  const [useCustodial, setUseCustodial] = useState(true); // Default to custodial wallet
  const [accountAddress, setAccountAddress] = useState('');
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [reclaiming, setReclaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [reclaimedAmount, setReclaimedAmount] = useState<number | null>(null);
  
  // Bulk scanning state
  const [scanning, setScanning] = useState(false);
  const [tokenAccounts, setTokenAccounts] = useState<TokenAccount[]>([]);
  const [bulkClosing, setBulkClosing] = useState(false);
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set());

  // Determine which wallet to use
  const activeWallet = useCustodial && user?.walletAddress 
    ? new PublicKey(user.walletAddress)
    : externalWallet;

  const validateAddress = (address: string): boolean => {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  };

  const checkAccount = async () => {
    if (!accountAddress.trim()) {
      setError('Please enter an account address');
      return;
    }

    if (!validateAddress(accountAddress)) {
      setError('Invalid Solana address');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    setAccountInfo(null);

    try {
      const pubkey = new PublicKey(accountAddress.trim());
      const accountData = await connection.getAccountInfo(pubkey);

      if (!accountData) {
        setError('Account not found or already closed');
        setLoading(false);
        return;
      }

      const owner = accountData.owner.toString();
      const lamports = accountData.lamports;
      const rentExempt = lamports > 0;

      let accountType: 'system' | 'token' | 'program' | 'unknown' = 'unknown';
      let reclaimable = false;
      let mint: string | undefined;
      let amount: string | undefined;

      // Check if it's a token account
      if (owner === TOKEN_PROGRAM_ID.toString()) {
        try {
          const tokenAccount = await getAccount(connection, pubkey);
          accountType = 'token';
          mint = tokenAccount.mint.toString();
          amount = tokenAccount.amount.toString();
          
          // Token accounts can be closed if balance is 0
          const walletPubkey = activeWallet;
          reclaimable = tokenAccount.amount === BigInt(0) && walletPubkey && 
            (tokenAccount.owner.toString() === walletPubkey.toString() || 
              tokenAccount.closeAuthority?.toString() === walletPubkey.toString()) || false;
        } catch (err) {
          accountType = 'unknown';
        }
      } else if (owner === SystemProgram.programId.toString()) {
        accountType = 'system';
        // System accounts can't be closed via rent reclamation
        reclaimable = false;
      } else {
        accountType = 'program';
        // Program accounts can't be closed via rent reclamation
        reclaimable = false;
      }

      setAccountInfo({
        address: accountAddress.trim(),
        type: accountType,
        lamports,
        rentExempt,
        reclaimable,
        owner,
        mint,
        amount,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check account');
    } finally {
      setLoading(false);
    }
  };

  // Sign transaction with custodial or external wallet
  const signAndSendTransaction = async (transaction: Transaction): Promise<string> => {
    if (!activeWallet) {
      throw new Error('No wallet available');
    }

    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = activeWallet;

    if (useCustodial && user?.walletAddress) {
      // Sign with custodial wallet via API
      const serialized = transaction.serialize({ requireAllSignatures: false });
      const base64 = Buffer.from(serialized).toString('base64');

      const response = await fetch('/api/wallet/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction: base64 }),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to sign transaction');
      }

      // Deserialize signed transaction
      const signedBuffer = Buffer.from(data.signedTransaction, 'base64');
      const signedTx = Transaction.from(signedBuffer);

      // Send transaction
      const signature = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: false,
        maxRetries: 3,
      });

      await connection.confirmTransaction(signature, 'confirmed');
      return signature;
    } else {
      // Sign with external wallet
      if (!signTransaction || !sendTransaction) {
        throw new Error('External wallet not connected');
      }

      const signed = await signTransaction(transaction);
      const signature = await sendTransaction(signed, connection);
      await connection.confirmTransaction(signature, 'confirmed');
      return signature;
    }
  };

  const reclaimRent = async () => {
    if (!accountInfo || !accountInfo.reclaimable) {
      setError('Account cannot be reclaimed');
      return;
    }

    if (!activeWallet) {
      setError('Wallet not available');
      return;
    }

    setReclaiming(true);
    setError(null);
    setSuccess(null);

    try {
      const accountPubkey = new PublicKey(accountInfo.address);
      const transaction = new Transaction();

      if (accountInfo.type === 'token') {
        // Close token account - rent goes to wallet owner
        transaction.add(
          createCloseAccountInstruction(
            accountPubkey, // account to close
            activeWallet,  // destination for rent (wallet owner)
            activeWallet, // owner/authority
            []            // multisig signers (empty for single signer)
          )
        );
      } else {
        setError('Only token accounts with zero balance can be closed');
        setReclaiming(false);
        return;
      }

      await signAndSendTransaction(transaction);

      const reclaimed = accountInfo.lamports / LAMPORTS_PER_SOL;
      setReclaimedAmount(reclaimed);
      setSuccess(`Successfully reclaimed ${reclaimed.toFixed(6)} SOL`);
      setAccountInfo(null);
      setAccountAddress('');
      
      // Refresh balance if using custodial wallet
      if (useCustodial && user?.walletAddress) {
        await refreshBalance(user.walletAddress);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reclaim rent');
    } finally {
      setReclaiming(false);
    }
  };

  // Scan all token accounts for the active wallet
  const scanTokenAccounts = async () => {
    if (!activeWallet) {
      setError('Please connect a wallet or use your custodial wallet');
      return;
    }

    setScanning(true);
    setError(null);
    setTokenAccounts([]);
    setSelectedAccounts(new Set());

    try {
      // Get all token accounts owned by the wallet
      const tokenAccountsData = await connection.getParsedTokenAccountsByOwner(
        activeWallet,
        {
          programId: TOKEN_PROGRAM_ID,
        }
      );

      const accounts: TokenAccount[] = [];
      for (const accountInfo of tokenAccountsData.value) {
        const parsedInfo = accountInfo.account.data.parsed?.info;
        if (!parsedInfo) continue;

        const amount = BigInt(parsedInfo.tokenAmount?.amount || '0');
        const accountPubkey = accountInfo.pubkey;
        const accountData = await connection.getAccountInfo(accountPubkey);

        // Only include zero-balance token accounts that can be closed
        if (amount === BigInt(0) && accountData) {
          const owner = parsedInfo.owner || accountInfo.account.owner.toString();
          const canClose = owner === activeWallet.toString() || 
                          parsedInfo.closeAuthority === activeWallet.toString();

          if (canClose) {
            accounts.push({
              address: accountPubkey.toString(),
              mint: parsedInfo.mint,
              amount,
              lamports: accountData.lamports,
              owner,
              closeAuthority: parsedInfo.closeAuthority,
            });
          }
        }
      }

      setTokenAccounts(accounts);
      if (accounts.length === 0) {
        setSuccess('No reclaimable token accounts found. All accounts either have balances or are not owned by this wallet.');
      } else {
        setSuccess(`Found ${accounts.length} reclaimable token account${accounts.length > 1 ? 's' : ''} with zero balance`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to scan token accounts');
    } finally {
      setScanning(false);
    }
  };

  // Bulk close selected token accounts
  const bulkCloseAccounts = async () => {
    if (!activeWallet) {
      setError('Wallet not available');
      return;
    }

    if (selectedAccounts.size === 0) {
      setError('Please select at least one account to close');
      return;
    }

    setBulkClosing(true);
    setError(null);
    setSuccess(null);

    try {
      const accountsToClose = tokenAccounts.filter(acc => selectedAccounts.has(acc.address));
      let totalReclaimed = 0;
      let successCount = 0;
      let failCount = 0;

      // Process in batches to avoid transaction size limits
      const batchSize = 10; // Close up to 10 accounts per transaction
      for (let i = 0; i < accountsToClose.length; i += batchSize) {
        const batch = accountsToClose.slice(i, i + batchSize);
        const transaction = new Transaction();

        for (const account of batch) {
          try {
            transaction.add(
              createCloseAccountInstruction(
                new PublicKey(account.address),
                activeWallet,
                activeWallet,
                []
              )
            );
            totalReclaimed += account.lamports;
          } catch (err) {
            console.error(`Failed to add close instruction for ${account.address}:`, err);
            failCount++;
          }
        }

        if (transaction.instructions.length > 0) {
          try {
            await signAndSendTransaction(transaction);
            successCount += transaction.instructions.length;
          } catch (err) {
            console.error('Failed to send batch transaction:', err);
            failCount += transaction.instructions.length;
          }
        }
      }

      const reclaimedSol = totalReclaimed / LAMPORTS_PER_SOL;
      setReclaimedAmount(reclaimedSol);
      setSuccess(
        `Successfully closed ${successCount} account${successCount !== 1 ? 's' : ''} ` +
        `and reclaimed ${reclaimedSol.toFixed(6)} SOL${failCount > 0 ? ` (${failCount} failed)` : ''}`
      );

      // Refresh token accounts list
      await scanTokenAccounts();
      
      // Refresh balance if using custodial wallet
      if (useCustodial && user?.walletAddress) {
        await refreshBalance(user.walletAddress);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to close accounts');
    } finally {
      setBulkClosing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      checkAccount();
    }
  };

  return (
    <div className="min-h-screen animated-bg text-white relative">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Header */}
      <div className="relative z-10 border-b border-slate-800/50 glass p-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              >
                <ArrowLeft size={18} />
                <span className="text-sm">Back</span>
              </button>
            )}
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-gradient-to-br from-yellow-500/20 to-orange-500/20">
                <Coins className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gradient-primary">Rent Reclaimer</h1>
                <p className="text-sm text-gray-400 mt-1">Close accounts and reclaim rent-exempt SOL</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-8">
        {/* Network Warning */}
        {network === 'mainnet' && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-400 font-medium">Mainnet Warning</p>
              <p className="text-sm text-gray-400 mt-1">
                Closing accounts on mainnet is permanent. Make sure you want to close this account.
              </p>
            </div>
          </div>
        )}

        {/* Wallet Selection */}
        <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <p className="text-blue-400 font-medium">Select Wallet</p>
            <div className="flex gap-2">
              <button
                onClick={() => setUseCustodial(true)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  useCustodial
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <WalletIcon size={16} className="inline mr-2" />
                Custodial Wallet
              </button>
              <button
                onClick={() => setUseCustodial(false)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  !useCustodial
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <WalletIcon size={16} className="inline mr-2" />
                External Wallet
              </button>
            </div>
          </div>
          {useCustodial ? (
            <div>
              {user?.walletAddress ? (
                <p className="text-sm text-gray-300">
                  Using custodial wallet: <span className="font-mono text-xs">{user.walletAddress.slice(0, 8)}...{user.walletAddress.slice(-8)}</span>
                </p>
              ) : (
                <div className="flex items-center gap-3">
                  <p className="text-sm text-yellow-400">
                    No custodial wallet found.
                  </p>
                  <button
                    onClick={async () => {
                      try {
                        await createWallet();
                        setSuccess('Custodial wallet created!');
                      } catch (err) {
                        setError(err instanceof Error ? err.message : 'Failed to create wallet');
                      }
                    }}
                    className="btn-modern px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700"
                  >
                    Create Wallet
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div>
              {externalWallet ? (
                <p className="text-sm text-gray-300">
                  Using external wallet: <span className="font-mono text-xs">{externalWallet.toString().slice(0, 8)}...{externalWallet.toString().slice(-8)}</span>
                </p>
              ) : (
                <p className="text-sm text-yellow-400">
                  Please connect your external wallet to use this option.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Bulk Scanner */}
        <div className="card-modern p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <List className="w-5 h-5 text-purple-400" />
            <h2 className="text-xl font-semibold">Scan Token Accounts</h2>
          </div>
          <p className="text-sm text-gray-400 mb-4">
            Scan your wallet for token accounts with zero balance (no liquidity tokens from other platforms) that can be closed to reclaim rent.
          </p>
          <button
            onClick={scanTokenAccounts}
            disabled={scanning || !activeWallet}
            className="btn-modern px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {scanning ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Scan for Reclaimable Accounts
              </>
            )}
          </button>

          {/* Token Accounts List */}
          {tokenAccounts.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  Found {tokenAccounts.length} Reclaimable Account{tokenAccounts.length > 1 ? 's' : ''}
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedAccounts(new Set(tokenAccounts.map(acc => acc.address)))}
                    className="text-sm text-blue-400 hover:text-blue-300"
                  >
                    Select All
                  </button>
                  <button
                    onClick={() => setSelectedAccounts(new Set())}
                    className="text-sm text-gray-400 hover:text-gray-300"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {tokenAccounts.map((account) => {
                  const isSelected = selectedAccounts.has(account.address);
                  const rentSol = account.lamports / LAMPORTS_PER_SOL;
                  return (
                    <div
                      key={account.address}
                      className={`p-4 rounded-lg border ${
                        isSelected
                          ? 'bg-blue-500/10 border-blue-500/30'
                          : 'bg-gray-800/50 border-gray-700'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            const newSelected = new Set(selectedAccounts);
                            if (e.target.checked) {
                              newSelected.add(account.address);
                            } else {
                              newSelected.delete(account.address);
                            }
                            setSelectedAccounts(newSelected);
                          }}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-mono text-xs text-gray-300">
                              {account.address.slice(0, 8)}...{account.address.slice(-8)}
                            </span>
                            <span className="text-yellow-400 font-semibold">
                              {rentSol.toFixed(6)} SOL
                            </span>
                          </div>
                          <div className="text-xs text-gray-400">
                            Mint: <span className="font-mono">{account.mint.slice(0, 8)}...{account.mint.slice(-8)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {selectedAccounts.size > 0 && (
                <div className="mt-4">
                  <button
                    onClick={bulkCloseAccounts}
                    disabled={bulkClosing}
                    className="btn-modern w-full px-6 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {bulkClosing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Closing {selectedAccounts.size} Account{selectedAccounts.size > 1 ? 's' : ''}...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        Close {selectedAccounts.size} Selected Account{selectedAccounts.size > 1 ? 's' : ''}
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Account Input */}
        <div className="card-modern p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Search className="w-5 h-5 text-purple-400" />
            <h2 className="text-xl font-semibold">Check Account</h2>
          </div>
          
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Enter account address..."
              value={accountAddress}
              onChange={(e) => setAccountAddress(e.target.value)}
              onKeyPress={handleKeyPress}
              className="input-modern flex-1"
              disabled={loading}
            />
            <button
              onClick={checkAccount}
              disabled={loading || !accountAddress.trim()}
              className="btn-modern px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Check
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-400 font-medium">Error</p>
              <p className="text-sm text-gray-300 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-green-400 font-medium">Success</p>
              <p className="text-sm text-gray-300 mt-1">{success}</p>
              {reclaimedAmount !== null && (
                <p className="text-sm text-green-300 mt-2 font-semibold">
                  Reclaimed: {reclaimedAmount.toFixed(6)} SOL
                </p>
              )}
            </div>
          </div>
        )}

        {/* Account Info */}
        {accountInfo && (
          <div className="card-modern p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Account Information</h2>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                accountInfo.reclaimable
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-gray-500/20 text-gray-400'
              }`}>
                {accountInfo.reclaimable ? 'Reclaimable' : 'Not Reclaimable'}
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-gray-700">
                <span className="text-gray-400">Address</span>
                <span className="font-mono text-sm">{accountInfo.address}</span>
              </div>
              
              <div className="flex items-center justify-between py-2 border-b border-gray-700">
                <span className="text-gray-400">Type</span>
                <span className="capitalize">{accountInfo.type}</span>
              </div>
              
              <div className="flex items-center justify-between py-2 border-b border-gray-700">
                <span className="text-gray-400">Balance</span>
                <span className="font-semibold">
                  {(accountInfo.lamports / LAMPORTS_PER_SOL).toFixed(6)} SOL
                </span>
              </div>
              
              {accountInfo.type === 'token' && accountInfo.mint && (
                <div className="flex items-center justify-between py-2 border-b border-gray-700">
                  <span className="text-gray-400">Token Mint</span>
                  <span className="font-mono text-sm">{accountInfo.mint}</span>
                </div>
              )}
              
              {accountInfo.type === 'token' && accountInfo.amount && (
                <div className="flex items-center justify-between py-2 border-b border-gray-700">
                  <span className="text-gray-400">Token Balance</span>
                  <span>{accountInfo.amount}</span>
                </div>
              )}
              
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-400">Owner</span>
                <span className="font-mono text-sm">{accountInfo.owner}</span>
              </div>
            </div>

            {accountInfo.reclaimable && (
              <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <DollarSign className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-yellow-400 font-medium">Reclaimable Rent</p>
                    <p className="text-sm text-gray-300 mt-1">
                      This account can be closed to reclaim {(accountInfo.lamports / LAMPORTS_PER_SOL).toFixed(6)} SOL.
                      {accountInfo.type === 'token' && (
                        <span className="block mt-1 text-yellow-300">
                          ⚠️ Make sure the token balance is zero before closing!
                        </span>
                      )}
                    </p>
                    <button
                      onClick={reclaimRent}
                      disabled={reclaiming || !activeWallet}
                      className="mt-4 btn-modern px-6 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {reclaiming ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Reclaiming...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4" />
                          Reclaim Rent
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {!accountInfo.reclaimable && (
              <div className="mt-6 p-4 bg-gray-500/10 border border-gray-500/30 rounded-lg">
                <p className="text-gray-400 text-sm">
                  {accountInfo.type === 'system' && 'System accounts cannot be closed via rent reclamation.'}
                  {accountInfo.type === 'program' && 'Program accounts cannot be closed via rent reclamation.'}
                  {accountInfo.type === 'token' && accountInfo.amount !== '0' && 'Token accounts with non-zero balance cannot be closed.'}
                  {accountInfo.type === 'token' && accountInfo.amount === '0' && activeWallet && 
                    accountInfo.owner !== activeWallet.toString() && 'You must be the owner or close authority to close this account.'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Info Section */}
        <div className="card-modern p-6">
          <h3 className="text-lg font-semibold mb-4">About Rent Reclamation</h3>
          <div className="space-y-3 text-sm text-gray-400">
            <p>
              <strong className="text-white">Rent Reclamation</strong> allows you to close accounts and reclaim the rent-exempt SOL that was locked when the account was created.
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Only token accounts with zero balance can be closed</li>
              <li>You must be the owner or close authority of the account</li>
              <li>The rent-exempt SOL will be sent to your wallet</li>
              <li>Closing an account is permanent and cannot be undone</li>
              <li>Always verify the account details before closing</li>
              <li>Use the bulk scanner to find and close multiple zero-balance token accounts at once</li>
              <li>Works with both custodial and external wallets</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

