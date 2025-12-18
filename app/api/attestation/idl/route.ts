import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export const dynamic = 'force-dynamic';

/**
 * GET /api/attestation/idl
 * Serves the attestation program IDL for client-side use
 * Tries multiple possible IDL file names and locations
 */
export async function GET() {
  try {
    // Try multiple possible IDL file names and locations
    const possiblePaths = [
      // Standard Anchor build output
      join(process.cwd(), 'programs/attestation-program/target/idl/sealevel_attestation.json'),
      join(process.cwd(), 'programs/attestation-program/target/idl/attestation_program.json'),
      join(process.cwd(), 'programs/attestation-program/target/idl/attestation-program.json'),
      // Alternative locations
      join(process.cwd(), 'target/idl/sealevel_attestation.json'),
      join(process.cwd(), 'target/idl/attestation_program.json'),
      // Root level
      join(process.cwd(), 'idl/sealevel_attestation.json'),
      join(process.cwd(), 'idl/attestation_program.json'),
    ];

    let idl: any = null;
    let foundPath: string | null = null;

    for (const idlPath of possiblePaths) {
      if (existsSync(idlPath)) {
        try {
          idl = JSON.parse(readFileSync(idlPath, 'utf-8'));
          foundPath = idlPath;
          console.log(`✅ Found IDL at: ${idlPath}`);
          break;
        } catch (parseError) {
          console.warn(`Failed to parse IDL at ${idlPath}:`, parseError);
          continue;
        }
      }
    }

    if (!idl) {
      console.error('IDL not found in any of these locations:', possiblePaths);
      return NextResponse.json(
        { 
          error: 'IDL not found. Please ensure the program is built.',
          hint: 'Run: cd programs/attestation-program && anchor build',
          searchedPaths: possiblePaths,
        },
        { status: 404 }
      );
    }

    // Validate IDL structure
    if (!idl.version || !idl.name || !idl.instructions) {
      return NextResponse.json(
        { 
          error: 'Invalid IDL format',
          foundPath,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(idl, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('Error loading IDL:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to load IDL',
        hint: 'Ensure the attestation program is built: anchor build',
      },
      { status: 500 }
    );
  }
}

