/**
 * Helper to load the Anchor program
 * Works even if types haven't been generated yet
 */
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";

export async function loadProgram(): Promise<any> {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // Try to use workspace first (requires IDL)
  if ((anchor.workspace as any).SealPresale) {
    return (anchor.workspace as any).SealPresale;
  }

  // Fallback: Load IDL directly if it exists
  const idlPath = path.join(__dirname, "../target/idl/seal_presale.json");
  if (fs.existsSync(idlPath)) {
    const idl = JSON.parse(fs.readFileSync(idlPath, "utf8"));
    const programId = new PublicKey("2g4two95hsPRbdQYoiyasp6cVYho8SF4puab4RyFHHnY");
    // Program constructor: new Program(idl, programId, provider)
    return new (Program as any)(idl, programId, provider);
  }

  throw new Error(
    "Program not found. Please run 'anchor build' first to generate the IDL.\n" +
    "You can run: cd /Users/krewdev/SealevelStudio4 && anchor build"
  );
}

