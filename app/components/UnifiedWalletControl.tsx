'use client';

import React, { useState } from 'react';
import { Loader2, LogOut, ShieldAlert, Wallet, Sparkles, ChevronDown, Check } from 'lucide-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useActiveWallet } from '../hooks/useActiveWallet';
import type { WalletSource } from '../lib/wallet/active-signer';

export function UnifiedWalletControl() {
  const w = useActiveWallet();
  const { setVisible } = useWalletModal();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const connectPhantom = () => {
    setVisible(true);
    setOpen(false);
  };

  const createStudio = async () => {
    if (creating) return;
    setCreating(true);
    try {
      await w.createStudioWallet();
      w.setPreferred('studio');
      setOpen(false);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to create studio wallet');
    } finally {
      setCreating(false);
    }
  };

  const pick = (source: WalletSource) => {
    w.setPreferred(source);
    setOpen(false);
  };

  if (!w.connected) {
    return (
      <div className="flex items-center gap-1.5" data-sealevel-target="connect-wallet">
        <button
          type="button"
          onClick={connectPhantom}
          data-sealevel-target="wallet-connect-phantom"
          disabled={w.connecting}
          className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium text-white hover:from-purple-500 hover:to-indigo-500 disabled:opacity-60"
        >
          {w.connecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wallet className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">Connect Phantom</span>
          <span className="sm:hidden">Connect</span>
        </button>
        <button
          type="button"
          onClick={() => void createStudio()}
          data-sealevel-target="wallet-create-studio"
          disabled={creating}
          className="hidden sm:inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-zinc-300 hover:bg-white/10 disabled:opacity-60"
          title="Hosted demo key — not for live trading size"
        >
          {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          Studio
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        data-sealevel-target="active-wallet"
        className={`inline-flex items-center gap-1.5 rounded-lg border px-2 sm:px-2.5 py-1.5 text-xs sm:text-sm font-medium transition-colors ${
          w.source === 'studio'
            ? 'border-amber-500/40 bg-amber-950/40 text-amber-100'
            : 'border-emerald-500/40 bg-emerald-950/30 text-emerald-100'
        }`}
        title={
          w.source === 'studio'
            ? 'Signing with hosted studio wallet. Switch to Phantom for live / atomic txs.'
            : 'Signing with Phantom / Solflare'
        }
      >
        <Wallet className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{w.source === 'phantom' ? 'Phantom' : 'Studio'}</span>
        <span className="font-mono">{w.shortLabel}</span>
        {w.source === 'studio' && <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />}
        <ChevronDown className={`h-3.5 w-3.5 opacity-70 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-white/10 bg-gray-900/95 shadow-2xl backdrop-blur-xl">
            <div className="border-b border-white/10 px-3 py-2 text-[11px] uppercase tracking-wide text-zinc-500">
              Active signer — one wallet at a time
            </div>

            {w.phantomConnected && w.phantom && (
              <button
                type="button"
                onClick={() => pick('phantom')}
                data-sealevel-target="wallet-use-phantom"
                className={`flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm hover:bg-white/5 ${
                  w.source === 'phantom' ? 'bg-emerald-950/40' : ''
                }`}
              >
                <div className="mt-0.5 w-4">{w.source === 'phantom' && <Check className="h-4 w-4 text-emerald-400" />}</div>
                <div>
                  <div className="font-medium text-white">Phantom / Solflare</div>
                  <div className="font-mono text-xs text-zinc-400">{w.phantom}</div>
                  <div className="mt-0.5 text-[11px] text-emerald-300">Live MM, sniper, atomic arb</div>
                </div>
              </button>
            )}

            {w.studioConnected && w.studio && (
              <button
                type="button"
                onClick={() => pick('studio')}
                data-sealevel-target="wallet-use-studio"
                className={`flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm hover:bg-white/5 ${
                  w.source === 'studio' ? 'bg-amber-950/30' : ''
                }`}
              >
                <div className="mt-0.5 w-4">{w.source === 'studio' && <Check className="h-4 w-4 text-amber-400" />}</div>
                <div>
                  <div className="font-medium text-white">Studio (hosted)</div>
                  <div className="font-mono text-xs text-zinc-400">{w.studio}</div>
                  <div className="mt-0.5 text-[11px] text-amber-300">
                    Demo / faucet / legacy txs only — do not fund size
                  </div>
                </div>
              </button>
            )}

            <div className="space-y-1 border-t border-white/10 p-2">
              {!w.phantomConnected && (
                <button
                  type="button"
                  onClick={connectPhantom}
                  data-sealevel-target="wallet-connect-phantom"
                  className="w-full rounded-lg bg-purple-600 px-3 py-2 text-xs font-medium text-white hover:bg-purple-500"
                >
                  Connect Phantom for live trading
                </button>
              )}
              {!w.studioConnected && (
                <button
                  type="button"
                  onClick={() => void createStudio()}
                  disabled={creating}
                  data-sealevel-target="wallet-create-studio"
                  className="w-full rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300 hover:bg-white/5 disabled:opacity-50"
                >
                  {creating ? 'Creating studio wallet…' : 'Create studio wallet (demo)'}
                </button>
              )}
              {w.phantomConnected && (
                <button
                  type="button"
                  onClick={() => {
                    void w.disconnectPhantom();
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-center gap-1 rounded-lg px-3 py-1.5 text-xs text-zinc-400 hover:bg-white/5 hover:text-white"
                >
                  <LogOut className="h-3.5 w-3.5" /> Disconnect Phantom
                </button>
              )}
              {w.studioConnected && (
                <button
                  type="button"
                  onClick={() => {
                    w.logoutStudio();
                    if (w.preferred === 'studio') w.setPreferred(w.phantomConnected ? 'phantom' : null);
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-center gap-1 rounded-lg px-3 py-1.5 text-xs text-zinc-400 hover:bg-white/5 hover:text-white"
                >
                  <LogOut className="h-3.5 w-3.5" /> Logout studio wallet
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
