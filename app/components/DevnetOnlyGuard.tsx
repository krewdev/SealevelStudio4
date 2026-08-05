'use client';

import React, { useState } from 'react';
import { useNetwork } from '../contexts/NetworkContext';
import { AlertTriangle, X } from 'lucide-react';

export function DevnetOnlyGuard({ children }: { children: React.ReactNode }) {
  const { network } = useNetwork();
  const [dismissed, setDismissed] = useState(false);

  return (
    <>
      {network === 'mainnet' && !dismissed && (
        <div className="fixed top-0 left-0 right-0 z-[10040] bg-amber-950/95 border-b border-amber-700/60 text-amber-100 text-xs sm:text-sm px-3 py-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="truncate">
              Mainnet is live — swaps use real funds. Simulate first. Scanner PnL is heuristic until Jupiter verifies.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="p-1 rounded hover:bg-amber-900/80"
            aria-label="Dismiss mainnet warning"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {children}
    </>
  );
}
