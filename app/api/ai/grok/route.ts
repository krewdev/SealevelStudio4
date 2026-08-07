import { NextRequest, NextResponse } from 'next/server';
import {
  GROK_TOOLS,
  runGrokTool,
  CLIENT_TOOL_NAMES,
  MUTATING_GROK_TOOLS,
  type ClientAction,
} from '@/app/lib/ai/grok-tools';

export const dynamic = 'force-dynamic';

const XAI_URL = 'https://api.x.ai/v1/chat/completions';
const DEFAULT_MODEL = process.env.XAI_MODEL || process.env.GROK_MODEL || 'grok-4-latest';

const SYSTEM = `You are Grok, the bleeding-edge copilot inside Sealevel Studio.

You can SEE the page (snapshot + read_page_state), POINT (highlight_ui), and AUTOMATE safe UI (click_ui, navigate, paper bots, replay, attach mint, disarm).

MODES
- explain: teach. Read-only tools only. Do not navigate or start bots unless the user insists.
- plan: numbered plan with why / risk / what you will click. Read tools OK. Do not mutate the page.
- act: execute the plan with tools. Narrate each step briefly.

HARD RULES
- NEVER broadcast, sign, or click Execute / Start live. Highlight those and ask the human to click.
- Prefer paper + quote replay. Not financial advice.
- Use tools for live data; do not invent quotes, slots, or PnL.
- When automating, call read_page_state first if snapshot looks stale.
- After acting, summarize what changed on the page.

Tools: navigate, highlight_ui, click_ui, start_quote_replay, start/stop_paper_bot, attach_mint_to_desk, load_top_opp_into_builder, scan_opportunities, jupiter_quote, kol_*, inspect_account, disarm_all.`;

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
    const mode =
      body.mode === 'plan' || body.mode === 'act' || body.mode === 'explain' ? body.mode : 'explain';
    const pageContext =
      typeof body.pageContext === 'string'
        ? body.pageContext
        : body.pageContext
          ? JSON.stringify(body.pageContext)
          : '';
    const origin = new URL(request.url).origin;
    const clientActions: ClientAction[] = [];

    let chatMessages: any[] = Array.isArray(body.resumeMessages) ? body.resumeMessages : null;
    if (!chatMessages) {
      const messages = Array.isArray(body.messages) ? body.messages : [];
      const prompt = typeof body.prompt === 'string' ? body.prompt : '';
      chatMessages = [
        {
          role: 'system',
          content: [
            SYSTEM,
            `MODE=${mode}`,
            view ? `DECLARED_VIEW=${view}` : '',
            pageContext ? `PAGE_SNAPSHOT\n${pageContext}` : '',
          ]
            .filter(Boolean)
            .join('\n\n'),
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
          if (mode !== 'act' && MUTATING_GROK_TOOLS.has(name)) {
            chatMessages.push({
              role: 'tool',
              tool_call_id: call.id,
              content: JSON.stringify({
                refused: true,
                reason: `MODE=${mode} blocks mutating tool ${name}. Switch to Act to automate.`,
              }),
            });
            continue;
          }
          pendingClient.push({ id: call.id, name, args });
          continue;
        }
        if (mode !== 'act' && MUTATING_GROK_TOOLS.has(name)) {
          chatMessages.push({
            role: 'tool',
            tool_call_id: call.id,
            content: JSON.stringify({
              refused: true,
              reason: `MODE=${mode} blocks mutating tool ${name}. Switch to Act to automate.`,
            }),
          });
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
