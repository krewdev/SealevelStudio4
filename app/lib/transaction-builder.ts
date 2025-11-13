import { 
  Connection, 
  PublicKey, 
  Transaction, 
  TransactionInstruction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  sendAndConfirmTransaction,
  Signer
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createTransferInstruction,
  createMintToInstruction,
  createBurnInstruction,
  createApproveInstruction,
  createAssociatedTokenAccountInstruction
} from '@solana/spl-token';
import { BuiltInstruction, TransactionDraft } from './instructions/types';

export class TransactionBuilder {
  constructor(private connection: Connection) {}

  async buildTransaction(draft: TransactionDraft): Promise<Transaction> {
    const transaction = new Transaction();
    
    // Add priority fee if specified
    if (draft.priorityFee) {
      transaction.add(this.createPriorityFeeInstruction(draft.priorityFee));
    }

    // Convert each instruction to Solana instruction
    for (const instruction of draft.instructions) {
      const solanaInstruction = await this.buildInstruction(instruction);
      transaction.add(solanaInstruction);
    }

    // Add memo if specified
    if (draft.memo) {
      transaction.add(this.createMemoInstruction(draft.memo));
    }

    return transaction;
  }

  private async buildInstruction(builtInstruction: BuiltInstruction): Promise<TransactionInstruction> {
    const { template, accounts, args } = builtInstruction;
    
    // Convert account names to PublicKeys
    const accountKeys = Object.entries(accounts).map(([name, pubkey]) => ({
      name,
      pubkey: new PublicKey(pubkey)
    }));

    // Get the instruction data based on template
    switch (template.id) {
      case 'system_transfer':
        return this.buildSystemTransfer(accountKeys, args);
      
      case 'system_create_account':
        return await this.buildSystemCreateAccount(accountKeys, args);
      
      case 'spl_token_transfer':
        return this.buildTokenTransfer(accountKeys, args);
      
      case 'spl_token_mint_to':
        return this.buildTokenMintTo(accountKeys, args);
      
      case 'spl_token_burn':
        return this.buildTokenBurn(accountKeys, args);
      
      case 'spl_token_approve':
        return this.buildTokenApprove(accountKeys, args);
      
      case 'spl_ata_create':
        return this.buildAssociatedTokenAccount(accountKeys, args);
      
      case 'mpl_create_metadata':
        return this.buildCreateMetadata(accountKeys, args);
      
      case 'mpl_update_metadata':
        return this.buildUpdateMetadata(accountKeys, args);
      
      default:
        throw new Error(`Unsupported instruction template: ${template.id}`);
    }
  }

  // ===== SYSTEM PROGRAM INSTRUCTIONS =====
  private buildSystemTransfer(accountKeys: any[], args: any): TransactionInstruction {
    const from = accountKeys.find(acc => acc.name === 'from')!.pubkey;
    const to = accountKeys.find(acc => acc.name === 'to')!.pubkey;
    const amount = args.amount;

    return SystemProgram.transfer({
      fromPubkey: from,
      toPubkey: to,
      lamports: amount
    });
  }

  private async buildSystemCreateAccount(accountKeys: any[], args: any): Promise<TransactionInstruction> {
    const from = accountKeys.find(acc => acc.name === 'from')!.pubkey;
    const newAccount = accountKeys.find(acc => acc.name === 'newAccount')!.pubkey;
    const space = args.space;

    return SystemProgram.createAccount({
      fromPubkey: from,
      newAccountPubkey: newAccount,
      lamports: await this.connection.getMinimumBalanceForRentExemption(space),
      space,
      programId: SystemProgram.programId
    });
  }

  // ===== SPL TOKEN INSTRUCTIONS =====
  private buildTokenTransfer(accountKeys: any[], args: any): TransactionInstruction {
    const source = accountKeys.find(acc => acc.name === 'source')!.pubkey;
    const destination = accountKeys.find(acc => acc.name === 'destination')!.pubkey;
    const authority = accountKeys.find(acc => acc.name === 'authority')!.pubkey;
    const amount = args.amount;

    return createTransferInstruction(
      source,
      destination,
      authority,
      amount,
      [],
      TOKEN_PROGRAM_ID
    );
  }

  private buildTokenMintTo(accountKeys: any[], args: any): TransactionInstruction {
    const mint = accountKeys.find(acc => acc.name === 'mint')!.pubkey;
    const destination = accountKeys.find(acc => acc.name === 'destination')!.pubkey;
    const authority = accountKeys.find(acc => acc.name === 'authority')!.pubkey;
    const amount = args.amount;

    return createMintToInstruction(
      mint,
      destination,
      authority,
      amount,
      [],
      TOKEN_PROGRAM_ID
    );
  }

  private buildTokenBurn(accountKeys: any[], args: any): TransactionInstruction {
    const source = accountKeys.find(acc => acc.name === 'source')!.pubkey;
    const mint = accountKeys.find(acc => acc.name === 'mint')!.pubkey;
    const authority = accountKeys.find(acc => acc.name === 'authority')!.pubkey;
    const amount = args.amount;

    return createBurnInstruction(
      source,
      mint,
      authority,
      amount,
      [],
      TOKEN_PROGRAM_ID
    );
  }

  private buildTokenApprove(accountKeys: any[], args: any): TransactionInstruction {
    const source = accountKeys.find(acc => acc.name === 'source')!.pubkey;
    const delegate = accountKeys.find(acc => acc.name === 'delegate')!.pubkey;
    const authority = accountKeys.find(acc => acc.name === 'authority')!.pubkey;
    const amount = args.amount;

    return createApproveInstruction(
      source,
      delegate,
      authority,
      amount,
      [],
      TOKEN_PROGRAM_ID
    );
  }

  private buildAssociatedTokenAccount(accountKeys: any[], args: any): TransactionInstruction {
    const funding = accountKeys.find(acc => acc.name === 'funding')!.pubkey;
    const associatedToken = accountKeys.find(acc => acc.name === 'associatedToken')!.pubkey;
    const wallet = accountKeys.find(acc => acc.name === 'wallet')!.pubkey;
    const mint = accountKeys.find(acc => acc.name === 'mint')!.pubkey;

    return createAssociatedTokenAccountInstruction(
      funding,
      associatedToken,
      wallet,
      mint,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
  }

  // ===== METAPLEX INSTRUCTIONS =====
  private buildCreateMetadata(accountKeys: any[], args: any): TransactionInstruction {
    const metadata = accountKeys.find(acc => acc.name === 'metadata')!.pubkey;
    const mint = accountKeys.find(acc => acc.name === 'mint')!.pubkey;
    const mintAuthority = accountKeys.find(acc => acc.name === 'mintAuthority')!.pubkey;
    const payer = accountKeys.find(acc => acc.name === 'payer')!.pubkey;
    const updateAuthority = accountKeys.find(acc => acc.name === 'updateAuthority')!.pubkey;

    // Create metadata instruction data
    const instructionData = Buffer.concat([
      Buffer.from([0]), // Create instruction discriminator
      Buffer.from(args.name, 'utf8'),
      Buffer.from(args.symbol, 'utf8'),
      Buffer.from(args.uri, 'utf8'),
      new PublicKey(mintAuthority).toBuffer(),
      new PublicKey(updateAuthority).toBuffer(),
      new Uint8Array(new Uint16Array([args.sellerFeeBasisPoints]).buffer),
      Buffer.from([args.creators ? 1 : 0])
    ]);

    return new TransactionInstruction({
      keys: [
        { pubkey: metadata, isSigner: false, isWritable: true },
        { pubkey: mint, isSigner: false, isWritable: false },
        { pubkey: mintAuthority, isSigner: true, isWritable: false },
        { pubkey: payer, isSigner: true, isWritable: false },
        { pubkey: updateAuthority, isSigner: true, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false }
      ],
      programId: new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'),
      data: instructionData
    });
  }

  private buildUpdateMetadata(accountKeys: any[], args: any): TransactionInstruction {
    const metadata = accountKeys.find(acc => acc.name === 'metadata')!.pubkey;
    const updateAuthority = accountKeys.find(acc => acc.name === 'updateAuthority')!.pubkey;

    // Build update data based on provided args
    const updateData = {
      name: args.name || null,
      symbol: args.symbol || null,
      uri: args.uri || null,
      sellerFeeBasisPoints: args.sellerFeeBasisPoints || null
    };

    const instructionData = Buffer.concat([
      Buffer.from([1]), // Update instruction discriminator
      Buffer.from(JSON.stringify(updateData))
    ]);

    return new TransactionInstruction({
      keys: [
        { pubkey: metadata, isSigner: false, isWritable: true },
        { pubkey: updateAuthority, isSigner: true, isWritable: false }
      ],
      programId: new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'),
      data: instructionData
    });
  }

  // ===== UTILITY INSTRUCTIONS =====
  private createPriorityFeeInstruction(microLamports: number): TransactionInstruction {
    // Encode u64 (64-bit unsigned integer) in little-endian format
    const microLamportsBuffer = Buffer.alloc(8);
    microLamportsBuffer.writeBigUInt64LE(BigInt(microLamports), 0);

    return new TransactionInstruction({
      keys: [],
      programId: new PublicKey('ComputeBudget111111111111111111111111111111'),
      data: Buffer.concat([
        Buffer.from([3]), // SetComputeUnitPrice instruction
        microLamportsBuffer
      ])
    });
  }

  private createMemoInstruction(memo: string): TransactionInstruction {
    return new TransactionInstruction({
      keys: [],
      programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
      data: Buffer.from(memo, 'utf8')
    });
  }

  // ===== TRANSACTION EXECUTION =====
  async signAndSendTransaction(
    transaction: Transaction, 
    signers: Signer[], 
    confirm = true
  ): Promise<string> {
    const signature = await sendAndConfirmTransaction(
      this.connection,
      transaction,
      signers,
      confirm ? { commitment: 'confirmed' } : undefined
    );
    
    return signature;
  }

  // Get recent blockhash and set on transaction
  async prepareTransaction(transaction: Transaction, payer: PublicKey): Promise<void> {
    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    transaction.feePayer = payer;
  }

  // Estimate transaction cost
  async estimateCost(transaction: Transaction): Promise<{
    lamports: number;
    sol: number;
  }> {
    const lamports = await transaction.getEstimatedFee(this.connection);
    
    // Handle case where fee estimation fails
    if (lamports === null) {
      // Provide a reasonable fallback or throw an error
      // For now, we'll use a fallback estimate
      return {
        lamports: 5000, // ~0.000005 SOL fallback
        sol: 0.000005
      };
    }
    
    return {
      lamports,
      sol: lamports / 1e9
    };
  }
}
