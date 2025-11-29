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
  TrendingUp,
  Download,
  Upload,
  History,
  FileJson,
  FileText,
  FileCode,
  Bookmark,
  BookOpen,
  RefreshCw,
  Eye,
  EyeOff,
  GripVertical,
  ExternalLink,
  Copy,
  Star,
  Filter
} from 'lucide-react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { TransactionBuilder } from '../lib/transaction-builder';
import { getTemplateById, getTemplatesByCategory } from '../lib/instructions/templates';
import { BuiltInstruction, TransactionDraft, InstructionTemplate } from '../lib/instructions/types';
import { importTransaction } from '../lib/transaction-importer';
import { PublicKey } from '@solana/web3.js';
import { UnifiedAIAgents } from './UnifiedAIAgents';
import { ArbitragePanel } from './ArbitragePanel';
import { ArbitrageOpportunity } from '../lib/pools/types';
import { AdvancedInstructionCard } from './AdvancedInstructionCard';
import { TemplateSelectorModal } from './TemplateSelectorModal';
import { useTransactionLogger } from '../hooks/useTransactionLogger';
import { RecentTransactions } from './RecentTransactions';
import { useUser } from '../contexts/UserContext';
import { signTransactionWithCustodialAndSigners, shouldUseCustodialWallet } from '../lib/wallet-recovery/custodial-signer';
import { Connection } from '@solana/web3.js';

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
    { id: 'kamino_flash_loan', name: 'Kamino Flash Loan', icon: 'Zap', color: 'bg-cyan-600', verified: true, params: { protocol: 'kamino', tokenMint: '', amount: '1000000000', lendingPool: '' } },
    { id: 'kamino_flash_repay', name: 'Kamino Flash Repay', icon: 'Zap', color: 'bg-cyan-700', verified: true, params: { protocol: 'kamino', tokenMint: '', repayAmount: '1000000000', lendingPool: '' } },
    { id: 'solend_flash_loan', name: 'Solend Flash Loan', icon: 'Zap', color: 'bg-blue-600', verified: true, params: { protocol: 'solend', tokenMint: '', amount: '1000000000', lendingPool: '' } },
    { id: 'solend_flash_repay', name: 'Solend Flash Repay', icon: 'Zap', color: 'bg-blue-700', verified: true, params: { protocol: 'solend', tokenMint: '', repayAmount: '1000000000', lendingPool: '' } },
    { id: 'marginfi_flash_loan', name: 'Marginfi Flash Loan', icon: 'Zap', color: 'bg-purple-600', verified: true, params: { protocol: 'marginfi', tokenMint: '', amount: '1000000000', lendingPool: '' } },
    { id: 'marginfi_flash_repay', name: 'Marginfi Flash Repay', icon: 'Zap', color: 'bg-purple-700', verified: true, params: { protocol: 'marginfi', tokenMint: '', repayAmount: '1000000000', lendingPool: '' } },
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
      tokenImage: '', // Base64 or URL for token image/logo
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

// Enhanced Transaction Builder Types
interface TransactionTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  instructions: BuiltInstruction[];
  createdAt: number;
  updatedAt: number;
  tags: string[];
  isFavorite?: boolean;
}

interface TransactionHistoryItem {
  id: string;
  name: string;
  instructions: BuiltInstruction[];
  builtTransaction?: any;
  cost?: any;
  signature?: string;
  timestamp: number;
  status: 'built' | 'executed' | 'failed';
}

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
  const { log, updateStatus } = useTransactionLogger();
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const { user } = useUser();
  const [viewMode, setViewMode] = useState<ViewMode>('simple');
  
  // Shared transaction state
  const [transactionDraft, setTransactionDraft] = useState<TransactionDraft>({
    instructions: []
  });
  const [isBuilding, setIsBuilding] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [buildError, setBuildError] = useState<string | null>(null);
  const [builtTransaction, setBuiltTransaction] = useState<any>(null);
  const [transactionCost, setTransactionCost] = useState<{
    lamports: number;
    sol: number;
    platformFee: { lamports: number; sol: number };
    total: { lamports: number; sol: number };
  } | null>(null);
  
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

  // Import state
  const [importSignature, setImportSignature] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Enhanced features state
  const [activeTab, setActiveTab] = useState<'build' | 'simulate' | 'templates' | 'history'>('build');
  const [savedTemplates, setSavedTemplates] = useState<TransactionTemplate[]>([]);
  const [transactionHistory, setTransactionHistory] = useState<TransactionHistoryItem[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<any>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // ===== ENHANCED UTILITY FUNCTIONS =====
  
  // Load templates from localStorage
  useEffect(() => {
    const loadTemplates = () => {
      try {
        const saved = localStorage.getItem('txBuilderTemplates');
        if (saved) {
          setSavedTemplates(JSON.parse(saved));
        }
      } catch (e) {
        console.error('Failed to load templates:', e);
      }
    };
    loadTemplates();
  }, []);

  // Save templates to localStorage
  useEffect(() => {
    if (savedTemplates.length > 0) {
      localStorage.setItem('txBuilderTemplates', JSON.stringify(savedTemplates));
    }
  }, [savedTemplates]);

  // Load transaction history from localStorage
  useEffect(() => {
    const loadHistory = () => {
      try {
        const saved = localStorage.getItem('txBuilderHistory');
        if (saved) {
          setTransactionHistory(JSON.parse(saved).slice(0, 50)); // Keep last 50
        }
      } catch (e) {
        console.error('Failed to load history:', e);
      }
    };
    loadHistory();
  }, []);

  // Save transaction history to localStorage
  useEffect(() => {
    if (transactionHistory.length > 0) {
      localStorage.setItem('txBuilderHistory', JSON.stringify(transactionHistory.slice(0, 50)));
    }
  }, [transactionHistory]);

  // Save current transaction as template
  const saveAsTemplate = (name: string, description: string = '', category: string = 'custom', tags: string[] = []) => {
    const instructions = viewMode === 'simple' 
      ? simpleWorkflow.map(b => ({ 
          template: getTemplateById(BLOCK_TO_TEMPLATE[b.id] || b.id) || {} as InstructionTemplate,
          accounts: b.params,
          args: b.params
        }))
      : transactionDraft.instructions;

    if (instructions.length === 0) {
      addLog('Cannot save empty template', 'error');
      return;
    }

    const template: TransactionTemplate = {
      id: `template_${Date.now()}`,
      name,
      description,
      category,
      instructions,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tags,
      isFavorite: false,
    };

    setSavedTemplates(prev => [...prev, template]);
    addLog(`Template "${name}" saved successfully!`, 'success');
  };

  // Load template into builder
  const loadTemplate = (template: TransactionTemplate) => {
    setTransactionDraft({ instructions: template.instructions });
    setViewMode('advanced');
    addLog(`Loaded template "${template.name}"`, 'success');
  };

  // Delete template
  const deleteTemplate = (templateId: string) => {
    setSavedTemplates(prev => prev.filter(t => t.id !== templateId));
    addLog('Template deleted', 'info');
  };

  // Save to history
  const saveToHistory = (name: string, signature?: string, status: 'built' | 'executed' | 'failed' = 'built') => {
    const instructions = viewMode === 'simple'
      ? simpleWorkflow.map(b => ({ 
          template: getTemplateById(BLOCK_TO_TEMPLATE[b.id] || b.id) || {} as InstructionTemplate,
          accounts: b.params,
          args: b.params
        }))
      : transactionDraft.instructions;

    const historyItem: TransactionHistoryItem = {
      id: `history_${Date.now()}`,
      name,
      instructions,
      builtTransaction: builtTransaction ? JSON.parse(JSON.stringify(builtTransaction)) : undefined,
      cost: transactionCost,
      signature,
      timestamp: Date.now(),
      status,
    };

    setTransactionHistory(prev => [historyItem, ...prev].slice(0, 50));
  };

  // Load from history
  const loadFromHistory = (item: TransactionHistoryItem) => {
    setTransactionDraft({ instructions: item.instructions });
    if (item.builtTransaction) {
      setBuiltTransaction(item.builtTransaction);
    }
    if (item.cost) {
      setTransactionCost(item.cost);
    }
    setViewMode('advanced');
    addLog(`Loaded transaction "${item.name}" from history`, 'success');
  };

  // Export transaction
  const exportTransaction = async (format: 'json' | 'typescript' | 'rust' | 'python') => {
    if (!builtTransaction && transactionDraft.instructions.length === 0) {
      addLog('No transaction to export', 'error');
      return;
    }

    const instructions = viewMode === 'simple'
      ? simpleWorkflow.map(b => ({ 
          template: getTemplateById(BLOCK_TO_TEMPLATE[b.id] || b.id) || {} as InstructionTemplate,
          accounts: b.params,
          args: b.params
        }))
      : transactionDraft.instructions;

    const exportData = {
      instructions,
      cost: transactionCost,
      timestamp: new Date().toISOString(),
      network: 'solana',
    };

    let content = '';
    let filename = '';
    let mimeType = '';

    if (format === 'json') {
      content = JSON.stringify(exportData, null, 2);
      filename = `transaction-${Date.now()}.json`;
      mimeType = 'application/json';
    } else if (format === 'typescript') {
      content = generateTypeScriptCode(instructions);
      filename = `transaction-${Date.now()}.ts`;
      mimeType = 'text/typescript';
    } else if (format === 'rust') {
      content = generateRustCode(instructions);
      filename = `transaction-${Date.now()}.rs`;
      mimeType = 'text/rust';
    } else if (format === 'python') {
      content = generatePythonCode(instructions);
      filename = `transaction-${Date.now()}.py`;
      mimeType = 'text/python';
    }

    // Download file
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    addLog(`Exported transaction as ${format.toUpperCase()}`, 'success');
  };

  // Code generation helpers
  const generateTypeScriptCode = (instructions: BuiltInstruction[]): string => {
    return `import { Transaction, SystemProgram, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

// Generated Transaction - ${new Date().toISOString()}
export async function buildTransaction(): Promise<Transaction> {
  const transaction = new Transaction();
  
${instructions.map((ix, i) => `  // Instruction ${i + 1}: ${ix.template.name}
  // ${ix.template.description}
  transaction.add(/* TODO: Add instruction */);`).join('\n\n')}
  
  return transaction;
}
`;
  };

  const generateRustCode = (instructions: BuiltInstruction[]): string => {
    return `use solana_program::{
    pubkey::Pubkey,
    instruction::{Instruction, AccountMeta},
    transaction::Transaction,
    system_program,
};

// Generated Transaction - ${new Date().toISOString()}
pub fn build_transaction() -> Transaction {
    let mut transaction = Transaction::new_with_payer(&[], None).unwrap();
    
${instructions.map((ix, i) => `    // Instruction ${i + 1}: ${ix.template.name}
    // ${ix.template.description}
    // TODO: Add instruction`).join('\n\n')}
    
    transaction
}
`;
  };

  const generatePythonCode = (instructions: BuiltInstruction[]): string => {
    return `from solders.transaction import Transaction
from solders.system_program import transfer, TransferParams
from solders.pubkey import Pubkey

# Generated Transaction - ${new Date().toISOString()}
def build_transaction() -> Transaction:
    transaction = Transaction()
    
${instructions.map((ix, i) => f'    # Instruction {i + 1}: {ix.template.name}\n    # {ix.template.description}\n    # TODO: Add instruction').join('\n\n')}
    
    return transaction
`;
  };

  // Simulate transaction
  const simulateTransaction = async () => {
    if (!connection || !builtTransaction || !publicKey) {
      addLog('Cannot simulate: connection, transaction, or wallet missing', 'error');
      return;
    }

    setIsSimulating(true);
    setSimulationResult(null);
    
    try {
      addLog('Starting transaction simulation...', 'info');
      
      // Simulate the transaction
      const simulation = await connection.simulateTransaction(builtTransaction);
      
      if (simulation.value.err) {
        setSimulationResult({
          success: false,
          error: simulation.value.err,
          logs: simulation.value.logs || [],
          unitsConsumed: simulation.value.unitsConsumed || 0,
        });
        addLog(`Simulation failed: ${JSON.stringify(simulation.value.err)}`, 'error');
      } else {
        setSimulationResult({
          success: true,
          logs: simulation.value.logs || [],
          unitsConsumed: simulation.value.unitsConsumed || 0,
        });
        addLog(`Simulation successful! Used ${simulation.value.unitsConsumed} compute units`, 'success');
      }
      
      setActiveTab('simulate');
    } catch (error: any) {
      addLog(`Simulation error: ${error.message}`, 'error');
      setSimulationResult({
        success: false,
        error: error.message,
        logs: [],
        unitsConsumed: 0,
      });
    } finally {
      setIsSimulating(false);
    }
  };

  const handleImport = async () => {
    if (!importSignature || !connection) return;
    setIsImporting(true);
    try {
      addLog(`Fetching transaction ${importSignature}...`, 'info');
      const instructions = await importTransaction(connection, importSignature);
      
      // Merge with existing or replace? Let's replace for now as "Import" usually implies loading a specific tx.
      // But to be safe/flexible, maybe append? No, users likely want to edit THAT tx.
      // Let's append to avoid data loss, or offer choice. For now, append.
      // Actually, user said "plugged into the builder", usually implies loading that tx state.
      // Let's append to draft.
      setTransactionDraft(prev => ({
        ...prev,
        instructions: [...prev.instructions, ...instructions]
      }));
      
      setViewMode('advanced'); // Switch to advanced to see the instructions
      setShowImportModal(false);
      setImportSignature('');
      addLog(`Successfully imported ${instructions.length} instructions`, 'success');
    } catch (e: any) {
      addLog(`Import failed: ${e.message}`, 'error');
      console.error(e);
    } finally {
      setIsImporting(false);
    }
  };

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

    // Use custodial wallet as payer if available, otherwise external wallet
    const payerPublicKey = user?.walletAddress 
      ? new PublicKey(user.walletAddress)
      : publicKey;

    if (!payerPublicKey) {
      setBuildError('Please connect your wallet or create a custodial wallet to build transactions');
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
        memo: `sealevelstudios.xyz 🤑`
      };

      const transaction = await builder.buildTransaction(draft);

      // Add fixed platform fee (0.0002 SOL) if a valid fee recipient is configured
      builder.addPlatformFee(transaction, payerPublicKey);

      await builder.prepareTransaction(transaction, payerPublicKey);
      
      const cost = await builder.estimateCost(transaction);
      setBuiltTransaction(transaction);
      setTransactionCost(cost);

      addLog(`Transaction built successfully!`, 'success');
      addLog(`Base transaction cost: ${cost.sol.toFixed(9)} SOL (${cost.lamports} lamports)`, 'info');
      addLog(`Platform fee: ${cost.platformFee.sol.toFixed(9)} SOL (${cost.platformFee.lamports} lamports)`, 'info');
      addLog(`Total estimated cost: ${cost.total.sol.toFixed(9)} SOL (${cost.total.lamports} lamports)`, 'info');
      addLog(`Instructions: ${instructions.length}`, 'info');

      for (let i = 0; i < instructions.length; i++) {
        const inst = instructions[i];
        addLog(`  [${i + 1}] ${inst.template.name}`, 'info');
      }

      // Log transaction build
      const transactionId = await log(
        'transaction-builder',
        'build',
        {
          instructions: instructions.map(inst => ({
            programId: inst.template.programId,
            template: inst.template.name,
            accounts: inst.accounts,
          })),
          cost: {
            base: cost.sol,
            platformFee: cost.platformFee.sol,
            total: cost.total.sol,
          },
          viewMode,
        }
      );

      // Store transaction ID for later update
      if (transactionId) {
        (transaction as any)._transactionLogId = transactionId;
      }

      onTransactionBuilt?.(transaction, cost);
      
      // Save to history
      const historyName = `Transaction with ${instructions.length} instruction${instructions.length !== 1 ? 's' : ''}`;
      saveToHistory(historyName, undefined, 'built');
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
    if (!builtTransaction) {
      addLog('Error: Transaction not built', 'error');
      return;
    }

    // Check if we should use custodial wallet
    const useCustodial = shouldUseCustodialWallet(user?.walletAddress);
    
    if (!useCustodial && (!sendTransaction || !publicKey)) {
      addLog('Error: Transaction not built or wallet not connected', 'error');
      return;
    }

    setIsExecuting(true);
    addLog('Sending transaction to network...', 'info');

    try {
      // Check for additional signers (like mint keypairs from create_token_and_mint)
      const additionalSigners = (builtTransaction as any)._additionalSigners || [];
      
      let signedTransaction = builtTransaction;
      
      if (useCustodial && user?.walletAddress) {
        // Sign with custodial wallet (and additional signers if any)
        addLog('Signing with custodial wallet...', 'info');
        signedTransaction = await signTransactionWithCustodialAndSigners(
          builtTransaction,
          additionalSigners,
          {
            userWalletAddress: user.walletAddress,
            connection,
          }
        );
        addLog('Transaction signed with custodial wallet', 'success');
      } else {
        // Use external wallet (Phantom, etc.)
        if (additionalSigners.length > 0) {
          addLog(`Found ${additionalSigners.length} additional signer(s) (e.g., mint keypair)`, 'info');
          // Sign transaction with additional signers
          additionalSigners.forEach((signer: any) => {
            signedTransaction.partialSign(signer);
          });
        }
        
        // External wallet will sign when sendTransaction is called
        if (!sendTransaction) {
          throw new Error('No wallet available for signing');
        }
      }
      
      // Send transaction
      let signature: string;
      if (useCustodial) {
        // For custodial wallet, we need to send the already-signed transaction
        const serialized = signedTransaction.serialize({ requireAllSignatures: false });
        signature = await connection.sendRawTransaction(serialized, {
          skipPreflight: false,
          maxRetries: 3,
        });
      } else {
        // For external wallet, use sendTransaction which will prompt for signature
        signature = await sendTransaction(signedTransaction, connection);
      }
      addLog(`Transaction sent! Signature: ${signature}`, 'success');
      addLog(`View on Solscan: https://solscan.io/tx/${signature}`, 'info');
      
      // Update transaction log with signature
      const transactionLogId = (builtTransaction as any)._transactionLogId;
      if (transactionLogId) {
        await updateStatus(transactionLogId, 'pending', signature);
      }
      
      addLog('Waiting for confirmation...', 'info');
      await connection.confirmTransaction(signature, 'confirmed');
      addLog('Transaction confirmed!', 'success');
      
      // Update transaction log to success
      if (transactionLogId) {
        await updateStatus(transactionLogId, 'success', signature);
      }
      
      // Save to history with signature
      const historyName = `Transaction executed - ${new Date().toLocaleTimeString()}`;
      saveToHistory(historyName, signature, 'executed');
      
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
      
      // Save failed transaction to history
      const historyName = `Transaction failed - ${new Date().toLocaleTimeString()}`;
      saveToHistory(historyName, undefined, 'failed');
      
      // Update transaction log to failed
      const transactionLogId = (builtTransaction as any)?._transactionLogId;
      if (transactionLogId) {
        await updateStatus(transactionLogId, 'failed', undefined, errorMsg);
      }
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
          
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2 overflow-x-visible">
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
        <main 
          className="flex-1 flex flex-col relative min-h-0 overflow-hidden"
          style={{
            backgroundColor: '#0f172a', // slate-950
            position: 'relative',
          }}
        >
          {/* Logo background layer - behind dot grid */}
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              zIndex: 0,
            }}
          >
            <img
              src="/transaction-builder-logo.jpeg"
              alt="Transaction Builder Logo"
              className="absolute inset-0 w-full h-full object-contain opacity-[0.08]"
              style={{
                objectPosition: 'center',
              }}
              onError={(e) => {
                // Fallback if logo doesn't exist - hide it
                console.warn('Transaction builder logo not found at /transaction-builder-logo.jpeg');
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
          {/* Dot grid overlay */}
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle, #1e293b 1px, transparent 1px)',
              backgroundSize: '16px 16px',
              zIndex: 1,
            }}
          />
          <div className="absolute top-4 left-4 right-4 h-12 pointer-events-none flex justify-between items-start z-20">
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
                <div className="flex flex-col gap-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Base Cost:</span>
                    <span className="text-green-400 font-mono">{transactionCost.sol.toFixed(9)} SOL</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Platform Fee:</span>
                    <span className="text-yellow-400 font-mono">{transactionCost.platformFee.sol.toFixed(9)} SOL</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-600 pt-1 mt-1">
                    <span className="text-slate-300 font-medium">Total:</span>
                    <span className="text-white font-mono font-bold">{transactionCost.total.sol.toFixed(9)} SOL</span>
                  </div>
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

          <div className="flex-1 overflow-y-auto p-8 pt-20 flex flex-col items-center gap-4 min-h-0 relative z-10">
            {simpleWorkflow.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-4 opacity-50 relative w-full z-2">
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
                  const isAddressField = ['to', 'destination', 'wallet', 'mint', 'mintAuthority', 'freezeAuthority', 'tokenAccountOwner', 'delegate', 'transferHookProgram', 'metadataPointer', 'updateAuthority', 'tokenMint', 'lendingPool'].includes(key);
                  const isAmountField = ['amount', 'initialSupply', 'supplyCap', 'delegatedAmount', 'repayAmount'].includes(key);
                  const isBooleanField = ['enableFreeze', 'enableTax', 'revokeMintAuthority', 'freezeInitialAccount', 'isNative', 'primarySaleHappened', 'isMutable', 'useToken2022', 'enableConfidentialTransfers', 'enableInterestBearing', 'enableNonTransferable', 'enableTransferMemo', 'enableImmutableOwner'].includes(key);
                  const isPercentageField = ['transferFee', 'sellerFeeBasisPoints', 'interestRate'].includes(key);
                  const isStringField = ['tokenName', 'tokenSymbol', 'metadataURI', 'creators'].includes(key);
                  const isImageField = key === 'tokenImage';
                  const isProtocolField = key === 'protocol';
                  
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
                        ) : isProtocolField ? (
                          <select
                            value={value}
                            onChange={(e) => updateSimpleBlockParams(selectedBlock.instanceId!, { [key]: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-teal-500 focus:outline-none transition-colors"
                          >
                            <option value="kamino">Kamino Finance (0.05% fee)</option>
                            <option value="solend">Solend (0.09% fee)</option>
                            <option value="marginfi">Marginfi (0.08% fee)</option>
                            <option value="jupiter">Jupiter (0.10% fee)</option>
                            <option value="mango">Mango Markets (0.12% fee)</option>
                          </select>
                        ) : isImageField ? (
                          <div className="space-y-2">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    const base64 = reader.result as string;
                                    updateSimpleBlockParams(selectedBlock.instanceId!, { [key]: base64 });
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                              className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-teal-500 focus:outline-none transition-colors file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-teal-600 file:text-white hover:file:bg-teal-700"
                            />
                            {value && (
                              <div className="relative">
                                <img 
                                  src={value} 
                                  alt="Token preview" 
                                  className="w-full h-32 object-contain rounded border border-slate-700 bg-slate-900"
                                />
                                <button
                                  onClick={() => updateSimpleBlockParams(selectedBlock.instanceId!, { [key]: '' })}
                                  className="absolute top-2 right-2 p-1 bg-red-600 hover:bg-red-700 rounded text-white text-xs"
                                  title="Remove image"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            )}
                            <input
                              type="text"
                              value={value}
                              onChange={(e) => updateSimpleBlockParams(selectedBlock.instanceId!, { [key]: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-teal-500 focus:outline-none transition-colors"
                              placeholder="Or paste image URL or base64 data URI"
                            />
                          </div>
                        ) : isAmountField ? (
                          <div className="space-y-3 pt-2">
                             <div className="relative group">
                                <label className="absolute -top-3.5 left-0 text-[9px] text-slate-500 font-mono uppercase tracking-wider">Amount (SOL)</label>
                                <input
                                    type="number"
                                    step="any"
                                    placeholder="0.0"
                                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-teal-500 focus:outline-none transition-colors"
                                    value={
                                      // Only apply lamports conversion for fields that are stored in lamports
                                      // Fields like 'initialSupply' are stored in SOL, so don't divide
                                      (value && !isNaN(Number(value)) && (key === 'amount' || key === 'delegatedAmount' || key === 'repayAmount'))
                                        ? (Number(value) / 1000000000).toString()
                                        : (value && !isNaN(Number(value)) ? value : '')
                                    }
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === '') {
                                            updateSimpleBlockParams(selectedBlock.instanceId!, { [key]: '' });
                                            return;
                                        }
                                        // Only convert to lamports for fields that should be stored in lamports
                                        // Fields like 'initialSupply' and 'supplyCap' are stored in SOL
                                        if (key === 'amount' || key === 'delegatedAmount' || key === 'repayAmount') {
                                          const lamports = Math.floor(parseFloat(val) * 1000000000);
                                          if (!isNaN(lamports)) {
                                            updateSimpleBlockParams(selectedBlock.instanceId!, { [key]: lamports.toString() });
                                          }
                                        } else {
                                          // For fields like initialSupply, store as SOL (no conversion)
                                          updateSimpleBlockParams(selectedBlock.instanceId!, { [key]: val });
                                        }
                                    }}
                                />
                             </div>
                             <div className="relative group">
                                <label className="absolute -top-3.5 left-0 text-[9px] text-slate-500 font-mono uppercase tracking-wider">
                                  {key === 'amount' || key === 'delegatedAmount' || key === 'repayAmount' ? 'Amount (Lamports)' : 'Amount (Raw)'}
                                </label>
                                <input
                                    type="number"
                                    placeholder="0"
                                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-teal-500 focus:outline-none transition-colors font-mono text-xs"
                                    value={value}
                                    onChange={(e) => updateSimpleBlockParams(selectedBlock.instanceId!, { [key]: e.target.value })}
                                />
                             </div>
                             <div className="flex items-center gap-1.5 text-[10px] text-teal-400/80 bg-teal-900/20 p-1.5 rounded border border-teal-900/30">
                                <Zap size={10} />
                                <span>
                                  {key === 'amount' || key === 'delegatedAmount' || key === 'repayAmount'
                                    ? 'AI Tip: 1 SOL = 10^9 Lamports. Use Lamports for exact precision.'
                                    : key === 'initialSupply'
                                    ? 'AI Tip: Enter supply in SOL units (e.g., 1.00 for 1 SOL worth of tokens).'
                                    : 'AI Tip: Enter the amount in the appropriate unit.'}
                                </span>
                             </div>
                          </div>
                        ) : (
                          <input 
                            type="text" 
                            value={value} 
                            onFocus={() => isAddressField && setFocusedInputField(`${selectedBlock.instanceId}-${key}`)}
                            onBlur={() => setTimeout(() => setFocusedInputField(null), 200)}
                            onChange={(e) => {
                              let newValue = e.target.value;
                              // Auto-convert SOL to lamports only for fields that should be stored in lamports
                              // Fields like 'initialSupply' and 'supplyCap' are stored in SOL units
                              if (isAmountField && (key === 'amount' || key === 'delegatedAmount' || key === 'repayAmount') && newValue.includes('.')) {
                                // User entered SOL, convert to lamports behind the scenes
                                newValue = convertSolToLamports(newValue);
                              }
                              // For initialSupply and supplyCap, keep as SOL (no conversion)
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
  const renderAdvancedMode = () => {
    return (
      <div className="h-full flex flex-col overflow-hidden">
      {/* Fixed Header */}
      <div className="flex-shrink-0 p-6 pb-4">
        <div className="flex items-center justify-between mb-6">
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
          <div className="mb-4 p-4 bg-red-900/20 border border-red-700 rounded-lg flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
            <span className="text-red-400">{buildError}</span>
          </div>
        )}
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-6">
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
      </div>

      {showTemplateSelector && (
        <TemplateSelectorModal
          categories={categories}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          templates={filteredTemplates}
          onSelectTemplate={addAdvancedInstruction}
          onClose={() => setShowTemplateSelector(false)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
      )}
      </div>
    );
  };

  // Main Transaction Builder layout
  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Mode Toggle Header */}
      <div className="border-b border-gray-700 bg-gray-800/50 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Logo */}
          <img
            src="/sea-level-logo.png"
            alt="Sealevel Studio"
            className="h-8 w-auto"
            style={{ maxHeight: '32px' }}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
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
              <img
                src="/transaction-builder-logo.jpeg"
                alt="Transaction Builder Logo"
                className="w-4 h-4 rounded-sm"
              />
              Advanced
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
            title="Import Transaction from Signature"
          >
            <span className="text-lg">📥</span>
            Import
          </button>
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
          
          {/* Enhanced Features Buttons */}
          <div className="flex items-center gap-2 border-l border-gray-700 pl-3">
            {/* Templates */}
            <button
              onClick={() => setShowTemplateModal(!showTemplateModal)}
              className="relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
              title="Saved Templates"
            >
              <BookOpen size={16} />
              {savedTemplates.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-purple-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {savedTemplates.length}
                </span>
              )}
            </button>
            
            {/* History */}
            <button
              onClick={() => setShowHistoryModal(!showHistoryModal)}
              className="relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
              title="Transaction History"
            >
              <History size={16} />
              {transactionHistory.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {transactionHistory.length}
                </span>
              )}
            </button>
            
            {/* Simulate */}
            {builtTransaction && (
              <button
                onClick={simulateTransaction}
                disabled={isSimulating}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-indigo-700 text-indigo-200 hover:bg-indigo-600 transition-colors disabled:opacity-50"
                title="Simulate Transaction"
              >
                {isSimulating ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <Eye size={16} />
                )}
                Simulate
              </button>
            )}
            
            {/* Export */}
            {(builtTransaction || transactionDraft.instructions.length > 0) && (
              <div className="relative group">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
                  title="Export Transaction"
                >
                  <Download size={16} />
                  Export
                </button>
                {showExportMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
                    <button
                      onClick={() => {
                        exportTransaction('json');
                        setShowExportMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-t-lg flex items-center gap-2"
                    >
                      <FileJson size={16} />
                      JSON
                    </button>
                    <button
                      onClick={() => {
                        exportTransaction('typescript');
                        setShowExportMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-2"
                    >
                      <FileCode size={16} />
                      TypeScript
                    </button>
                    <button
                      onClick={() => {
                        exportTransaction('rust');
                        setShowExportMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-2"
                    >
                      <FileCode size={16} />
                      Rust
                    </button>
                    <button
                      onClick={() => {
                        exportTransaction('python');
                        setShowExportMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-b-lg flex items-center gap-2"
                    >
                      <FileCode size={16} />
                      Python
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {/* Save Template */}
            {(transactionDraft.instructions.length > 0 || simpleWorkflow.length > 0) && (
              <button
                onClick={() => {
                  const name = prompt('Template name:');
                  if (name) {
                    const description = prompt('Description (optional):') || '';
                    const category = prompt('Category (optional):') || 'custom';
                    saveAsTemplate(name, description, category);
                  }
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-purple-700 text-purple-200 hover:bg-purple-600 transition-colors"
                title="Save as Template"
              >
                <Bookmark size={16} />
                Save
              </button>
            )}
          </div>
          
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

      {/* Recent Transactions */}
      <div className="border-t border-gray-700/50 p-6 bg-gray-800/30">
        <RecentTransactions featureName="transaction-builder" limit={5} />
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

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-lg w-full shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-teal-500" />
            
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="text-2xl">📥</span>
                Import Transaction
              </h3>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-white">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  Transaction Signature
                </label>
                <input
                  type="text"
                  value={importSignature}
                  onChange={(e) => setImportSignature(e.target.value)}
                  placeholder="Enter transaction signature..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-teal-500 focus:outline-none transition-colors font-mono text-sm"
                />
                <p className="text-xs text-slate-500 mt-2">
                  Enter the signature of any transaction to import its instructions into the builder.
                </p>
              </div>

              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-800 flex gap-3">
                <Zap className="text-yellow-400 shrink-0" size={20} />
                <div className="text-xs text-slate-300 space-y-1">
                  <p className="font-bold text-white">AI Auto-Parse</p>
                  <p>Our AI will attempt to map instructions to known templates. Unrecognized instructions will be imported as custom blocks.</p>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={!importSignature || isImporting}
                  className="px-6 py-2 bg-teal-600 hover:bg-teal-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  {isImporting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <span className="text-lg">⚡</span>
                      Import & Build
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Advanced Mode Instruction Card


