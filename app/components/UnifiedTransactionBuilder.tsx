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
  ToggleRight,
  ArrowLeft,
  Clipboard,
  ClipboardCheck,
  Info,
  TrendingUp
} from 'lucide-react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { TransactionBuilder } from '../lib/transaction-builder';
import { getTemplateById, getTemplatesByCategory } from '../lib/instructions/templates';
import { BuiltInstruction, TransactionDraft, InstructionTemplate } from '../lib/instructions/types';
import { PublicKey } from '@solana/web3.js';
import { UnifiedAIAgents } from './UnifiedAIAgents';
import { ArbitragePanel } from './ArbitragePanel';
import { ArbitrageOpportunity } from '../lib/pools/types';

// --- Block to Instruction Template Mapping ---
const BLOCK_TO_TEMPLATE: Record<string, string> = {
  'jup_swap': 'jupiter_swap',
  'system_transfer': 'system_transfer',
  'token_transfer': 'spl_token_transfer',
  'create_token_and_mint': 'spl_token_create_mint', // Custom combined operation
  'token_mint': 'spl_token_mint_to',
  'token_burn': 'spl_token_burn',
  'ata_create': 'spl_ata_create',
};

export interface SimpleBlock {
  id: string;
  name: string;
  icon: string;
  color: string;
  verified: boolean;
  params: Record<string, string>;
  instanceId?: string;
}

// --- Simple Mode Block Categories ---
const SIMPLE_BLOCK_CATEGORIES: Record<string, SimpleBlock[]> = {
  DEFI: [
    { id: 'jup_swap', name: 'Jupiter Swap', icon: 'Zap', color: 'bg-orange-500', verified: true, params: { amount: '100000000', minAmountOut: '0' } },
    { id: 'system_transfer', name: 'Transfer SOL', icon: 'Layers', color: 'bg-green-600', verified: true, params: { to: '', amount: '1000000000' } },
    { id: 'token_transfer', name: 'Transfer Token', icon: 'TrendingUp', color: 'bg-blue-500', verified: true, params: { destination: '', amount: '1000000' } },
  ],
  TOKEN: [
    { id: 'create_token_and_mint', name: 'Create Token + Mint', icon: 'Zap', color: 'bg-purple-600', verified: true, params: { 
      // Core SPL Mint Attributes
      decimals: '9', 
      initialSupply: '1.00', 
      mintAuthority: '', 
      freezeAuthority: '', 
      enableFreeze: 'false',
      revokeMintAuthority: 'false',
      
      // Token Account Attributes
      tokenAccountOwner: '',
      delegate: '',
      delegatedAmount: '0',
      freezeInitialAccount: 'false',
      isNative: 'false',
      
      // Metaplex Metadata
      tokenName: '',
      tokenSymbol: '',
      metadataURI: '',
      sellerFeeBasisPoints: '500',
      creators: '',
      primarySaleHappened: 'false',
      isMutable: 'true',
      
      // Token-2022 Extensions
      useToken2022: 'false',
      transferFee: '0',
      enableTax: 'false',
      transferHookProgram: '',
      enableConfidentialTransfers: 'false',
      enableInterestBearing: 'false',
      interestRate: '0',
      enableNonTransferable: 'false',
      enableTransferMemo: 'false',
      enableImmutableOwner: 'false',
      metadataPointer: '',
      supplyCap: ''
    } },
    { id: 'token_mint', name: 'Mint Tokens', icon: 'Zap', color: 'bg-purple-500', verified: true, params: { mint: '', destination: '', amount: '1000000' } },
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

interface Log {
  timestamp: string;
  msg: string;
  type: 'info' | 'error' | 'success' | 'warning';
}

type ViewMode = 'simple' | 'advanced';

// Template Tooltip Component (for advanced mode)
function TemplateTooltip({ 
  template, 
  children 
}: { 
  template: InstructionTemplate;
  children: React.ReactElement;
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  const getRules = () => {
    const rules: string[] = [];
    
    template.args.forEach(arg => {
      if (arg.validation) {
        if (arg.validation.min !== undefined) {
          rules.push(`${arg.name}: minimum ${arg.validation.min}`);
        }
        if (arg.validation.max !== undefined) {
          rules.push(`${arg.name}: maximum ${arg.validation.max}`);
        }
        if (arg.validation.pattern) {
          rules.push(`${arg.name}: must match pattern`);
        }
      }
      if (arg.isOptional) {
        rules.push(`${arg.name}: optional`);
      }
    });

    template.accounts.forEach(acc => {
      if (acc.isOptional) {
        rules.push(`${acc.name}: optional account`);
      }
      if (acc.type === 'signer') {
        rules.push(`${acc.name}: must be a signer`);
      }
    });

    return rules;
  };

  return (
    <div 
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {children}
      {showTooltip && (
        <div
          className="absolute z-50 w-80 p-4 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl pointer-events-none"
          style={{
            left: 'calc(100% + 12px)',
            top: '50%',
            transform: 'translateY(-50%)'
          }}
        >
          {/* Context/Description */}
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-2">
              <Info size={14} className="text-purple-400" />
              <h4 className="text-sm font-semibold text-white">{template.name}</h4>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">{template.description}</p>
          </div>

          {/* Parameters Needed */}
          <div className="mb-3">
            <h5 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Parameters</h5>
            <div className="space-y-1.5">
              {template.args.length > 0 ? (
                template.args.map((arg, idx) => (
                  <div key={idx} className="text-xs">
                    <span className="text-purple-400 font-mono">{arg.name}</span>
                    <span className="text-gray-500 mx-1">({arg.type})</span>
                    <span className="text-gray-400">: {arg.description}</span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-gray-500">No parameters required</div>
              )}
            </div>
          </div>

          {/* Accounts Needed */}
          {template.accounts.length > 0 && (
            <div className="mb-3">
              <h5 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Accounts</h5>
              <div className="space-y-1.5">
                {template.accounts.map((acc, idx) => (
                  <div key={idx} className="text-xs">
                    <span className="text-blue-400 font-mono">{acc.name}</span>
                    <span className={`mx-1 text-xs ${
                      acc.type === 'signer' ? 'text-yellow-400' : 
                      acc.type === 'writable' ? 'text-green-400' : 
                      'text-gray-500'
                    }`}>
                      ({acc.type})
                    </span>
                    <span className="text-gray-400">: {acc.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rules */}
          {getRules().length > 0 && (
            <div className="pt-3 border-t border-gray-700">
              <h5 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Rules</h5>
              <div className="space-y-1">
                {getRules().map((rule, idx) => (
                  <div key={idx} className="text-xs text-amber-400 flex items-start gap-1.5">
                    <span className="mt-0.5">•</span>
                    <span>{rule}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Arrow */}
          <div 
            className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2"
            style={{
              borderRight: '6px solid rgb(31 41 55)',
              borderTop: '6px solid transparent',
              borderBottom: '6px solid transparent'
            }}
          />
        </div>
      )}
    </div>
  );
}

// Block Tooltip Component
function BlockTooltip({ 
  block, 
  template, 
  children 
}: { 
  block: SimpleBlock; 
  template?: InstructionTemplate | null;
  children: React.ReactElement;
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ left: 0, top: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get template info if available
  const templateId = BLOCK_TO_TEMPLATE[block.id];
  const blockTemplate = template || (templateId ? getTemplateById(templateId) : null);

  // Update tooltip position when it shows
  useEffect(() => {
    if (showTooltip && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setTooltipPosition({
        left: rect.right + 12,
        top: rect.top + (rect.height / 2)
      });
    }
  }, [showTooltip]);

  // Get rules/validation info
  const getRules = () => {
    if (!blockTemplate) return [];
    const rules: string[] = [];
    
    blockTemplate.args.forEach(arg => {
      if (arg.validation) {
        if (arg.validation.min !== undefined) {
          rules.push(`${arg.name}: minimum ${arg.validation.min}`);
        }
        if (arg.validation.max !== undefined) {
          rules.push(`${arg.name}: maximum ${arg.validation.max}`);
        }
        if (arg.validation.pattern) {
          rules.push(`${arg.name}: must match pattern`);
        }
      }
      if (arg.isOptional) {
        rules.push(`${arg.name}: optional`);
      }
    });

    blockTemplate.accounts.forEach(acc => {
      if (acc.isOptional) {
        rules.push(`${acc.name}: optional account`);
      }
      if (acc.type === 'signer') {
        rules.push(`${acc.name}: must be a signer`);
      }
    });

    return rules;
  };

  // Show tooltip even if template not found, with basic info
  if (!blockTemplate) {
    // Still wrap in tooltip container to maintain hover behavior
    return (
      <div 
        ref={containerRef}
        className="relative"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {children}
        {showTooltip && (
          <div
            ref={tooltipRef}
            className="fixed z-[9999] w-80 p-4 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl pointer-events-none"
            style={{
              left: `${tooltipPosition.left}px`,
              top: `${tooltipPosition.top}px`,
              transform: 'translateY(-50%)',
            }}
          >
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-2">
                <Info size={14} className="text-purple-400" />
                <h4 className="text-sm font-semibold text-white">{block.name}</h4>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed">
                {block.verified ? '✅ Verified block' : '⚠️ Unverified block'}
              </p>
            </div>
            <div className="mb-3">
              <h5 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Parameters</h5>
              <div className="space-y-1.5">
                {Object.keys(block.params).length > 0 ? (
                  Object.keys(block.params).map((key) => (
                    <div key={key} className="text-xs">
                      <span className="text-purple-400 font-mono">{key}</span>
                      <span className="text-gray-400">: Required parameter</span>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-gray-500">No parameters required</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {children}
      {showTooltip && (
        <div
          ref={tooltipRef}
          className="fixed z-[9999] w-80 p-4 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl pointer-events-none"
          style={{
            left: `${tooltipPosition.left}px`,
            top: `${tooltipPosition.top}px`,
            transform: 'translateY(-50%)',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}
        >
          {/* Context/Description */}
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-2">
              <Info size={14} className="text-purple-400" />
              <h4 className="text-sm font-semibold text-white">{blockTemplate.name}</h4>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">{blockTemplate.description}</p>
          </div>

          {/* Parameters Needed */}
          <div className="mb-3">
            <h5 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Parameters</h5>
            <div className="space-y-1.5">
              {blockTemplate.args.length > 0 ? (
                blockTemplate.args.map((arg, idx) => (
                  <div key={idx} className="text-xs">
                    <span className="text-purple-400 font-mono">{arg.name}</span>
                    <span className="text-gray-500 mx-1">({arg.type})</span>
                    <span className="text-gray-400">: {arg.description}</span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-gray-500">No parameters required</div>
              )}
            </div>
          </div>

          {/* Accounts Needed */}
          {blockTemplate.accounts.length > 0 && (
            <div className="mb-3">
              <h5 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Accounts</h5>
              <div className="space-y-1.5">
                {blockTemplate.accounts.map((acc, idx) => (
                  <div key={idx} className="text-xs">
                    <span className="text-blue-400 font-mono">{acc.name}</span>
                    <span className={`mx-1 text-xs ${
                      acc.type === 'signer' ? 'text-yellow-400' : 
                      acc.type === 'writable' ? 'text-green-400' : 
                      'text-gray-500'
                    }`}>
                      ({acc.type})
                    </span>
                    <span className="text-gray-400">: {acc.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rules */}
          {getRules().length > 0 && (
            <div className="pt-3 border-t border-gray-700">
              <h5 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Rules</h5>
              <div className="space-y-1">
                {getRules().map((rule, idx) => (
                  <div key={idx} className="text-xs text-amber-400 flex items-start gap-1.5">
                    <span className="mt-0.5">•</span>
                    <span>{rule}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Arrow */}
          <div 
            className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2"
            style={{
              borderRight: '6px solid rgb(31 41 55)',
              borderTop: '6px solid transparent',
              borderBottom: '6px solid transparent'
            }}
          />
        </div>
      )}
    </div>
  );
}

interface UnifiedTransactionBuilderProps {
  onTransactionBuilt?: (transaction: any, cost: any) => void;
  onBack?: () => void;
}

export function UnifiedTransactionBuilder({ onTransactionBuilt, onBack }: UnifiedTransactionBuilderProps) {
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
  
  // Clipboard state
  const [copiedAddresses, setCopiedAddresses] = useState<string[]>([]);
  const [showClipboard, setShowClipboard] = useState(false);
  const [justCopied, setJustCopied] = useState<string | null>(null);
  const [focusedInputField, setFocusedInputField] = useState<string | null>(null);

  // Arbitrage panel state
  const [showArbitragePanel, setShowArbitragePanel] = useState(false);

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

  // Load clipboard from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('sealevel-clipboard');
    if (saved) {
      try {
        setCopiedAddresses(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load clipboard:', e);
      }
    }
  }, []);

  // Close clipboard when clicking outside
  useEffect(() => {
    if (!showClipboard) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-clipboard-panel]') && !target.closest('[data-clipboard-button]')) {
        setShowClipboard(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showClipboard]);

  const addLog = (msg: string, type: Log['type'] = 'info') => {
    const timestamp = new Date().toLocaleTimeString([], { hour12: false });
    setLogs(prev => [...prev, { timestamp, msg, type }]);
  };

  // Copy address to clipboard
  const copyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setJustCopied(address);
      setTimeout(() => setJustCopied(null), 2000);
      
      // Add to recent addresses if not already there
      setCopiedAddresses(prev => {
        const filtered = prev.filter(addr => addr !== address);
        const updated = [address, ...filtered].slice(0, 10); // Keep last 10
        localStorage.setItem('sealevel-clipboard', JSON.stringify(updated));
        return updated;
      });
      
      addLog(`Copied address: ${address.slice(0, 8)}...${address.slice(-8)}`, 'success');
    } catch (err) {
      addLog('Failed to copy address', 'error');
    }
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

      // Auto-convert SOL to lamports helper
      const convertSolToLamports = (value: string): bigint => {
        if (!value) return BigInt(0);
        // Check if it's a decimal (SOL format)
        if (value.includes('.')) {
          const sol = parseFloat(value);
          return BigInt(Math.floor(sol * 1_000_000_000));
        }
        // Already in lamports
        return BigInt(value || '0');
      };

      if (block.id === 'system_transfer') {
        if (!publicKey) throw new Error('Wallet not connected');
        accounts['from'] = publicKey.toString();
        accounts['to'] = block.params.to || '';
        args['amount'] = convertSolToLamports(block.params.amount || '0');
      } else if (block.id === 'token_transfer') {
        if (!publicKey) throw new Error('Wallet not connected');
        accounts['authority'] = publicKey.toString();
        accounts['source'] = '';
        accounts['destination'] = block.params.destination || '';
        args['amount'] = BigInt(block.params.amount || '0');
      } else if (block.id === 'create_token_and_mint') {
        // Combined operation: Create mint + Create token account + Mint tokens with ALL features
        if (!publicKey) throw new Error('Wallet not connected');
        
        // Core SPL Mint Attributes
        const decimals = parseInt(block.params.decimals || '9');
        const initialSupply = convertSolToLamports(block.params.initialSupply || '0');
        const mintAuthority = block.params.mintAuthority || publicKey.toString();
        const freezeAuthority = block.params.freezeAuthority || (block.params.enableFreeze === 'true' ? publicKey.toString() : '');
        const enableFreeze = block.params.enableFreeze === 'true';
        const revokeMintAuthority = block.params.revokeMintAuthority === 'true';
        
        // Token Account Attributes
        const tokenAccountOwner = block.params.tokenAccountOwner || publicKey.toString();
        const delegate = block.params.delegate || '';
        const delegatedAmount = BigInt(block.params.delegatedAmount || '0');
        const freezeInitialAccount = block.params.freezeInitialAccount === 'true';
        const isNative = block.params.isNative === 'true';
        
        // Metaplex Metadata
        const tokenName = block.params.tokenName || '';
        const tokenSymbol = block.params.tokenSymbol || '';
        const metadataURI = block.params.metadataURI || '';
        const sellerFeeBasisPoints = parseInt(block.params.sellerFeeBasisPoints || '500');
        const creators = block.params.creators || '';
        const primarySaleHappened = block.params.primarySaleHappened === 'true';
        const isMutable = block.params.isMutable !== 'false'; // Default to true
        
        // Token-2022 Extensions
        const useToken2022 = block.params.useToken2022 === 'true';
        const transferFee = parseInt(block.params.transferFee || '0');
        const enableTax = block.params.enableTax === 'true';
        const transferHookProgram = block.params.transferHookProgram || '';
        const enableConfidentialTransfers = block.params.enableConfidentialTransfers === 'true';
        const enableInterestBearing = block.params.enableInterestBearing === 'true';
        const interestRate = parseInt(block.params.interestRate || '0');
        const enableNonTransferable = block.params.enableNonTransferable === 'true';
        const enableTransferMemo = block.params.enableTransferMemo === 'true';
        const enableImmutableOwner = block.params.enableImmutableOwner === 'true';
        const metadataPointer = block.params.metadataPointer || '';
        const supplyCap = block.params.supplyCap ? BigInt(block.params.supplyCap) : BigInt(0);
        
        // Store special params for multi-instruction handling
        args['_operation'] = 'create_token_and_mint';
        
        // Core SPL Mint
        args['decimals'] = decimals;
        args['initialSupply'] = initialSupply;
        args['mintAuthority'] = mintAuthority;
        args['freezeAuthority'] = enableFreeze ? freezeAuthority : null;
        args['revokeMintAuthority'] = revokeMintAuthority;
        
        // Token Account
        args['delegate'] = delegate;
        args['delegatedAmount'] = delegatedAmount;
        args['freezeInitialAccount'] = freezeInitialAccount;
        args['isNative'] = isNative;
        
        // Metaplex Metadata
        args['tokenName'] = tokenName;
        args['tokenSymbol'] = tokenSymbol;
        args['metadataURI'] = metadataURI;
        args['sellerFeeBasisPoints'] = sellerFeeBasisPoints;
        args['creators'] = creators;
        args['primarySaleHappened'] = primarySaleHappened;
        args['isMutable'] = isMutable;
        
        // Token-2022 Extensions
        args['useToken2022'] = useToken2022;
        args['transferFee'] = enableTax ? transferFee : 0;
        args['enableTax'] = enableTax;
        args['transferHookProgram'] = transferHookProgram;
        args['enableConfidentialTransfers'] = enableConfidentialTransfers;
        args['enableInterestBearing'] = enableInterestBearing;
        args['interestRate'] = interestRate;
        args['enableNonTransferable'] = enableNonTransferable;
        args['enableTransferMemo'] = enableTransferMemo;
        args['enableImmutableOwner'] = enableImmutableOwner;
        args['metadataPointer'] = metadataPointer;
        args['supplyCap'] = supplyCap;
        
        accounts['payer'] = publicKey.toString();
        accounts['tokenAccountOwner'] = tokenAccountOwner;
        if (freezeAuthority) {
          accounts['freezeAuthority'] = freezeAuthority;
        }
        if (delegate) {
          accounts['delegate'] = delegate;
        }
        if (transferHookProgram) {
          accounts['transferHookProgram'] = transferHookProgram;
        }
        
        // Use a placeholder template for now - will be expanded in transaction builder
        const placeholderTemplate = getTemplateById('spl_token_create_mint') || template;
        instructions.push({ template: placeholderTemplate, accounts, args });
        continue; // Skip normal processing
      } else if (block.id === 'token_mint') {
        if (!publicKey) throw new Error('Wallet not connected');
        accounts['mint'] = block.params.mint || '';
        accounts['destination'] = block.params.destination || '';
        accounts['authority'] = publicKey.toString();
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
      // Check for additional signers (like mint keypairs from create_token_and_mint)
      const additionalSigners = (builtTransaction as any)._additionalSigners || [];
      
      // If there are additional signers, we need to sign with them
      // For R&D: This allows executing transactions with program-derived keypairs
      if (additionalSigners.length > 0) {
        addLog(`Found ${additionalSigners.length} additional signer(s) (e.g., mint keypair)`, 'info');
        // Sign transaction with additional signers
        additionalSigners.forEach((signer: any) => {
          builtTransaction.partialSign(signer);
        });
      }
      
      const signature = await sendTransaction(builtTransaction, connection);
      addLog(`Transaction sent! Signature: ${signature}`, 'success');
      addLog(`View on Solscan: https://solscan.io/tx/${signature}`, 'info');
      
      addLog('Waiting for confirmation...', 'info');
      await connection.confirmTransaction(signature, 'confirmed');
      addLog('Transaction confirmed!', 'success');
      
      // Log mint address if created
      if (additionalSigners.length > 0) {
        const mintPubkey = additionalSigners[0].publicKey.toString();
        addLog(`Created mint address: ${mintPubkey}`, 'success');
        addLog(`Mint keypair generated (secret key stored securely in transaction for signing)`, 'info');
        addLog(`⚠️ For R&D: The mint keypair secret key is in the transaction object but not logged for security.`, 'warning');
      }
      
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
      <div className="flex flex-1 overflow-hidden min-h-0">
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
          
          <div className="flex-1 overflow-y-auto p-3 space-y-2 overflow-x-visible">
            {SIMPLE_BLOCK_CATEGORIES[activeCategory].map(block => (
              <BlockTooltip key={block.id} block={block}>
                <div 
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
                      <span title="VeriSoL Audited">
                        <ShieldCheck size={14} className="text-teal-500" />
                      </span>
                    )}
                  </div>
                </div>
              </BlockTooltip>
            ))}
          </div>
        </aside>

        {/* Center: Canvas */}
        <main className="flex-1 flex flex-col relative bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] bg-slate-950 min-h-0 overflow-hidden">
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

          <div className="flex-1 overflow-y-auto p-8 pt-20 flex flex-col items-center gap-4 min-h-0">
            {simpleWorkflow.length === 0 ? (
              <div 
                className="flex flex-col items-center justify-center h-full text-slate-600 gap-4 opacity-50 relative w-full"
                style={{
                  backgroundImage: 'url(/logo-2.png)',
                  backgroundSize: 'contain',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  opacity: 0.1
                }}
              >
                <div className="relative z-10 flex flex-col items-center gap-4">
                  <Layers size={48} className="text-slate-700" />
                  <p>Drag & drop blocks here to build your transaction</p>
                </div>
              </div>
            ) : (
              simpleWorkflow.map((block, index) => (
                <BlockTooltip key={block.instanceId} block={block}>
                  <div className="w-full max-w-md relative group">
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
                </BlockTooltip>
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
          <aside className="w-72 border-l border-slate-800 bg-slate-900 flex flex-col min-h-0">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
              <h2 className="font-bold text-slate-200">Block Config</h2>
              <button onClick={() => setSelectedBlock(null)} className="text-slate-500 hover:text-white"><X size={16} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6 min-h-0">
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
                {Object.entries(selectedBlock.params).map(([key, value]) => {
                  const isAddressField = ['to', 'destination', 'wallet', 'mint', 'mintAuthority', 'freezeAuthority', 'tokenAccountOwner', 'delegate', 'transferHookProgram', 'metadataPointer', 'updateAuthority'].includes(key);
                  const isAmountField = ['amount', 'initialSupply', 'supplyCap', 'delegatedAmount'].includes(key);
                  const isBooleanField = ['enableFreeze', 'enableTax', 'revokeMintAuthority', 'freezeInitialAccount', 'isNative', 'primarySaleHappened', 'isMutable', 'useToken2022', 'enableConfidentialTransfers', 'enableInterestBearing', 'enableNonTransferable', 'enableTransferMemo', 'enableImmutableOwner'].includes(key);
                  const isPercentageField = ['transferFee', 'sellerFeeBasisPoints', 'interestRate'].includes(key);
                  const isStringField = ['tokenName', 'tokenSymbol', 'metadataURI', 'creators'].includes(key);
                  
                  // Auto-convert SOL to lamports (hidden from user)
                  const convertSolToLamports = (solValue: string): string => {
                    if (!solValue || isNaN(parseFloat(solValue))) return solValue;
                    const sol = parseFloat(solValue);
                    const lamports = Math.floor(sol * 1_000_000_000);
                    return lamports.toString();
                  };
                  
                  return (
                    <div key={key} className="space-y-1">
                      <label className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">
                        {key}
                        {isAmountField && key === 'amount' && (
                          <span className="text-slate-600 ml-1">(in lamports)</span>
                        )}
                        {isAmountField && key === 'initialSupply' && (
                          <span className="text-slate-600 ml-1">(in SOL)</span>
                        )}
                        {isAmountField && key === 'supplyCap' && (
                          <span className="text-slate-600 ml-1">(0 = unlimited)</span>
                        )}
                        {isPercentageField && (
                          <span className="text-slate-600 ml-1">(basis points: 100 = 1%)</span>
                        )}
                        {isBooleanField && (
                          <span className="text-slate-600 ml-1">(true/false)</span>
                        )}
                        {isStringField && key === 'creators' && (
                          <span className="text-slate-600 ml-1">(comma-separated: "addr1:50,addr2:50")</span>
                        )}
                        {isStringField && key === 'metadataURI' && (
                          <span className="text-slate-600 ml-1">(JSON metadata URL)</span>
                        )}
                      </label>
                      <div className="relative">
                        {isBooleanField ? (
                          <select
                            value={value}
                            onChange={(e) => updateSimpleBlockParams(selectedBlock.instanceId!, { [key]: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-teal-500 focus:outline-none transition-colors"
                          >
                            <option value="false">False (Disabled)</option>
                            <option value="true">True (Enabled)</option>
                          </select>
                        ) : isStringField && key === 'creators' ? (
                          <textarea
                            value={value}
                            onChange={(e) => updateSimpleBlockParams(selectedBlock.instanceId!, { [key]: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 pr-10 text-sm text-white focus:border-teal-500 focus:outline-none transition-colors min-h-[60px]"
                            placeholder="addr1:50,addr2:50 (address:share pairs)"
                          />
                        ) : (
                          <input 
                            type="text" 
                            value={value} 
                            onFocus={() => isAddressField && setFocusedInputField(`${selectedBlock.instanceId}-${key}`)}
                            onBlur={() => setTimeout(() => setFocusedInputField(null), 200)}
                            onChange={(e) => {
                              let newValue = e.target.value;
                              // Auto-convert SOL to lamports for amount fields (hidden conversion)
                              if (isAmountField && key === 'amount' && newValue.includes('.')) {
                                // User entered SOL, convert to lamports behind the scenes
                                newValue = convertSolToLamports(newValue);
                              }
                              if (isAmountField && key === 'initialSupply' && newValue.includes('.')) {
                                // User entered SOL, convert to lamports behind the scenes
                                newValue = convertSolToLamports(newValue);
                              }
                              updateSimpleBlockParams(selectedBlock.instanceId!, { [key]: newValue });
                            }}
                            className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 pr-10 text-sm text-white focus:border-teal-500 focus:outline-none transition-colors"
                            placeholder={
                              isAddressField ? "Enter address..." : 
                              isAmountField && key === 'initialSupply' ? "e.g., 1.00 (SOL)" :
                              isAmountField && key === 'supplyCap' ? "e.g., 1000000000 (0 = unlimited)" :
                              isAmountField && key === 'delegatedAmount' ? "e.g., 1000000 (lamports)" :
                              isAmountField ? "e.g., 1000000000 (lamports)" :
                              isPercentageField && key === 'transferFee' ? "e.g., 100 (1%) or 500 (5%)" :
                              isPercentageField && key === 'sellerFeeBasisPoints' ? "e.g., 500 (5%) or 1000 (10%)" :
                              isPercentageField && key === 'interestRate' ? "e.g., 500 (5% APY) or -200 (-2% APY)" :
                              isStringField && key === 'tokenName' ? "e.g., Solana Ipsum Token" :
                              isStringField && key === 'tokenSymbol' ? "e.g., SIT" :
                              isStringField && key === 'metadataURI' ? "https://example.com/metadata.json" :
                              ""
                            }
                          />
                        )}
                        {!isBooleanField && isAddressField && value && (
                          <button
                            onClick={() => copyAddress(value)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-teal-400 hover:bg-slate-800 rounded transition-colors"
                            title="Copy address"
                          >
                            {justCopied === value ? (
                              <ClipboardCheck size={14} className="text-green-400" />
                            ) : (
                              <Clipboard size={14} />
                            )}
                          </button>
                        )}
                        {!isBooleanField && isAddressField && copiedAddresses.length > 0 && focusedInputField === `${selectedBlock.instanceId}-${key}` && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                            {copiedAddresses.slice(0, 5).map((addr, idx) => (
                              <button
                                key={idx}
                                onClick={() => {
                                  updateSimpleBlockParams(selectedBlock.instanceId!, { [key]: addr });
                                  copyAddress(addr);
                                  setFocusedInputField(null);
                                }}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-slate-700 transition-colors border-b border-slate-700 last:border-b-0"
                              >
                                <div className="font-mono text-slate-300 truncate">{addr}</div>
                                <div className="text-slate-500 text-[10px] mt-0.5">{addr.slice(0, 8)}...{addr.slice(-8)}</div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
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
              onCopyAddress={copyAddress}
              copiedAddresses={copiedAddresses}
              justCopied={justCopied}
              focusedInputField={focusedInputField}
              setFocusedInputField={setFocusedInputField}
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
          <button
            onClick={onBack || (() => {})}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            title="Go back to Account Inspector"
          >
            <ArrowLeft size={18} />
            <span className="text-sm">Back</span>
          </button>
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
          <button
            onClick={() => setShowArbitragePanel(!showArbitragePanel)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              showArbitragePanel
                ? 'bg-teal-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            title="Toggle Arbitrage Panel"
          >
            <TrendingUp size={16} />
            Arbitrage
          </button>
          {publicKey ? (
            <button
              onClick={() => copyAddress(publicKey.toString())}
              className="flex items-center gap-2 text-xs px-3 py-1.5 rounded bg-green-900/30 text-green-400 border border-green-700/50 hover:bg-green-900/50 hover:border-green-600 transition-colors cursor-pointer group"
              title="Click to copy wallet address"
            >
              {justCopied === publicKey.toString() ? (
                <>
                  <ClipboardCheck size={14} />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Clipboard size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span>{publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}</span>
                </>
              )}
            </button>
          ) : (
            <span className="text-xs px-2 py-1 rounded bg-red-900/30 text-red-400 border border-red-700/50">
              Wallet Not Connected
            </span>
          )}
          <button
            onClick={() => setShowClipboard(!showClipboard)}
            className="relative flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white transition-colors"
            title="Recent addresses"
            data-clipboard-button
          >
            <Clipboard size={16} />
            {copiedAddresses.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-purple-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {copiedAddresses.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Clipboard Dropdown */}
      {showClipboard && (
        <div className="absolute top-16 right-6 z-50 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-xl" data-clipboard-panel>
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Recent Addresses</h3>
            <button
              onClick={() => setShowClipboard(false)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {copiedAddresses.length === 0 ? (
              <div className="p-6 text-center text-gray-500 text-sm">
                <Clipboard size={32} className="mx-auto mb-2 opacity-50" />
                <p>No addresses copied yet</p>
                <p className="text-xs mt-1">Copy an address to see it here</p>
              </div>
            ) : (
              <div className="p-2">
                {copiedAddresses.map((address, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      copyAddress(address);
                      setShowClipboard(false);
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-700 transition-colors group"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-600/20 flex items-center justify-center text-purple-400 text-xs font-mono">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-mono text-gray-300 truncate">
                          {address}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {address.slice(0, 8)}...{address.slice(-8)}
                        </p>
                      </div>
                    </div>
                    {justCopied === address ? (
                      <ClipboardCheck size={16} className="text-green-400 flex-shrink-0" />
                    ) : (
                      <Clipboard size={16} className="text-gray-500 group-hover:text-gray-300 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          {copiedAddresses.length > 0 && (
            <div className="p-3 border-t border-gray-700">
              <button
                onClick={() => {
                  setCopiedAddresses([]);
                  localStorage.removeItem('sealevel-clipboard');
                }}
                className="w-full text-xs text-gray-400 hover:text-red-400 transition-colors"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-hidden flex">
        <div className="flex-1 overflow-hidden">
          {viewMode === 'simple' ? renderSimpleMode() : renderAdvancedMode()}
        </div>
        {showArbitragePanel && (
          <ArbitragePanel
            onSelectOpportunity={(opportunity: ArbitrageOpportunity) => {
              // Add swap blocks for each step in the arbitrage path
              if (viewMode === 'simple') {
                opportunity.steps.forEach((step, index) => {
                  // Find or create swap block
                  const swapBlock = SIMPLE_BLOCK_CATEGORIES.DEFI.find(b => b.id === 'jup_swap');
                  if (swapBlock) {
                    const block = {
                      ...swapBlock,
                      instanceId: `arb-${opportunity.id}-${index}-${Date.now()}`,
                      params: {
                        amount: step.amountIn.toString(),
                        minAmountOut: (step.amountOut * BigInt(95) / BigInt(100)).toString(), // 5% slippage
                      }
                    };
                    addSimpleBlock(block);
                  }
                });
                addLog(`Added ${opportunity.steps.length} swap blocks from arbitrage opportunity`, 'success');
              }
            }}
            onClose={() => setShowArbitragePanel(false)}
          />
        )}
      </div>

      {/* Unified AI Agents */}
      <UnifiedAIAgents
        simpleWorkflow={viewMode === 'simple' ? simpleWorkflow : []}
        transactionDraft={viewMode === 'advanced' ? transactionDraft : undefined}
        transaction={builtTransaction}
        onAddBlock={viewMode === 'simple' ? addSimpleBlock : undefined}
        onUpdateBlock={viewMode === 'simple' ? (blockId, params) => {
          const block = simpleWorkflow.find(b => b.instanceId === blockId);
          if (block) {
            updateSimpleBlockParams(blockId, params);
          }
        } : undefined}
        errors={buildError ? [buildError] : []}
        warnings={[]}
        availableBlocks={viewMode === 'simple' ? Object.values(SIMPLE_BLOCK_CATEGORIES).flat() : []}
        onExplainBlock={(blockId) => {
          const block = simpleWorkflow.find(b => b.instanceId === blockId);
          if (block) {
            const templateId = BLOCK_TO_TEMPLATE[block.id];
            const template = templateId ? getTemplateById(templateId) : null;
            if (template) {
              addLog(`Block: ${block.name}\n${template.description}\nAccounts: ${template.accounts.length}\nArgs: ${template.args.length}`, 'info');
            }
          }
        }}
        onOptimize={() => {
          addLog('Analyzing transaction for optimizations...', 'info');
        }}
      />
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
  validationErrors,
  onCopyAddress,
  copiedAddresses,
  justCopied,
  focusedInputField,
  setFocusedInputField
}: {
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
              <TemplateTooltip key={template.id} template={template}>
                <button
                  onClick={() => onSelectTemplate(template)}
                  className="p-4 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700/50 hover:border-purple-500/50 rounded-lg text-left transition-colors group w-full"
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
              </TemplateTooltip>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

