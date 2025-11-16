'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Wallet,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  Edit2,
  Trash2,
  Copy,
  Check,
  Tag,
  FolderPlus,
  Eye,
  EyeOff,
  RefreshCw,
  Key,
  FileText,
} from 'lucide-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { walletRegistry, ManagedWallet, WalletGroup } from '../lib/wallet-manager';

interface WalletManagerProps {
  onBack?: () => void;
}

export function WalletManager({ onBack }: WalletManagerProps) {
  const { connection } = useConnection();
  const [wallets, setWallets] = useState<ManagedWallet[]>([]);
  const [groups, setGroups] = useState<WalletGroup[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWallets, setSelectedWallets] = useState<Set<string>>(new Set());
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'created' | 'label' | 'balance'>('created');
  const [showImport, setShowImport] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [editingWallet, setEditingWallet] = useState<string | null>(null);
  const [showPrivateKeys, setShowPrivateKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadWallets();
    loadGroups();
  }, []);

  const loadWallets = () => {
    const allWallets = walletRegistry.getAllWallets();
    setWallets(allWallets);
    
    // Update balances
    allWallets.forEach(async (wallet) => {
      try {
        const pubkey = new PublicKey(wallet.address);
        const balance = await connection.getBalance(pubkey);
        walletRegistry.updateBalance(wallet.id, balance / LAMPORTS_PER_SOL);
      } catch (error) {
        console.error(`Error fetching balance for ${wallet.address}:`, error);
      }
    });
  };

  const loadGroups = () => {
    setGroups(walletRegistry.getAllGroups());
  };

  const filteredWallets = useMemo(() => {
    let filtered = wallets;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        w =>
          w.address.toLowerCase().includes(query) ||
          w.label?.toLowerCase().includes(query) ||
          w.notes?.toLowerCase().includes(query)
      );
    }

    // Tag filter
    if (filterTags.length > 0) {
      filtered = filtered.filter(w =>
        w.tags?.some(tag => filterTags.includes(tag))
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'label':
          return (a.label || '').localeCompare(b.label || '');
        case 'balance':
          return (b.balance || 0) - (a.balance || 0);
        case 'created':
        default:
          return b.createdAt.getTime() - a.createdAt.getTime();
      }
    });

    return filtered;
  }, [wallets, searchQuery, filterTags, sortBy]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    wallets.forEach(w => w.tags?.forEach(tag => tags.add(tag)));
    return Array.from(tags);
  }, [wallets]);

  const stats = useMemo(() => {
    return walletRegistry.getStats();
  }, [wallets]);

  const handleImport = async (privateKey: string, label?: string, tags?: string[]) => {
    try {
      walletRegistry.importWallet({ privateKey, label, tags });
      loadWallets();
      setShowImport(false);
    } catch (error) {
      alert(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleExport = (password: string) => {
    try {
      const walletIds = selectedWallets.size > 0
        ? Array.from(selectedWallets)
        : wallets.map(w => w.id);
      
      const exportData = walletRegistry.exportRegistry(password, walletIds);
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wallet-backup-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setShowExport(false);
    } catch (error) {
      alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDelete = (walletId: string) => {
    if (confirm('Are you sure you want to delete this wallet from the registry?')) {
      walletRegistry.deleteWallet(walletId);
      loadWallets();
    }
  };

  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      {/* Header */}
      <div className="border-b border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                title="Go back"
              >
                <ArrowLeft size={18} />
                <span className="text-sm">Back</span>
              </button>
            )}
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Wallet size={28} />
                Wallet Manager
              </h1>
              <p className="text-gray-400 mt-1">Manage wallets created via transaction bundler</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowImport(true)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg flex items-center gap-2"
            >
              <Upload size={18} />
              Import
            </button>
            <button
              onClick={() => setShowExport(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2"
            >
              <Download size={18} />
              Export
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mt-4">
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="text-sm text-gray-400">Total Wallets</div>
            <div className="text-2xl font-bold">{stats.totalWallets}</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="text-sm text-gray-400">Created</div>
            <div className="text-2xl font-bold">{stats.createdWallets}</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="text-sm text-gray-400">Imported</div>
            <div className="text-2xl font-bold">{stats.importedWallets}</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="text-sm text-gray-400">Total Balance</div>
            <div className="text-2xl font-bold">{stats.totalBalance.toFixed(4)} SOL</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="border-b border-gray-700 p-4 flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search wallets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 rounded-lg border border-gray-700 focus:border-purple-500 focus:outline-none"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="px-4 py-2 bg-gray-800 rounded-lg border border-gray-700 focus:border-purple-500 focus:outline-none"
        >
          <option value="created">Sort by Created</option>
          <option value="label">Sort by Label</option>
          <option value="balance">Sort by Balance</option>
        </select>
      </div>

      {/* Wallet List */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWallets.map((wallet) => (
            <div
              key={wallet.id}
              className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-purple-500 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {wallet.label ? (
                      <h3 className="font-semibold">{wallet.label}</h3>
                    ) : (
                      <h3 className="font-semibold text-gray-400">Unnamed Wallet</h3>
                    )}
                    {wallet.isImported && (
                      <span className="text-xs bg-blue-900/50 text-blue-400 px-2 py-0.5 rounded">
                        Imported
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400 font-mono">
                    <span className="truncate">{wallet.address.slice(0, 8)}...{wallet.address.slice(-8)}</span>
                    <button
                      onClick={() => handleCopyAddress(wallet.address)}
                      className="hover:text-white"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setEditingWallet(wallet.id)}
                    className="p-1.5 hover:bg-gray-700 rounded"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(wallet.id)}
                    className="p-1.5 hover:bg-red-900/50 rounded text-red-400"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Balance:</span>
                  <span className="font-semibold">
                    {wallet.balance !== undefined ? `${wallet.balance.toFixed(4)} SOL` : 'Loading...'}
                  </span>
                </div>
                {wallet.tags && wallet.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {wallet.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs bg-purple-900/50 text-purple-400 px-2 py-0.5 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {wallet.encryptedKeypair && (
                  <button
                    onClick={() => {
                      const newSet = new Set(showPrivateKeys);
                      if (newSet.has(wallet.id)) {
                        newSet.delete(wallet.id);
                      } else {
                        newSet.add(wallet.id);
                      }
                      setShowPrivateKeys(newSet);
                    }}
                    className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
                  >
                    {showPrivateKeys.has(wallet.id) ? <EyeOff size={12} /> : <Eye size={12} />}
                    {showPrivateKeys.has(wallet.id) ? 'Hide' : 'Show'} Private Key
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {filteredWallets.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Wallet size={48} className="mx-auto mb-4 opacity-50" />
            <p>No wallets found</p>
            {wallets.length > 0 && <p className="text-sm mt-2">Try adjusting your filters</p>}
          </div>
        )}
      </div>

      {/* Import Modal */}
      {showImport && (
        <ImportWalletModal
          onImport={handleImport}
          onClose={() => setShowImport(false)}
        />
      )}

      {/* Export Modal */}
      {showExport && (
        <ExportWalletModal
          onExport={handleExport}
          onClose={() => setShowExport(false)}
          walletCount={selectedWallets.size || wallets.length}
        />
      )}

      {/* Edit Modal */}
      {editingWallet && (
        <EditWalletModal
          wallet={wallets.find(w => w.id === editingWallet)!}
          onSave={(updates) => {
            if (updates.label) walletRegistry.updateLabel(editingWallet, updates.label);
            if (updates.tags) walletRegistry.updateTags(editingWallet, updates.tags);
            if (updates.notes) walletRegistry.updateNotes(editingWallet, updates.notes);
            loadWallets();
            setEditingWallet(null);
          }}
          onClose={() => setEditingWallet(null)}
        />
      )}
    </div>
  );
}

function ImportWalletModal({ onImport, onClose }: { onImport: (key: string, label?: string, tags?: string[]) => void; onClose: () => void }) {
  const [privateKey, setPrivateKey] = useState('');
  const [label, setLabel] = useState('');
  const [tags, setTags] = useState('');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Import Wallet</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Private Key (hex or base64)</label>
            <textarea
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900 rounded border border-gray-700 font-mono text-sm"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Label (optional)</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900 rounded border border-gray-700"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Tags (comma-separated, optional)</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900 rounded border border-gray-700"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-6">
          <button
            onClick={() => onImport(privateKey, label, tags.split(',').map(t => t.trim()).filter(Boolean))}
            className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg"
          >
            Import
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function ExportWalletModal({ onExport, onClose, walletCount }: { onExport: (password: string) => void; onClose: () => void; walletCount: number }) {
  const [password, setPassword] = useState('');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Export Wallets</h2>
        <p className="text-gray-400 mb-4">Exporting {walletCount} wallet(s)</p>
        <div>
          <label className="block text-sm text-gray-400 mb-2">Password (for encryption)</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 bg-gray-900 rounded border border-gray-700"
          />
        </div>
        <div className="flex gap-2 mt-6">
          <button
            onClick={() => onExport(password)}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
          >
            Export
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function EditWalletModal({ wallet, onSave, onClose }: { wallet: ManagedWallet; onSave: (updates: { label?: string; tags?: string[]; notes?: string }) => void; onClose: () => void }) {
  const [label, setLabel] = useState(wallet.label || '');
  const [tags, setTags] = useState(wallet.tags?.join(', ') || '');
  const [notes, setNotes] = useState(wallet.notes || '');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Edit Wallet</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Label</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900 rounded border border-gray-700"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Tags (comma-separated)</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900 rounded border border-gray-700"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900 rounded border border-gray-700"
              rows={3}
            />
          </div>
        </div>
        <div className="flex gap-2 mt-6">
          <button
            onClick={() => onSave({
              label,
              tags: tags.split(',').map(t => t.trim()).filter(Boolean),
              notes,
            })}
            className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg"
          >
            Save
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

