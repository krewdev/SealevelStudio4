'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Save, 
  Trash2, 
  Plus, 
  Code, 
  Settings, 
  Terminal, 
  Zap, 
  Globe, 
  ShieldCheck, 
  Cpu, 
  ArrowRight, 
  Layers,
  Share2,
  MoreHorizontal,
  X,
  Send,
  Wrench,
  AlertCircle,
  CheckCircle,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { TransactionBuilder } from '../lib/transaction-builder';
import { getTemplateById, getTemplatesByCategory } from '../lib/instructions/templates';
import { BuiltInstruction, TransactionDraft, InstructionTemplate } from '../lib/instructions/types';
import { PublicKey } from '@solana/web3.js';

// --- Block to Instruction Template Mapping ---
const BLOCK_TO_TEMPLATE: Record<string, string> = {
  'jup_swap': 'jupiter_swap',
  'system_transfer': 'system_transfer',
  'token_transfer': 'spl_token_transfer',
  'token_mint': 'spl_token_mint_to',
  'token_burn': 'spl_token_burn',
  'ata_create': 'spl_ata_create',
};

// --- Simple Mode Block Categories ---
const SIMPLE_BLOCK_CATEGORIES = {
  DEFI: [
    { id: 'jup_swap', name: 'Jupiter Swap', icon: 'Zap', color: 'bg-orange-500', verified: true, params: { amount: '100000000', minAmountOut: '0' } },
    { id: 'system_transfer', name: 'Transfer SOL', icon: 'Layers', color: 'bg-green-600', verified: true, params: { to: '', amount: '1000000000' } },
    { id: 'token_transfer', name: 'Transfer Token', icon: 'TrendingUp', color: 'bg-blue-500', verified: true, params: { destination: '', amount: '1000000' } },
  ],
  TOKEN: [
    { id: 'token_mint', name: 'Mint Tokens', icon: 'Zap', color: 'bg-purple-500', verified: true, params: { destination: '', amount: '1000000' } },
    { id: 'token_burn', name: 'Burn Tokens', icon: 'Zap', color: 'bg-red-500', verified: true, params: { amount: '1000000' } },
    { id: 'ata_create', name: 'Create ATA', icon: 'Layers', color: 'bg-indigo-500', verified: true, params: { wallet: '', mint: '' } },
  ],
  WEB2: [
    { id: 'discord_webhook', name: 'Discord Alert', icon: 'MessageSquare', color: 'bg-indigo-500', verified: false, params: { webhook: 'https://...', msg: 'Trade Executed' } },
    { id: 'http_get', name: 'HTTP Request', icon: 'Globe', color: 'bg-gray-600', verified: false, params: { method: 'GET', url: 'https://api.coingecko...' } },
  ],
  LOGIC: [
    { id: 'condition_if', name: 'If Condition', icon: 'Split', color: 'bg-yellow-600', verified: true, params: { condition: 'Price > 150' } },
    { id: 'timer_cron', name: 'Schedule (Cron)', icon: 'Clock', color: 'bg-purple-600', verified: true, params: { time: 'Every Friday 9am' } },
  ]
};

interface SimpleBlock {
  id: string;
  name: string;
  icon: string;
  color: string;
  verified: boolean;
  params: Record<string, string>;
  instanceId?: string;
}

interface Log {
  timestamp: string;
  msg: string;
  type: 'info' | 'error' | 'success' | 'warning';
}

type ViewMode = 'simple' | 'advanced';

interface UnifiedTransactionBuilderProps {
  onTransactionBuilt?: (transaction: any, cost: any) => void;
}

export function UnifiedTransactionBuilder({ onTransactionBuilt }: UnifiedTransactionBuilderProps) {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [viewMode, setViewMode] = useState<ViewMode>('simple');
  
  // Shared transaction state
  const [transactionDraft, setTransactionDraft] = useState<TransactionDraft>({
    instructions: []
  });
  const [isBuilding, setIsBuilding] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [buildError, setBuildError] = useState<string | null>(null);
  const [builtTransaction, setBuiltTransaction] = useState<any>(null);
  const [transactionCost, setTransactionCost] = useState<{ lamports: number; sol: number } | null>(null);
  
  // Simple mode state
  const [simpleWorkflow, setSimpleWorkflow] = useState<SimpleBlock[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<SimpleBlock | null>(null);
  const [activeCategory, setActiveCategory] = useState<keyof typeof SIMPLE_BLOCK_CATEGORIES>('DEFI');
  const [logs, setLogs] = useState<Log[]>([]);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  
  // Advanced mode state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('system');
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);

  const categories = [
    { id: 'system', name: 'System', icon: '🏠' },
    { id: 'token', name: 'Token', icon: '🪙' },
    { id: 'nft', name: 'NFT', icon: '🎨' },
    { id: 'defi', name: 'DeFi', icon: '💰' },
    { id: 'custom', name: 'Custom', icon: '⚙️' }
  ];

  // Scroll to bottom of logs
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const addLog = (msg: string, type: Log['type'] = 'info') => {
    const timestamp = new Date().toLocaleTimeString([], { hour12: false });
    setLogs(prev => [...prev, { timestamp, msg, type }]);
  };

  // ===== SIMPLE MODE FUNCTIONS =====
  const addSimpleBlock = (block: SimpleBlock) => {
    const newBlock: SimpleBlock = { 
      ...block, 
      instanceId: Math.random().toString(36).substr(2, 9) 
    };
    setSimpleWorkflow([...simpleWorkflow, newBlock]);
    addLog(`Added block: ${block.name}`);
  };

  const removeSimpleBlock = (instanceId: string) => {
    setSimpleWorkflow(simpleWorkflow.filter(b => b.instanceId !== instanceId));
    if (selectedBlock?.instanceId === instanceId) setSelectedBlock(null);
  };

  const updateSimpleBlockParams = (instanceId: string, newParams: Record<string, string>) => {
    setSimpleWorkflow(simpleWorkflow.map(b => 
      b.instanceId === instanceId ? { ...b, params: { ...b.params, ...newParams } } : b
    ));
    if (selectedBlock?.instanceId === instanceId) {
      setSelectedBlock({ ...selectedBlock, params: { ...selectedBlock.params, ...newParams } });
    }
  };

  // Convert simple blocks to instructions
  const convertSimpleBlocksToInstructions = async (): Promise<BuiltInstruction[]> => {
    const instructions: BuiltInstruction[] = [];
    
    for (const block of simpleWorkflow) {
      if (!block.verified || !BLOCK_TO_TEMPLATE[block.id]) {
        continue;
      }

      const templateId = BLOCK_TO_TEMPLATE[block.id];
      const template = getTemplateById(templateId);
      
      if (!template) {
        addLog(`Warning: Template not found for ${block.name}`, 'warning');
        continue;
      }

      const accounts: Record<string, string> = {};
      const args: Record<string, any> = {};

      if (block.id === 'system_transfer') {
        if (!publicKey) throw new Error('Wallet not connected');
        accounts['from'] = publicKey.toString();
        accounts['to'] = block.params.to || '';
        args['amount'] = BigInt(block.params.amount || '0');
      } else if (block.id === 'token_transfer') {
        if (!publicKey) throw new Error('Wallet not connected');
        accounts['authority'] = publicKey.toString();
        accounts['source'] = '';
        accounts['destination'] = block.params.destination || '';
        args['amount'] = BigInt(block.params.amount || '0');
      } else if (block.id === 'jup_swap') {
        if (!publicKey) throw new Error('Wallet not connected');
        accounts['userTransferAuthority'] = publicKey.toString();
        args['amount'] = BigInt(block.params.amount || '0');
        args['minAmountOut'] = BigInt(block.params.minAmountOut || '0');
      } else {
        Object.entries(block.params).forEach(([key, value]) => {
          const arg = template.args.find(a => a.name === key);
          const account = template.accounts.find(a => a.name === key);
          
          if (arg) {
            if (arg.type.startsWith('u') || arg.type.startsWith('i')) {
              args[key] = BigInt(value || '0');
            } else {
              args[key] = value;
            }
          } else if (account) {
            accounts[key] = value;
          }
        });
      }

      instructions.push({ template, accounts, args });
    }

    return instructions;
  };

  // ===== ADVANCED MODE FUNCTIONS =====
  const addAdvancedInstruction = (template: InstructionTemplate) => {
    const newInstruction: BuiltInstruction = {
      template,
      accounts: {},
      args: {}
    };
    setTransactionDraft({
      ...transactionDraft,
      instructions: [...transactionDraft.instructions, newInstruction]
    });
    setShowTemplateSelector(false);
  };

  const removeAdvancedInstruction = (index: number) => {
    setTransactionDraft({
      ...transactionDraft,
      instructions: transactionDraft.instructions.filter((_, i) => i !== index)
    });
  };

  const updateAdvancedInstructionAccount = (index: number, accountName: string, value: string) => {
    const updated = [...transactionDraft.instructions];
    updated[index] = {
      ...updated[index],
      accounts: { ...updated[index].accounts, [accountName]: value }
    };
    setTransactionDraft({ ...transactionDraft, instructions: updated });
  };

  const updateAdvancedInstructionArg = (index: number, argName: string, value: any) => {
    const updated = [...transactionDraft.instructions];
    updated[index] = {
      ...updated[index],
      args: { ...updated[index].args, [argName]: value }
    };
    setTransactionDraft({ ...transactionDraft, instructions: updated });
  };

  const validateAdvancedInstruction = (instruction: BuiltInstruction): string[] => {
    const errors: string[] = [];
    
    instruction.template.accounts.forEach(account => {
      if (!account.isOptional && !instruction.accounts[account.name]) {
        errors.push(`Missing required account: ${account.name}`);
      }
    });
    
    instruction.template.args.forEach(arg => {
      if (!arg.isOptional && instruction.args[arg.name] === undefined) {
        errors.push(`Missing required argument: ${arg.name}`);
      }
    });
    
    return errors;
  };

  // ===== SHARED TRANSACTION BUILDING =====
  const buildTransaction = async () => {
    if (!connection) {
      setBuildError('Connection not available');
      return;
    }

    if (!publicKey) {
      setBuildError('Please connect your wallet to build transactions');
      return;
    }

    setIsBuilding(true);
    setBuildError(null);
    setBuiltTransaction(null);
    setTransactionCost(null);
    setLogs([]);

    try {
      let instructions: BuiltInstruction[] = [];

      if (viewMode === 'simple') {
        addLog('Converting blocks to instructions...', 'info');
        instructions = await convertSimpleBlocksToInstructions();
        
        if (instructions.length === 0) {
          setBuildError('No valid transaction blocks found in workflow');
          setIsBuilding(false);
          return;
        }
        addLog(`Found ${instructions.length} transaction instruction(s)`, 'success');
      } else {
        // Advanced mode - validate all instructions
        const validationErrors = transactionDraft.instructions.flatMap(validateAdvancedInstruction);
        if (validationErrors.length > 0) {
          setBuildError(`Validation errors: ${validationErrors.join(', ')}`);
          setIsBuilding(false);
          return;
        }
        instructions = transactionDraft.instructions;
      }

      addLog('Building transaction...', 'info');
      const builder = new TransactionBuilder(connection);
      
      const draft: TransactionDraft = {
        instructions,
        priorityFee: 0,
        memo: `Sealevel Studio - ${new Date().toISOString()}`
      };

      const transaction = await builder.buildTransaction(draft);
      await builder.prepareTransaction(transaction, publicKey);
      
      const cost = await builder.estimateCost(transaction);
      setBuiltTransaction(transaction);
      setTransactionCost(cost);

      addLog(`Transaction built successfully!`, 'success');
      addLog(`Estimated cost: ${cost.sol.toFixed(9)} SOL (${cost.lamports} lamports)`, 'info');
      addLog(`Instructions: ${instructions.length}`, 'info');

      for (let i = 0; i < instructions.length; i++) {
        const inst = instructions[i];
        addLog(`  [${i + 1}] ${inst.template.name}`, 'info');
      }

      onTransactionBuilt?.(transaction, cost);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to build transaction';
      setBuildError(errorMsg);
      addLog(`Error: ${errorMsg}`, 'error');
      console.error('Transaction build error:', error);
    } finally {
      setIsBuilding(false);
    }
  };

  const executeTransaction = async () => {
    if (!builtTransaction || !sendTransaction || !publicKey) {
      addLog('Error: Transaction not built or wallet not connected', 'error');
      return;
    }

    setIsExecuting(true);
    addLog('Sending transaction to network...', 'info');

    try {
      const signature = await sendTransaction(builtTransaction, connection);
      addLog(`Transaction sent! Signature: ${signature}`, 'success');
      addLog(`View on Solscan: https://solscan.io/tx/${signature}`, 'info');
      
      addLog('Waiting for confirmation...', 'info');
      await connection.confirmTransaction(signature, 'confirmed');
      addLog('Transaction confirmed!', 'success');
      
      setBuiltTransaction(null);
      setTransactionCost(null);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Transaction failed';
      addLog(`Error: ${errorMsg}`, 'error');
      console.error('Transaction execution error:', error);
    } finally {
      setIsExecuting(false);
    }
  };

  // Render Icon Helper
  const renderIcon = (iconName: string, className: string) => {
    const icons: Record<string, React.ReactNode> = {
      Zap: <Zap className={className} />,
      Globe: <Globe className={className} />,
      ShieldCheck: <ShieldCheck className={className} />,
      Layers: <Layers className={className} />,
      Clock: <Settings className={className} />,
      TrendingUp: <Zap className={className} />,
      MessageSquare: <Share2 className={className} />,
      Split: <Code className={className} />
    };
    return icons[iconName] || <Cpu className={className} />;
  };

  const filteredTemplates = getTemplatesByCategory(selectedCategory).filter(template =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Render Simple Mode
  const renderSimpleMode = () => (
    <div className="flex flex-col h-full bg-slate-950 text-slate-200 font-mono overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar: Block Palette */}
        <aside className="w-64 border-r border-slate-800 bg-slate-900/30 flex flex-col">
          <div className="p-3 border-b border-slate-800">
            <div className="flex bg-slate-800 p-1 rounded-lg">
              {Object.keys(SIMPLE_BLOCK_CATEGORIES).map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat as keyof typeof SIMPLE_BLOCK_CATEGORIES)}
                  className={`flex-1 text-xs py-1.5 rounded-md transition-all ${
                    activeCategory === cat 
                    ? 'bg-slate-700 text-white shadow-sm' 
                    : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {SIMPLE_BLOCK_CATEGORIES[activeCategory].map(block => (
              <div 
                key={block.id}
                onClick={() => addSimpleBlock(block)}
                className="group relative bg-slate-800 border border-slate-700 hover:border-teal-500/50 hover:bg-slate-800/80 p-3 rounded-lg cursor-pointer transition-all duration-200 active:scale-95"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded flex items-center justify-center text-white shadow-lg ${block.color}`}>
                      {renderIcon(block.icon, "w-4 h-4")}
                    </div>
                    <span className="text-sm font-medium">{block.name}</span>
                  </div>
                  {block.verified && (
                    <ShieldCheck size={14} className="text-teal-500" title="VeriSoL Audited" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Center: Canvas */}
        <main className="flex-1 flex flex-col relative bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] bg-slate-950">
          <div className="absolute top-4 left-4 right-4 h-12 pointer-events-none flex justify-between items-start z-10">
            <div className="pointer-events-auto flex gap-2">
              <button 
                onClick={buildTransaction}
                disabled={isBuilding || isExecuting}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm shadow-lg shadow-black/50 transition-all ${
                  isBuilding || isExecuting
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed' 
                  : 'bg-teal-500 hover:bg-teal-400 text-slate-900 hover:scale-105 active:scale-95'
                }`}
              >
                {isBuilding ? <Cpu className="animate-spin" size={16} /> : <Play size={16} />}
                {isBuilding ? 'Building...' : 'Build Transaction'}
              </button>
              
              {builtTransaction && (
                <button 
                  onClick={executeTransaction}
                  disabled={isExecuting || !publicKey}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm shadow-lg shadow-black/50 transition-all ${
                    isExecuting || !publicKey
                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed' 
                    : 'bg-green-500 hover:bg-green-400 text-slate-900 hover:scale-105 active:scale-95'
                  }`}
                >
                  {isExecuting ? <Cpu className="animate-spin" size={16} /> : <Send size={16} />}
                  {isExecuting ? 'Sending...' : 'Execute'}
                </button>
              )}
              
              {transactionCost && (
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs">
                  <span className="text-slate-400">Cost:</span>
                  <span className="text-green-400 font-mono">{transactionCost.sol.toFixed(9)} SOL</span>
                </div>
              )}
            </div>
            
            <div className="pointer-events-auto flex gap-2">
              <button 
                className="p-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-white hover:border-slate-600 transition-colors"
                onClick={() => setSimpleWorkflow([])}
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8 pt-20 flex flex-col items-center gap-4">
            {simpleWorkflow.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-4 opacity-50">
                <Layers size={48} className="text-slate-700" />
                <p>Drag & drop blocks here to build your transaction</p>
              </div>
            ) : (
              simpleWorkflow.map((block, index) => (
                <div key={block.instanceId} className="w-full max-w-md relative group">
                  {index > 0 && (
                    <div className="h-4 w-0.5 bg-slate-700 mx-auto absolute -top-4 left-0 right-0" />
                  )}
                  
                  <div 
                    onClick={() => setSelectedBlock(block)}
                    className={`relative bg-slate-900 border ${
                      selectedBlock?.instanceId === block.instanceId 
                      ? 'border-teal-500 ring-1 ring-teal-500/50 shadow-[0_0_20px_rgba(20,184,166,0.2)]' 
                      : 'border-slate-700 hover:border-slate-500'
                    } p-4 rounded-xl transition-all cursor-pointer select-none`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded flex items-center justify-center text-white shadow-sm ${block.color}`}>
                          {renderIcon(block.icon, "w-4 h-4")}
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-200">{block.name}</h3>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                            {block.verified ? <span className="text-teal-500 flex items-center gap-1"><ShieldCheck size={10}/> Verified</span> : 'External'}
                          </p>
                        </div>
                      </div>
                      <MoreHorizontal size={16} className="text-slate-600" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      {Object.entries(block.params).map(([key, value]) => (
                        <div key={key} className="bg-slate-950/50 rounded px-2 py-1 border border-slate-800 flex justify-between items-center">
                          <span className="text-[10px] text-slate-500 uppercase">{key}</span>
                          <span className="text-xs font-mono text-teal-200 truncate max-w-[80px]">{value}</span>
                        </div>
                      ))}
                    </div>

                    <button 
                      onClick={(e) => { e.stopPropagation(); removeSimpleBlock(block.instanceId!); }}
                      className="absolute -right-2 -top-2 bg-red-500/90 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg scale-0 group-hover:scale-100"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Terminal */}
          <div className="h-48 bg-slate-900 border-t border-slate-800 flex flex-col font-mono text-xs">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-950 border-b border-slate-800">
              <div className="flex items-center gap-2 text-slate-400">
                <Terminal size={14} />
                <span>Runtime Output</span>
              </div>
              <button onClick={() => setLogs([])} className="hover:text-white text-slate-500">Clear</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {logs.length === 0 && (
                <span className="text-slate-600 italic">Ready to build transaction...</span>
              )}
              {logs.map((log, i) => (
                <div key={i} className="flex gap-3">
                  <span className="text-slate-600 shrink-0">[{log.timestamp}]</span>
                  <span className={`
                    ${log.type === 'error' ? 'text-red-400' : ''}
                    ${log.type === 'success' ? 'text-green-400' : ''}
                    ${log.type === 'warning' ? 'text-orange-400' : ''}
                    ${log.type === 'info' ? 'text-slate-300' : ''}
                  `}>
                    {log.type === 'success' ? '✔ ' : ''}
                    {log.type === 'error' ? '✖ ' : ''}
                    {log.msg}
                  </span>
                </div>
              ))}
              <div ref={terminalEndRef} />
            </div>
          </div>
        </main>

        {/* Right Sidebar: Block Config */}
        {selectedBlock ? (
          <aside className="w-72 border-l border-slate-800 bg-slate-900 p-4 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-slate-200">Block Config</h2>
              <button onClick={() => setSelectedBlock(null)} className="text-slate-500 hover:text-white"><X size={16} /></button>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
                <div className={`w-10 h-10 rounded flex items-center justify-center text-white shadow-sm ${selectedBlock.color}`}>
                  {renderIcon(selectedBlock.icon, "w-5 h-5")}
                </div>
                <div>
                  <h3 className="font-bold text-slate-100">{selectedBlock.name}</h3>
                  <p className="text-xs text-slate-500">{selectedBlock.id}</p>
                </div>
              </div>

              <div className="space-y-4">
                {Object.entries(selectedBlock.params).map(([key, value]) => (
                  <div key={key} className="space-y-1">
                    <label className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">{key}</label>
                    <input 
                      type="text" 
                      value={value} 
                      onChange={(e) => updateSimpleBlockParams(selectedBlock.instanceId!, { [key]: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-teal-500 focus:outline-none transition-colors"
                    />
                  </div>
                ))}
              </div>
            </div>
          </aside>
        ) : (
          <aside className="w-12 border-l border-slate-800 bg-slate-900/30 flex flex-col items-center py-4 gap-4 text-slate-600">
            <Settings size={18} />
          </aside>
        )}
      </div>
    </div>
  );

  // Render Advanced Mode (InstructionAssembler)
  const renderAdvancedMode = () => (
    <div className="space-y-6 p-6">
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
          
          {transactionDraft.instructions.length > 0 && (
            <button
              onClick={buildTransaction}
              disabled={isBuilding || isExecuting}
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

          {builtTransaction && (
            <button
              onClick={executeTransaction}
              disabled={isExecuting || !publicKey}
              className="flex items-center space-x-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all px-5 py-2 text-sm font-medium text-white"
            >
              {isExecuting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Execute</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {buildError && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-700 rounded-lg flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
          <span className="text-red-400">{buildError}</span>
        </div>
      )}

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
        <div className="space-y-4">
          {transactionDraft.instructions.map((instruction, index) => (
            <AdvancedInstructionCard
              key={index}
              instruction={instruction}
              index={index}
              onUpdateAccount={(accountName, value) => updateAdvancedInstructionAccount(index, accountName, value)}
              onUpdateArg={(argName, value) => updateAdvancedInstructionArg(index, argName, value)}
              onRemove={() => removeAdvancedInstruction(index)}
              validationErrors={validateAdvancedInstruction(instruction)}
            />
          ))}
        </div>
      )}

      {showTemplateSelector && (
        <TemplateSelectorModal
          categories={categories}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          templates={filteredTemplates}
          onSelectTemplate={addAdvancedInstruction}
          onClose={() => setShowTemplateSelector(false)}
        />
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Mode Toggle Header */}
      <div className="border-b border-gray-700 bg-gray-800/50 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-white">Transaction Builder</h1>
          <div className="flex items-center gap-2 bg-gray-900 rounded-lg p-1">
            <button
              onClick={() => setViewMode('simple')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                viewMode === 'simple'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Layers size={16} />
              Simple
            </button>
            <button
              onClick={() => setViewMode('advanced')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                viewMode === 'advanced'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Wrench size={16} />
              Advanced
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {publicKey ? (
            <span className="text-xs px-2 py-1 rounded bg-green-900/30 text-green-400 border border-green-700/50">
              {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
            </span>
          ) : (
            <span className="text-xs px-2 py-1 rounded bg-red-900/30 text-red-400 border border-red-700/50">
              Wallet Not Connected
            </span>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'simple' ? renderSimpleMode() : renderAdvancedMode()}
      </div>
    </div>
  );
}

// Advanced Mode Instruction Card
function AdvancedInstructionCard({ 
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
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-4">
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

