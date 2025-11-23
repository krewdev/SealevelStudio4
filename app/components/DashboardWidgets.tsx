import React, { useState } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { Fuel, Globe, ArrowRight, Activity, TrendingUp, DollarSign, Zap } from 'lucide-react';

export function GasEstimator() {
  const { connection } = useConnection();
  const [priorityFee, setPriorityFee] = useState<number | null>(null);
  const [baseFee, setBaseFee] = useState<number>(5000); // Standard 5000 lamports
  const [isLoading, setIsLoading] = useState(false);

  const fetchFees = async () => {
    setIsLoading(true);
    try {
      // In a real app, fetch recent prioritization fees from RPC
      // const fees = await connection.getRecentPrioritizationFees();
      // For now, mock a realistic value based on "network congestion"
      await new Promise(r => setTimeout(r, 800));
      const mockPriority = Math.floor(Math.random() * 10000) + 1000;
      setPriorityFee(mockPriority);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch
  React.useEffect(() => {
    fetchFees();
    const interval = setInterval(fetchFees, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Fuel className="w-5 h-5 text-orange-400" />
          Gas Fee Predictor
        </h3>
        <span className="text-xs text-green-400 flex items-center gap-1">
          <Activity className="w-3 h-3" />
          Live Updates
        </span>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center p-3 bg-gray-900/50 rounded-lg border border-gray-700/50">
          <span className="text-gray-400 text-sm">Base Fee</span>
          <span className="text-white font-mono">{(baseFee / 1e9).toFixed(9)} SOL</span>
        </div>

        <div className="flex justify-between items-center p-3 bg-gray-900/50 rounded-lg border border-gray-700/50">
          <span className="text-gray-400 text-sm">Priority Fee (Avg)</span>
          <div className="text-right">
            <span className={`block font-mono ${isLoading ? 'animate-pulse' : 'text-orange-400'}`}>
              {priorityFee ? (priorityFee / 1e9).toFixed(9) : '---'} SOL
            </span>
            <span className="text-xs text-gray-500">Est. for fast confirmation</span>
          </div>
        </div>

        <div className="pt-2 border-t border-gray-700/50">
          <div className="flex justify-between items-center">
            <span className="text-gray-300 font-medium">Total Estimate</span>
            <span className="text-xl font-bold text-white">
              {priorityFee ? ((baseFee + priorityFee) / 1e9).toFixed(9) : '---'} SOL
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1 text-right">~$0.0002 USD</p>
        </div>
      </div>
    </div>
  );
}

export function CrossChainFees() {
  // Mock data for cross-chain fees
  const routes = [
    { from: 'Solana', to: 'Ethereum', protocol: 'Wormhole', fee: '0.004 SOL', time: '~15m' },
    { from: 'Solana', to: 'Polygon', protocol: 'Portal', fee: '0.002 SOL', time: '~10m' },
    { from: 'Solana', to: 'Arbitrum', protocol: 'Allbridge', fee: '0.003 SOL', time: '~5m' },
  ];

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Globe className="w-5 h-5 text-blue-400" />
          Cross-Chain Portal Fees
        </h3>
      </div>

      <div className="space-y-3">
        {routes.map((route, idx) => (
          <div key={idx} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg hover:bg-gray-900 transition-colors border border-gray-700/50">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-sm font-medium text-white">
                <span>{route.from}</span>
                <ArrowRight className="w-3 h-3 text-gray-500" />
                <span>{route.to}</span>
              </div>
              <span className="px-2 py-0.5 bg-gray-800 rounded text-xs text-gray-400">{route.protocol}</span>
            </div>
            <div className="text-right">
              <span className="block text-sm font-medium text-white">{route.fee}</span>
              <span className="text-xs text-gray-500">{route.time}</span>
            </div>
          </div>
        ))}
      </div>
      
      <button className="w-full mt-4 py-2 text-xs text-center text-gray-400 hover:text-white transition-colors">
        View All Routes →
      </button>
    </div>
  );
}
