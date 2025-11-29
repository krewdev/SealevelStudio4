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
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

