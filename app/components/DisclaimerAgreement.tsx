'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, X } from 'lucide-react';

interface DisclaimerAgreementProps {
  onAgree: () => void;
}

export function DisclaimerAgreement({ onAgree }: DisclaimerAgreementProps) {
  const [hasScrolled, setHasScrolled] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    // Check if scrolled to bottom (with 20px tolerance)
    const scrolled = target.scrollHeight - target.scrollTop <= target.clientHeight + 20;
    if (scrolled) {
      setHasScrolled(true);
    }
  };

  // Auto-detect if content is already fully visible (no scrolling needed)
  React.useEffect(() => {
    const scrollContainer = document.querySelector('.disclaimer-scroll-container') as HTMLElement;
    if (scrollContainer) {
      // Check if content fits without scrolling
      if (scrollContainer.scrollHeight <= scrollContainer.clientHeight) {
        setHasScrolled(true);
      }
    }
  }, []);

  const handleAgree = () => {
    if (hasScrolled && agreed) {
      // Store agreement in localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('sealevel-disclaimer-agreed', 'true');
        localStorage.setItem('sealevel-disclaimer-agreed-date', new Date().toISOString());
      }
      onAgree();
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/95 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-yellow-500" size={24} />
            <h2 className="text-2xl font-bold text-white">Important Disclaimer</h2>
          </div>
        </div>

        {/* Scrollable Content */}
        <div
          className="disclaimer-scroll-container flex-1 overflow-y-auto p-6 space-y-4 text-gray-300"
          onScroll={handleScroll}
        >
          <p className="text-lg font-semibold text-white mb-4">
            Please read and understand the following disclaimer before using Sealevel Studio.
          </p>

          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">1. Risk Acknowledgment</h3>
              <p className="text-gray-400">
                All transactions and operations executed through Sealevel Studio are done at your own risk. 
                You are solely responsible for verifying transaction details, security practices, and compliance 
                with applicable laws before executing any transaction.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-2">2. No Liability</h3>
              <p className="text-gray-400">
                Sealevel Studio and its developers are not liable for any financial losses, damages, or 
                consequences resulting from the use of these tools. We provide developer tools and educational 
                resources "as-is" without warranties of any kind.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-2">3. Irreversible Transactions</h3>
              <p className="text-gray-400">
                Cryptocurrency transactions are irreversible. Always test thoroughly on devnet/testnet 
                before executing transactions on mainnet. Double-check all addresses, amounts, and transaction 
                parameters before signing.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-2">4. Security Responsibility</h3>
              <p className="text-gray-400">
                You are responsible for maintaining the security of your private keys, wallet credentials, 
                and API keys. Never share your private keys or seed phrases with anyone. Sealevel Studio 
                does not store or have access to your private keys.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-2">5. Educational Purpose</h3>
              <p className="text-gray-400">
                These tools are provided for educational and development purposes. Use them responsibly 
                and in accordance with all applicable laws and regulations in your jurisdiction.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-2">6. No Financial Advice</h3>
              <p className="text-gray-400">
                Sealevel Studio does not provide financial, investment, or trading advice. Any information 
                or analysis provided by these tools should not be construed as financial advice.
              </p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-lg">
            <p className="text-yellow-300 font-semibold">
              ⚠️ By proceeding, you acknowledge that you have read, understood, and agree to all terms 
              and conditions stated above.
            </p>
          </div>
        </div>

        {/* Footer with Agreement Checkbox and Button */}
        <div className="p-6 border-t border-gray-700 bg-gray-800/50">
          <div className="flex items-center gap-3 mb-4">
            <input
              type="checkbox"
              id="disclaimer-agree"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-purple-500 focus:ring-2"
            />
            <label
              htmlFor="disclaimer-agree"
              className="text-gray-300 cursor-pointer flex items-center gap-2"
            >
              <span>I have read and agree to the disclaimer</span>
              {!hasScrolled && (
                <span className="text-xs text-yellow-500">(Please scroll to read all terms)</span>
              )}
            </label>
          </div>
          <button
            onClick={handleAgree}
            disabled={!hasScrolled || !agreed}
            className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-semibold transition-all flex items-center justify-center gap-2"
          >
            {hasScrolled && agreed ? (
              <>
                <CheckCircle size={20} />
                I Agree - Continue to Sealevel Studio
              </>
            ) : (
              <>
                <X size={20} />
                Please read and agree to continue
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

