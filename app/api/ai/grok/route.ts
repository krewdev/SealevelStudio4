import { NextRequest, NextResponse } from 'next/server';
import {
  GROK_TOOLS,
  runGrokTool,
  CLIENT_TOOL_NAMES,
  type ClientAction,
} from '@/app/lib/ai/grok-tools';

export const dynamic = 'force-dynamic';

const XAI_URL = 'https://api.x.ai/v1/chat/completions';
const DEFAULT_MODEL = process.env.XAI_MODEL || process.env.GROK_MODEL || 'grok-4-latest';

const SYSTEM = `You are Grok for Sealevel Studio with tools.

Use tools instead of guessing live data.
- Paper bots: start_paper_bot / stop_paper_bot / paper_candle_stats
- Builder: load_top_opp_into_builder (never auto-executes)
- Research: scan_opportunities, jupiter_quote, token_price, parse_transaction, simulate_arb_roundtrip
- KOL: kol_hot_board, kol_mint, kol_wallet_map (needs local radar on :8088)
- Wallets: list_session_wallets, wallet_info, create_session_wallet (no secrets)
- Live risk: prepare_live_swap, arm_sniper, execute_built_arb require confirm=true and still do not auto-broadcast

Not financial advice. Prefer paper. Be concise.`;

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.XAI_API_KEY || process.env.GROK_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'Grok API key not configured',
          suggestion: 'Add XAI_API_KEY to .env.local',
          requiresConfiguration: true,
        },
        { status: 503 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const model = typeof body.model === 'string' && body.model.trim() ? body.model : DEFAULT_MODEL;
    const view = typeof body.view === 'string' ? body.view : '';
    const origin = new URL(request.url).origin;
    const clientActions: ClientAction[] = [];

    let chatMessages: any[] = Array.isArray(body.resumeMessages) ? body.resumeMessages : null;
    if (!chatMessages) {
      const messages = Array.isArray(body.messages) ? body.messages : [];
      const prompt = typeof body.prompt === 'string' ? body.prompt : '';
      chatMessages = [
        {
          role: 'system',
          content: view ? `${SYSTEM}\n\nUser is on "${view}".` : SYSTEM,
        },
        ...messages
          .filter((m: any) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
          .map((m: any) => ({ role: m.role, content: m.content })),
      ];
      if (prompt.trim()) chatMessages.push({ role: 'user', content: prompt.trim() });
    }

    if (Array.isArray(body.clientToolResults) && body.clientToolResults.length) {
      for (const r of body.clientToolResults) {
        chatMessages.push({
          role: 'tool',
          tool_call_id: r.tool_call_id,
          content: typeof r.content === 'string' ? r.content : JSON.stringify(r.content),
        });
      }
    }

    if (chatMessages.length < 2) {
      return NextResponse.json({ error: 'Missing prompt or messages' }, { status: 400 });
    }

    let content = '';
    let usedModel = model;
    let usage: unknown;

    for (let round = 0; round < 5; round++) {
      const upstream = await fetch(XAI_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: chatMessages,
          temperature: 0.35,
          stream: false,
          tools: GROK_TOOLS,
          tool_choice: 'auto',
        }),
      });
      const data = await upstream.json().catch(() => ({}));
      if (!upstream.ok) {
        return NextResponse.json(
          { error: data.error?.message || data.error || `Grok API ${upstream.status}` },
          { status: upstream.status >= 400 ? upstream.status : 502 }
        );
      }
      usedModel = data.model || model;
      usage = data.usage;
      const msg = data.choices?.[0]?.message || {};
      const toolCalls = msg.tool_calls || [];
      if (!toolCalls.length) {
        content = msg.content || '';
        break;
      }

      chatMessages.push({
        role: 'assistant',
        content: msg.content || null,
        tool_calls: toolCalls,
      });

      const pendingClient: { id: string; name: string; args: Record<string, unknown> }[] = [];
      for (const call of toolCalls) {
        const name = call.function?.name || '';
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(call.function?.arguments || '{}');
        } catch {
          args = {};
        }
        if (CLIENT_TOOL_NAMES.has(name)) {
          pendingClient.push({ id: call.id, name, args });
          continue;
        }
        const { result, clientAction } = await runGrokTool(name, args, origin);
        if (clientAction) clientActions.push(clientAction);
        chatMessages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify(result),
        });
      }

      if (pendingClient.length) {
        return NextResponse.json({
          success: true,
          content: null,
          pendingClientTools: pendingClient,
          resumeMessages: chatMessages,
          clientActions,
          model: usedModel,
          usage,
        });
      }
    }

    return NextResponse.json({
      success: true,
      content,
      model: usedModel,
      usage,
      clientActions,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Grok proxy failed' },
      { status: 500 }
    );
  }
}
