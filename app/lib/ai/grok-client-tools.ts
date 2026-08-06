'use client';

import {
  startControlledPaperBot,
  stopControlledPaperBot,
  getPaperBotStatus,
} from '../bots/controller';
import { listPaperTrades } from '../bots/trade-store';
import { buildCandles } from '../bots/candles';
import { setPendingArbOpportunity } from '../arbitrage/pending-build';
import type { BotPatternId } from '../bots/patterns';
import { attachMintToDesk, getDeskSession, patchDeskSession } from '../session/desk-session';
import { clearDisarm, disarmAll } from '../bots/kill-switch';

export async function runClientGrokTool(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  switch (name) {
    case 'start_paper_bot': {
      const session = getDeskSession();
      const mint = String(args.mint || session.mint || 'DEMO');
      const status = startControlledPaperBot({
        mint,
        pattern: (args.pattern as BotPatternId) || undefined,
        bot: args.mode === 'mm' ? 'mm' : 'volume',
      });
      patchDeskSession({ mint, source: 'grok', intentTab: args.mode === 'mm' ? 'mm' : 'volume' });
      window.dispatchEvent(new CustomEvent('sealevel-navigate', { detail: 'bots' }));
      return { started: true, ...status };
    }
    case 'stop_paper_bot': {
      const prev = stopControlledPaperBot();
      return { stopped: true, previous: prev };
    }
    case 'paper_candle_stats': {
      const mint = args.mint ? String(args.mint) : undefined;
      const trades = listPaperTrades(mint);
      const candles = buildCandles(trades, 4000);
      const last = candles[candles.length - 1];
      const buys = trades.filter((t) => t.side === 'buy').length;
      const sells = trades.filter((t) => t.side === 'sell').length;
      return {
        tradeCount: trades.length,
        buys,
        sells,
        candleCount: candles.length,
        lastClose: last?.close,
        lastVolume: last?.volume,
        bot: getPaperBotStatus(),
      };
    }
    case 'load_top_opp_into_builder': {
      const res = await fetch('/api/pools/scan?network=mainnet&dexes=raydium,orca&opportunities=true');
      const data = await res.json();
      const opps = data.opportunities || [];
      const prefer = args.preferVerified !== false;
      const opp =
        (prefer && opps.find((o: any) => o.accuracy === 'quote_verified')) || opps[0];
      if (!opp) return { error: 'No opportunities from scan' };
      setPendingArbOpportunity(opp);
      const step = opp.steps?.[0] || opp.path?.steps?.[0];
      if (step?.tokenIn?.mint) {
        patchDeskSession({
          mint: step.tokenOut?.mint || step.tokenIn.mint,
          source: 'grok',
          reason: `top opp ${opp.accuracy || ''} net ${opp.netProfit}`,
          opportunityId: opp.id,
        });
      }
      window.dispatchEvent(new CustomEvent('sealevel-navigate', { detail: 'builder' }));
      return {
        loaded: true,
        id: opp.id,
        accuracy: opp.accuracy,
        netProfit: opp.netProfit,
        profitTokenSymbol: opp.profitTokenSymbol,
        executed: false,
      };
    }
    case 'get_desk_session': {
      return getDeskSession();
    }
    case 'attach_mint_to_desk': {
      const mint = String(args.mint || '');
      if (!mint) return { error: 'mint required' };
      const tab = args.tab === 'mm' || args.tab === 'volume' || args.tab === 'sniper' ? args.tab : 'sniper';
      return attachMintToDesk({
        mint,
        source: 'grok',
        reason: args.reason ? String(args.reason) : 'grok attach',
        intentTab: tab,
      });
    }
    case 'disarm_all': {
      disarmAll(args.reason ? String(args.reason) : 'grok');
      stopControlledPaperBot();
      return { disarmed: true, broadcast: false };
    }
    case 'clear_disarm': {
      clearDisarm();
      return { disarmed: false };
    }
    case 'list_session_wallets': {
      const out: unknown[] = [];
      try {
        const profile = localStorage.getItem('user_profile');
        const walletId = localStorage.getItem('wallet_id');
        if (profile) out.push({ source: 'user_profile', ...JSON.parse(profile), walletId });
        else if (walletId) out.push({ source: 'wallet_id', walletId });
      } catch {
        /* ignore */
      }
      return { wallets: out, secretsExposed: false };
    }
    case 'arm_sniper': {
      if (args.confirm !== true) {
        return { refused: true, reason: 'confirm=true required' };
      }
      const cfg = {
        mint: args.mint ? String(args.mint) : '',
        maxSol: Number(args.maxSol) || 0.05,
        armedAt: Date.now(),
      };
      localStorage.setItem('sealevel-sniper-arm', JSON.stringify(cfg));
      window.dispatchEvent(new CustomEvent('sealevel-sniper-arm'));
      window.dispatchEvent(new CustomEvent('sealevel-navigate', { detail: 'pumpfun-sniper' }));
      return { armed: true, bought: false, executed: false, ...cfg };
    }
    case 'execute_built_arb': {
      if (args.confirm !== true) {
        return { refused: true, reason: 'confirm=true required' };
      }
      window.dispatchEvent(new CustomEvent('sealevel-navigate', { detail: 'builder' }));
      return {
        executed: false,
        broadcast: false,
        message: 'Opened Builder. Click Execute and sign with Phantom/Solflare. Grok will not auto-broadcast.',
      };
    }
    default:
      return { error: `Unknown client tool ${name}` };
  }
}
