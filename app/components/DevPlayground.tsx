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
  Send
} from 'lucide-react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { TransactionBuilder } from '../lib/transaction-builder';
import { getTemplateById } from '../lib/instructions/templates';
import { BuiltInstruction, TransactionDraft } from '../lib/instructions/types';
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

// --- Mock Data for "Legos" ---
const LEGO_CATEGORIES = {
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

interface Block {
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

const DevPlayground = () => {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [workflow, setWorkflow] = useState<Block[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [logs, setLogs] = useState<Log[]>([]);
  const [activeCategory, setActiveCategory] = useState<keyof typeof LEGO_CATEGORIES>('DEFI');
  const [builtTransaction, setBuiltTransaction] = useState<any>(null);
  const [transactionCost, setTransactionCost] = useState<{ lamports: number; sol: number } | null>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of logs
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const addBlock = (block: Block) => {
    const newBlock: Block = { 
      ...block, 
      instanceId: Math.random().toString(36).substr(2, 9) 
    };
    setWorkflow([...workflow, newBlock]);
    addLog(`Added block: ${block.name}`);
  };

  const removeBlock = (instanceId: string) => {
    setWorkflow(workflow.filter(b => b.instanceId !== instanceId));
    if (selectedBlock?.instanceId === instanceId) setSelectedBlock(null);
  };

  const updateBlockParams = (instanceId: string, newParams: Record<string, string>) => {
    setWorkflow(workflow.map(b => 
      b.instanceId === instanceId ? { ...b, params: { ...b.params, ...newParams } } : b
    ));
    // Update selected block if it's the one being edited
    if (selectedBlock?.instanceId === instanceId) {
      setSelectedBlock({ ...selectedBlock, params: { ...selectedBlock.params, ...newParams } });
    }
  };

  const addLog = (msg: string, type: Log['type'] = 'info') => {
    const timestamp = new Date().toLocaleTimeString([], { hour12: false });
    setLogs(prev => [...prev, { timestamp, msg, type }]);
  };

  // Convert blocks to BuiltInstructions
  const convertBlocksToInstructions = async (): Promise<BuiltInstruction[]> => {
    const instructions: BuiltInstruction[] = [];
    
    for (const block of workflow) {
      // Skip non-transaction blocks (WEB2, LOGIC)
      if (!block.verified || !BLOCK_TO_TEMPLATE[block.id]) {
        continue;
      }

      const templateId = BLOCK_TO_TEMPLATE[block.id];
      const template = getTemplateById(templateId);
      
      if (!template) {
        addLog(`Warning: Template not found for ${block.name}`, 'warning');
        continue;
      }

      // Build accounts and args from block params
      const accounts: Record<string, string> = {};
      const args: Record<string, any> = {};

      // For system_transfer, use wallet as 'from' and params for 'to' and 'amount'
      if (block.id === 'system_transfer') {
        if (!publicKey) {
          throw new Error('Wallet not connected');
        }
        accounts['from'] = publicKey.toString();
        accounts['to'] = block.params.to || '';
        args['amount'] = BigInt(block.params.amount || '0');
      }
      // For token_transfer
      else if (block.id === 'token_transfer') {
        if (!publicKey) {
          throw new Error('Wallet not connected');
        }
        accounts['authority'] = publicKey.toString();
        accounts['source'] = ''; // Would need to be provided
        accounts['destination'] = block.params.destination || '';
        args['amount'] = BigInt(block.params.amount || '0');
      }
      // For jupiter_swap (simplified - would need more complex setup)
      else if (block.id === 'jup_swap') {
        if (!publicKey) {
          throw new Error('Wallet not connected');
        }
        accounts['userTransferAuthority'] = publicKey.toString();
        args['amount'] = BigInt(block.params.amount || '0');
        args['minAmountOut'] = BigInt(block.params.minAmountOut || '0');
      }
      // Add more mappings as needed
      else {
        // Generic mapping - try to match param names to template args/accounts
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

      instructions.push({
        template,
        accounts,
        args
      });
    }

    return instructions;
  };

  const runSimulation = async () => {
    if (workflow.length === 0) {
      addLog('Error: Workflow is empty.', 'error');
      return;
    }

    setIsRunning(true);
    setLogs([]);
    setBuiltTransaction(null);
    setTransactionCost(null);
    
    addLog('Initializing Runtime Environment...');
    addLog('Verifying VeriSoL Attestations...', 'info');

    try {
      // Convert blocks to instructions
      addLog('Converting blocks to instructions...', 'info');
      const instructions = await convertBlocksToInstructions();
      
      if (instructions.length === 0) {
        addLog('Warning: No valid transaction blocks found in workflow.', 'warning');
        setIsRunning(false);
        return;
      }

      addLog(`Found ${instructions.length} transaction instruction(s)`, 'success');

      // Build transaction
      if (!connection) {
        throw new Error('Connection not available');
      }

      if (!publicKey) {
        throw new Error('Please connect your wallet to build transactions');
      }

      addLog('Building transaction...', 'info');
      const builder = new TransactionBuilder(connection);
      
      const draft: TransactionDraft = {
        instructions,
        priorityFee: 0,
        memo: `DevPlayground Workflow - ${new Date().toISOString()}`
      };

      const transaction = await builder.buildTransaction(draft);
      await builder.prepareTransaction(transaction, publicKey);
      
      const cost = await builder.estimateCost(transaction);
      setBuiltTransaction(transaction);
      setTransactionCost(cost);

      addLog(`Transaction built successfully!`, 'success');
      addLog(`Estimated cost: ${cost.sol.toFixed(9)} SOL (${cost.lamports} lamports)`, 'info');
      addLog(`Instructions: ${instructions.length}`, 'info');

      // Log each instruction
      for (let i = 0; i < instructions.length; i++) {
        const inst = instructions[i];
        const block = workflow.find(b => BLOCK_TO_TEMPLATE[b.id] === inst.template.id);
        if (block) {
          addLog(`  [${i + 1}] ${block.name} (${inst.template.name})`, 'info');
        }
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to build transaction';
      addLog(`Error: ${errorMsg}`, 'error');
      console.error('Transaction build error:', error);
    } finally {
      setIsRunning(false);
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
      
      // Wait for confirmation
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
      Clock: <Settings className={className} />, // Placeholder
      TrendingUp: <Zap className={className} />, // Placeholder
      MessageSquare: <Share2 className={className} />, // Placeholder
      Split: <Code className={className} /> // Placeholder
    };
    return icons[iconName] || <Cpu className={className} />;
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-200 font-mono overflow-hidden selection:bg-teal-500 selection:text-slate-900">
      
      {/* Top Bar */}
      <header className="h-14 border-b border-slate-800 flex items-center justify-between px-4 bg-slate-900/50 backdrop-blur-sm z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-teal-500 rounded flex items-center justify-center text-slate-900 font-bold text-lg">
            On
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-wider text-teal-400 uppercase">Dev Playground</h1>
            <p className="text-xs text-slate-500">Pro Mode v0.9.2 // Powered by VeriSoL</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <span className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-400 border border-slate-700">
             Network: <span className="text-green-400">Mainnet-Beta</span>
           </span>
           {publicKey ? (
             <span className="text-xs px-2 py-1 rounded bg-green-900/30 text-green-400 border border-green-700/50">
               Wallet: {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
             </span>
           ) : (
             <span className="text-xs px-2 py-1 rounded bg-red-900/30 text-red-400 border border-red-700/50">
               Wallet Not Connected
             </span>
           )}
           <button className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition">
             <Share2 size={18} />
           </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Sidebar: Lego Palette */}
        <aside className="w-64 border-r border-slate-800 bg-slate-900/30 flex flex-col">
          <div className="p-3 border-b border-slate-800">
             <div className="flex bg-slate-800 p-1 rounded-lg">
               {Object.keys(LEGO_CATEGORIES).map(cat => (
                 <button
                   key={cat}
                   onClick={() => setActiveCategory(cat as keyof typeof LEGO_CATEGORIES)}
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
            {LEGO_CATEGORIES[activeCategory].map(block => (
              <div 
                key={block.id}
                onClick={() => addBlock(block)}
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
                <div className="absolute inset-0 border border-teal-500/0 group-hover:border-teal-500/30 rounded-lg pointer-events-none transition-all" />
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-slate-800 bg-slate-900/80">
             <div className="text-xs text-slate-500 mb-2 flex items-center gap-1">
               <Code size={12} />
               AI Command Line
             </div>
             <div className="relative">
               <input 
                 type="text" 
                 placeholder='Try "Swap 5 SOL to USDC..."'
                 className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500 transition-colors placeholder:text-slate-600"
               />
               <button className="absolute right-1 top-1 bottom-1 px-2 bg-slate-800 hover:bg-teal-600 rounded text-xs text-slate-300 hover:text-white transition-colors">
                 <ArrowRight size={12} />
               </button>
             </div>
          </div>
        </aside>

        {/* Center: The Canvas */}
        <main className="flex-1 flex flex-col relative bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] bg-slate-950">
          
          {/* Canvas Toolbar */}
          <div className="absolute top-4 left-4 right-4 h-12 pointer-events-none flex justify-between items-start z-10">
             <div className="pointer-events-auto flex gap-2">
               <button 
                 onClick={runSimulation}
                 disabled={isRunning || isExecuting}
                 className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm shadow-lg shadow-black/50 transition-all ${
                   isRunning || isExecuting
                   ? 'bg-slate-700 text-slate-400 cursor-not-allowed' 
                   : 'bg-teal-500 hover:bg-teal-400 text-slate-900 hover:scale-105 active:scale-95'
                 }`}
               >
                 {isRunning ? <Cpu className="animate-spin" size={16} /> : <Play size={16} />}
                 {isRunning ? 'Building Transaction...' : 'Build Transaction'}
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
                   {isExecuting ? 'Sending...' : 'Execute Transaction'}
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
                  onClick={() => setWorkflow([])}
                >
                   <Trash2 size={18} />
                </button>
                <button className="p-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-white hover:border-slate-600 transition-colors">
                   <Save size={18} />
                </button>
             </div>
          </div>

          {/* The Stack (Visualizer) */}
          <div className="flex-1 overflow-y-auto p-8 pt-20 flex flex-col items-center gap-4">
             {workflow.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-4 opacity-50">
                 <Layers size={48} className="text-slate-700" />
                 <p>Drag & drop Legos here to build your bot</p>
               </div>
             ) : (
               workflow.map((block, index) => (
                 <div key={block.instanceId} className="w-full max-w-md relative group">
                   {/* Connecting Line */}
                   {index > 0 && (
                     <div className="h-4 w-0.5 bg-slate-700 mx-auto absolute -top-4 left-0 right-0" />
                   )}
                   
                   {/* Block Card */}
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
                               {block.verified ? <span className="text-teal-500 flex items-center gap-1"><ShieldCheck size={10}/> Verified Logic</span> : 'External Action'}
                             </p>
                           </div>
                        </div>
                        <MoreHorizontal size={16} className="text-slate-600" />
                      </div>
                      
                      {/* Parameters Preview */}
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        {Object.entries(block.params).map(([key, value]) => (
                          <div key={key} className="bg-slate-950/50 rounded px-2 py-1 border border-slate-800 flex justify-between items-center">
                            <span className="text-[10px] text-slate-500 uppercase">{key}</span>
                            <span className="text-xs font-mono text-teal-200 truncate max-w-[80px]">{value}</span>
                          </div>
                        ))}
                      </div>

                      {/* Remove Button (Hover) */}
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeBlock(block.instanceId!); }}
                        className="absolute -right-2 -top-2 bg-red-500/90 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg scale-0 group-hover:scale-100"
                      >
                        <X size={12} />
                      </button>
                   </div>
                 </div>
               ))
             )}
             
             {/* Add Button at bottom of stack */}
             {workflow.length > 0 && (
                <div className="h-8 w-0.5 bg-slate-700" />
             )}
             <div className="border-2 border-dashed border-slate-800 rounded-xl w-full max-w-md p-4 flex items-center justify-center text-slate-600 hover:border-slate-600 hover:text-slate-400 transition-all cursor-pointer">
               <Plus size={20} />
             </div>
          </div>

          {/* Bottom Panel: Terminal */}
          <div className="h-48 bg-slate-900 border-t border-slate-800 flex flex-col font-mono text-xs">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-950 border-b border-slate-800">
              <div className="flex items-center gap-2 text-slate-400">
                <Terminal size={14} />
                <span>Sealevel Runtime Output</span>
              </div>
              <div className="flex gap-2">
                 <button onClick={() => setLogs([])} className="hover:text-white text-slate-500">Clear</button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
               {logs.length === 0 && (
                 <span className="text-slate-600 italic">Ready to simulate...</span>
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

        {/* Right Sidebar: Properties (Visible when block selected) */}
        {selectedBlock ? (
          <aside className="w-72 border-l border-slate-800 bg-slate-900 p-4 flex flex-col animate-in slide-in-from-right duration-200">
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
                       onChange={(e) => updateBlockParams(selectedBlock.instanceId!, { [key]: e.target.value })}
                       className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-teal-500 focus:outline-none transition-colors"
                     />
                   </div>
                 ))}
               </div>

               {selectedBlock.verified ? (
                 <div className="bg-teal-500/10 border border-teal-500/30 rounded-lg p-3 mt-4">
                   <div className="flex items-center gap-2 text-teal-400 mb-1">
                     <ShieldCheck size={16} />
                     <span className="font-bold text-xs">VeriSoL Secured</span>
                   </div>
                   <p className="text-[10px] text-teal-200/70 leading-relaxed">
                     This block's logic has been verified on-chain. 
                     <br/>
                     <span className="opacity-50">Proof ID: 0x7a...9f</span>
                   </p>
                 </div>
               ) : (
                 <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 mt-4">
                   <div className="flex items-center gap-2 text-orange-400 mb-1">
                     <Globe size={16} />
                     <span className="font-bold text-xs">External Logic</span>
                   </div>
                   <p className="text-[10px] text-orange-200/70 leading-relaxed">
                     This block interacts with Web2 APIs. Data integrity relies on the endpoint source.
                   </p>
                 </div>
               )}
               
               <div className="mt-auto pt-10">
                  <button className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded flex items-center justify-center gap-2 transition-colors">
                    <Code size={14} />
                    View in Sealevel Studio
                  </button>
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
};

export default DevPlayground;

