'use client';

import { useEffect, useState, useCallback } from 'react';

interface RiskConsentState {
  hasConsent: boolean;
  initialized: boolean;
  accept: () => void;
  reset: () => void;
}

/**
 * Centralized helper hook to persist per-feature risk acknowledgements.
 * Stores acceptance in localStorage so users only need to agree once per device.
 */
export function useRiskConsent(featureKey: string): RiskConsentState {
  const storageKey = `sealevel-risk-${featureKey}`;
  const [hasConsent, setHasConsent] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const stored = window.localStorage.getItem(storageKey);
    setHasConsent(stored === 'true');
    setInitialized(true);
  }, [storageKey]);

  const accept = useCallback(() => {
    setHasConsent(true);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(storageKey, 'true');
    }
  }, [storageKey]);

  const reset = useCallback(() => {
    setHasConsent(false);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  return { hasConsent, initialized, accept, reset };
}

