/**
 * Single source of truth for "which wallet is signing?"
 * Phantom (user-held) vs studio (server-custodied) must never silently swap.
 */

import type {
  Connection,
  PublicKey,
  SendOptions,
  Signer,
  Transaction,
  VersionedTransaction,
} from '@solana/web3.js';

export type WalletSource = 'phantom' | 'studio';

export type SigningSendOptions = SendOptions & {
  signers?: Signer[];
};

/**
 * Minimal signer surface shared by Phantom's adapter and useActiveWallet().
 * Executors must take this — never WalletContextState — so studio can sign
 * legacy txs and Phantom remains required for versioned/atomic ones.
 */
export type SigningWallet = {
  publicKey: PublicKey | null;
  signTransaction?: <T extends Transaction | VersionedTransaction>(tx: T) => Promise<T>;
  signAllTransactions?: <T extends Transaction | VersionedTransaction>(txs: T[]) => Promise<T[]>;
  sendTransaction?: (
    transaction: Transaction | VersionedTransaction,
    connection: Connection,
    options?: SigningSendOptions
  ) => Promise<string>;
  canSignVersioned?: boolean;
  hotWalletSafe?: boolean;
  source?: WalletSource | null;
};

export function requireSigningWallet(
  wallet: SigningWallet,
  opts?: { versioned?: boolean }
): string | null {
  if (!wallet.publicKey || (!wallet.sendTransaction && !wallet.signTransaction)) {
    return 'No wallet connected. Use the header to pick Phantom or a studio wallet.';
  }
  if (opts?.versioned && wallet.canSignVersioned === false) {
    return 'This transaction is versioned/atomic. Switch to Phantom in the header.';
  }
  return null;
}

export type ActiveSignerState = {
  source: WalletSource | null;
  address: string | null;
  label: string;
  shortLabel: string;
  canSignVersioned: boolean;
  /** True when the active signer is an extension wallet (safe for live / arb). */
  hotWalletSafe: boolean;
  connected: boolean;
  phantom: string | null;
  studio: string | null;
};

export const ACTIVE_SOURCE_KEY = 'sealevel-active-signer';

export function shortAddr(addr: string, left = 4, right = 4): string {
  if (addr.length <= left + right + 1) return addr;
  return `${addr.slice(0, left)}…${addr.slice(-right)}`;
}

export function resolveActiveSigner(opts: {
  phantom?: string | null;
  studio?: string | null;
  preferred?: WalletSource | null;
}): ActiveSignerState {
  const phantom = opts.phantom || null;
  const studio = opts.studio || null;

  let source: WalletSource | null = null;
  if (opts.preferred === 'phantom' && phantom) source = 'phantom';
  else if (opts.preferred === 'studio' && studio) source = 'studio';
  else if (phantom) source = 'phantom';
  else if (studio) source = 'studio';

  const address = source === 'phantom' ? phantom : source === 'studio' ? studio : null;

  const label =
    source === 'phantom' && address
      ? `Phantom ${shortAddr(address)}`
      : source === 'studio' && address
        ? `Studio ${shortAddr(address)}`
        : 'Not connected';

  return {
    source,
    address,
    label,
    shortLabel: address ? shortAddr(address) : '—',
    canSignVersioned: source === 'phantom',
    hotWalletSafe: source === 'phantom',
    connected: Boolean(source && address),
    phantom,
    studio,
  };
}

/**
 * True when the active signer is the hosted studio wallet.
 * Phantom wins by default when both exist (needed for versioned / atomic txs).
 */
export function shouldUseCustodialWallet(
  studioAddress?: string | null,
  phantomAddress?: string | null,
  preferred?: WalletSource | null
): boolean {
  return (
    resolveActiveSigner({
      phantom: phantomAddress,
      studio: studioAddress,
      preferred,
    }).source === 'studio'
  );
}
