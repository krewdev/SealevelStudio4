'use client';

import React, { useState } from 'react';
import { ArrowLeft, ExternalLink, Map, Radio } from 'lucide-react';

export function KolMapper({ onBack }: { onBack?: () => void }) {
  const [src, setSrc] = useState('http://127.0.0.1:8088/mapper');
  const [frame, setFrame] = useState(src);

  return (
    <div className="h-full w-full flex flex-col bg-slate-950 text-white overflow-hidden">
      <header className="shrink-0 border-b border-slate-800 px-4 py-3 flex items-center gap-3">
        {onBack && (
          <button onClick={onBack} className="text-slate-400 hover:text-white flex items-center gap-1 text-sm">
            <ArrowLeft size={16} /> Back
          </button>
        )}
        <Map size={18} className="text-cyan-400" />
        <h1 className="font-semibold">KOL / Wallet Mapper</h1>
        <input
          value={src}
          onChange={(e) => setSrc(e.target.value)}
          className="ml-4 flex-1 max-w-xl bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm"
        />
        <button
          onClick={() => setFrame(src)}
          className="px-3 py-1.5 bg-cyan-700 hover:bg-cyan-600 rounded text-sm"
        >
          Load
        </button>
        <a
          href={frame}
          target="_blank"
          rel="noreferrer"
          className="text-slate-400 hover:text-white"
          title="Open in new tab"
        >
          <ExternalLink size={16} />
        </a>
      </header>
      <div className="px-4 py-2 text-xs text-slate-400 border-b border-slate-800 flex items-center gap-2">
        <Radio size={12} className="text-cyan-400" />
        Uses your local <code className="text-slate-300">solana-kol-radar</code> research UI. From
        that repo run <code className="text-slate-300">./start.sh all-local</code> then load{' '}
        <code className="text-slate-300">/mapper</code>. Deep merge of collector + trace mapper into
        this Next app can come next.
      </div>
      <iframe title="KOL Mapper" src={frame} className="flex-1 min-h-0 w-full bg-black border-0" />
    </div>
  );
}
