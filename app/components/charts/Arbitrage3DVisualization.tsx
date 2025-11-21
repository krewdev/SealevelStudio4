'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ArbitrageOpportunity, ArbitrageStep } from '../../lib/pools/types';
import { ArrowRight, Wallet, Zap, Coins, CheckCircle, XCircle, AlertTriangle, Brain, Play, AlertOctagon, Timer, BarChart, Layers, Info } from 'lucide-react';

interface Arbitrage3DVisualizationProps {
  opportunity: ArbitrageOpportunity;
  onTrainAI: () => void;
  onExecute: () => void;
  onClose: () => void;
}

export function Arbitrage3DVisualization({ opportunity, onTrainAI, onExecute, onClose }: Arbitrage3DVisualizationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current || !isHovering) return;
      
      const { left, top, width, height } = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - left) / width - 0.5;
      const y = (e.clientY - top) / height - 0.5;
      
      // Max rotation: 25 degrees for deeper 3D feel
      setRotation({
        x: -y * 50, 
        y: x * 50
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isHovering]);

  const steps = opportunity.path.steps;
  const isProfitable = opportunity.netProfit > 0;

  // Simulation data flags
  const liquidityDepth = steps.reduce((acc, step) => acc + Number(step.pool.reserves.tokenA), 0) / steps.length; // Simplified avg
  const complexityScore = opportunity.path.totalHops * 10 + (opportunity.type === 'cross_protocol' ? 20 : 0);
  const executionTimeEst = opportunity.path.totalHops * 400 + 1000; // ms

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-950/90 backdrop-blur-md p-4 overflow-hidden">
      <div className="absolute top-4 right-4 z-[110]">
        <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition">
          <XCircle size={32} />
        </button>
      </div>

      <div 
        className="relative w-full max-w-6xl h-[700px] perspective-1000 cursor-grab active:cursor-grabbing"
        ref={containerRef}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => {
          setIsHovering(false);
          setRotation({ x: 0, y: 0 });
        }}
      >
        {/* 3D Container */}
        <div 
          className="w-full h-full transition-transform duration-200 ease-out preserve-3d"
          style={{
            transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`
          }}
        >
          {/* Floating Data Layers */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-8 transform-style-3d">
            
            {/* Header Layer (Furthest Front) */}
            <div className="transform translate-z-40 bg-black/80 border-2 border-blue-500/60 p-6 rounded-2xl shadow-[0_0_30px_rgba(59,130,246,0.3)] backdrop-blur-xl min-w-[400px] text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Layers className="text-blue-400" size={20} />
                <h2 className="text-2xl font-bold text-white tracking-wider">MULTI-HOP VISUALIZER</h2>
              </div>
              <div className={`text-4xl font-mono font-bold ${isProfitable ? 'text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.5)]' : 'text-red-400 drop-shadow-[0_0_10px_rgba(248,113,113,0.5)]'}`}>
                {isProfitable ? '+' : ''}{opportunity.netProfit.toFixed(6)} SOL
              </div>
              <div className="flex justify-center gap-4 mt-2 text-sm text-gray-400">
                 <span className="flex items-center gap-1"><BarChart size={14}/> ROI: {opportunity.profitPercent.toFixed(2)}%</span>
                 <span className="flex items-center gap-1"><Timer size={14}/> ~{(executionTimeEst/1000).toFixed(1)}s</span>
              </div>
            </div>

            {/* Path Visualization Layer (Middle) */}
            <div className="transform translate-z-20 flex items-center gap-6 overflow-visible p-8">
              {steps.map((step, index) => (
                <React.Fragment key={index}>
                  <div 
                    className="relative group transform hover:translate-z-20 transition-transform duration-300"
                  >
                    {/* Step Card */}
                    <div className={`w-56 bg-gray-900/90 border-2 ${
                      index === 0 ? 'border-emerald-500' : index === steps.length - 1 ? 'border-indigo-500' : 'border-blue-500/50'
                    } rounded-xl p-5 shadow-2xl backdrop-blur-md relative overflow-hidden`}>
                      
                      {/* Background pattern */}
                      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent" />

                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-3">
                          <span className="px-2 py-1 rounded bg-white/10 text-[10px] font-bold uppercase tracking-wider text-white">{step.dex}</span>
                          <div className="text-xs text-gray-400">Hop {index + 1}</div>
                        </div>
                        
                        <div className="flex flex-col gap-2 my-4">
                          <div className="flex items-center justify-between bg-black/40 p-2 rounded border border-white/5">
                            <span className="font-bold text-lg text-white">{step.tokenIn.symbol}</span>
                            <span className="text-xs text-gray-500">In</span>
                          </div>
                          <div className="flex justify-center text-gray-500"><ArrowRight size={16} className="rotate-90" /></div>
                          <div className="flex items-center justify-between bg-black/40 p-2 rounded border border-white/5">
                            <span className="font-bold text-lg text-white">{step.tokenOut.symbol}</span>
                            <span className="text-xs text-gray-500">Out</span>
                          </div>
                        </div>

                        <div className="text-[10px] text-gray-400 font-mono bg-black/20 p-2 rounded flex justify-between">
                          <span>Price:</span>
                          <span className="text-white">{step.price.toFixed(6)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Connection Line Visualization */}
                    {index < steps.length - 1 && (
                       <div className="absolute top-1/2 -right-8 w-8 h-1 bg-gradient-to-r from-blue-500 to-purple-500 shadow-[0_0_10px_rgba(59,130,246,0.5)] transform translate-z-[-10px]" />
                    )}
                  </div>

                  {index < steps.length - 1 && (
                    <div className="w-8 flex justify-center transform translate-z-10">
                      <ArrowRight className="text-blue-400 animate-pulse" size={32} />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Analysis & Context Layer (Back) */}
            <div className="transform translate-z-0 bg-gray-900/95 border border-gray-700 p-8 rounded-2xl max-w-3xl w-full shadow-2xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Detailed Data Flags */}
                <div>
                  <h3 className="text-sm font-bold text-blue-400 uppercase mb-4 flex items-center gap-2 border-b border-blue-500/20 pb-2">
                    <Info size={16} />
                    Simulation Flags
                  </h3>
                  <ul className="space-y-3">
                    <li className="flex items-center justify-between text-sm text-gray-300 bg-white/5 p-2 rounded">
                      <span>Net Expectancy</span>
                      <span className={isProfitable ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
                        {isProfitable ? 'POSITIVE' : 'NEGATIVE'}
                      </span>
                    </li>
                    <li className="flex items-center justify-between text-sm text-gray-300 bg-white/5 p-2 rounded">
                      <span>Path Confidence</span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500" style={{ width: `${opportunity.confidence * 100}%` }} />
                        </div>
                        <span>{(opportunity.confidence * 100).toFixed(0)}%</span>
                      </div>
                    </li>
                    <li className="flex items-center justify-between text-sm text-gray-300 bg-white/5 p-2 rounded">
                      <span>Est. Gas Cost</span>
                      <span className="text-yellow-400 font-mono">{(opportunity.gasEstimate / 1e9).toFixed(6)} SOL</span>
                    </li>
                    <li className="flex items-center justify-between text-sm text-gray-300 bg-white/5 p-2 rounded">
                      <span>Complexity</span>
                      <span className={complexityScore > 50 ? 'text-red-400' : 'text-green-400'}>
                        {complexityScore > 50 ? 'High' : 'Low'} ({opportunity.path.totalHops} Hops)
                      </span>
                    </li>
                  </ul>
                </div>

                {/* Context & Training */}
                <div>
                  <h3 className="text-sm font-bold text-purple-400 uppercase mb-4 flex items-center gap-2 border-b border-purple-500/20 pb-2">
                    <Brain size={16} />
                    AI Learning Context
                  </h3>
                  <div className="bg-purple-900/10 border border-purple-500/20 rounded-lg p-4 mb-4">
                    <p className="text-xs text-purple-200 leading-relaxed">
                      Retaining this path helps the neural network identify {isProfitable ? 'efficient' : 'inefficient'} routing patterns. 
                      <br/><br/>
                      <strong>Key Factors Identified:</strong>
                      <ul className="list-disc list-inside mt-1 text-purple-300/80">
                        <li>Liquidity Variance: High</li>
                        <li>Route: {opportunity.type.replace('_', ' ').toUpperCase()}</li>
                        <li>Slippage Risk: {(1 - opportunity.confidence) * 100}%</li>
                      </ul>
                    </p>
                  </div>
                  
                  <div className="flex flex-col gap-3">
                    <button
                      onClick={onTrainAI}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold shadow-lg transition-all active:scale-95 border border-purple-400/30"
                    >
                      <Brain size={18} />
                      Retain Context & Train AI
                    </button>
                    <button
                      onClick={onExecute}
                      className={`w-full flex items-center justify-center gap-2 px-4 py-3 ${
                        isProfitable 
                          ? 'bg-green-600 hover:bg-green-700 shadow-green-900/20' 
                          : 'bg-red-900/80 hover:bg-red-800 border border-red-500/50'
                      } text-white rounded-lg font-bold shadow-lg transition-all active:scale-95`}
                    >
                      {isProfitable ? <Zap size={18} /> : <AlertOctagon size={18} />}
                      {isProfitable ? 'Execute Strategy' : 'Force Execution (High Risk)'}
                    </button>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </div>

      <div className="absolute bottom-8 left-0 right-0 text-center pointer-events-none">
        <p className="text-gray-500 text-xs uppercase tracking-[0.5em] animate-pulse">
          Interactive 3D Workspace • Drag to Rotate
        </p>
      </div>

      <style jsx>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .preserve-3d {
          transform-style: preserve-3d;
        }
        .transform-style-3d {
          transform-style: preserve-3d;
        }
        .translate-z-10 { transform: translateZ(10px); }
        .translate-z-20 { transform: translateZ(20px); }
        .translate-z-30 { transform: translateZ(30px); }
        .translate-z-40 { transform: translateZ(40px); }
      `}</style>
    </div>
  );
}
