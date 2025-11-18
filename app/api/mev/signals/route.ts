import { NextRequest, NextResponse } from 'next/server';
import { Connection } from '@solana/web3.js';
import { MEVSignalDetector } from '@/app/lib/mev/signals';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const signalTypes = searchParams.get('types')?.split(',') || [];
  const minSeverity = searchParams.get('severity') || 'low';
  
  try {
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_DEVNET || 
                   process.env.NEXT_PUBLIC_SOLANA_RPC_MAINNET || 
                   'https://api.devnet.solana.com';
    const connection = new Connection(rpcUrl, 'confirmed');

    const detector = new MEVSignalDetector(connection);
    
    // Detect MEV signals
    // In production, this would connect to Jito ShredStream
    const signals = await detector.detectMEVSignals();
    
    // Filter by type if specified
    const filteredSignals = signalTypes.length > 0
      ? signals.filter(s => signalTypes.includes(s.type))
      : signals;
    
    // Filter by severity
    const severityLevels = { low: 0, medium: 1, high: 2, critical: 3 };
    const finalSignals = filteredSignals.filter(s => 
      severityLevels[s.severity] >= severityLevels[minSeverity as keyof typeof severityLevels]
    );
    
    return NextResponse.json({
      success: true,
      signals: finalSignals,
      total: finalSignals.length,
      note: 'MEV detection requires Jito ShredStream integration for production use',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('MEV detection error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to detect MEV signals',
        success: false,
      },
      { status: 500 }
    );
  }
}

