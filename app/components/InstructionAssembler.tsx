'use client';

import React, { useState, useEffect } from 'react';
import { PublicKey, Connection } from '@solana/web3.js';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { 
  Plus, 
  Trash2, 
  Play, 
  Code, 
  AlertCircle, 
  CheckCircle,
  Wrench,
  Zap
} from 'lucide-react';
import { 
  InstructionTemplate, 
  BuiltInstruction, 
  TransactionDraft
} from '../lib/instructions/types';
import { 
  getTemplatesByCategory,
  getTemplateById 
} from '../lib/instructions/templates';
import { TransactionBuilder } from '../lib/transaction-builder';

interface InstructionAssemblerProps {
  onTransactionBuilt?: (transaction: any, cost: any) => void;
}

export function InstructionAssembler({ onTransactionBuilt }: InstructionAssemblerProps) {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection(); // Add this
  const [transactionDraft, setTransactionDraft] = useState<TransactionDraft>({
    instructions: []
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('system');
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildError, setBuildError] = useState<string | null>(null);

  const categories = [
    { id: 'system', name: 'System', icon: '🏠' },
    { id: 'token', name: 'Token', icon: '🪙' },
    { id: 'nft', name: 'NFT', icon: '🎨' },
    { id: 'defi', name: 'DeFi', icon: '💰' },
    { id: 'custom', name: 'Custom', icon: '⚙️' }
  ];

  const availableTemplates = getTemplatesByCategory(selectedCategory);
  // Filter templates based on search
  const filteredTemplates = availableTemplates.filter(template =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const popularTemplates = [
    'system_transfer',
    'spl_token_transfer', 
    'spl_ata_create',
    'mpl_create_metadata'
  ];

  const addInstruction = (template: InstructionTemplate) => {
    const newInstruction: BuiltInstruction = {
      template,
      accounts: {},
      args: {}
    };

    // Initialize with default values
    template.args.forEach(arg => {
      if (arg.defaultValue !== undefined) {
        newInstruction.args[arg.name] = arg.defaultValue;
      }
    });

    setTransactionDraft(prev => ({
      ...prev,
      instructions: [...prev.instructions, newInstruction]
    }));
    setShowTemplateSelector(false);
  };

  const removeInstruction = (index: number) => {
    setTransactionDraft(prev => ({
      ...prev,
      instructions: prev.instructions.filter((_, i) => i !== index)
    }));
  };

  const updateInstructionAccount = (instructionIndex: number, accountName: string, value: string) => {
    setTransactionDraft(prev => {
      const newInstructions = [...prev.instructions];
      newInstructions[instructionIndex].accounts[accountName] = value;
      return { ...prev, instructions: newInstructions };
    });
  };

  const updateInstructionArg = (instructionIndex: number, argName: string, value: any) => {
    setTransactionDraft(prev => {
      const newInstructions = [...prev.instructions];
      newInstructions[instructionIndex].args[argName] = value;
      return { ...prev, instructions: newInstructions };
    });
  };

  const validateInstruction = (instruction: BuiltInstruction): string[] => {
    const errors: string[] = [];

    // Check required accounts
    instruction.template.accounts.forEach(account => {
      if (!account.isOptional && !instruction.accounts[account.name]) {
        errors.push(`Missing required account: ${account.name}`);
      }
      
      // Validate pubkey format if provided
      if (instruction.accounts[account.name]) {
        try {
          new PublicKey(instruction.accounts[account.name]);
        } catch {
          errors.push(`Invalid public key format for ${account.name}`);
        }
      }
    });

    // Check required args
    instruction.template.args.forEach(arg => {
      const value = instruction.args[arg.name];
      if (value === undefined || value === '') {
        errors.push(`Missing required argument: ${arg.name}`);
      }

      // Type-specific validation
      if (arg.type === 'u64' || arg.type === 'u32' || arg.type === 'u16' || arg.type === 'u8') {
        const numValue = Number(value);
        if (isNaN(numValue) || numValue < 0) {
          errors.push(`${arg.name} must be a positive number`);
        }
        if (arg.validation?.min !== undefined && numValue < arg.validation.min) {
          errors.push(`${arg.name} must be at least ${arg.validation.min}`);
        }
        if (arg.validation?.max !== undefined && numValue > arg.validation.max) {
          errors.push(`${arg.name} must be at most ${arg.validation.max}`);
        }
      }

      if (arg.type === 'pubkey' && value) {
        try {
          new PublicKey(value);
        } catch {
          errors.push(`Invalid public key format for ${arg.name}`);
        }
      }
    });

    return errors;
  };

  const isInstructionValid = (instruction: BuiltInstruction): boolean => {
    return validateInstruction(instruction).length === 0;
  };

  const canBuildTransaction = (): boolean => {
    return transactionDraft.instructions.length > 0 && 
           transactionDraft.instructions.every(isInstructionValid);
  };

  const handleBuildTransaction = async () => {
    if (!canBuildTransaction()) return;
    if (!publicKey) {
      setBuildError('Please connect your wallet first');
      return;
    }

    setIsBuilding(true);
    setBuildError(null);

    try {
      const builder = new TransactionBuilder(connection);
      const transaction = await builder.buildTransaction(transactionDraft);
      
      // Prepare transaction with recent blockhash
      await builder.prepareTransaction(transaction, publicKey);
      
      // Estimate cost
      const cost = await builder.estimateCost(transaction);
      
      onTransactionBuilt?.(transaction, cost);
    } catch (error) {
      console.error('Failed to build transaction:', error);
      setBuildError(error instanceof Error ? error.message : 'Failed to build transaction');
    } finally {
      setIsBuilding(false);
    }
  };

  const handleExecuteTransaction = async (transaction: any) => {
    if (!publicKey || !sendTransaction) return;

    try {
      const signature = await sendTransaction(transaction, connection);
      console.log('Transaction sent:', signature);
      // Show success message, update UI, etc.
    } catch (error) {
      console.error('Transaction failed:', error);
      setBuildError('Transaction failed to send');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Instruction Assembler</h1>
          <p className="text-gray-400">
            Build transactions by adding and configuring instructions
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowTemplateSelector(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-medium transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add Instruction</span>
          </button>
          
          {canBuildTransaction() && (
            <button
              onClick={handleBuildTransaction}
              disabled={isBuilding || !canBuildTransaction()}
              className="flex items-center space-x-2 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all px-5 py-2 text-sm font-medium text-white"
            >
              {isBuilding ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Building...</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  <span>Build Transaction</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Popular Templates Section */}
      <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700/50">
        <h3 className="text-lg font-semibold text-white mb-3">Popular Instructions</h3>
        <div className="flex flex-wrap gap-2">
          {popularTemplates.map(templateId => {
            const template = getTemplateById(templateId);
            return template ? (
              <button
                key={templateId}
                onClick={() => addInstruction(template)}
                className="px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg text-sm font-medium text-purple-300 hover:text-purple-200 transition-colors"
              >
                {template.name}
              </button>
            ) : null;
          })}
        </div>
      </div>

      {/* Error Display */}
      {buildError && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-700 rounded-lg flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
          <span className="text-red-400">{buildError}</span>
        </div>
      )}

      {/* Instructions List */}
      <div className="space-y-4">
        {transactionDraft.instructions.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-gray-700 rounded-lg">
            <Wrench className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No instructions added yet</p>
            <button
              onClick={() => setShowTemplateSelector(true)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 hover:text-white transition-colors"
            >
              Add Your First Instruction
            </button>
          </div>
        ) : (
          transactionDraft.instructions.map((instruction, index) => (
            <InstructionCard
              key={index}
              instruction={instruction}
              index={index}
              onUpdateAccount={(accountName, value) => updateInstructionAccount(index, accountName, value)}
              onUpdateArg={(argName, value) => updateInstructionArg(index, argName, value)}
              onRemove={() => removeInstruction(index)}
              validationErrors={validateInstruction(instruction)}
            />
          ))
        )}
      </div>

      {/* Template Selector Modal */}
      {showTemplateSelector && (
        <TemplateSelectorModal
          categories={categories}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          templates={filteredTemplates}
          onSelectTemplate={addInstruction}
          onClose={() => setShowTemplateSelector(false)}
        />
      )}
    </div>
  );
}

// Instruction Card Component
function InstructionCard({ 
  instruction, 
  index, 
  onUpdateAccount, 
  onUpdateArg, 
  onRemove,
  validationErrors 
}: {
  instruction: BuiltInstruction;
  index: number;
  onUpdateAccount: (name: string, value: string) => void;
  onUpdateArg: (name: string, value: any) => void;
  onRemove: () => void;
  validationErrors: string[];
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg overflow-hidden">
      {/* Header */}
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
            <Zap className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
          
          <button
            onClick={onRemove}
            className="p-1 hover:bg-red-700 hover:text-red-400 rounded text-gray-400"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {expanded && (
        <div className="p-4 space-y-4">
          {/* Validation Errors */}
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

          {/* Accounts */}
          <div>
            <h4 className="font-medium text-gray-300 mb-3">Accounts</h4>
            <div className="space-y-3">
              {instruction.template.accounts.map(account => (
                <div key={account.name} className="flex items-center space-x-3">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      {account.name}
                      {account.type === 'signer' && <span className="text-yellow-400 ml-1">(Signer)</span>}
                      {account.type === 'writable' && <span className="text-blue-400 ml-1">(Writable)</span>}
                      {account.isOptional && <span className="text-gray-500 ml-1">(Optional)</span>}
                    </label>
                    <input
                      type="text"
                      value={instruction.accounts[account.name] || ''}
                      onChange={(e) => onUpdateAccount(account.name, e.target.value)}
                      placeholder={account.description}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">{account.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Arguments */}
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

// Template Selector Modal
function TemplateSelectorModal({ 
  categories, 
  selectedCategory, 
  onCategoryChange, 
  templates, 
  onSelectTemplate, 
  onClose 
}: {
  categories: any[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  templates: InstructionTemplate[];
  onSelectTemplate: (template: InstructionTemplate) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Add Instruction</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-800 rounded"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-4">
          {/* Category Tabs */}
          <div className="flex space-x-2 mb-4 overflow-x-auto">
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => onCategoryChange(category.id)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                <span>{category.icon}</span>
                <span>{category.name}</span>
              </button>
            ))}
          </div>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
            {templates.map(template => (
              <button
                key={template.id}
                onClick={() => onSelectTemplate(template)}
                className="p-4 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700/50 hover:border-purple-500/50 rounded-lg text-left transition-colors group"
              >
                <h3 className="font-semibold text-white group-hover:text-purple-300 transition-colors">
                  {template.name}
                </h3>
                <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                  {template.description}
                </p>
                <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                  <span>{template.accounts.length} accounts</span>
                  <span>{template.args.length} args</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}