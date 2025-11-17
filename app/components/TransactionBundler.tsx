'use client';

import React, { useState, useCallback } from 'react';
import {
  Layers,
  Plus,
  Trash2,
  Send,
  Wallet,
  ArrowLeft,
  Copy,
  CheckCircle,
  AlertCircle,
  Loader2,
  Download,
  Upload,
  X,
  Settings,
  Info
} from 'lucide-react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { buildMultiSendTransaction, estimateMultiSend } from '../lib/bundler/multi-send';
import { MultiSendConfig, MultiSendRecipient } from '../lib/bundler/types';
import { walletRegistry } from '../lib/wallet-manager';

interface TransactionBundlerProps {
  onBack?: () => void;
}

export function TransactionBundler({ onBack }: TransactionBundlerProps) {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [recipients, setRecipients] = useState<MultiSendRecipient[]>([
    { address: '', amount: 0.1 }
  ]);
  const [memo, setMemo] = useState('');
  const [priorityFee, setPriorityFee] = useState(0);
  const [createAccounts, setCreateAccounts] = useState(true);
  const [isBuilding, setIsBuilding] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [estimate, setEstimate] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const addRecipient = () => {
    if (recipients.length >= 50) {
      setError('Maximum 50 recipients allowed');
      return;
    }
    setRecipients([...recipients, { address: '', amount: 0.1 }]);
  };

  const removeRecipient = (index: number) => {
    setRecipients(recipients.filter((_, i) => i !== index));
  };

  const updateRecipient = (index: number, field: 'address' | 'amount', value: string | number) => {
    const updated = [...recipients];
    updated[index] = { ...updated[index], [field]: value };
    setRecipients(updated);
  };

  const handleEstimate = useCallback(async () => {
    if (!publicKey) {
      setError('Please connect your wallet');
      return;
    }

    if (recipients.length === 0) {
      setError('Add at least one recipient');
      return;
    }

    const invalidRecipients = recipients.filter(r => !r.address || r.amount <= 0);
    if (invalidRecipients.length > 0) {
      setError('All recipients must have valid addresses and amounts > 0');
      return;
    }

    setIsBuilding(true);
    setError(null);
    setEstimate(null);

    try {
      const config: MultiSendConfig = {
        recipients: recipients.map(r => ({
          address: r.address === 'new' ? 'new' : r.address,
          amount: r.amount * LAMPORTS_PER_SOL
        })),
        createAccounts,
        priorityFee: priorityFee * LAMPORTS_PER_SOL,
        memo: memo || undefined,
        maxRecipients: 50
      };

      const estimateResult = await estimateMultiSend(connection, config);
      setEstimate(estimateResult);

      if (!estimateResult.canFitInTransaction) {
        setError(`Transaction too large (${estimateResult.transactionSize} bytes). Reduce recipients or amounts.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to estimate transaction');
    } finally {
      setIsBuilding(false);
    }
  }, [connection, publicKey, recipients, createAccounts, priorityFee, memo]);

  const handleSend = useCallback(async () => {
    if (!publicKey || !sendTransaction) {
      setError('Please connect your wallet');
      return;
    }

    if (!estimate || !estimate.canFitInTransaction) {
      setError('Please estimate transaction first and ensure it fits');
      return;
    }

    setIsSending(true);
    setError(null);
    setSuccess(null);

    try {
      const config: MultiSendConfig = {
        recipients: recipients.map(r => ({
          address: r.address === 'new' ? 'new' : r.address,
          amount: r.amount * LAMPORTS_PER_SOL
        })),
        createAccounts,
        priorityFee: priorityFee * LAMPORTS_PER_SOL,
        memo: memo || undefined,
        maxRecipients: 50
      };

      const { transaction, signers, createdWallets } = await buildMultiSendTransaction(
        connection,
        publicKey,
        config
      );

      // Register created wallets
      if (createdWallets && createdWallets.length > 0) {
        for (const wallet of createdWallets) {
          walletRegistry.registerWallet(
            wallet.keypair.publicKey.toString(),
            wallet.keypair,
            wallet.label || `Bundler Wallet ${Date.now()}`,
            ['bundler']
          );
        }
      }

      // Sign and send
      const signature = await sendTransaction(transaction, connection, { signers });
      await connection.confirmTransaction(signature, 'confirmed');

      setSuccess(`Transaction sent! Signature: ${signature}`);
      
      // Reset form
      setRecipients([{ address: '', amount: 0.1 }]);
      setMemo('');
      setPriorityFee(0);
      setEstimate(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send transaction');
    } finally {
      setIsSending(false);
    }
  }, [connection, publicKey, sendTransaction, recipients, createAccounts, priorityFee, memo, estimate]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(text);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  const importRecipients = (text: string) => {
    try {
      const lines = text.split('\n').filter(l => l.trim());
      const imported = lines.map(line => {
        const parts = line.split(/[\s,]+/);
        const address = parts[0];
        const amount = parseFloat(parts[1] || '0.1');
        return { address, amount };
      });
      
      if (imported.length > 0 && imported.length <= 50) {
        setRecipients(imported);
        setError(null);
      } else {
        setError('Invalid format or too many recipients (max 50)');
      }
    } catch {
      setError('Failed to parse recipients. Format: address amount (one per line)');
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      {/* Header */}
      <div className="border-b border-gray-700 p-6 bg-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
              >
                <ArrowLeft size={18} />
                <span>Back</span>
              </button>
            )}
            <div className="flex items-center gap-2">
              <Layers className="text-purple-400" size={24} />
              <h1 className="text-2xl font-bold">Transaction Bundler</h1>
            </div>
          </div>
          {publicKey && (
            <div className="flex items-center gap-2 px-3 py-2 bg-green-900/30 border border-green-700/50 rounded-lg">
              <CheckCircle size={14} className="text-green-400" />
              <span className="text-sm text-green-400">Wallet Connected</span>
            </div>
          )}
        </div>
        <p className="text-sm text-gray-400 mt-2">
          Send SOL to up to 50 wallets in a single transaction. Automatically creates new accounts if needed.
        </p>
      </div>

      <div className="flex-1 overflow-hidden flex">
        {/* Main Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          {/* Settings */}
          <div className="bg-gray-800 rounded-lg p-4 mb-6 border border-gray-700">
            <div className="flex items-center gap-2 mb-4">
              <Settings size={18} className="text-gray-400" />
              <h2 className="text-lg font-bold">Settings</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Priority Fee (SOL)</label>
                <input
                  type="number"
                  step="0.000001"
                  min="0"
                  value={priorityFee}
                  onChange={(e) => setPriorityFee(parseFloat(e.target.value) || 0)}
                  className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
                  placeholder="0.0001"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Memo (Optional)</label>
                <input
                  type="text"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
                  placeholder="Transaction memo"
                  maxLength={566}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="createAccounts"
                  checked={createAccounts}
                  onChange={(e) => setCreateAccounts(e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="createAccounts" className="text-sm text-gray-300">
                  Auto-create accounts for new addresses
                </label>
              </div>
            </div>
          </div>

          {/* Recipients */}
          <div className="bg-gray-800 rounded-lg p-4 mb-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Wallet size={18} className="text-gray-400" />
                <h2 className="text-lg font-bold">Recipients ({recipients.length}/50)</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const text = recipients.map(r => `${r.address} ${r.amount}`).join('\n');
                    copyToClipboard(text);
                  }}
                  className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm"
                  title="Copy all recipients"
                >
                  <Copy size={14} />
                </button>
                <button
                  onClick={addRecipient}
                  disabled={recipients.length >= 50}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm flex items-center gap-2"
                >
                  <Plus size={14} />
                  Add
                </button>
              </div>
            </div>

            {/* Import */}
            <div className="mb-4 p-3 bg-gray-900/50 rounded border border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <Upload size={14} className="text-gray-400" />
                <span className="text-sm text-gray-400">Import Recipients</span>
              </div>
              <textarea
                placeholder="Paste recipients (one per line): address amount&#10;Example:&#10;ABC123... 0.1&#10;DEF456... 0.2"
                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-white font-mono"
                rows={3}
                onBlur={(e) => {
                  if (e.target.value.trim()) {
                    importRecipients(e.target.value);
                  }
                }}
              />
            </div>

            {/* Recipients List */}
            <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
              {recipients.map((recipient, index) => (
                <div key={index} className="flex items-center gap-2 p-3 bg-gray-900/50 rounded border border-gray-700">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <div>
                      <input
                        type="text"
                        value={recipient.address}
                        onChange={(e) => updateRecipient(index, 'address', e.target.value)}
                        placeholder={index === 0 ? "Wallet address or 'new'" : "Wallet address"}
                        className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white font-mono"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.000001"
                        min="0"
                        value={recipient.amount}
                        onChange={(e) => updateRecipient(index, 'amount', parseFloat(e.target.value) || 0)}
                        placeholder="Amount (SOL)"
                        className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
                      />
                      <span className="text-xs text-gray-500">SOL</span>
                    </div>
                  </div>
                  <button
                    onClick={() => removeRecipient(index)}
                    className="p-2 text-red-400 hover:bg-red-900/20 rounded"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Estimate & Send */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleEstimate}
              disabled={isBuilding || !publicKey || recipients.length === 0}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium flex items-center gap-2"
            >
              {isBuilding ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Estimating...
                </>
              ) : (
                <>
                  <Info size={18} />
                  Estimate Transaction
                </>
              )}
            </button>

            {estimate && (
              <button
                onClick={handleSend}
                disabled={isSending || !estimate.canFitInTransaction || !publicKey}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium flex items-center gap-2"
              >
                {isSending ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    Send Transaction
                  </>
                )}
              </button>
            )}
          </div>

          {/* Estimate Results */}
          {estimate && (
            <div className="mt-6 bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h3 className="text-lg font-bold mb-4">Transaction Estimate</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-gray-400">Total Amount</div>
                  <div className="text-xl font-bold text-white">
                    {(estimate.totalAmount / LAMPORTS_PER_SOL).toFixed(6)} SOL
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Total Fees</div>
                  <div className="text-xl font-bold text-orange-400">
                    {estimate.totalFees.toFixed(6)} SOL
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Accounts to Create</div>
                  <div className="text-xl font-bold text-blue-400">
                    {estimate.accountsToCreate}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Transaction Size</div>
                  <div className={`text-xl font-bold ${
                    estimate.canFitInTransaction ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {estimate.transactionSize} / 1200 bytes (safe limit)
                  </div>
                </div>
              </div>
              {!estimate.canFitInTransaction && (
                <div className="mt-4 p-3 bg-red-900/20 border border-red-700 rounded flex items-center gap-2">
                  <AlertCircle size={18} className="text-red-400" />
                  <span className="text-sm text-red-400">
                    Transaction too large. Reduce recipients or amounts.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Error/Success Messages */}
          {error && (
            <div className="mt-4 p-4 bg-red-900/20 border border-red-700 rounded flex items-center gap-2">
              <AlertCircle size={18} className="text-red-400" />
              <span className="text-red-400">{error}</span>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-400 hover:text-red-300"
              >
                <X size={18} />
              </button>
            </div>
          )}

          {success && (
            <div className="mt-4 p-4 bg-green-900/20 border border-green-700 rounded flex items-center gap-2">
              <CheckCircle size={18} className="text-green-400" />
              <span className="text-green-400">{success}</span>
              <button
                onClick={() => setSuccess(null)}
                className="ml-auto text-green-400 hover:text-green-300"
              >
                <X size={18} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

