import React from 'react';
import { Transaction, PublicKey } from '@solana/web3.js';
import { X, Send, DollarSign, Eye, Key } from 'lucide-react';

interface TransactionPreviewProps {
  transaction: Transaction;
  cost: { lamports: number; sol: number };
  onExecute: () => void;
  onClose: () => void;
  onSimulate?: () => void; // Add simulation option
  isExecuting?: boolean;
  network?: string; // Show current network
}

// Add instruction name mapping
const PROGRAM_NAMES: Record<string, string> = {
  '11111111111111111111111111111112': 'System Program',
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA': 'SPL Token',
  'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL': 'Associated Token',
  'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s': 'Metaplex Metadata',
  '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8': 'Raydium AMM',
  'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4': 'Jupiter',
  'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc': 'Orca Whirlpool',
  'MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD': 'Marinade',
  'M2mx93ekt1fmXSVkTrUL9xVFHkmME8HTUi5Cyc5aF7K': 'Magic Eden',
  'AeK2u45NkNvAcgZuYyCWqmRuCsnXPvcutR3pziXF1cDw': 'Sealevel Studios Attestation',
  'mUQFmu8w9jf4RGd5cHE6Y54y1B7Bou5an5Rvezu9GY6': 'VeriSol (Legacy)',
};

export function TransactionPreview({ 
  transaction, 
  cost, 
  onExecute, 
  onClose, 
  onSimulate,
  isExecuting = false,
  network = 'mainnet'
}: TransactionPreviewProps) {
  const getProgramName = (programId: PublicKey): string => {
    const key = programId.toString();
    return PROGRAM_NAMES[key] || `${key.slice(0, 8)}...`;
  };

  const getInstructionSummary = (instruction: any, index: number) => {
    const programName = getProgramName(instruction.programId);
    const accountCount = instruction.keys?.length || 0;
    const dataSize = instruction.data?.length || 0;
    
    return {
      programName,
      accountCount,
      dataSize,
      accounts: instruction.keys?.slice(0, 3).map((key: any) => 
        key.pubkey.toString().slice(0, 8) + '...'
      ) || []
    };
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-bold text-white">Transaction Preview</h2>
            <span className="px-2 py-1 bg-gray-700 text-xs rounded-full text-gray-300 capitalize">
              {network}
            </span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-800 rounded">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Cost Summary */}
          <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5 text-green-400" />
                <div>
                  <h3 className="font-semibold text-white">Estimated Cost</h3>
                  <p className="text-sm text-gray-400">Includes fees and priority</p>
                </div>
              </div>
              {onSimulate && (
                <button
                  onClick={onSimulate}
                  className="flex items-center space-x-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium text-white transition-colors"
                >
                  <Eye className="h-3 w-3" />
                  <span>Simulate</span>
                </button>
              )}
            </div>
            <div className="mt-3 text-2xl font-bold text-green-400">
              {cost.sol.toFixed(6)} SOL
            </div>
            <div className="text-sm text-gray-400">
              {cost.lamports.toLocaleString()} lamports
            </div>
          </div>

          {/* Instructions Summary */}
          <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700/50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-white">Instructions ({transaction.instructions.length})</h3>
              <span className="text-xs text-gray-500">
                {transaction.recentBlockhash ? 'Ready to execute' : 'Missing blockhash'}
              </span>
            </div>
            <div className="space-y-3">
              {transaction.instructions.map((instruction, index) => {
                const summary = getInstructionSummary(instruction, index);
                return (
                  <div key={index} className="p-3 bg-gray-900/50 rounded border border-gray-700/30">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center text-xs font-bold text-white">
                          {index + 1}
                        </span>
                        <span className="font-medium text-white">{summary.programName}</span>
                      </div>
                      <div className="flex items-center space-x-3 text-xs text-gray-500">
                        <span className="flex items-center space-x-1">
                          <Key className="h-3 w-3" />
                          <span>{summary.accountCount} accounts</span>
                        </span>
                        <span>{summary.dataSize} bytes</span>
                      </div>
                    </div>
                    
                    {/* Show first few accounts */}
                    {summary.accounts.length > 0 && (
                      <div className="text-xs text-gray-400">
                        <span className="font-medium">Accounts: </span>
                        {summary.accounts.join(', ')}
                        {summary.accountCount > 3 && ` +${summary.accountCount - 3} more`}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Transaction Details */}
          <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700/50">
            <h3 className="font-semibold text-white mb-3">Transaction Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Fee Payer:</span>
                <div className="font-mono text-gray-200 mt-1">
                  {transaction.feePayer?.toString().slice(0, 16)}...
                </div>
              </div>
              <div>
                <span className="text-gray-400">Recent Blockhash:</span>
                <div className="font-mono text-gray-200 mt-1">
                  {transaction.recentBlockhash?.slice(0, 16)}...
                </div>
              </div>
              <div>
                <span className="text-gray-400">Valid Until:</span>
                <div className="text-gray-200 mt-1">
                  Block {transaction.lastValidBlockHeight?.toLocaleString() || 'N/A'}
                </div>
              </div>
              <div>
                <span className="text-gray-400">Instructions:</span>
                <div className="text-gray-200 mt-1">
                  {transaction.instructions.length}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4 border-t border-gray-700">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            
            {onSimulate && (
              <button
                onClick={onSimulate}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors"
              >
                <Eye className="h-4 w-4 inline mr-2" />
                Simulate First
              </button>
            )}
            
            <button
              onClick={onExecute}
              disabled={isExecuting}
              className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors flex items-center justify-center space-x-2"
            >
              {isExecuting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Execute Transaction</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
