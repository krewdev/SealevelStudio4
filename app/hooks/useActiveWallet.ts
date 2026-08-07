'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Connection,
  Keypair,
  PublicKey,
  Signer,
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

export type SendWithActiveOptions = {
  signers?: Signer[];
  skipPreflight?: boolean;
  maxRetries?: number;
};

function isVersionedTx(tx: Transaction | VersionedTransaction): tx is VersionedTransaction {
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
      additionalSigners: Signer[] = [],
      options?: SendWithActiveOptions
    ): Promise<string> => {
      if (!signer.source || !signer.address) {
        throw new Error('No wallet connected. Use the header to pick Phantom or a studio wallet.');
      }

      const extra = [...(options?.signers ?? []), ...additionalSigners];

      if (signer.source === 'phantom') {
        if (!adapter.sendTransaction || !adapter.publicKey) {
          throw new Error('Phantom/Solflare is not connected');
        }
        const toSend = tx;
        if (extra.length) {
          if (toSend instanceof VersionedTransaction) toSend.sign(extra);
          else if (toSend instanceof Transaction) toSend.partialSign(...extra);
        }
        return adapter.sendTransaction(toSend, connection, {
          skipPreflight: options?.skipPreflight,
          maxRetries: options?.maxRetries,
        });
      }

      if (isVersionedTx(tx)) {
        throw new Error(
          'Studio wallet cannot sign versioned/atomic transactions. Switch to Phantom in the header.'
        );
      }

      const signed = await signTransactionWithCustodialAndSigners(tx, extra as Keypair[], {
        userWalletAddress: signer.address,
        connection,
      });
      const serialized =
        signed instanceof VersionedTransaction
          ? signed.serialize()
          : signed.serialize({ requireAllSignatures: false });
      return connection.sendRawTransaction(serialized, {
        skipPreflight: options?.skipPreflight ?? false,
        maxRetries: options?.maxRetries ?? 3,
      });
    },
    [signer, adapter]
  );

  const sendTransaction = useCallback(
    (
      tx: Transaction | VersionedTransaction,
      connection: Connection,
      options?: SendWithActiveOptions
    ) => sendWithActive(tx, connection, options?.signers ?? [], options),
    [sendWithActive]
  );

  const signTransaction = useCallback(
    async <T extends Transaction | VersionedTransaction>(tx: T): Promise<T> => {
      if (!signer.source || !signer.address) {
        throw new Error('No wallet connected');
      }

      if (signer.source === 'phantom') {
        if (!adapter.signTransaction) {
          throw new Error('Phantom/Solflare cannot sign this transaction');
        }
        return adapter.signTransaction(tx);
      }

      if (isVersionedTx(tx)) {
        throw new Error(
          'Studio wallet cannot sign versioned/atomic transactions. Switch to Phantom in the header.'
        );
      }

      const signed = await signTransactionWithCustodialAndSigners(tx, [], {
        userWalletAddress: signer.address,
      });
      return signed as T;
    },
    [signer, adapter]
  );

  const signAllTransactions = useCallback(
    async <T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> => {
      const out: T[] = [];
      for (const tx of txs) out.push(await signTransaction(tx));
      return out;
    },
    [signTransaction]
  );

  return {
    ...signer,
    /** Active payer — alias so tools can drop-in replace useWallet(). */
    publicKey: payerPublicKey,
    payerPublicKey,
    sendTransaction,
    signTransaction,
    signAllTransactions,
    sendWithActive,
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
    disconnect: async () => {
      if (signer.source === 'studio') {
        logout();
        setPreferred(phantom ? 'phantom' : null);
        return;
      }
      await adapter.disconnect();
      setPreferred(studio ? 'studio' : null);
    },
  };
}
