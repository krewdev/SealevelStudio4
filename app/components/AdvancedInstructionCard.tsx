'use client';

import React, { useState } from 'react';
import { Trash2, CheckCircle, AlertCircle, Clipboard, ClipboardCheck } from 'lucide-react';
import { BuiltInstruction } from '../lib/instructions/types';

interface AdvancedInstructionCardProps {
  instruction: BuiltInstruction;
  index: number;
  onUpdateAccount: (name: string, value: string) => void;
  onUpdateArg: (name: string, value: any) => void;
  onRemove: () => void;
  validationErrors: string[];
  onCopyAddress: (address: string) => void;
  copiedAddresses: string[];
  justCopied: string | null;
  focusedInputField: string | null;
  setFocusedInputField: (field: string | null) => void;
}

export function AdvancedInstructionCard({
  instruction,
  index,
  onUpdateAccount,
  onUpdateArg,
  onRemove,
  validationErrors,
  onCopyAddress,
  copiedAddresses,
  justCopied,
  focusedInputField,
  setFocusedInputField
}: AdvancedInstructionCardProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-8 h-8 bg-purple-600 rounded-lg">
            <span className="text-white font-bold text-sm">{index + 1}</span>
          </div>
          <div>
            <h3 className="font-semibold text-white">{instruction.template.name}</h3>
            <p className="text-sm text-gray-400">{instruction.template.description}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {validationErrors.length === 0 ? (
            <CheckCircle className="h-5 w-5 text-green-400" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-400" />
          )}

          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 hover:bg-gray-700 rounded"
          >
            <svg className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>

          <button
            onClick={onRemove}
            className="p-1 hover:bg-red-700 hover:text-red-400 rounded text-gray-400"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="p-4 space-y-4">
          {validationErrors.length > 0 && (
            <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-3">
              <h4 className="text-red-400 font-medium mb-2">Validation Errors:</h4>
              <ul className="text-red-300 text-sm space-y-1">
                {validationErrors.map((error, i) => (
                  <li key={i}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h4 className="font-medium text-gray-300 mb-3">Accounts</h4>
            <div className="space-y-3">
              {instruction.template.accounts.map(account => {
                const accountValue = instruction.accounts[account.name] || '';
                const isAddress = accountValue.length > 20; // Simple heuristic for Solana addresses
                return (
                  <div key={account.name} className="flex items-center space-x-3">
                    <div className="flex-1 relative">
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        {account.name}
                        {account.type === 'signer' && <span className="text-yellow-400 ml-1">(Signer)</span>}
                        {account.type === 'writable' && <span className="text-blue-400 ml-1">(Writable)</span>}
                        {account.isOptional && <span className="text-gray-500 ml-1">(Optional)</span>}
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={accountValue}
                          onFocus={() => isAddress && setFocusedInputField(`advanced-${index}-${account.name}`)}
                          onBlur={() => setTimeout(() => setFocusedInputField(null), 200)}
                          onChange={(e) => onUpdateAccount(account.name, e.target.value)}
                          placeholder={account.description}
                          className="w-full px-3 py-2 pr-10 bg-gray-900 border border-gray-700 rounded-md text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        {isAddress && accountValue && (
                          <button
                            onClick={() => onCopyAddress(accountValue)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-purple-400 hover:bg-gray-800 rounded transition-colors"
                            title="Copy address"
                          >
                            {justCopied === accountValue ? (
                              <ClipboardCheck size={14} className="text-green-400" />
                            ) : (
                              <Clipboard size={14} />
                            )}
                          </button>
                        )}
                        {isAddress && copiedAddresses.length > 0 && focusedInputField === `advanced-${index}-${account.name}` && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                            {copiedAddresses.slice(0, 5).map((addr, idx) => (
                              <button
                                key={idx}
                                onClick={() => {
                                  onUpdateAccount(account.name, addr);
                                  onCopyAddress(addr);
                                  setFocusedInputField(null);
                                }}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-gray-700 transition-colors border-b border-gray-700 last:border-b-0"
                              >
                                <div className="font-mono text-gray-300 truncate">{addr}</div>
                                <div className="text-gray-500 text-[10px] mt-0.5">{addr.slice(0, 8)}...{addr.slice(-8)}</div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{account.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {instruction.template.args.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-300 mb-3">Arguments</h4>
              <div className="space-y-3">
                {instruction.template.args.map(arg => (
                  <div key={arg.name} className="flex items-center space-x-3">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        {arg.name} <span className="text-purple-400">({arg.type})</span>
                      </label>
                      {arg.type === 'bool' ? (
                        <select
                          value={instruction.args[arg.name] || false}
                          onChange={(e) => onUpdateArg(arg.name, e.target.value === 'true')}
                          className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="false">False</option>
                          <option value="true">True</option>
                        </select>
                      ) : arg.type === 'pubkey' ? (
                        <input
                          type="text"
                          value={instruction.args[arg.name] || ''}
                          onChange={(e) => onUpdateArg(arg.name, e.target.value)}
                          placeholder="Public key"
                          className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      ) : (
                        <input
                          type={arg.type.startsWith('u') || arg.type.startsWith('i') ? 'number' : 'text'}
                          value={instruction.args[arg.name] || ''}
                          onChange={(e) => {
                            const value = arg.type.startsWith('u') || arg.type.startsWith('i')
                              ? Number(e.target.value)
                              : e.target.value;
                            onUpdateArg(arg.name, value);
                          }}
                          placeholder={arg.description}
                          className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      )}
                      <p className="text-xs text-gray-500 mt-1">{arg.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
