'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Brain, Loader2, Send, Sparkles, Square, X } from 'lucide-react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useUser } from '../contexts/UserContext';
import { useNetwork } from '../contexts/NetworkContext';
import { collectPageSnapshot, snapshotToPrompt, type GrokMode } from '../lib/ai/page-snapshot';
import { MUTATING_GROK_TOOLS } from '../lib/ai/grok-tools';

type ChatRole = 'user' | 'assistant' | 'system';

type ToolTrace = { name: string; ok: boolean; detail?: string };

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: Date;
  traces?: ToolTrace[];
  suggestions?: string[];
};

const SUGGEST: Record<GrokMode, string[]> = {
  explain: [
    'Explain what this screen is for',
    'What does quote_verified mean?',
    'How does replay unlock live without spending?',
  ],
  plan: [
    'Plan: scan arb then load the best opp into the builder',
    'Plan a paper MM session on the current mint',
    'Plan how to go from KOL hot board to a gated live start',
  ],
  act: [
    'Open the scanner and tell me what you see',
    'Attach the session mint to MM desk and start paper',
    'Run a quote replay, then highlight Start live for me',
  ],
};

export function SitewideAIAssistant() {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const { user } = useUser();
  const { network } = useNetwork();
  const [open, setOpen] = useState(false);
  const [wide, setWide] = useState(false);
  const [mode, setMode] = useState<GrokMode>('act');
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState('home');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        '**Grok copilot online.** I can see this page, walk you through it, write a plan, or automate safe steps (navigate, paper bots, replay, highlight).\n\nI will **never** click Execute or Start live — those stay yours.\n\nNot financial advice.',
      timestamp: new Date(),
      suggestions: SUGGEST.act,
    },
  ]);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef(false);

  useEffect(() => {
    const sync = () => setView(localStorage.getItem('sealevel-active-view') || 'home');
    sync();
    window.addEventListener('sealevel-view', sync as EventListener);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('sealevel-view', sync as EventListener);
      window.removeEventListener('storage', sync);
    };
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80);
  }, [open]);

  const pageChip = useMemo(() => {
    const phantom = publicKey?.toBase58();
    const studio = user?.walletAddress;
    const pay = phantom ? `P ${phantom.slice(0, 4)}…` : studio ? `S ${studio.slice(0, 4)}…` : 'no wallet';
    return `${view} · ${network} · ${pay}`;
  }, [view, network, publicKey, user?.walletAddress]);

  const stop = () => {
    abortRef.current = true;
    setBusy(false);
  };

  const send = async (text?: string) => {
    const prompt = (text || input).trim();
    if (!prompt || busy) return;
    abortRef.current = false;
    setInput('');
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: prompt,
      timestamp: new Date(),
    };
    setMessages((m) => [...m.filter((x) => x.id !== 'welcome' || m.length < 3), userMsg]);
    setBusy(true);

    const traces: ToolTrace[] = [];
    try {
      const { runClientGrokTool } = await import('../lib/ai/grok-client-tools');
      const snap = collectPageSnapshot({
        phantom: publicKey?.toBase58() || null,
        studio: user?.walletAddress || null,
        network,
      });
      const history = [...messages, userMsg]
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .filter((m) => m.id !== 'welcome')
        .slice(-16)
        .map((m) => ({ role: m.role, content: m.content }));

      let payload: Record<string, unknown> = {
        prompt,
        messages: history,
        view: snap.view,
        mode,
        pageContext: snapshotToPrompt(snap),
      };

      let aiText = '';
      for (let hop = 0; hop < 8; hop++) {
        if (abortRef.current) {
          aiText = aiText || '_Stopped._';
          break;
        }
        const res = await fetch('/api/ai/grok', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json();

        if (Array.isArray(json.clientActions)) {
          for (const action of json.clientActions) {
            if (action?.type === 'navigate' && action.view) {
              window.dispatchEvent(new CustomEvent('sealevel-navigate', { detail: action.view }));
              traces.push({ name: `navigate:${action.view}`, ok: true });
            }
          }
        }

        if (!res.ok) {
          aiText = json.requiresConfiguration
            ? `Grok key missing. Add \`XAI_API_KEY\` locally or on Vercel **ss4**.\n\n${json.suggestion || ''}`
            : String(json.error || 'Grok request failed');
          break;
        }

        if (Array.isArray(json.pendingClientTools) && json.pendingClientTools.length) {
          const clientToolResults = [];
          for (const t of json.pendingClientTools) {
            if (abortRef.current) break;
            if (mode !== 'act' && MUTATING_GROK_TOOLS.has(t.name)) {
              const refused = { refused: true, reason: `MODE=${mode} — switch to Act to run ${t.name}` };
              traces.push({ name: t.name, ok: false, detail: 'blocked by mode' });
              clientToolResults.push({ tool_call_id: t.id, content: refused });
              continue;
            }
            try {
              const result = await runClientGrokTool(t.name, t.args || {});
              const ok = !(result && typeof result === 'object' && ('error' in (result as any) || (result as any).refused));
              traces.push({
                name: t.name,
                ok,
                detail: ok ? undefined : JSON.stringify(result).slice(0, 120),
              });
              clientToolResults.push({ tool_call_id: t.id, content: result });
            } catch (err) {
              const detail = err instanceof Error ? err.message : String(err);
              traces.push({ name: t.name, ok: false, detail });
              clientToolResults.push({ tool_call_id: t.id, content: { error: detail } });
            }
          }
          payload = {
            resumeMessages: json.resumeMessages,
            clientToolResults,
            view: snap.view,
            mode,
            pageContext: snapshotToPrompt(
              collectPageSnapshot({
                phantom: publicKey?.toBase58() || null,
                studio: user?.walletAddress || null,
                network,
              })
            ),
          };
          continue;
        }

        aiText = String(json.content || '');
        break;
      }

      setMessages((m) => [
        ...m,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: aiText || '_No text — check tool trace._',
          timestamp: new Date(),
          traces: traces.length ? traces : undefined,
          suggestions: SUGGEST[mode],
        },
      ]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          id: `e-${Date.now()}`,
          role: 'assistant',
          content: `Assistant error: ${err instanceof Error ? err.message : String(err)}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 left-6 z-[60] group flex items-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-600 text-white pl-3 pr-4 py-3 shadow-lg shadow-purple-900/40 hover:scale-[1.03] transition"
        title="Grok copilot"
        data-sealevel-target="grok-launcher"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
          <Brain className="h-5 w-5" />
        </span>
        <span className="text-left leading-tight">
          <span className="block text-sm font-semibold">Grok</span>
          <span className="block text-[10px] text-white/80">Explain · Plan · Act</span>
        </span>
      </button>
    );
  }

  return (
    <div
      className={`fixed bottom-4 left-4 z-[60] flex max-h-[min(88vh,760px)] flex-col overflow-hidden rounded-2xl border border-purple-500/30 bg-gray-950/95 shadow-2xl shadow-black/50 backdrop-blur ${
        wide ? 'w-[min(560px,calc(100vw-1.5rem))]' : 'w-[min(420px,calc(100vw-1.5rem))]'
      }`}
    >
      <header className="shrink-0 border-b border-white/10 bg-gradient-to-r from-fuchsia-700/90 via-purple-700/90 to-indigo-700/90 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-white" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-white">Grok copilot</div>
            <div className="truncate text-[10px] text-white/75">{pageChip}</div>
          </div>
          <button
            type="button"
            onClick={() => setWide((w) => !w)}
            className="rounded px-2 py-1 text-[10px] text-white/80 hover:bg-white/10"
          >
            {wide ? 'Narrow' : 'Wide'}
          </button>
          <button type="button" onClick={() => setOpen(false)} className="rounded p-1 text-white/80 hover:bg-white/10">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-2 flex rounded-lg bg-black/25 p-0.5 text-[11px]">
          {(['explain', 'plan', 'act'] as GrokMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`flex-1 rounded-md py-1 capitalize ${
                mode === m ? 'bg-white/20 text-white' : 'text-white/70 hover:text-white'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 custom-scrollbar">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[92%] rounded-2xl px-3 py-2 ${
                message.role === 'user'
                  ? 'bg-purple-600 text-white'
                  : 'border border-white/10 bg-gray-900 text-gray-100'
              }`}
            >
              {message.role === 'assistant' ? (
                <div className="grok-md markdown-content">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                </div>
              ) : (
                <div className="whitespace-pre-wrap text-sm">{message.content}</div>
              )}
              {message.traces && message.traces.length > 0 && (
                <div className="mt-2 space-y-1 border-t border-white/10 pt-2">
                  {message.traces.map((t, i) => (
                    <div key={`${t.name}-${i}`} className="flex gap-2 text-[10px] text-gray-400">
                      <span className={t.ok ? 'text-emerald-400' : 'text-amber-300'}>{t.ok ? '●' : '○'}</span>
                      <span className="font-mono">{t.name}</span>
                      {t.detail && <span className="truncate opacity-70">{t.detail}</span>}
                    </div>
                  ))}
                </div>
              )}
              {message.suggestions && message.role === 'assistant' && (
                <div className="mt-2 flex flex-col gap-1">
                  {message.suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => void send(s)}
                      className="rounded-lg bg-white/5 px-2 py-1 text-left text-[11px] text-purple-100 hover:bg-white/10"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex items-center gap-2 text-xs text-purple-200">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {mode === 'act' ? 'Acting on the page…' : mode === 'plan' ? 'Planning…' : 'Explaining…'}
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="shrink-0 border-t border-white/10 p-3">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            placeholder={
              mode === 'act'
                ? 'e.g. Open scanner and load the best opp into the builder'
                : mode === 'plan'
                  ? 'e.g. Plan a paper MM session on this mint'
                  : 'e.g. Explain the controls on this screen'
            }
            className="flex-1 rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          {busy ? (
            <button type="button" onClick={stop} className="rounded-lg bg-gray-800 p-2 text-red-200 hover:bg-gray-700">
              <Square className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void send()}
              disabled={!input.trim()}
              className="rounded-lg bg-purple-600 p-2 text-white hover:bg-purple-500 disabled:bg-gray-800"
            >
              <Send className="h-4 w-4" />
            </button>
          )}
        </div>
        <p className="mt-2 text-[10px] text-gray-500">
          Mode <span className="text-purple-300">{mode}</span>
          {mode === 'explain' && ' · read-only'}
          {mode === 'plan' && ' · no page mutations'}
          {mode === 'act' && ' · can drive UI, never broadcasts'}
          {connection ? ` · rpc ${connection.rpcEndpoint.includes('devnet') ? 'devnet' : 'mainnet'}` : ''}
        </p>
      </div>
    </div>
  );
}
