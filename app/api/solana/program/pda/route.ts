// API route to derive Program Derived Addresses (PDAs)
// POST /api/solana/program/pda
// Body: { programId: string, seeds: (string | number[])[], bumpSeed?: number }

import { NextRequest, NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import { validateSolanaAddress } from '@/app/lib/security/validation';

export const dynamic = 'force-dynamic';

/**
 * Derive a Program Derived Address (PDA)
 * 
 * Body:
 * - programId: Program address (required)
 * - seeds: Array of seeds (string or number array) (required)
 * - bumpSeed: Optional bump seed (if not provided, will find canonical bump)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { programId: programIdParam, seeds, bumpSeed } = body;

    // Validate program ID
    if (!programIdParam) {
      return NextResponse.json(
        { error: 'programId is required' },
        { status: 400 }
      );
    }

    const programIdValidation = validateSolanaAddress(programIdParam);
    if (!programIdValidation.valid) {
      return NextResponse.json(
        { error: programIdValidation.error || 'Invalid program ID format' },
        { status: 400 }
      );
    }

    const programId = new PublicKey(programIdParam);

    // Validate seeds
    if (!seeds || !Array.isArray(seeds) || seeds.length === 0) {
      return NextResponse.json(
        { error: 'seeds array is required and must not be empty' },
        { status: 400 }
      );
    }

    // Convert seeds to Buffer format
    const seedBuffers: (Buffer | Uint8Array)[] = [];
    for (const seed of seeds) {
      if (typeof seed === 'string') {
        seedBuffers.push(Buffer.from(seed, 'utf8'));
      } else if (Array.isArray(seed) && seed.every(s => typeof s === 'number')) {
        seedBuffers.push(Buffer.from(seed));
      } else {
        return NextResponse.json(
          { error: `Invalid seed format. Seeds must be strings or number arrays. Found: ${typeof seed}` },
          { status: 400 }
        );
      }
    }

    // Find PDA
    let pda: PublicKey;
    let bump: number;

    if (bumpSeed !== undefined) {
      // Use provided bump
      if (typeof bumpSeed !== 'number' || bumpSeed < 0 || bumpSeed > 255) {
        return NextResponse.json(
          { error: 'bumpSeed must be a number between 0 and 255' },
          { status: 400 }
        );
      }
      
      // Include the bump seed in the derivation
      const allSeeds = [...seedBuffers, Buffer.from([bumpSeed])];
      pda = PublicKey.findProgramAddressSync(allSeeds, programId)[0];
      bump = bumpSeed;
    } else {
      // Find canonical bump
      [pda, bump] = PublicKey.findProgramAddressSync(seedBuffers, programId);
    }

    return NextResponse.json({
      success: true,
      programId: programId.toString(),
      seeds: seeds,
      pda: pda.toString(),
      bump: bump,
    });
  } catch (error) {
    console.error('Error deriving PDA:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to derive PDA',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

