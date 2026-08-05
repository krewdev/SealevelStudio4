import { getSolanaRpcUrl, redactRpc } from '../quicknode/rpc';
import { Connection, PublicKey } from '@solana/web3.js';

export const CLIENT_TOOL_NAMES = new Set([
  'start_paper_bot',
  'stop_paper_bot',
  'paper_candle_stats',
  'load_top_opp_into_builder',
  'list_session_wallets',
  'arm_sniper',
  'execute_built_arb',
]);

export type ClientAction = { type: 'navigate'; view: string };

export const GROK_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'navigate',
      description: 'Open a Sealevel screen.',
      parameters: {
        type: 'object',
        properties: {
          view: {
            type: 'string',
            enum: ['home', 'scanner', 'builder', 'bots', 'charts', 'kol-mapper', 'wallets', 'inspector', 'pumpfun-sniper'],
          },
        },
        required: ['view'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'rpc_health',
      description: 'Check mainnet RPC health.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'scan_opportunities',
      description: 'Live arb scan; returns top opportunities.',
      parameters: {
        type: 'object',
        properties: {
          dexes: { type: 'string' },
          limit: { type: 'number' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'jupiter_quote',
      description: 'Live Jupiter quote.',
      parameters: {
        type: 'object',
        properties: {
          inputMint: { type: 'string' },
          outputMint: { type: 'string' },
          amount: { type: 'string' },
          slippageBps: { type: 'number' },
        },
        required: ['inputMint', 'outputMint', 'amount'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'token_price',
      description: 'Approximate token price via Jupiter (1 SOL or 1 USDC in).',
      parameters: {
        type: 'object',
        properties: {
          mint: { type: 'string' },
          vs: { type: 'string', enum: ['SOL', 'USDC'] },
        },
        required: ['mint'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'inspect_account',
      description: 'On-chain account peek.',
      parameters: {
        type: 'object',
        properties: { address: { type: 'string' } },
        required: ['address'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_bot_patterns',
      description: 'Paper bot patterns.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'start_paper_bot',
      description: 'Start paper volume or inventory MM bot in this browser session.',
      parameters: {
        type: 'object',
        properties: {
          mint: { type: 'string' },
          pattern: { type: 'string' },
          mode: { type: 'string', enum: ['volume', 'mm'] },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'stop_paper_bot',
      description: 'Stop the running paper bot.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'paper_candle_stats',
      description: 'Stats from paper trades / candles in this session.',
      parameters: {
        type: 'object',
        properties: { mint: { type: 'string' } },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'load_top_opp_into_builder',
      description: 'Take a top scanned opportunity and open TX Builder with it loaded (does not execute).',
      parameters: {
        type: 'object',
        properties: {
          preferVerified: { type: 'boolean' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'parse_transaction',
      description: 'Parse a signature with Helius enhanced txs (mainnet).',
      parameters: {
        type: 'object',
        properties: {
          signature: { type: 'string' },
        },
        required: ['signature'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'simulate_arb_roundtrip',
      description: 'Simulate Jupiter round-trip profitability for the top scan opportunity or given mints.',
      parameters: {
        type: 'object',
        properties: {
          inputMint: { type: 'string' },
          midMint: { type: 'string' },
          amount: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'kol_hot_board',
      description: 'Fetch KOL radar hot board from local solana-kol-radar (:8088).',
      parameters: {
        type: 'object',
        properties: { limit: { type: 'number' } },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'kol_mint',
      description: 'KOL radar drill-down for a mint.',
      parameters: {
        type: 'object',
        properties: { mint: { type: 'string' } },
        required: ['mint'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'kol_wallet_map',
      description: 'KOL radar mapper seed for a wallet.',
      parameters: {
        type: 'object',
        properties: { wallet: { type: 'string' } },
        required: ['wallet'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'wallet_info',
      description: 'Balance/info for a Solana address on mainnet.',
      parameters: {
        type: 'object',
        properties: { address: { type: 'string' } },
        required: ['address'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_session_wallets',
      description: 'List wallets stored in this browser session (no private keys).',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_session_wallet',
      description: 'Create a custodial session wallet (no secret returned). Read-only use after create.',
      parameters: {
        type: 'object',
        properties: { email: { type: 'string' } },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'prepare_live_swap',
      description: 'Prepare a live Jupiter swap quote. Does NOT send. Requires confirm=true.',
      parameters: {
        type: 'object',
        properties: {
          inputMint: { type: 'string' },
          outputMint: { type: 'string' },
          amount: { type: 'string' },
          confirm: { type: 'boolean' },
        },
        required: ['inputMint', 'outputMint', 'amount', 'confirm'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'arm_sniper',
      description: 'Store pump sniper settings in this browser and open the sniper tab. Never buys or broadcasts, even with confirm=true.',
      parameters: {
        type: 'object',
        properties: {
          mint: { type: 'string' },
          maxSol: { type: 'number' },
          confirm: { type: 'boolean' },
        },
        required: ['confirm'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'execute_built_arb',
      description: 'Tell the user to sign the already-built atomic arb in TX Builder. Requires confirm=true. Does not auto-broadcast.',
      parameters: {
        type: 'object',
        properties: { confirm: { type: 'boolean' } },
        required: ['confirm'],
      },
    },
  },
];

const SOL = 'So11111111111111111111111111111111111111112';
const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

export async function runGrokTool(
  name: string,
  args: Record<string, unknown>,
  origin: string
): Promise<{ result: unknown; clientAction?: ClientAction }> {
  switch (name) {
    case 'navigate': {
      const view = String(args.view || 'home');
      return { result: { ok: true, view }, clientAction: { type: 'navigate', view } };
    }
    case 'rpc_health': {
      const rpcUrl = getSolanaRpcUrl('mainnet');
      const started = Date.now();
      const connection = new Connection(rpcUrl, 'confirmed');
      const slot = await connection.getSlot('confirmed');
      return { result: { ok: true, slot, latencyMs: Date.now() - started, rpc: redactRpc(rpcUrl) } };
    }
    case 'scan_opportunities': {
      const dexes = String(args.dexes || 'raydium,orca');
      const limit = Math.min(Number(args.limit) || 8, 15);
      const res = await fetch(
        `${origin}/api/pools/scan?network=mainnet&dexes=${encodeURIComponent(dexes)}&opportunities=true`
      );
      const data = await res.json();
      const opps = (data.opportunities || []).slice(0, limit).map((o: any) => ({
        id: o.id,
        type: o.type,
        accuracy: o.accuracy,
        netProfit: o.netProfit,
        profitPercent: o.profitPercent,
        profitTokenSymbol: o.profitTokenSymbol,
        confidence: o.confidence,
        hops: (o.steps || o.path?.steps || []).map(
          (s: any) => `${s.tokenIn?.symbol}→${s.tokenOut?.symbol}@${s.dex}`
        ),
        warnings: (o.warnings || []).slice(0, 2),
      }));
      return {
        result: {
          success: data.success,
          poolCount: data.stats?.totalPools,
          opportunities: opps,
        },
      };
    }
    case 'jupiter_quote': {
      const qs = new URLSearchParams({
        inputMint: String(args.inputMint),
        outputMint: String(args.outputMint),
        amount: String(args.amount),
        slippageBps: String(args.slippageBps ?? 50),
      });
      const res = await fetch(`${origin}/api/jupiter/quote?${qs}`);
      return { result: await res.json() };
    }
    case 'token_price': {
      const mint = String(args.mint);
      const vsMint = String(args.vs || 'SOL').toUpperCase() === 'USDC' ? USDC : SOL;
      const amount = vsMint === SOL ? '1000000000' : '1000000';
      const qs = new URLSearchParams({
        inputMint: vsMint,
        outputMint: mint,
        amount,
        slippageBps: '50',
      });
      const res = await fetch(`${origin}/api/jupiter/quote?${qs}`);
      const data = await res.json();
      return {
        result: {
          mint,
          vs: vsMint === SOL ? 'SOL' : 'USDC',
          inAmount: data.inAmount,
          outAmount: data.outAmount,
          priceImpactPct: data.priceImpactPct,
        },
      };
    }
    case 'inspect_account':
    case 'wallet_info': {
      const address = String(args.address);
      const connection = new Connection(getSolanaRpcUrl('mainnet'), 'confirmed');
      const info = await connection.getAccountInfo(new PublicKey(address));
      if (!info) return { result: { found: false, address } };
      return {
        result: {
          found: true,
          address,
          lamports: info.lamports,
          sol: info.lamports / 1e9,
          owner: info.owner.toBase58(),
          executable: info.executable,
          dataBytes: info.data.length,
        },
      };
    }
    case 'list_bot_patterns': {
      const { BOT_PATTERNS } = await import('../bots/patterns');
      return {
        result: BOT_PATTERNS.map((p) => ({
          id: p.id,
          label: p.label,
          kind: p.kind,
          description: p.description,
        })),
      };
    }
    case 'parse_transaction': {
      const res = await fetch(`${origin}/api/helius/parse-transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signature: String(args.signature), network: 'mainnet' }),
      });
      const data = await res.json();
      return { result: data };
    }
    case 'simulate_arb_roundtrip': {
      let inputMint = args.inputMint ? String(args.inputMint) : '';
      let midMint = args.midMint ? String(args.midMint) : '';
      let amount = args.amount ? String(args.amount) : '';
      if (!inputMint || !midMint) {
        const scan = await fetch(
          `${origin}/api/pools/scan?network=mainnet&dexes=raydium,orca&opportunities=true`
        ).then((r) => r.json());
        const opps = scan.opportunities || [];
        const opp =
          opps.find((o: any) => o.accuracy === 'quote_verified') ||
          opps[0];
        const steps = opp?.steps || opp?.path?.steps || [];
        if (steps.length >= 2) {
          inputMint = steps[0].tokenIn.mint;
          midMint = steps[0].tokenOut.mint;
          amount = String(steps[0].amountIn);
        }
      }
      if (!inputMint || !midMint || !amount) {
        return { result: { error: 'No opportunity or mints to simulate' } };
      }
      const q1 = await fetch(
        `${origin}/api/jupiter/quote?inputMint=${inputMint}&outputMint=${midMint}&amount=${amount}&slippageBps=75`
      ).then((r) => r.json());
      const midAmt = String(q1.outAmount || '0');
      const q2 = await fetch(
        `${origin}/api/jupiter/quote?inputMint=${midMint}&outputMint=${inputMint}&amount=${midAmt}&slippageBps=75`
      ).then((r) => r.json());
      const outAmt = BigInt(String(q2.outAmount || '0'));
      const inAmt = BigInt(String(q1.inAmount || amount));
      return {
        result: {
          inputMint,
          midMint,
          hop1Out: midAmt,
          hop2Out: outAmt.toString(),
          inAmount: inAmt.toString(),
          profitable: outAmt > inAmt,
          deltaRaw: (outAmt - inAmt).toString(),
          note: 'Aggregator round-trip sim only — not a locked pool pair and not broadcast.',
        },
      };
    }
    case 'kol_hot_board': {
      try {
        const res = await fetch(`${origin}/api/kol/hot`);
        const data = await res.json();
        const tokens = (data.tokens || data || []).slice(0, Number(args.limit) || 12);
        return { result: { ok: !!data.ok, tokens, ts: data.ts, error: data.error } };
      } catch (e) {
        return {
          result: {
            ok: false,
            error: 'KOL radar not reachable. Start ~/solana-kol-radar ./start.sh all-local or set KOL_RADAR_URL.',
            detail: e instanceof Error ? e.message : String(e),
          },
        };
      }
    }
    case 'kol_mint': {
      try {
        const res = await fetch(`${origin}/api/kol/mint/${encodeURIComponent(String(args.mint))}`);
        return { result: await res.json() };
      } catch (e) {
        return { result: { ok: false, error: e instanceof Error ? e.message : String(e) } };
      }
    }
    case 'kol_wallet_map': {
      try {
        const wallet = String(args.wallet);
        const res = await fetch(`${origin}/api/kol/mapper?seed=${encodeURIComponent(wallet)}&hops=2&live=0`);
        const data = await res.json().catch(() => ({}));
        return {
          result: {
            ...data,
            mapperView: 'kol-mapper',
          },
        };
      } catch (e) {
        return {
          result: {
            ok: false,
            error: e instanceof Error ? e.message : String(e),
          },
        };
      }
    }
    case 'create_session_wallet': {
      const res = await fetch(`${origin}/api/wallet/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: `grok-${Date.now()}`,
          email: args.email ? String(args.email) : undefined,
          skipEmailVerification: true,
        }),
      });
      const data = await res.json();
      return {
        result: {
          success: data.success,
          address: data.wallet?.address,
          walletId: data.wallet?.walletId,
          note: 'Secret key is not returned. Stored server-side/session only.',
        },
      };
    }
    case 'prepare_live_swap': {
      if (args.confirm !== true) {
        return { result: { refused: true, reason: 'confirm=true required. No live swap prepared.' } };
      }
      const qs = new URLSearchParams({
        inputMint: String(args.inputMint),
        outputMint: String(args.outputMint),
        amount: String(args.amount),
        slippageBps: '75',
      });
      const quote = await fetch(`${origin}/api/jupiter/quote?${qs}`).then((r) => r.json());
      return {
        result: {
          prepared: true,
          sent: false,
          quote,
          nextStep: 'Open Builder or wallet adapter to sign. Grok will not auto-broadcast.',
        },
      };
    }
    default:
      return { result: { error: `Unknown or client-only tool ${name}` } };
  }
}
