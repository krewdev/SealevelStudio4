import React, { useState } from 'react';
import { 
  Rocket, 
  Zap, 
  ArrowRight, 
  ShieldCheck, 
  Coins,
  Loader2
} from 'lucide-react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { createRuglessLaunchTransaction, calculateLaunchEconomics } from '../lib/launch/rugless';
import { TokenImageUploader } from './TokenImageUploader';

interface QuickLaunchProps {
  onSuccess?: (mintAddress: string, signature: string) => void;
}

export function QuickLaunch({ onSuccess }: QuickLaunchProps) {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  const [step, setStep] = useState<'input' | 'image' | 'confirm' | 'launching'>('input');
  const [tokenName, setTokenName] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [tokenImage, setTokenImage] = useState('');
  const [status, setStatus] = useState('');
  
  // Defaults for Quick Launch
  const SUPPLY = 1_000_000_000;
  const SOL_LOCK = 5; // Standard entry point

  const handleNext = () => {
    if (!tokenName || !tokenSymbol) return;
    setStep('image');
  };

  const handleLaunch = async () => {
    if (!publicKey) return;
    setStep('launching');
    
    try {
      setStatus('Creating token mint...');
      
      const config = {
        name: tokenName,
        symbol: tokenSymbol,
        decimals: 9,
        totalSupply: SUPPLY,
        solLockAmount: SOL_LOCK,
        sealLockAmount: 0, // No SEAL stake for quick launch
        platformMatchRatio: 1.0,
        taxBasisPoints: 100,
        vestingPeriodSeconds: 604800
      };

      const { transaction, signers, mintKeypair } = await createRuglessLaunchTransaction(
        connection,
        publicKey,
        config
      );

      setStatus('Please sign transaction...');
      
      const signature = await sendTransaction(transaction, connection, {
        signers: signers,
      });

      setStatus('Confirming launch...');
      await connection.confirmTransaction(signature, 'confirmed');

      const mintAddress = mintKeypair.publicKey.toBase58();
      
      // Auto-save image if present
      if (tokenImage) {
        // In a real app, we'd save this association to DB here
      }

      onSuccess?.(mintAddress, signature);
      
      // Reset form
      setTokenName('');
      setTokenSymbol('');
      setTokenImage('');
      setStep('input');

    } catch (error) {
      console.error(error);
      setStatus('Launch failed. Please try again.');
      setTimeout(() => setStep('confirm'), 2000);
    }
  };

  if (step === 'launching') {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-8 text-center">
        <div className="w-16 h-16 bg-purple-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Launching {tokenName}...</h3>
        <p className="text-gray-400">{status}</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-2xl overflow-hidden">
      <div className="p-6 border-b border-gray-700 bg-gray-900/30">
        <h2 className="text-xl font-bold text-white flex items-center space-x-2">
          <Zap className="w-5 h-5 text-yellow-400" />
          <span>Quick Launch</span>
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          Deploy a rugless token in under 60 seconds.
        </p>
      </div>

      <div className="p-6">
        {step === 'input' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Token Name</label>
              <input
                type="text"
                value={tokenName}
                onChange={(e) => setTokenName(e.target.value)}
                placeholder="e.g. Moon Doge"
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Token Symbol</label>
              <input
                type="text"
                value={tokenSymbol}
                onChange={(e) => setTokenSymbol(e.target.value.toUpperCase())}
                placeholder="e.g. MDOGE"
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 transition-all uppercase"
              />
            </div>
            
            <button
              onClick={handleNext}
              disabled={!tokenName || !tokenSymbol}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl font-medium flex items-center justify-center space-x-2 transition-colors mt-4"
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {step === 'image' && (
          <div className="space-y-4">
            <TokenImageUploader
              tokenName={tokenName}
              tokenSymbol={tokenSymbol}
              onImageChange={(url) => setTokenImage(url)}
              currentImage={tokenImage}
            />
            
            <div className="grid grid-cols-2 gap-3 mt-4">
              <button
                onClick={() => setStep('input')}
                className="py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setStep('confirm')}
                className="py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-colors"
              >
                Review Launch
              </button>
            </div>
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-4">
            <div className="bg-gray-900/50 rounded-xl p-4 space-y-3 border border-gray-700/50">
              <div className="flex justify-between">
                <span className="text-gray-400">Name</span>
                <span className="text-white font-medium">{tokenName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Symbol</span>
                <span className="text-white font-medium">${tokenSymbol}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Supply</span>
                <span className="text-white font-medium">1 Billion</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Liquidity</span>
                <span className="text-white font-medium">{SOL_LOCK} SOL (Locked)</span>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 bg-green-900/20 border border-green-800/30 rounded-lg">
              <ShieldCheck className="w-5 h-5 text-green-400 mt-0.5" />
              <p className="text-xs text-green-200">
                Rugless Protection Active: Liquidity locked for 7 days. Mint authority revoked.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <button
                onClick={() => setStep('image')}
                className="py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium transition-colors"
              >
                Edit
              </button>
              <button
                onClick={handleLaunch}
                className="py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl font-bold shadow-lg transition-all"
              >
                🚀 Launch Now
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

