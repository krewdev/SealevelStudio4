import React, { useState, useEffect } from 'react';
import { Copy, Check, QrCode, RefreshCw, ExternalLink, Coins, DollarSign, Sparkles } from 'lucide-react';
import { useNetwork } from '../contexts/NetworkContext';

interface DepositWalletProps {
  walletAddress: string;
  balance?: number;
  onRefresh?: () => void;
}

type FundingOption = 'SOL' | 'USDC' | 'SEAL';

export function DepositWallet({ walletAddress, balance, onRefresh }: DepositWalletProps) {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [selectedFunding, setSelectedFunding] = useState<FundingOption>('SOL');
  const { network } = useNetwork();
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  // Generate QR code URL
  useEffect(() => {
    // Use a QR code service (or generate client-side)
    const solanaUrl = `solana:${walletAddress}?network=${network}`;
    const qrServiceUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(solanaUrl)}`;
    setQrCodeUrl(qrServiceUrl);
  }, [walletAddress, network]);

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const explorerUrl = network === 'mainnet'
    ? `https://solscan.io/account/${walletAddress}`
    : `https://solscan.io/account/${walletAddress}?cluster=${network}`;

  // Get token mint addresses based on network
  const getTokenMint = (token: FundingOption): string => {
    if (token === 'SOL') return 'So11111111111111111111111111111111111111112'; // WSOL
    if (token === 'USDC') {
      return network === 'mainnet' 
        ? 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' // Mainnet USDC
        : '4zMMC9srt5Ri5X14GAgX6H8SuHpz2k1jWwzzo4Hq1oNV'; // Devnet USDC
    }
    // SEAL token mint (replace with actual SEAL mint address)
    return network === 'mainnet'
      ? 'So11111111111111111111111111111111111111112' // Placeholder: Wrapped SOL (Replace with actual SEAL mint)
      : 'So11111111111111111111111111111111111111112'; // Placeholder: Wrapped SOL (Replace with actual SEAL mint)
  };

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Fund Wallet</h3>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
            title="Refresh Balance"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Funding Option Selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Choose Funding Method
        </label>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setSelectedFunding('SOL')}
            className={`p-3 rounded-lg border-2 transition-all ${
              selectedFunding === 'SOL'
                ? 'border-purple-500 bg-purple-500/20 text-white'
                : 'border-gray-700 bg-gray-900/50 text-gray-400 hover:border-gray-600'
            }`}
          >
            <Coins className="w-5 h-5 mx-auto mb-1" />
            <div className="text-xs font-medium">SOL</div>
          </button>
          <button
            onClick={() => setSelectedFunding('USDC')}
            className={`p-3 rounded-lg border-2 transition-all ${
              selectedFunding === 'USDC'
                ? 'border-blue-500 bg-blue-500/20 text-white'
                : 'border-gray-700 bg-gray-900/50 text-gray-400 hover:border-gray-600'
            }`}
          >
            <DollarSign className="w-5 h-5 mx-auto mb-1" />
            <div className="text-xs font-medium">USDC</div>
          </button>
          <button
            onClick={() => setSelectedFunding('SEAL')}
            className={`p-3 rounded-lg border-2 transition-all ${
              selectedFunding === 'SEAL'
                ? 'border-amber-500 bg-amber-500/20 text-white'
                : 'border-gray-700 bg-gray-900/50 text-gray-400 hover:border-gray-600'
            }`}
          >
            <Sparkles className="w-5 h-5 mx-auto mb-1" />
            <div className="text-xs font-medium">SEAL</div>
          </button>
        </div>
      </div>

      {/* Balance Display */}
      {balance !== undefined && (
        <div className="mb-6 p-4 bg-gray-900/50 rounded-lg border border-gray-700/50">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Current Balance</span>
            <span className="text-2xl font-bold text-white">
              {balance.toFixed(4)} SOL
            </span>
          </div>
        </div>
      )}

      {/* Wallet Address */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Your Wallet Address
        </label>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 font-mono text-sm text-white break-all">
            {walletAddress}
          </div>
          <button
            onClick={copyAddress}
            className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors flex-shrink-0"
            title="Copy Address"
          >
            {copied ? (
              <Check className="w-5 h-5 text-green-400" />
            ) : (
              <Copy className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* QR Code */}
      <div className="mb-4">
        <button
          onClick={() => setShowQR(!showQR)}
          className="w-full flex items-center justify-center gap-2 p-3 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg text-purple-300 transition-colors"
        >
          <QrCode className="w-5 h-5" />
          <span>{showQR ? 'Hide' : 'Show'} QR Code</span>
        </button>
        
        {showQR && (
          <div className="mt-4 flex justify-center p-4 bg-white rounded-lg">
            <img
              src={qrCodeUrl}
              alt="Wallet QR Code"
              className="w-48 h-48"
            />
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="p-4 bg-blue-900/20 border border-blue-800/50 rounded-lg mb-4">
        <p className="text-sm text-blue-200 mb-2">
          <strong>How to fund your wallet:</strong>
        </p>
        <ol className="text-xs text-blue-300 space-y-1 list-decimal list-inside">
          <li>Copy your wallet address above</li>
          <li>Send {selectedFunding} from your external wallet (Phantom, Solflare, etc.)</li>
          <li>Or scan the QR code with a mobile wallet</li>
          <li>Your balance will update automatically</li>
          {selectedFunding !== 'SOL' && (
            <li className="text-yellow-300 mt-2">
              ⚠️ Make sure you're sending {selectedFunding} tokens, not SOL
            </li>
          )}
        </ol>
      </div>

      {/* Explorer Link */}
      <a
        href={explorerUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full p-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors text-sm"
      >
        <ExternalLink className="w-4 h-4" />
        <span>View on Solscan</span>
      </a>
    </div>
  );
}


