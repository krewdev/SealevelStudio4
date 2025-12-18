import React, { useState, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { 
  Rocket, 
  Shield, 
  Lock, 
  Coins, 
  ArrowRight, 
  AlertCircle,
  CheckCircle2,
  Info,
  TrendingUp,
  Percent
} from 'lucide-react';
import { 
  createRuglessLaunchTransaction, 
  calculateLaunchEconomics, 
  RuglessLaunchConfig 
} from '../lib/launch/rugless';
import { SEAL_TOKEN_CONFIG } from '../lib/seal-token/config';
import { TokenImageUploader } from './TokenImageUploader';

interface RuglessLaunchpadProps {
  onBack?: () => void;
}

export function RuglessLaunchpad({ onBack }: RuglessLaunchpadProps) {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  // Form State
  const [tokenName, setTokenName] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [totalSupply, setTotalSupply] = useState(1000000000);
  const [solLockAmount, setSolLockAmount] = useState(10);
  const [sealLockAmount, setSealLockAmount] = useState(1000);
  const [tokenImage, setTokenImage] = useState('');
  const [tokenImageFile, setTokenImageFile] = useState<File | undefined>();
  const [autoPostToSocial, setAutoPostToSocial] = useState(true);
  
  // Status State
  const [isLaunching, setIsLaunching] = useState(false);
  const [launchStatus, setLaunchStatus] = useState<'idle' | 'building' | 'signing' | 'confirming' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [successTx, setSuccessTx] = useState('');
  const [mintAddress, setMintAddress] = useState('');

  // Calculated Economics
  const economics = calculateLaunchEconomics({
    name: tokenName,
    symbol: tokenSymbol,
    decimals: 9,
    totalSupply,
    solLockAmount,
    sealLockAmount,
    platformMatchRatio: 1.0, // 1:1 Match
    taxBasisPoints: 100, // 1%
    vestingPeriodSeconds: 604800 // 1 week
  });

  const handleLaunch = async () => {
    if (!publicKey) return;

    try {
      setIsLaunching(true);
      setLaunchStatus('building');
      setErrorMessage('');

      const config: RuglessLaunchConfig = {
        name: tokenName,
        symbol: tokenSymbol,
        decimals: 9,
        totalSupply,
        solLockAmount,
        sealLockAmount,
        platformMatchRatio: 1.0,
        taxBasisPoints: 100,
        vestingPeriodSeconds: 604800
      };

      const { transaction, signers, mintKeypair } = await createRuglessLaunchTransaction(
        connection,
        publicKey,
        config
      );

      setLaunchStatus('signing');
      
      // Send transaction
      const signature = await sendTransaction(transaction, connection, {
        signers: signers,
      });

      setLaunchStatus('confirming');
      
      const confirmation = await connection.confirmTransaction(signature, 'confirmed');

      if (confirmation.value.err) {
        throw new Error('Transaction failed to confirm');
      }

      const newMintAddress = mintKeypair.publicKey.toBase58();
      setSuccessTx(signature);
      setMintAddress(newMintAddress);
      setLaunchStatus('success');

      // Always broadcast transaction to all social platforms
      try {
        await fetch('/api/social/post-token-launch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tokenSymbol,
            tokenName,
            tokenMintAddress: newMintAddress,
            transactionSignature: signature, // Include transaction signature
            imageUrl: tokenImage,
            totalSupply,
            liquidityAmount: economics.totalLiquiditySol,
            platforms: ['twitter', 'telegram'], // Broadcast to all configured platforms
          }),
        });
      } catch (socialError) {
        console.error('Social media broadcast failed:', socialError);
        // Don't fail the launch if social posting fails
      }

    } catch (error) {
      console.error('Launch failed:', error);
      setLaunchStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsLaunching(false);
    }
  };

  if (launchStatus === 'success') {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-green-900/20 border border-green-700 rounded-2xl p-8 text-center">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Rocket className="w-10 h-10 text-green-400" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">Launch Successful!</h2>
          <p className="text-gray-300 mb-8">
            Your token <span className="text-green-400 font-bold">{tokenName} ({tokenSymbol})</span> has been deployed with Rugless protection.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 text-left">
            <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
              <div className="text-sm text-gray-400 mb-1">Liquidity Locked</div>
              <div className="text-xl font-bold text-white">{(economics.totalLiquiditySol).toFixed(2)} SOL</div>
              <div className="text-xs text-green-400 mt-1">Includes Platform Match</div>
            </div>
            <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
              <div className="text-sm text-gray-400 mb-1">Vesting Period</div>
              <div className="text-xl font-bold text-white">7 Days</div>
              <div className="text-xs text-yellow-400 mt-1">Cliff Unlock</div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 mb-8 text-left">
            <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
              <div className="text-sm text-gray-400 mb-1">Mint Address</div>
              <div className="text-sm font-mono text-blue-400 break-all cursor-pointer hover:underline" onClick={() => window.open(`https://solscan.io/token/${mintAddress}`, '_blank')}>
                {mintAddress}
              </div>
            </div>
            <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
              <div className="text-sm text-gray-400 mb-1">Transaction</div>
              <div className="text-sm font-mono text-blue-400 break-all cursor-pointer hover:underline" onClick={() => window.open(`https://solscan.io/tx/${successTx}`, '_blank')}>
                {successTx}
              </div>
            </div>
          </div>

          {tokenImage && (
            <div className="mb-8">
              <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
                <div className="text-sm text-gray-400 mb-3">Token Image</div>
                <div className="flex items-center space-x-4">
                  <img src={tokenImage} alt={tokenName} className="w-20 h-20 rounded-lg border border-gray-600" />
                  <div className="flex-1">
                    <p className="text-sm text-green-400 mb-1">✓ Image saved for social media</p>
                    <p className="text-xs text-gray-400">
                      {autoPostToSocial ? 'Posted to Twitter & Telegram' : 'Ready for manual posting'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-center space-x-4">
            <button
              onClick={onBack}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium transition-colors"
            >
              Return to Dashboard
            </button>
            <button
              onClick={() => setLaunchStatus('idle')}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-colors"
            >
              Launch Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button 
            onClick={onBack}
            className="text-gray-400 hover:text-white text-sm flex items-center space-x-2 mb-2 transition-colors"
          >
            <ArrowRight className="w-4 h-4 rotate-180" />
            <span>Back to Dashboard</span>
          </button>
          <h1 className="text-3xl font-bold text-white flex items-center space-x-3">
            <Shield className="w-8 h-8 text-purple-400" />
            <span>Rugless Launchpad</span>
          </h1>
          <p className="text-gray-400 mt-2 max-w-2xl">
            Deploy with confidence using Sealevel's matched liquidity program. 
            Lock your SOL and SEAL to receive a 1:1 liquidity match and build instant trust.
          </p>
        </div>
        <div className="hidden md:block">
          <div className="bg-purple-900/30 border border-purple-500/30 rounded-xl p-4 flex items-center space-x-4">
            <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <div className="text-sm text-purple-300 font-medium">Platform Match Active</div>
              <div className="text-xs text-purple-400/70">100% Liquidity Matching Enabled</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Configuration Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center space-x-2">
              <Rocket className="w-5 h-5 text-blue-400" />
              <span>Token Configuration</span>
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Token Name</label>
                <input
                  type="text"
                  value={tokenName}
                  onChange={(e) => setTokenName(e.target.value)}
                  placeholder="e.g. Sealevel Protocol"
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Token Symbol</label>
                <input
                  type="text"
                  value={tokenSymbol}
                  onChange={(e) => setTokenSymbol(e.target.value)}
                  placeholder="e.g. SEAL"
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Total Supply</label>
              <input
                type="number"
                value={totalSupply}
                onChange={(e) => setTotalSupply(Number(e.target.value))}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
              />
              <p className="text-xs text-gray-500 mt-2">Standard 9 decimals applied automatically.</p>
            </div>
          </div>

          {/* Token Image Uploader */}
          <TokenImageUploader
            tokenSymbol={tokenSymbol}
            tokenName={tokenName}
            onImageChange={(imageUrl, imageFile) => {
              setTokenImage(imageUrl);
              setTokenImageFile(imageFile);
            }}
            currentImage={tokenImage}
          />

          <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center space-x-2">
              <Lock className="w-5 h-5 text-orange-400" />
              <span>Liquidity & Security</span>
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2 flex justify-between">
                  <span>Initial SOL Liquidity Lock</span>
                  <span className="text-white font-mono">{solLockAmount} SOL</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="1000"
                  value={solLockAmount}
                  onChange={(e) => setSolLockAmount(Number(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>1 SOL</span>
                  <span>1000 SOL</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2 flex justify-between">
                  <span>SEAL Token Stake Required</span>
                  <span className="text-white font-mono">{sealLockAmount} SEAL</span>
                </label>
                <input
                  type="range"
                  min="100"
                  max="100000"
                  step="100"
                  value={sealLockAmount}
                  onChange={(e) => setSealLockAmount(Number(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>100 SEAL</span>
                  <span>100,000 SEAL</span>
                </div>
                <p className="text-xs text-purple-400 mt-2 flex items-center">
                  <Info className="w-3 h-3 mr-1" />
                  Stake is returned after successful graduation (1 week lock).
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Economics Preview Panel */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-2xl p-6 sticky top-6 shadow-xl">
            <h3 className="text-lg font-semibold text-white mb-6">Launch Economics</h3>
            
            <div className="space-y-4 mb-8">
              <div className="flex justify-between items-center pb-4 border-b border-gray-700">
                <span className="text-gray-400">Your SOL Lock</span>
                <span className="text-white font-medium">{economics.devSolCommitment.toFixed(2)} SOL</span>
              </div>
              
              <div className="flex justify-between items-center pb-4 border-b border-gray-700">
                <span className="text-purple-400 flex items-center">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  Platform Match
                </span>
                <span className="text-green-400 font-bold">+{economics.platformMatch.toFixed(2)} SOL</span>
              </div>

              <div className="flex justify-between items-center pb-4 border-b border-gray-700 bg-gray-800/50 -mx-2 px-2 py-3 rounded-lg">
                <span className="text-gray-300 font-medium">Total Starting Liquidity</span>
                <span className="text-white font-bold text-lg">{economics.totalLiquiditySol.toFixed(2)} SOL</span>
              </div>
              
              <div className="space-y-2 pt-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400 flex items-center">
                    <Percent className="w-3 h-3 mr-1" />
                    Platform Tax
                  </span>
                  <span className="text-white">{economics.taxRatePercentage}%</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400 flex items-center">
                    <Lock className="w-3 h-3 mr-1" />
                    Liquidity Lock
                  </span>
                  <span className="text-white">{economics.vestingDurationDays} Days</span>
                </div>
              </div>
            </div>

            {/* Social Media Auto-Post Option */}
            {tokenImage && (
              <div className="bg-purple-900/20 border border-purple-700/50 rounded-xl p-4 mb-6">
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoPostToSocial}
                    onChange={(e) => setAutoPostToSocial(e.target.checked)}
                    className="mt-1 w-4 h-4 text-purple-600 bg-gray-800 border-gray-600 rounded focus:ring-purple-500"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-purple-200">
                      Auto-post launch announcement
                    </div>
                    <div className="text-xs text-purple-300/70 mt-1">
                      Automatically share token launch with image on Twitter and Telegram
                    </div>
                  </div>
                </label>
              </div>
            )}

            {/* Warning / Info Box */}
            <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-xl p-4 mb-6">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-yellow-200/80">
                  <p className="font-semibold text-yellow-200 mb-1">Terms of Rugless Launch</p>
                  <ul className="list-disc pl-3 space-y-1">
                    <li>Initial liquidity is locked for 1 week.</li>
                    <li>1% Transfer Tax is applied to all token volume.</li>
                    <li>Platform match is recoverable if dev withdraws post-lock.</li>
                  </ul>
                </div>
              </div>
            </div>

            <button
              onClick={handleLaunch}
              disabled={isLaunching || !tokenName || !tokenSymbol || !publicKey}
              className={`
                w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center space-x-2 transition-all
                ${isLaunching || !tokenName || !tokenSymbol || !publicKey
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg hover:shadow-purple-500/25'
                }
              `}
            >
              {isLaunching ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{launchStatus === 'building' ? 'Building...' : launchStatus === 'signing' ? 'Sign Request...' : 'Confirming...'}</span>
                </>
              ) : (
                <>
                  <Rocket className="w-5 h-5" />
                  <span>Initiate Launch</span>
                </>
              )}
            </button>
            
            {!publicKey && (
              <p className="text-center text-red-400 text-xs mt-3">
                Please connect your wallet to launch.
              </p>
            )}

            {errorMessage && (
              <div className="mt-4 p-3 bg-red-900/30 border border-red-800 rounded-lg flex items-start space-x-2 text-xs text-red-200">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
