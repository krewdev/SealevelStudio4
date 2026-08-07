/**
 * Jito Block Engine JSON-RPC (bundles).
 * Correct path is /api/v1/bundles — not /v1/bundles.
 * @see https://docs.jito.wtf/lowlatencytxnsend/
 */

export const JITO_BUNDLE_ENDPOINTS = [
  'https://mainnet.block-engine.jito.wtf/api/v1/bundles',
  'https://amsterdam.mainnet.block-engine.jito.wtf/api/v1/bundles',
  'https://ny.mainnet.block-engine.jito.wtf/api/v1/bundles',
  'https://tokyo.mainnet.block-engine.jito.wtf/api/v1/bundles',
  'https://frankfurt.mainnet.block-engine.jito.wtf/api/v1/bundles',
];

export const KNOWN_JITO_TIP_ACCOUNTS = [
  '96gYZGLnJYVFmbjzopPSU6QiEV5fGqZ8Nonsp8qrdNiy',
  'HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe',
  'Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY',
  'ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49',
  'DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh',
  'ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt',
  'DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL',
  '3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT',
];

export type JitoBundleStatusValue = {
  bundle_id?: string;
  bundleId?: string;
  transactions?: string[];
  slot?: number;
  confirmation_status?: string;
  confirmationStatus?: string;
  err?: unknown;
};

async function jitoRpc<T>(method: string, params: unknown[]): Promise<T> {
  let lastErr: Error | null = null;
  for (const url of JITO_BUNDLE_ENDPOINTS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      });
      const json = (await res.json()) as { result?: T; error?: { message?: string } };
      if (!res.ok || json.error) {
        throw new Error(json.error?.message || `Jito HTTP ${res.status} @ ${url}`);
      }
      return json.result as T;
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
    }
  }
  throw lastErr || new Error('All Jito bundle endpoints failed');
}

export async function jitoGetTipAccounts(): Promise<string[]> {
  try {
    const tips = await jitoRpc<string[]>('getTipAccounts', []);
    if (Array.isArray(tips) && tips.length) return tips;
  } catch {
    /* fall through to known list */
  }
  return [...KNOWN_JITO_TIP_ACCOUNTS];
}

export async function jitoSendBundle(base64Txs: string[]): Promise<string> {
  if (base64Txs.length < 1 || base64Txs.length > 5) {
    throw new Error('Jito bundle must contain 1–5 signed transactions');
  }
  const id = await jitoRpc<string>('sendBundle', [base64Txs]);
  if (!id || typeof id !== 'string') throw new Error('Jito sendBundle returned no bundle id');
  return id;
}

export async function jitoGetInflightStatuses(bundleIds: string[]): Promise<JitoBundleStatusValue[]> {
  const result = await jitoRpc<{ value?: JitoBundleStatusValue[] } | JitoBundleStatusValue[]>(
    'getInflightBundleStatuses',
    [bundleIds]
  );
  if (Array.isArray(result)) return result;
  return result?.value || [];
}

export async function jitoGetBundleStatuses(bundleIds: string[]): Promise<JitoBundleStatusValue[]> {
  const result = await jitoRpc<{ value?: JitoBundleStatusValue[] } | JitoBundleStatusValue[]>(
    'getBundleStatuses',
    [bundleIds]
  );
  if (Array.isArray(result)) return result;
  return result?.value || [];
}

export function pickTipAccount(accounts: string[], salt = Date.now()): string {
  const list = accounts.length ? accounts : KNOWN_JITO_TIP_ACCOUNTS;
  return list[Math.abs(salt) % list.length]!;
}

export async function waitForBundleLand(bundleId: string, timeoutMs = 18_000): Promise<{
  status: 'landed' | 'failed' | 'pending' | 'invalid' | 'dropped';
  slot?: number;
  signatures: string[];
  raw?: JitoBundleStatusValue;
}> {
  const started = Date.now();
  let last: JitoBundleStatusValue | undefined;
  while (Date.now() - started < timeoutMs) {
    try {
      const inflight = await jitoGetInflightStatuses([bundleId]);
      last = inflight[0] || last;
      const inflightState = String(
        (last as any)?.status || last?.confirmation_status || last?.confirmationStatus || ''
      ).toLowerCase();
      if (inflightState === 'landed' || inflightState === 'confirmed' || inflightState === 'finalized') {
        break;
      }
      if (inflightState === 'failed' || inflightState === 'invalid' || inflightState === 'dropped') {
        return {
          status: inflightState as 'failed' | 'invalid' | 'dropped',
          signatures: last?.transactions || [],
          raw: last,
        };
      }
    } catch {
      /* inflight often 404s after land — check statuses */
    }
    try {
      const statuses = await jitoGetBundleStatuses([bundleId]);
      const row = statuses[0];
      if (row) {
        last = row;
        const conf = String(row.confirmation_status || row.confirmationStatus || '').toLowerCase();
        const err = row.err && JSON.stringify(row.err) !== '{"Ok":null}' && JSON.stringify(row.err) !== 'null';
        if (err) {
          return { status: 'failed', slot: row.slot, signatures: row.transactions || [], raw: row };
        }
        if (conf === 'confirmed' || conf === 'finalized' || row.slot) {
          return {
            status: 'landed',
            slot: row.slot,
            signatures: row.transactions || [],
            raw: row,
          };
        }
      }
    } catch {
      /* keep polling */
    }
    await new Promise((r) => setTimeout(r, 800));
  }
  return {
    status: last?.slot ? 'landed' : 'pending',
    slot: last?.slot,
    signatures: last?.transactions || [],
    raw: last,
  };
}
