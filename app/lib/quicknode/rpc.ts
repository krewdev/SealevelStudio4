/**
 * Resolve Solana RPC URLs. Prefers QuickNode when configured.
 */

export function redactRpc(url: string): string {
  return url
    .replace(/api-key=[^&]+/gi, 'api-key=***')
    .replace(/(quiknode\.pro\/)[^/?#]+/gi, '$1***');
}

function constructQuickNodeHttp(): string | null {
  const direct = process.env.QUICKNODE_HTTP_URL?.trim();
  if (direct) return direct.replace(/\/$/, '');

  const mainnet = process.env.NEXT_PUBLIC_SOLANA_RPC_MAINNET?.trim();
  if (mainnet && /quiknode\.pro/i.test(mainnet)) return mainnet.replace(/\/$/, '');

  const endpoint = process.env.QUICKNODE_ENDPOINT?.trim();
  const apiKey = process.env.QUICKNODE_API_KEY?.trim();
  if (endpoint && apiKey) {
    const host = endpoint.replace(/^https?:\/\//, '').replace(/\/$/, '');
    return `https://${host}/${apiKey}`;
  }

  const ws =
    process.env.QUICKNODE_WS_URL?.trim() ||
    process.env.NEXT_PUBLIC_QUICKNODE_WS_URL?.trim();
  if (ws && /quiknode\.pro/i.test(ws)) {
    return ws.replace(/^wss:/i, 'https:').replace(/^ws:/i, 'http:').replace(/\/$/, '');
  }

  return null;
}

export function getSolanaRpcUrl(network: string = 'mainnet'): string {
  if (network === 'mainnet' || network === 'mainnet-beta') {
    const qn = constructQuickNodeHttp();
    if (qn) return qn;

    if (process.env.NEXT_PUBLIC_HELIUS_API_KEY) {
      const apiKey = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
      let heliusKey = apiKey;
      if (apiKey.includes('helius-rpc.com')) {
        const match = apiKey.match(/[?&]api-key=([^&]+)/);
        heliusKey = match ? match[1] : apiKey.split('api-key=')[1]?.split('&')[0] || apiKey;
      }
      return `https://mainnet.helius-rpc.com/?api-key=${heliusKey}`;
    }

    return process.env.NEXT_PUBLIC_SOLANA_RPC_MAINNET || 'https://api.mainnet-beta.solana.com';
  }

  if (process.env.NEXT_PUBLIC_HELIUS_API_KEY && network === 'devnet') {
    const apiKey = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
    let heliusKey = apiKey;
    if (apiKey.includes('helius-rpc.com')) {
      const match = apiKey.match(/[?&]api-key=([^&]+)/);
      heliusKey = match ? match[1] : apiKey.split('api-key=')[1]?.split('&')[0] || apiKey;
    }
    return `https://devnet.helius-rpc.com/?api-key=${heliusKey}`;
  }

  if (network === 'testnet') {
    return process.env.NEXT_PUBLIC_SOLANA_RPC_TESTNET || 'https://api.testnet.solana.com';
  }

  return process.env.NEXT_PUBLIC_SOLANA_RPC_DEVNET || 'https://api.devnet.solana.com';
}

export function getQuickNodeWsUrl(): string | null {
  const ws =
    process.env.NEXT_PUBLIC_QUICKNODE_WS_URL?.trim() ||
    process.env.QUICKNODE_WS_URL?.trim();
  if (ws) return ws.endsWith('/') ? ws : `${ws}/`;

  const endpoint = process.env.QUICKNODE_ENDPOINT?.trim();
  const apiKey = process.env.QUICKNODE_API_KEY?.trim();
  if (endpoint && apiKey) {
    const host = endpoint.replace(/^https?:\/\//, '').replace(/\/$/, '');
    return `wss://${host}/${apiKey}/`;
  }
  return null;
}
