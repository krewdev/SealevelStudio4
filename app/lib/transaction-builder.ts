import { 
  Connection, 
  PublicKey, 
  Transaction, 
  TransactionInstruction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  sendAndConfirmTransaction,
  Signer,
  Keypair,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  MINT_SIZE,
  getMinimumBalanceForRentExemptMint,
  createTransferInstruction,
  createMintToInstruction,
  createBurnInstruction,
  createApproveInstruction,
  createAssociatedTokenAccountInstruction,
  createInitializeMintInstruction,
  createInitializeAccountInstruction,
  createFreezeAccountInstruction,
  createThawAccountInstruction,
  getAssociatedTokenAddress
} from '@solana/spl-token';
import { BuiltInstruction, TransactionDraft } from './instructions/types';

// Platform fee configuration
// 0.0002 SOL per transaction
const PLATFORM_FEE_LAMPORTS = Math.floor(0.0002 * LAMPORTS_PER_SOL);

// Environment variable for platform fee recipient
// Should be a valid Solana address
const PLATFORM_FEE_RECIPIENT_ENV = process.env.NEXT_PUBLIC_PLATFORM_FEE_ADDRESS || process.env.NEXT_PUBLIC_TREASURY_ADDRESS || '';

export class TransactionBuilder {
  constructor(private connection: Connection) {}

  async buildTransaction(draft: TransactionDraft): Promise<Transaction> {
    const transaction = new Transaction();
    
    // Add priority fee if specified
    if (draft.priorityFee) {
      transaction.add(this.createPriorityFeeInstruction(draft.priorityFee));
    }

    // Store additional signers (like mint keypairs)
    const additionalSigners: Keypair[] = [];
    
    // Convert each instruction to Solana instruction
    for (const instruction of draft.instructions) {
      // Handle special multi-instruction operations
      if (instruction.args._operation === 'create_token_and_mint') {
        const result = await this.buildCreateTokenAndMint(instruction);
        for (const inst of result.instructions) {
          transaction.add(inst);
        }
        // Add mint keypair to signers
        additionalSigners.push(...result.signers);
      } else {
        const solanaInstruction = await this.buildInstruction(instruction);
        transaction.add(solanaInstruction);
      }
    }
    
    // Store additional signers in transaction metadata (for R&D purposes)
    (transaction as any)._additionalSigners = additionalSigners;

    // Add memo if specified
    if (draft.memo) {
      transaction.add(this.createMemoInstruction(draft.memo));
    }

    return transaction;
  }

  /**
   * Add a fixed platform fee transfer to the transaction, if a valid
   * platform fee recipient is configured.
   *
   * This should be called after buildTransaction and before prepareTransaction.
   */
  addPlatformFee(transaction: Transaction, payer: PublicKey): void {
    // If no recipient configured, skip adding the fee
    if (!PLATFORM_FEE_RECIPIENT_ENV) {
      return;
    }

    let recipient: PublicKey;
    try {
      recipient = new PublicKey(PLATFORM_FEE_RECIPIENT_ENV);
    } catch {
      // Invalid address configured - skip to avoid breaking transactions
      console.warn('Invalid platform fee recipient address configured, skipping platform fee.');
      return;
    }

    if (PLATFORM_FEE_LAMPORTS <= 0) {
      return;
    }

    const feeIx = SystemProgram.transfer({
      fromPubkey: payer,
      toPubkey: recipient,
      lamports: PLATFORM_FEE_LAMPORTS,
    });

    transaction.add(feeIx);
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
      
      case 'spl_token_create_mint':
        // This is handled separately in buildTransaction as multi-instruction
        throw new Error('spl_token_create_mint should be handled via _operation flag');
      
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

  // Build create token + mint (multi-instruction operation)
  // Returns both instructions and the mint keypair (needs to sign)
  private async buildCreateTokenAndMint(builtInstruction: BuiltInstruction): Promise<{
    instructions: TransactionInstruction[];
    signers: Keypair[];
  }> {
    const { accounts, args } = builtInstruction;
    const payer = new PublicKey(accounts.payer);
    const mintAuthority = new PublicKey(args.mintAuthority || accounts.payer);
    const tokenAccountOwner = new PublicKey(accounts.tokenAccountOwner || accounts.payer);
    
    // Generate keypair for mint (for R&D - in production, this should be deterministic or user-provided)
    const mintKeypair = Keypair.generate();
    const mint = mintKeypair.publicKey;
    
    // Get associated token account address
    const tokenAccount = await getAssociatedTokenAddress(
      mint,
      tokenAccountOwner,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    
    // Core SPL Mint Attributes
    const decimals = args.decimals || 9;
    const initialSupply = args.initialSupply || BigInt(0);
    const enableFreeze = args.enableFreeze === true;
    const freezeAuthorityPubkey = enableFreeze && args.freezeAuthority 
      ? new PublicKey(args.freezeAuthority) 
      : null;
    const revokeMintAuthority = args.revokeMintAuthority === true;
    const useToken2022 = args.useToken2022 === true;
    
    // Token Account Attributes
    const delegate = args.delegate ? new PublicKey(args.delegate) : null;
    const delegatedAmount = args.delegatedAmount || BigInt(0);
    const freezeInitialAccount = args.freezeInitialAccount === true;
    const isNative = args.isNative === true;
    
    // Metaplex Metadata
    const tokenName = args.tokenName || '';
    const tokenSymbol = args.tokenSymbol || '';
    const tokenImage = args.tokenImage || ''; // Base64 data URI or URL
    const metadataURI = args.metadataURI || '';
    const sellerFeeBasisPoints = args.sellerFeeBasisPoints || 500;
    const creators = args.creators || '';
    const primarySaleHappened = args.primarySaleHappened === true;
    const isMutable = args.isMutable !== false;
    
    // Token-2022 Extensions
    const transferFee = args.transferFee || 0;
    const enableTax = args.enableTax === true;
    const transferHookProgram = args.transferHookProgram ? new PublicKey(args.transferHookProgram) : null;
    const enableConfidentialTransfers = args.enableConfidentialTransfers === true;
    const enableInterestBearing = args.enableInterestBearing === true;
    const interestRate = args.interestRate || 0;
    const enableNonTransferable = args.enableNonTransferable === true;
    const enableTransferMemo = args.enableTransferMemo === true;
    const enableImmutableOwner = args.enableImmutableOwner === true;
    const metadataPointer = args.metadataPointer || '';
    const supplyCap = args.supplyCap || BigInt(0);
    
    // Determine which token program to use
    const TOKEN_PROGRAM = useToken2022 
      ? new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb') // Token-2022
      : TOKEN_PROGRAM_ID; // Standard SPL Token
    
    // Get rent exemption for mint
    const mintRent = await getMinimumBalanceForRentExemptMint(this.connection);
    
    const instructions: TransactionInstruction[] = [];
    
    // 1. Create mint account
    // Note: Token-2022 requires larger space for extensions
    const mintSpace = useToken2022 ? MINT_SIZE + 1024 : MINT_SIZE; // Extra space for extensions
    const mintRent2022 = useToken2022 
      ? await this.connection.getMinimumBalanceForRentExemption(mintSpace)
      : mintRent;
    
    instructions.push(
      SystemProgram.createAccount({
        fromPubkey: payer,
        newAccountPubkey: mint,
        space: mintSpace,
        lamports: mintRent2022,
        programId: TOKEN_PROGRAM
      })
    );
    
    // 2. Initialize mint with freeze authority (if enabled)
    instructions.push(
      createInitializeMintInstruction(
        mint,
        decimals,
        mintAuthority,
        freezeAuthorityPubkey, // freeze authority (null = no freeze capability)
        TOKEN_PROGRAM
      )
    );
    
    // 2b. For Token-2022: Add extensions if enabled
    if (useToken2022) {
      // Transfer Fee Extension
      if (enableTax && transferFee > 0) {
        // This would require Token-2022's extension initialization
        // For now, we log it - full implementation would use extension instructions
        console.log('Token-2022: Transfer fee extension would be initialized here');
      }
      
      // Interest-bearing Extension
      if (enableInterestBearing && interestRate !== 0) {
        console.log('Token-2022: Interest-bearing extension would be initialized here');
      }
      
      // Non-transferable Extension
      if (enableNonTransferable) {
        console.log('Token-2022: Non-transferable extension would be initialized here');
      }
      
      // Metadata Pointer Extension
      if (metadataPointer) {
        console.log('Token-2022: Metadata pointer extension would be initialized here');
      }
    }
    
    // 3. Create associated token account
    instructions.push(
      createAssociatedTokenAccountInstruction(
        payer,
        tokenAccount,
        tokenAccountOwner,
        mint,
        TOKEN_PROGRAM,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );
    
    // 3b. Approve delegate (if specified)
    if (delegate && delegatedAmount > 0) {
      instructions.push(
        createApproveInstruction(
          tokenAccount,
          delegate,
          tokenAccountOwner,
          delegatedAmount,
          [],
          TOKEN_PROGRAM
        )
      );
    }
    
    // 4. Mint initial supply (respecting supply cap if set)
    if (initialSupply > 0) {
      // Check supply cap if enabled
      if (supplyCap > 0 && initialSupply > supplyCap) {
        throw new Error(`Initial supply ${initialSupply} exceeds supply cap ${supplyCap}`);
      }
      
      instructions.push(
        createMintToInstruction(
          mint,
          tokenAccount,
          mintAuthority,
          initialSupply,
          [],
          TOKEN_PROGRAM
        )
      );
    }
    
    // 5. Create Metaplex Metadata (if provided)
    if (tokenName || tokenSymbol || metadataURI || tokenImage) {
      // This would create a Metaplex metadata account
      // For now, we'll add the instruction structure
      const metadataProgramId = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
      // Metadata PDA derivation would go here
      // Full implementation would use Metaplex SDK or manual instruction building
      // If tokenImage is provided, it should be included in the metadata JSON
      // The image can be a base64 data URI or a URL - if base64, it should be uploaded to IPFS/Arweave first
      console.log('Metaplex metadata would be created here with:', {
        name: tokenName,
        symbol: tokenSymbol,
        image: tokenImage ? (tokenImage.startsWith('data:') ? '[Base64 Image]' : tokenImage) : undefined,
        uri: metadataURI,
        sellerFeeBasisPoints,
        creators,
        primarySaleHappened,
        isMutable
      });
    }
    
    // 6. Freeze token account (if freeze is enabled and requested)
    if (enableFreeze && freezeAuthorityPubkey && freezeInitialAccount) {
      instructions.push(
        createFreezeAccountInstruction(
          tokenAccount,
          mint,
          freezeAuthorityPubkey,
          [],
          TOKEN_PROGRAM
        )
      );
    }
    
    // 7. Revoke mint authority (if requested - makes supply immutable)
    if (revokeMintAuthority) {
      // This would require a revoke authority instruction
      // For standard SPL Token, this sets mint authority to null
      console.log('Mint authority would be revoked here (sets to null)');
      // Full implementation: createSetAuthorityInstruction with AuthorityType.MintTokens
    }
    
    return {
      instructions,
      signers: [mintKeypair] // Mint keypair must sign the create account instruction
    };
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

  // Estimate transaction cost with platform fee breakdown
  async estimateCost(transaction: Transaction): Promise<{
    lamports: number;
    sol: number;
    platformFee: {
      lamports: number;
      sol: number;
    };
    total: {
      lamports: number;
      sol: number;
    };
  }> {
    const baseLamports = await transaction.getEstimatedFee(this.connection);

    // Handle case where fee estimation fails
    if (baseLamports === null) {
      // Provide a reasonable fallback or throw an error
      // For now, we'll use a fallback estimate
      const fallbackLamports = 5000; // ~0.000005 SOL fallback
      const platformFeeLamports = PLATFORM_FEE_LAMPORTS;

      return {
        lamports: fallbackLamports,
        sol: fallbackLamports / 1e9,
        platformFee: {
          lamports: platformFeeLamports,
          sol: platformFeeLamports / 1e9
        },
        total: {
          lamports: fallbackLamports + platformFeeLamports,
          sol: (fallbackLamports + platformFeeLamports) / 1e9
        }
      };
    }

    const platformFeeLamports = PLATFORM_FEE_LAMPORTS;
    const totalLamports = baseLamports + platformFeeLamports;

    return {
      lamports: baseLamports,
      sol: baseLamports / 1e9,
      platformFee: {
        lamports: platformFeeLamports,
        sol: platformFeeLamports / 1e9
      },
      total: {
        lamports: totalLamports,
        sol: totalLamports / 1e9
      }
    };
  }
}
