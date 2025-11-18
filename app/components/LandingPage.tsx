import React from 'react';

export function LandingPage({ onGetStarted }: { onGetStarted: () => void }) {
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
      
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-gray-900/80 backdrop-blur-md border-b border-gray-700/50">
        <nav className="container mx-auto max-w-7xl px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            {/* Logo Video */}
            <video
              autoPlay
              loop
              muted
              playsInline
              className="h-10 w-auto"
              style={{ maxHeight: '40px' }}
              onError={(e) => {
                // Hide video if it fails to load, show fallback
                e.currentTarget.style.display = 'none';
              }}
            >
              <source src="/logo-video.mp4" type="video/mp4" />
              <source src="/logo-video.webm" type="video/webm" />
              {/* Fallback text if video doesn't load */}
            </video>
            <span className="text-xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-500">
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
            className="px-5 py-2 text-sm font-medium rounded-lg text-white bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 transition-all cursor-pointer"
          >
            Get Started
          </button>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="pt-24">
        <section className="relative container mx-auto max-w-7xl px-6 py-20 md:py-32 text-center">
          <div className="absolute inset-0 max-w-4xl mx-auto h-3/4 -translate-y-1/4 bg-purple-900/40 blur-3xl rounded-full -z-10"></div>
          
          {/* Logo Video - Centered in Hero */}
          <div className="mb-12 flex justify-center">
            <video
              autoPlay
              loop
              muted
              playsInline
              className="h-40 md:h-56 lg:h-64 w-auto"
              style={{ maxHeight: '256px' }}
              onError={(e) => {
                // Hide video if it fails to load
                e.currentTarget.style.display = 'none';
              }}
            >
              <source src="/logo-video.mp4" type="video/mp4" />
              <source src="/logo-video.webm" type="video/webm" />
            </video>
          </div>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tighter leading-tight text-transparent bg-clip-text bg-gradient-to-br from-white via-gray-100 to-gray-400 mb-6">
            Build Solana Transactions Like a Pro
          </h1>
          <p className="max-w-3xl mx-auto text-lg md:text-xl text-gray-300 mb-4">
            The most powerful developer toolkit for Solana. Build, simulate, debug, and execute transactions with AI-powered assistance—no more guessing, no more errors.
          </p>
          <p className="max-w-3xl mx-auto text-base md:text-lg text-gray-400 mb-10">
            Visual transaction builder • Real-time simulation • Arbitrage scanner • AI agents • Code export
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
            className="px-8 py-3 text-base font-medium rounded-lg text-white bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 transition-all shadow-lg hover:shadow-indigo-500/30 cursor-pointer"
          >
            Get Started
          </button>
        </section>

        {/* Problem Section */}
        <section className="py-20 bg-gray-950/50">
          <div className="container mx-auto max-w-7xl px-6">
            <h2 className="text-center text-3xl md:text-4xl font-bold tracking-tighter mb-4">
              Stop Wasting Time on Solana's Hidden Complexity
            </h2>
            <p className="text-center text-lg text-gray-400 mb-16 max-w-2xl mx-auto">
              Every Solana developer faces the same challenges: cryptic errors, manual account management, and zero visibility into what your transactions actually do.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
        <section className="py-20 md:py-32">
          <div className="container mx-auto max-w-7xl px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tighter mb-4">
                Everything You Need to Build on Solana
              </h2>
              <p className="text-center text-lg text-gray-400 max-w-2xl mx-auto">
                From simple transfers to complex DeFi strategies—build, test, and deploy with confidence.
              </p>
            </div>

            {/* Mockup UI */}
            <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl overflow-hidden max-w-5xl mx-auto">
              {/* Toolbar */}
              <div className="h-10 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                </div>
                <div className="text-gray-400 text-sm bg-gray-700 px-3 py-1 rounded-md hidden sm:block font-mono tracking-tight">
                  Simulation: `spl_token::transfer`
                </div>
                <div className="w-16"></div>
              </div>

              {/* Diff View */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-gray-700">
                {/* Before */}
                <div className="bg-gray-800 p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-lg font-semibold text-gray-200">Before Simulation</h4>
                    <span className="text-xs font-medium bg-gray-700 text-gray-300 px-3 py-1 rounded-full">STATE</span>
                  </div>
                  <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm overflow-x-auto">
                    <p className="text-gray-400">// TokenAccount: `Alice.ATA`</p>
                    <pre className="text-gray-200">{"{\n  \"mint\": \"EPj...Nwg\",\n  \"owner\": \"ALi...c3p\",\n  \"amount\": \"100000000\"\n}"}</pre>
                    <p className="text-gray-400 mt-4">// TokenAccount: `Bob.ATA`</p>
                    <pre className="text-gray-200">{"{\n  \"mint\": \"EPj...Nwg\",\n  \"owner\": \"Bob...b3A\",\n  \"amount\": \"0\"\n}"}</pre>
                  </div>
                </div>

                {/* After */}
                <div className="bg-gray-800 p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-lg font-semibold text-green-400">After Simulation</h4>
                    <span className="text-xs font-medium bg-green-900 text-green-300 px-3 py-1 rounded-full">SUCCESS</span>
                  </div>
                  <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm overflow-x-auto">
                    <p className="text-gray-400">// TokenAccount: `Alice.ATA`</p>
                    <pre className="text-gray-200">{"{\n  \"mint\": \"EPj...Nwg\",\n  \"owner\": \"ALi...c3p\",\n  \"amount\": \"75000000\"\n}"}</pre>
                    <p className="text-gray-400 mt-4">// TokenAccount: `Bob.ATA`</p>
                    <pre className="text-gray-200">{"{\n  \"mint\": \"EPj...Nwg\",\n  \"owner\": \"Bob...b3A\",\n  \"amount\": \"25000000\"\n}"}</pre>
                  </div>
                </div>
              </div>

              {/* Logs */}
              <div className="bg-gray-800 border-t border-gray-700 p-4 font-mono text-xs">
                <p className="text-gray-400 mb-2">&gt; Logs (CU: 1,450)</p>
                <p className="text-gray-300">&gt; Program `Tokenkeg...1111` invoke [1]</p>
                <p className="text-gray-300">&gt; Program log: Instruction: Transfer</p>
                <p className="text-gray-300">&gt; Program `Tokenkeg...1111` consumed 1450 of 200000 compute units</p>
                <p className="text-green-400">&gt; Program `Tokenkeg...1111` success</p>
              </div>
            </div>

            {/* Feature Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mt-20 max-w-6xl mx-auto">
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
        <section id="contact" className="py-20 md:py-32 bg-gray-950/50">
          <div className="container mx-auto max-w-4xl px-6 text-center">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tighter mb-4">
              Ready to Build Faster?
            </h2>
            <p className="text-lg text-gray-400 mb-10 max-w-2xl mx-auto">
              Join developers who are shipping Solana applications faster with AI-powered tools and real-time simulation.
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
              className="px-8 py-3 text-base font-medium rounded-lg text-white bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 transition-all shadow-lg hover:shadow-indigo-500/30 cursor-pointer"
            >
              Start Building Free
            </button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-700/50">
        <div className="container mx-auto max-w-7xl px-6 py-8">
          <div className="text-center text-gray-500 mb-4">
            <p>&copy; 2025 Sealevel Studio. All rights reserved.</p>
          </div>
          
          {/* Disclaimer */}
          <div className="max-w-4xl mx-auto mt-6 p-4 bg-gray-800/50 border border-gray-700/50 rounded-lg">
            <p className="text-xs text-gray-400 leading-relaxed">
              <strong className="text-gray-300">Disclaimer:</strong> Sealevel Studio provides developer tools and educational resources for building on the Solana blockchain. 
              By using this platform, you acknowledge that:
            </p>
            <ul className="text-xs text-gray-400 mt-2 space-y-1 list-disc list-inside ml-2">
              <li>All transactions and operations are executed at your own risk</li>
              <li>We are not liable for any financial losses, damages, or consequences resulting from the use of these tools</li>
              <li>You are solely responsible for verifying transaction details, security practices, and compliance with applicable laws</li>
              <li>These tools are provided "as-is" without warranties of any kind</li>
              <li>Cryptocurrency transactions are irreversible—always test thoroughly before executing on mainnet</li>
            </ul>
            <p className="text-xs text-gray-500 mt-3 italic">
              Use these tools responsibly. Always review and understand transactions before signing. 
              We recommend testing on devnet/testnet first.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}