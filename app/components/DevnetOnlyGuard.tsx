/**
 * Devnet Only Guard
 * Blocks access if user tries to use mainnet
 */

'use client';

import React, { useEffect } from 'react';
import { useNetwork } from '../contexts/NetworkContext';
import { AlertTriangle, X } from 'lucide-react';

export function DevnetOnlyGuard({ children }: { children: React.ReactNode }) {
  const { network } = useNetwork();

  // If somehow mainnet is selected, show warning and force devnet
  if (network === 'mainnet') {
    return (
      <div className="fixed inset-0 bg-gray-900 z-[9999] flex items-center justify-center p-4">
        <div className="bg-red-900/20 border-2 border-red-500 rounded-2xl p-8 max-w-md w-full">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-8 h-8 text-red-400" />
            <h2 className="text-2xl font-bold text-white">Mainnet Access Disabled</h2>
          </div>
          <p className="text-gray-300 mb-6">
            This site is currently only available on <strong className="text-green-400">Devnet</strong> for testing purposes.
            Mainnet access has been disabled to prevent accidental transactions with real funds.
          </p>
          <button
            onClick={() => {
              localStorage.setItem('sealevel-network', 'devnet');
              window.location.reload();
            }}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Switch to Devnet
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

