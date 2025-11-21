import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export const dynamic = 'force-dynamic';

/**
 * GET /api/attestation/idl
 * Serves the attestation program IDL for client-side use
 */
export async function GET() {
  try {
    const idlPath = join(process.cwd(), 'programs/attestation-program/target/idl/sealevel_attestation.json');
    const idl = JSON.parse(readFileSync(idlPath, 'utf-8'));
    
    return NextResponse.json(idl, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('Error loading IDL:', error);
    return NextResponse.json(
      { error: 'IDL not found. Please ensure the program is built.' },
      { status: 404 }
    );
  }
}

