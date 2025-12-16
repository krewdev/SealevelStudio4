'use client';

import React, { useState, useRef, useEffect } from 'react';

export type BlockchainType = 'polkadot' | 'solana' | 'ethereum' | 'polygon' | 'avalanche' | 'base' | 'arbitrum' | 'optimism' | 'sui' | 'aptos';

interface BlockchainInfo {
  id: BlockchainType;
  name: string;
  description: string;
  logo: string;
  color: string;
  gradient: string;
  status: 'available' | 'coming-soon' | 'beta';
  features: string[];
}

const BLOCKCHAINS: BlockchainInfo[] = [
  {
    id: 'polkadot',
    name: 'Polkadot',
    description: 'Interoperable blockchain network with parachains',
    logo: 'https://cryptologos.cc/logos/polkadot-new-dot-logo.png?v=032',
    color: 'from-pink-500 to-red-600',
    gradient: 'bg-gradient-to-r from-pink-500 to-red-600',
    status: 'available',
    features: ['Transaction Builder', 'Parachain Support', 'Cross-Chain', 'Full Support'],
  },
  {
    id: 'solana',
    name: 'Solana',
    description: 'High-performance blockchain with sub-second finality',
    logo: 'https://cryptologos.cc/logos/solana-sol-logo.png?v=032',
    color: 'from-purple-500 to-indigo-600',
    gradient: 'bg-gradient-to-r from-purple-500 to-indigo-600',
    status: 'available',
    features: ['Transaction Builder', 'Arbitrage Scanner', 'AI Agents', 'Full Support'],
  },
  {
    id: 'ethereum',
    name: 'Ethereum',
    description: 'The world\'s leading smart contract platform',
    logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.png?v=032',
    color: 'from-blue-500 to-cyan-600',
    gradient: 'bg-gradient-to-r from-blue-500 to-cyan-600',
    status: 'coming-soon',
    features: ['Transaction Builder', 'DeFi Tools', 'Coming Soon'],
  },
  {
    id: 'polygon',
    name: 'Polygon',
    description: 'Ethereum scaling solution with low fees',
    logo: 'https://cryptologos.cc/logos/polygon-matic-logo.png?v=032',
    color: 'from-purple-500 to-pink-600',
    gradient: 'bg-gradient-to-r from-purple-500 to-pink-600',
    status: 'coming-soon',
    features: ['Transaction Builder', 'Coming Soon'],
  },
  {
    id: 'avalanche',
    name: 'Avalanche',
    description: 'Fast, low-cost smart contracts platform',
    logo: 'https://cryptologos.cc/logos/avalanche-avax-logo.png?v=032',
    color: 'from-red-500 to-orange-600',
    gradient: 'bg-gradient-to-r from-red-500 to-orange-600',
    status: 'coming-soon',
    features: ['Transaction Builder', 'Coming Soon'],
  },
  {
    id: 'base',
    name: 'Base',
    description: 'Coinbase\'s L2 built on Optimism',
    logo: 'https://cryptologos.cc/logos/base-base-logo.png?v=032',
    color: 'from-blue-400 to-blue-600',
    gradient: 'bg-gradient-to-r from-blue-400 to-blue-600',
    status: 'coming-soon',
    features: ['Transaction Builder', 'Coming Soon'],
  },
  {
    id: 'arbitrum',
    name: 'Arbitrum',
    description: 'Ethereum L2 with optimistic rollups',
    logo: 'https://cryptologos.cc/logos/arbitrum-arb-logo.png?v=032',
    color: 'from-blue-500 to-indigo-600',
    gradient: 'bg-gradient-to-r from-blue-500 to-indigo-600',
    status: 'coming-soon',
    features: ['Transaction Builder', 'Coming Soon'],
  },
  {
    id: 'optimism',
    name: 'Optimism',
    description: 'Ethereum L2 with optimistic rollups',
    logo: 'https://cryptologos.cc/logos/optimism-op-logo.png?v=032',
    color: 'from-red-500 to-pink-600',
    gradient: 'bg-gradient-to-r from-red-500 to-pink-600',
    status: 'coming-soon',
    features: ['Transaction Builder', 'Coming Soon'],
  },
  {
    id: 'sui',
    name: 'Sui',
    description: 'Next-gen blockchain with parallel execution',
    logo: 'https://cryptologos.cc/logos/sui-sui-logo.png?v=032',
    color: 'from-cyan-500 to-blue-600',
    gradient: 'bg-gradient-to-r from-cyan-500 to-blue-600',
    status: 'coming-soon',
    features: ['Transaction Builder', 'Coming Soon'],
  },
  {
    id: 'aptos',
    name: 'Aptos',
    description: 'High-throughput Move-based blockchain',
    logo: 'https://cryptologos.cc/logos/aptos-apt-logo.png?v=032',
    color: 'from-green-500 to-emerald-600',
    gradient: 'bg-gradient-to-r from-green-500 to-emerald-600',
    status: 'coming-soon',
    features: ['Transaction Builder', 'Coming Soon'],
  },
];

export function LandingPage({ onGetStarted }: { onGetStarted: (blockchain?: BlockchainType) => void }) {
  // Default to Solana
  const [selectedBlockchain, setSelectedBlockchain] = useState<BlockchainType | null>('solana');
  const [showBlockchainSelector, setShowBlockchainSelector] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [videoLoading, setVideoLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const selectedChainData = selectedBlockchain ? BLOCKCHAINS.find(b => b.id === selectedBlockchain) : null;

  // Preload video immediately when component mounts
  useEffect(() => {
    if (videoRef.current) {
      // Set preload attribute for better loading
      videoRef.current.preload = 'auto';
      // Force video to start loading
      videoRef.current.load();
      // Try to play (will be muted, so should work)
      videoRef.current.play().catch((error) => {
        console.log('Autoplay prevented, but video is preloading:', error);
      });
    }
  }, []);
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 scroll-smooth">
      <style jsx>{`
        body {
          font-family: 'Inter', sans-serif;
        }
        
        ::-webkit-scrollbar {
          width: 12px;
          background-color: #111827;
        }
        
        ::-webkit-scrollbar-thumb {
          background-color: #374151;
          border-radius: 10px;
          border: 2px solid #111827;
        }
      `}</style>

      {/* Background Logo */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{ zIndex: 0 }}
      >
        <img
          src="/sea-level-logo.png"
          alt="Sealevel Studio Background"
          className="absolute inset-0 w-full h-full object-contain opacity-[0.04] filter hue-rotate-[180deg] saturate-50"
          style={{
            objectPosition: 'center',
            transform: 'scale(0.8)',
          }}
          onError={(e) => {
            console.warn('Background logo not found');
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-gray-900/80 backdrop-blur-md border-b border-gray-700/50">
        <nav className="container mx-auto max-w-7xl px-4 sm:px-6 py-3 md:py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Logo */}
            <img
              src="/sea-level-logo.png"
              alt="Sealevel Studio"
              className="h-8 sm:h-10 w-auto"
              style={{ maxHeight: '40px' }}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <span className="text-lg sm:text-xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-500">
              Sealevel Studio
            </span>
          </div>
          <button 
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (onGetStarted) {
                onGetStarted();
              }
            }}
            className="px-4 sm:px-5 py-2 text-xs sm:text-sm font-medium rounded-lg text-white bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 transition-all cursor-pointer"
          >
            Get Started
          </button>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="pt-20 md:pt-24">
        <section className="relative container mx-auto max-w-7xl px-4 sm:px-6 py-12 md:py-20 lg:py-32 text-center" style={{ zIndex: 1 }}>
          <div className="absolute inset-0 max-w-4xl mx-auto h-3/4 -translate-y-1/4 bg-purple-900/40 blur-3xl rounded-full -z-10 pointer-events-none"></div>
          
          {/* Logo - Centered in Hero */}
          <div className="mb-8 md:mb-12 flex justify-center">
            <img
              src="/sea-level-logo.png"
              alt="Sealevel Studio"
              className="h-32 sm:h-40 md:h-56 lg:h-64 w-auto rounded-full bg-gray-800/40 p-4 md:p-6"
              style={{ maxHeight: '256px' }}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold tracking-tighter leading-tight text-transparent bg-clip-text bg-gradient-to-br from-white via-gray-100 to-gray-400 mb-4 md:mb-6 px-4">
            Build Multi-Chain Transactions Like a Pro
          </h1>
          <p className="max-w-3xl mx-auto text-base sm:text-lg md:text-xl text-gray-300 mb-3 md:mb-4 px-4">
            The most powerful developer toolkit for blockchain development. Build, simulate, debug, and execute transactions across multiple chains with AI-powered assistance.
          </p>
          <p className="max-w-3xl mx-auto text-sm sm:text-base md:text-lg text-gray-400 mb-8 md:mb-10 px-4">
            Visual transaction builder • Real-time simulation • Arbitrage scanner • AI agents • Code export • Multi-chain support
          </p>
          
          {/* Blockchain Selector */}
          <div className="mb-8">
            {!showBlockchainSelector ? (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                {selectedBlockchain ? (
                  <div className="flex items-center gap-3 px-6 py-3 bg-gray-800/50 rounded-lg border border-gray-700">
                    <img
                      src={selectedChainData?.logo || ''}
                      alt={selectedChainData ? `${selectedChainData.name} logo` : 'Selected blockchain'}
                      className="h-8 w-8 object-contain rounded"
                    />
                    <span className="font-semibold">{selectedChainData?.name}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBlockchain(null);
                        setShowBlockchainSelector(true);
                      }}
                      className="text-gray-400 hover:text-white ml-2"
                    >
                      ✕
                    </button>
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => setShowBlockchainSelector(true)}
                  className="px-6 py-3 text-sm font-medium rounded-lg text-white bg-gray-800 hover:bg-gray-700 border border-gray-700 transition-all"
                >
                  {selectedBlockchain ? 'Change Blockchain' : 'Choose Blockchain'}
                </button>
              </div>
            ) : (
              <div className="max-w-5xl mx-auto px-4">
                <div className="mb-4 text-center">
                  <h3 className="text-lg sm:text-xl font-semibold mb-2">Select Your Blockchain</h3>
                  <p className="text-xs sm:text-sm text-gray-400">Choose a blockchain to get started</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
                  {BLOCKCHAINS.map((blockchain) => (
                    <button
                      key={blockchain.id}
                      type="button"
                      onClick={() => {
                        setSelectedBlockchain(blockchain.id);
                        setShowBlockchainSelector(false);
                      }}
                      className={`relative p-3 sm:p-4 rounded-xl border-2 transition-all text-left ${
                        selectedBlockchain === blockchain.id
                          ? `border-purple-500 bg-gray-800/80 ${blockchain.gradient} bg-opacity-20`
                          : 'border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800/70'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <img
                          src={blockchain.logo}
                          alt={`${blockchain.name} logo`}
                          className="h-8 w-8 sm:h-10 sm:w-10 object-contain rounded"
                        />
                        {blockchain.status === 'available' && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-green-500/20 text-green-400 rounded-full">
                            Available
                          </span>
                        )}
                        {blockchain.status === 'coming-soon' && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-yellow-500/20 text-yellow-400 rounded-full">
                            Soon
                          </span>
                        )}
                        {blockchain.status === 'beta' && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-blue-500/20 text-blue-400 rounded-full">
                            Beta
                          </span>
                        )}
                      </div>
                      <h4 className="font-semibold text-white mb-1">{blockchain.name}</h4>
                      <p className="text-xs text-gray-400 line-clamp-2">{blockchain.description}</p>
                    </button>
                  ))}
                </div>
                <div className="flex flex-col sm:flex-row justify-center gap-3 px-4">
                  <button
                    type="button"
                    onClick={() => setShowBlockchainSelector(false)}
                    className="px-5 sm:px-6 py-2 text-xs sm:text-sm font-medium rounded-lg text-gray-300 bg-gray-800 hover:bg-gray-700 border border-gray-700 transition-all"
                  >
                    Cancel
                  </button>
                  {selectedBlockchain && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowBlockchainSelector(false);
                        if (onGetStarted) {
                          onGetStarted(selectedBlockchain);
                        }
                      }}
                      className="px-5 sm:px-6 py-2 text-xs sm:text-sm font-medium rounded-lg text-white bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 transition-all"
                    >
                      Continue with {selectedChainData?.name}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="relative z-10 mt-6 md:mt-8">
            <button 
              type="button"
              onClick={() => {
                console.log('Get Started button clicked', { selectedBlockchain, onGetStarted: !!onGetStarted });
                if (onGetStarted) {
                  onGetStarted(selectedBlockchain || undefined);
                } else {
                  console.error('onGetStarted handler is not defined');
                }
              }}
              className={`px-6 sm:px-8 py-2.5 sm:py-3 text-sm sm:text-base font-medium rounded-lg text-white transition-all shadow-lg ${
                selectedChainData
                  ? `${selectedChainData.gradient} hover:opacity-90`
                  : 'bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700'
              } focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 hover:shadow-indigo-500/30 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed enabled:cursor-pointer`}
              disabled={!onGetStarted}
            >
              {selectedChainData
                ? `Get Started on ${selectedChainData.name}`
                : 'Get Started'}
            </button>
          </div>
        </section>

        {/* Video Embed Section */}
        <section className="py-8 md:py-16 bg-gray-900/50">
          <div className="container mx-auto max-w-5xl px-4 sm:px-6">
            <div className="relative w-full rounded-xl overflow-hidden bg-gray-800/50 shadow-2xl" style={{ paddingBottom: '56.25%' }}> {/* 16:9 aspect ratio */}
              {videoError ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 p-4 md:p-8 bg-gray-800/50 rounded-xl">
                  <svg className="w-12 h-12 md:w-16 md:h-16 mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <p className="text-base md:text-lg font-medium mb-2 text-center px-4">Video failed to load</p>
                  <p className="text-xs md:text-sm text-gray-500 mb-4 text-center px-4">The video file appears to be empty or corrupted (0 bytes)</p>
                  <p className="text-xs text-gray-600 text-center px-4 break-words">Please replace <code className="bg-gray-700 px-2 py-1 rounded">/public/gemini_generated_video_EBF488F6.MP4</code> with a valid video file</p>
                </div>
              ) : (
                <>
                  {videoLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-800/50 z-10">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 md:h-12 md:w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
                        <p className="text-gray-400 text-xs md:text-sm">Loading video...</p>
                      </div>
                    </div>
                  )}
                  <video
                    ref={videoRef}
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="auto"
                    controls
                    className="absolute inset-0 w-full h-full object-cover"
                    onError={(e) => {
                      console.error('Video failed to load:', e);
                      const video = e.currentTarget;
                      const error = video.error;
                      if (error) {
                        let errorMessage = 'Unknown error';
                        switch (error.code) {
                          case error.MEDIA_ERR_ABORTED:
                            errorMessage = 'Video loading was aborted';
                            break;
                          case error.MEDIA_ERR_NETWORK:
                            errorMessage = 'Network error while loading video';
                            break;
                          case error.MEDIA_ERR_DECODE:
                            errorMessage = 'Video decoding error (file may be corrupted)';
                            break;
                          case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
                            errorMessage = 'Video format not supported or file not found';
                            break;
                        }
                        console.error('Video error details:', errorMessage, error);
                      }
                      setVideoError(true);
                      setVideoLoading(false);
                    }}
                    onLoadStart={() => {
                      console.log('Video loading started');
                      setVideoLoading(true);
                    }}
                    onLoadedData={() => {
                      console.log('Video data loaded');
                      setVideoLoading(false);
                    }}
                    onCanPlay={() => {
                      console.log('Video can play');
                      setVideoLoading(false);
                    }}
                    onCanPlayThrough={() => {
                      console.log('Video can play through (fully loaded)');
                      setVideoLoading(false);
                    }}
                  >
                    <source src="/gemini_generated_video_EBF488F6.MP4" type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Problem Section */}
        <section className="py-12 md:py-20 bg-gray-950/50">
          <div className="container mx-auto max-w-7xl px-4 sm:px-6">
            <h2 className="text-center text-2xl sm:text-3xl md:text-4xl font-bold tracking-tighter mb-4 px-4">
              Stop Wasting Time on Blockchain Complexity
            </h2>
            <p className="text-center text-base sm:text-lg text-gray-400 mb-12 md:mb-16 max-w-2xl mx-auto px-4">
              Every blockchain developer faces the same challenges: cryptic errors, manual account management, and zero visibility into what your transactions actually do.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
              {/* Problem 1 */}
              <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700/50">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className="w-8 h-8 text-purple-400 mb-4">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
                  <path d="m12 9 1.8 3.24"></path>
                  <path d="m17 21 1.8-3.24"></path>
                  <path d="m7 21-1.8-3.24"></path>
                </svg>
                <h3 className="text-xl font-semibold mb-2">Manual Account Lists</h3>
                <p className="text-gray-400">
                  Guessing which accounts are `mut`, `signer`, or required for a CPI.
                </p>
              </div>
              
              {/* Problem 2 */}
              <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700/50">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className="w-8 h-8 text-purple-400 mb-4">
                  <path d="m18 10-4.5 4.5a.5.5 0 0 1-.71 0L10 11.71a.5.5 0 0 0-.71 0L6 15"></path>
                  <path d="m22 19-5-5"></path>
                  <path d="M2 13h6"></path>
                  <path d="M3 10v4"></path>
                </svg>
                <h3 className="text-xl font-semibold mb-2">Cryptic Error Codes</h3>
                <p className="text-gray-400">
                  Debugging `0x1` or `ConstraintHasOne` by "guess-and-check" for hours.
                </p>
              </div>
              
              {/* Problem 3 */}
              <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700/50">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className="w-8 h-8 text-purple-400 mb-4">
                  <path d="M10 10v.2A3 3 0 0 1 7 13v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-5a3 3 0 0 1-3-2.8V10a3 3 0 0 0-3-3v0a3 3 0 0 0-3 3Zm0 0v-1a3 3 0 0 0-3-3m0 0v-1"></path>
                  <path d="m10 10-2 1.8"></path>
                  <path d="m14 10 2 1.8"></path>
                </svg>
                <h3 className="text-xl font-semibold mb-2">Opaque State Changes</h3>
                <p className="text-gray-400">
                  No simple way to answer "What did my transaction *actually* do?"
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-12 md:py-20 lg:py-32">
          <div className="container mx-auto max-w-7xl px-4 sm:px-6">
            <div className="text-center mb-12 md:mb-16">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tighter mb-4 px-4">
                Everything You Need to Build on Any Blockchain
              </h2>
              <p className="text-center text-base sm:text-lg text-gray-400 max-w-2xl mx-auto px-4">
                From simple transfers to complex DeFi strategies—build, test, and deploy with confidence across multiple chains.
              </p>
            </div>

            {/* Mockup UI */}
            <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl overflow-hidden max-w-5xl mx-auto">
              {/* Toolbar */}
              <div className="h-10 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-3 sm:px-4">
                <div className="flex items-center space-x-2">
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-red-500 rounded-full"></div>
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-yellow-400 rounded-full"></div>
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 rounded-full"></div>
                </div>
                <div className="text-gray-400 text-xs sm:text-sm bg-gray-700 px-2 sm:px-3 py-1 rounded-md font-mono tracking-tight truncate max-w-[200px] sm:max-w-none">
                  Simulation: `spl_token::transfer`
                </div>
                <div className="w-8 sm:w-16"></div>
              </div>

              {/* Diff View */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-gray-700">
                {/* Before */}
                <div className="bg-gray-800 p-4 sm:p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-base sm:text-lg font-semibold text-gray-200">Before Simulation</h4>
                    <span className="text-xs font-medium bg-gray-700 text-gray-300 px-2 sm:px-3 py-1 rounded-full">STATE</span>
                  </div>
                  <div className="bg-gray-900 rounded-lg p-3 sm:p-4 font-mono text-xs sm:text-sm overflow-x-auto">
                    <p className="text-gray-400">// TokenAccount: `Alice.ATA`</p>
                    <pre className="text-gray-200">{"{\n  \"mint\": \"EPj...Nwg\",\n  \"owner\": \"ALi...c3p\",\n  \"amount\": \"100000000\"\n}"}</pre>
                    <p className="text-gray-400 mt-4">// TokenAccount: `Bob.ATA`</p>
                    <pre className="text-gray-200">{"{\n  \"mint\": \"EPj...Nwg\",\n  \"owner\": \"Bob...b3A\",\n  \"amount\": \"0\"\n}"}</pre>
                  </div>
                </div>

                {/* After */}
                <div className="bg-gray-800 p-4 sm:p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-base sm:text-lg font-semibold text-green-400">After Simulation</h4>
                    <span className="text-xs font-medium bg-green-900 text-green-300 px-2 sm:px-3 py-1 rounded-full">SUCCESS</span>
                  </div>
                  <div className="bg-gray-900 rounded-lg p-3 sm:p-4 font-mono text-xs sm:text-sm overflow-x-auto">
                    <p className="text-gray-400">// TokenAccount: `Alice.ATA`</p>
                    <pre className="text-gray-200">{"{\n  \"mint\": \"EPj...Nwg\",\n  \"owner\": \"ALi...c3p\",\n  \"amount\": \"75000000\"\n}"}</pre>
                    <p className="text-gray-400 mt-4">// TokenAccount: `Bob.ATA`</p>
                    <pre className="text-gray-200">{"{\n  \"mint\": \"EPj...Nwg\",\n  \"owner\": \"Bob...b3A\",\n  \"amount\": \"25000000\"\n}"}</pre>
                  </div>
                </div>
              </div>

              {/* Logs */}
              <div className="bg-gray-800 border-t border-gray-700 p-3 sm:p-4 font-mono text-xs overflow-x-auto">
                <p className="text-gray-400 mb-2">&gt; Logs (CU: 1,450)</p>
                <p className="text-gray-300">&gt; Program `Tokenkeg...1111` invoke [1]</p>
                <p className="text-gray-300">&gt; Program log: Instruction: Transfer</p>
                <p className="text-gray-300">&gt; Program `Tokenkeg...1111` consumed 1450 of 200000 compute units</p>
                <p className="text-green-400">&gt; Program `Tokenkeg...1111` success</p>
              </div>
            </div>

            {/* Feature Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 mt-12 md:mt-20 max-w-6xl mx-auto px-4">
              <div className="text-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className="w-10 h-10 mx-auto mb-4 text-purple-400">
                  <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                  <polyline points="2 17 12 22 22 17"></polyline>
                  <polyline points="2 12 12 17 22 12"></polyline>
                </svg>
                <h3 className="text-xl font-semibold mb-2">Assemble</h3>
                <p className="text-gray-400">Visually build transactions and CPIs with IDL-aware validation.</p>
              </div>
              
              <div className="text-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className="w-10 h-10 mx-auto mb-4 text-purple-400">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polygon points="10 8 16 12 10 16 10 8"></polygon>
                </svg>
                <h3 className="text-xl font-semibold mb-2">Simulate</h3>
                <p className="text-gray-400">Get an instant "before & after" state diff to see *exactly* what changed.</p>
              </div>
              
              <div className="text-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className="w-10 h-10 mx-auto mb-4 text-purple-400">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72"></path>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                </svg>
                <h3 className="text-xl font-semibold mb-2">Debug</h3>
                <p className="text-gray-400">Read human-friendly console logs and monitor compute unit usage.</p>
              </div>
              
              <div className="text-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className="w-10 h-10 mx-auto mb-4 text-purple-400">
                  <polyline points="16 18 22 12 16 6"></polyline>
                  <polyline points="8 6 2 12 8 18"></polyline>
                </svg>
                <h3 className="text-xl font-semibold mb-2">Export</h3>
                <p className="text-gray-400">Generate copy-paste client code (TS/JS, Rust) in one click.</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section id="contact" className="py-12 md:py-20 lg:py-32 bg-gray-950/50">
          <div className="container mx-auto max-w-4xl px-4 sm:px-6 text-center">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tighter mb-4 px-4">
              Ready to Build Faster?
            </h2>
            <p className="text-base sm:text-lg text-gray-400 mb-8 md:mb-10 max-w-2xl mx-auto px-4">
              Join developers who are shipping blockchain applications faster with AI-powered tools and real-time simulation across multiple chains.
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onGetStarted) {
                  onGetStarted();
                }
              }}
              className="px-6 sm:px-8 py-3 text-sm sm:text-base font-medium rounded-lg text-white bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 transition-all shadow-lg hover:shadow-indigo-500/30 cursor-pointer"
            >
              Start Building Free
            </button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-700/50">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 py-6 md:py-8">
          {/* Logo Video - Bottom of Landing Page */}
          <div className="mb-6 md:mb-8 flex justify-center">
            <video
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              className="h-24 sm:h-32 md:h-40 lg:h-48 w-auto opacity-80"
              style={{ maxHeight: '192px' }}
              onError={(e) => {
                console.error('Video failed to load:', e);
                e.currentTarget.style.display = 'none';
              }}
            >
              <source src="/logo-video.mp4" type="video/mp4" />
              <source src="/logo-video.webm" type="video/webm" />
            </video>
          </div>
          
          <div className="flex flex-col items-center gap-4 mb-4">
            <div className="flex items-center gap-4">
              <a
                href="https://discord.gg/8a7FrYCEEc"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-gray-400 hover:text-indigo-400 transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
                <span className="text-sm font-medium">Join Discord</span>
              </a>
            </div>
            <div className="text-center text-gray-500 text-sm">
              <p>&copy; 2025 Sealevel Studio. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}