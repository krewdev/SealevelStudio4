import { NextRequest, NextResponse } from 'next/server';

const MAINNET_GATEWAY = 'https://api.multiversx.com';
const DEVNET_GATEWAY = 'https://devnet-api.multiversx.com';

export async function POST(request: NextRequest) {
  try {
    const signedTx = (await request.json()) as Record<string, unknown>;

    if (!signedTx || typeof signedTx !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Signed transaction object is required' },
        { status: 400 }
      );
    }

    const network = process.env.MULTIVERX_NETWORK ?? process.env.NEXT_PUBLIC_MULTIVERX_NETWORK ?? 'mainnet';
    const baseUrl = network === 'devnet' ? DEVNET_GATEWAY : MAINNET_GATEWAY;
    const url = `${baseUrl}/transaction/send`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(signedTx),
    });

    const data = (await res.json().catch(() => ({}))) as {
      txHash?: string;
      code?: string;
      error?: string;
      data?: { txHash?: string };
    };

    if (!res.ok) {
      return NextResponse.json(
        {
          success: false,
          error: data?.error ?? data?.message ?? `Gateway returned ${res.status}`,
        },
        { status: res.status >= 400 && res.status < 500 ? 400 : 502 }
      );
    }

    const txHash = data?.data?.txHash ?? data?.txHash;
    if (!txHash) {
      return NextResponse.json(
        { success: false, error: 'No txHash in gateway response' },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, txHash });
  } catch (e) {
    console.error('Presale MultiversX send error:', e);
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Failed to send transaction' },
      { status: 500 }
    );
  }
}
