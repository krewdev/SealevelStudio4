import React, { useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { 
  Lock, 
  Unlock, 
  Ban, 
  Flame, 
  RefreshCw, 
  ShieldAlert,
  Search,
  Key
} from 'lucide-react';
import { PublicKey } from '@solana/web3.js';

export function TokenManager() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [mintAddress, setMintAddress] = useState('');
  const [targetAddress, setTargetAddress] = useState('');
  const [action, setAction] = useState<'freeze' | 'thaw' | 'burn' | 'mint'>('freeze');
  const [isLoading, setIsLoading] = useState(false);

  const handleAction = async () => {
    if (!publicKey) return;
    setIsLoading(true);
    
    try {
      // Mocking the action for UI demonstration
      await new Promise(r => setTimeout(r, 1500));
      
      /* 
      Real implementation would use:
      const tx = new Transaction();
      if (action === 'freeze') {
        tx.add(createFreezeAccountInstruction(mint, target, authority));
      }
      await sendTransaction(tx, connection);
      */
      
      alert(`${action.toUpperCase()} action simulation successful!`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Key className="w-5 h-5 text-purple-400" />
          Token Manager
        </h3>
        <span className="text-xs bg-purple-900/30 text-purple-300 px-2 py-1 rounded-full border border-purple-700/50">
          Authority Actions
        </span>
      </div>

      <div className="space-y-4">
        {/* Action Selector */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { id: 'freeze', icon: Lock, label: 'Freeze' },
            { id: 'thaw', icon: Unlock, label: 'Thaw' },
            { id: 'burn', icon: Flame, label: 'Burn' },
            { id: 'mint', icon: RefreshCw, label: 'Mint' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setAction(item.id as any)}
              className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${
                action === item.id
                  ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                  : 'bg-gray-900/50 border-gray-700/50 text-gray-400 hover:bg-gray-800'
              }`}
            >
              <item.icon className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          ))}
        </div>

        {/* Inputs */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Token Mint Address</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={mintAddress}
                onChange={(e) => setMintAddress(e.target.value)}
                placeholder="Token Mint Address..."
                className="w-full bg-gray-900 border border-gray-700 rounded-lg py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Target Account (Wallet)</label>
            <input
              type="text"
              value={targetAddress}
              onChange={(e) => setTargetAddress(e.target.value)}
              placeholder="Target Wallet Address..."
              className="w-full bg-gray-900 border border-gray-700 rounded-lg py-2 px-4 text-sm text-white focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        {/* Warning for Freeze */}
        {action === 'freeze' && (
          <div className="p-3 bg-red-900/20 border border-red-800/50 rounded-lg flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-red-200">
              Freezing an account will prevent all transfers in or out. You must have Freeze Authority.
            </p>
          </div>
        )}

        <button
          onClick={handleAction}
          disabled={isLoading || !mintAddress || !targetAddress || !publicKey}
          className={`w-full py-3 rounded-lg font-medium text-sm transition-all ${
            isLoading || !mintAddress || !targetAddress || !publicKey
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white'
          }`}
        >
          {isLoading ? 'Processing...' : `Execute ${action.toUpperCase()}`}
        </button>
      </div>
    </div>
  );
}
