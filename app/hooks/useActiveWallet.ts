'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  VersionedTransaction,
} from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import { useUser } from '../contexts/UserContext';
import {
  ACTIVE_SOURCE_KEY,
  resolveActiveSigner,
  type WalletSource,
} from '../lib/wallet/active-signer';
import { signTransactionWithCustodialAndSigners } from '../lib/wallet-recovery/custodial-signer';

function isVersionedTx(tx: Transaction | VersionedTransaction): boolean {
  return (
    tx instanceof VersionedTransaction ||
    (typeof tx === 'object' && tx !== null && 'message' in tx && !('instructions' in tx))
  );
}

export function useActiveWallet() {
  const adapter = useWallet();
  const { user, createWallet, logout, isLoading } = useUser();
  const [preferred, setPreferredState] = useState<WalletSource | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ACTIVE_SOURCE_KEY);
      if (raw === 'phantom' || raw === 'studio') setPreferredState(raw);
    } catch {
      /* ignore */
    }
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<WalletSource | null>).detail;
      if (detail === 'phantom' || detail === 'studio' || detail === null) {
        setPreferredState(detail);
      } else {
        try {
          const raw = localStorage.getItem(ACTIVE_SOURCE_KEY);
          setPreferredState(raw === 'phantom' || raw === 'studio' ? raw : null);
        } catch {
          /* ignore */
        }
      }
    };
    window.addEventListener('sealevel-active-signer', onChange as EventListener);
    return () => window.removeEventListener('sealevel-active-signer', onChange as EventListener);
  }, []);

  const phantom = adapter.publicKey?.toBase58() ?? null;
  const studio = user?.walletAddress ?? null;

  const signer = useMemo(
    () => resolveActiveSigner({ phantom, studio, preferred }),
    [phantom, studio, preferred]
  );

  const setPreferred = useCallback((source: WalletSource | null) => {
    setPreferredState(source);
    try {
      if (source) localStorage.setItem(ACTIVE_SOURCE_KEY, source);
      else localStorage.removeItem(ACTIVE_SOURCE_KEY);
      window.dispatchEvent(new CustomEvent('sealevel-active-signer', { detail: source }));
    } catch {
      /* ignore */
    }
  }, []);

  const payerPublicKey = useMemo(() => {
    if (!signer.address) return null;
    try {
      return new PublicKey(signer.address);
    } catch {
      return null;
    }
  }, [signer.address]);

  const sendWithActive = useCallback(
    async (
      tx: Transaction | VersionedTransaction,
      connection: Connection,
      additionalSigners: Keypair[] = []
    ): Promise<string> => {
      if (!signer.source || !signer.address) {
        throw new Error('No wallet connected');
      }

      if (signer.source === 'phantom') {
        if (!adapter.sendTransaction || !adapter.publicKey) {
          throw new Error('Phantom/Solflare is not connected');
        }
        const toSend = tx;
        if (additionalSigners.length) {
          if (toSend instanceof VersionedTransaction) toSend.sign(additionalSigners);
          else if (toSend instanceof Transaction) toSend.partialSign(...additionalSigners);
        }
        return adapter.sendTransaction(toSend, connection);
      }

      if (isVersionedTx(tx)) {
        throw new Error(
          'Studio wallet cannot sign versioned/atomic transactions. Switch to Phantom in the header.'
        );
      }

      const signed = await signTransactionWithCustodialAndSigners(tx, additionalSigners, {
        userWalletAddress: signer.address,
        connection,
      });
      const serialized =
        signed instanceof VersionedTransaction
          ? signed.serialize()
          : signed.serialize({ requireAllSignatures: false });
      return connection.sendRawTransaction(serialized, {
        skipPreflight: false,
        maxRetries: 3,
      });
    },
    [signer, adapter]
  );

  return {
    ...signer,
    payerPublicKey,
    phantomConnected: Boolean(phantom),
    studioConnected: Boolean(studio),
    connecting: adapter.connecting || isLoading,
    adapter,
    user,
    preferred,
    setPreferred,
    createStudioWallet: createWallet,
    logoutStudio: logout,
    disconnectPhantom: adapter.disconnect,
    sendWithActive,
  };
}
