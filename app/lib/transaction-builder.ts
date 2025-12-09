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
import { getTemplateById } from './instructions/templates';

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
      } else if (instruction.template.id === 'flash_loan_liquidity_withdraw') {
        const result = await this.buildFlashLoanLiquidityWithdraw(instruction);
        for (const inst of result.instructions) {
          transaction.add(inst);
        }
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
    
    // Convert account names to PublicKeys with validation
    // Also include accounts from template that have default pubkeys
    const allAccounts: Record<string, string> = { ...accounts };
    
    // Add accounts with default pubkeys from template if not already provided
    template.accounts.forEach((account) => {
      if (account.pubkey && !allAccounts[account.name]) {
        allAccounts[account.name] = account.pubkey;
      }
    });
    
    // Validate all required accounts are present
    const requiredAccounts = template.accounts.filter(acc => !acc.isOptional);
    for (const reqAcc of requiredAccounts) {
      if (!allAccounts[reqAcc.name] && !reqAcc.pubkey) {
        throw new Error(`Missing required account '${reqAcc.name}' for template '${template.id}'`);
      }
    }
    
    const accountKeys = Object.entries(allAccounts)
      .filter(([name, pubkey]) => {
        // Keep all accounts, but validate they're strings
        if (!pubkey) {
          return false;
        }
        if (typeof pubkey !== 'string') {
          throw new Error(`Account '${name}' in template '${template.id}' has invalid type: ${typeof pubkey}, value: ${pubkey}`);
        }
        const trimmed = pubkey.trim();
        if (trimmed === '') {
          return false;
        }
        return true;
      })
      .map(([name, pubkey]) => {
        try {
          const trimmedPubkey = (pubkey as string).trim();
          return {
            name,
            pubkey: new PublicKey(trimmedPubkey)
          };
        } catch (error: any) {
          throw new Error(`Invalid public key for account '${name}' in template '${template.id}': "${pubkey}". Error: ${error.message}`);
        }
      });

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
      
      // ===== DeFi INSTRUCTIONS =====
      case 'jupiter_swap':
        return this.buildJupiterSwap(accountKeys, args);
      
      case 'orca_open_position':
        return this.buildOrcaOpenPosition(accountKeys, args);
      
      case 'marinade_deposit':
        return this.buildMarinadeDeposit(accountKeys, args);
      
      case 'raydium_swap':
        return this.buildRaydiumSwap(accountKeys, args);
      
      // ===== FLASH LOAN INSTRUCTIONS =====
      case 'kamino_flash_loan':
        return this.buildKaminoFlashLoan(accountKeys, args);
      
      case 'kamino_flash_repay':
        return this.buildKaminoFlashRepay(accountKeys, args);
      
      case 'solend_flash_loan':
        return this.buildSolendFlashLoan(accountKeys, args);
      
      case 'solend_flash_repay':
        return this.buildSolendFlashRepay(accountKeys, args);
      
      case 'marginfi_flash_loan':
        return this.buildMarginfiFlashLoan(accountKeys, args);
      
      case 'marginfi_flash_repay':
        return this.buildMarginfiFlashRepay(accountKeys, args);
      
      // ===== NFT MARKETPLACE INSTRUCTIONS =====
      case 'me_buy_now':
        return this.buildMagicEdenBuyNow(accountKeys, args);
      
      // ===== CUSTOM INSTRUCTIONS =====
      case 'custom_instruction':
        return this.buildCustomInstruction(accountKeys, args, template);
      
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

  /**
   * Build flash loan liquidity withdrawal sequence
   * Sequence: 1. Flash Loan Borrow, 2. Withdraw from Pool, 3. Flash Loan Repay
   * This allows users to withdraw liquidity even if they don't have tokens for fees upfront
   */
  private async buildFlashLoanLiquidityWithdraw(builtInstruction: BuiltInstruction): Promise<{
    instructions: TransactionInstruction[];
    signers: Keypair[];
  }> {
    const { accounts, args } = builtInstruction;
    const instructions: TransactionInstruction[] = [];
    const signers: Keypair[] = [];

    const borrower = new PublicKey(accounts.borrower);
    const poolAddress = new PublicKey(accounts.poolAddress);
    const positionAccount = new PublicKey(accounts.positionAccount);
    const withdrawTokenAccount = new PublicKey(accounts.withdrawTokenAccount);
    const flashLoanPool = new PublicKey(accounts.flashLoanPool);
    const borrowerTokenAccount = new PublicKey(accounts.borrowerTokenAccount);
    const tokenMint = new PublicKey(accounts.tokenMint);

    const withdrawAmount = BigInt(args.withdrawAmount || 0);
    const flashLoanAmount = BigInt(args.flashLoanAmount || 0);
    const protocol = args.protocol || 'orca';
    const flashLoanProtocol = args.flashLoanProtocol || 'kamino';
    const flashLoanFeeBps = args.flashLoanFeeBps || 9; // Default 0.09%
    
    // Calculate repay amount (loan + fee)
    const feeAmount = (flashLoanAmount * BigInt(flashLoanFeeBps)) / BigInt(10000);
    const repayAmount = flashLoanAmount + feeAmount;

    // Step 1: Flash Loan Borrow
    // Use the flash loan protocol's borrow instruction
    // For now, we'll create a transfer instruction as a placeholder
    // In production, this would use the actual flash loan program instruction
    const flashLoanBorrow = createTransferInstruction(
      flashLoanPool, // Source (lending pool token account)
      borrowerTokenAccount, // Destination (borrower token account)
      flashLoanPool, // Authority (program authority - would be PDA in real implementation)
      flashLoanAmount,
      [],
      TOKEN_PROGRAM_ID
    );
    instructions.push(flashLoanBorrow);

    // Step 2: Withdraw from Liquidity Pool
    // This is a simplified version - in production, you'd use the actual pool program SDK
    // For Orca Whirlpool, Raydium, etc., you'd construct the proper withdraw instruction
    const poolProgramId = protocol === 'orca' 
      ? new PublicKey('whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc') // Orca Whirlpool
      : protocol === 'raydium'
      ? new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8') // Raydium
      : poolAddress; // Fallback to pool address as program ID

    // Create withdraw instruction data (simplified - real implementation would use proper instruction encoding)
    const withdrawData = Buffer.alloc(9);
    withdrawData.writeUInt8(3, 0); // Withdraw instruction discriminator (placeholder)
    withdrawData.writeBigUInt64LE(withdrawAmount, 1);

    const withdrawInstruction = new TransactionInstruction({
      keys: [
        { pubkey: poolAddress, isSigner: false, isWritable: true },
        { pubkey: positionAccount, isSigner: false, isWritable: true },
        { pubkey: withdrawTokenAccount, isSigner: false, isWritable: true },
        { pubkey: borrower, isSigner: true, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: poolProgramId,
      data: withdrawData
    });
    instructions.push(withdrawInstruction);

    // Step 3: Flash Loan Repay (from withdrawn tokens)
    const flashLoanRepay = createTransferInstruction(
      withdrawTokenAccount, // Source (withdrawn tokens)
      flashLoanPool, // Destination (lending pool token account)
      borrower, // Authority (borrower)
      repayAmount,
      [],
      TOKEN_PROGRAM_ID
    );
    instructions.push(flashLoanRepay);

    return { instructions, signers };
  }

  // ===== METAPLEX INSTRUCTIONS =====
  private buildCreateMetadata(accountKeys: any[], args: any): TransactionInstruction {
    const metadata = accountKeys.find(acc => acc.name === 'metadata')!.pubkey;
    const mint = accountKeys.find(acc => acc.name === 'mint')!.pubkey;
    const mintAuthority = accountKeys.find(acc => acc.name === 'mintAuthority')!.pubkey;
    const payer = accountKeys.find(acc => acc.name === 'payer')!.pubkey;
    const updateAuthority = accountKeys.find(acc => acc.name === 'updateAuthority')!.pubkey;

    const name = String(args.name || '');
    const symbol = String(args.symbol || '');
    const uri = String(args.uri || '');
    const sellerFeeBasisPoints = Number(args.sellerFeeBasisPoints || 0);

    // Create metadata instruction data (properly encoded)
    const instructionData = Buffer.concat([
      Buffer.from([0]), // Create instruction discriminator
      Buffer.from(name, 'utf8'),
      Buffer.from([0]), // Null terminator
      Buffer.from(symbol, 'utf8'),
      Buffer.from([0]), // Null terminator
      Buffer.from(uri, 'utf8'),
      Buffer.from([0]), // Null terminator
      new PublicKey(mintAuthority).toBuffer(),
      new PublicKey(updateAuthority).toBuffer(),
      Buffer.alloc(2),
      Buffer.from([sellerFeeBasisPoints & 0xFF, (sellerFeeBasisPoints >> 8) & 0xFF]),
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
      Buffer.from(JSON.stringify(updateData), 'utf8')
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

  // ===== DeFi INSTRUCTIONS =====
  private buildJupiterSwap(accountKeys: any[], args: any): TransactionInstruction {
    const userTransferAuthority = accountKeys.find(acc => acc.name === 'userTransferAuthority')!.pubkey;
    const userSourceTokenAccount = accountKeys.find(acc => acc.name === 'userSourceTokenAccount')!.pubkey;
    const userDestinationTokenAccount = accountKeys.find(acc => acc.name === 'userDestinationTokenAccount')!.pubkey;
    const destinationTokenAccount = accountKeys.find(acc => acc.name === 'destinationTokenAccount')!.pubkey;
    const destinationMint = accountKeys.find(acc => acc.name === 'destinationMint')!.pubkey;

    const amount = BigInt(args.amount || 0);
    const minAmountOut = BigInt(args.minAmountOut || 0);

    // Jupiter swap instruction data (simplified - real implementation would use Jupiter SDK)
    const data = Buffer.alloc(16);
    data.writeBigUInt64LE(amount, 0);
    data.writeBigUInt64LE(minAmountOut, 8);

    const keys = [
      { pubkey: userTransferAuthority, isSigner: true, isWritable: false },
      { pubkey: userSourceTokenAccount, isSigner: false, isWritable: true },
      { pubkey: userDestinationTokenAccount, isSigner: false, isWritable: true },
      { pubkey: destinationTokenAccount, isSigner: false, isWritable: true },
      { pubkey: destinationMint, isSigner: false, isWritable: false },
    ];

    const platformFeeAccount = accountKeys.find(acc => acc.name === 'platformFeeAccount');
    if (platformFeeAccount) {
      keys.push({ pubkey: platformFeeAccount.pubkey, isSigner: false, isWritable: true });
    }

    return new TransactionInstruction({
      keys,
      programId: new PublicKey('JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4'),
      data
    });
  }

  private buildOrcaOpenPosition(accountKeys: any[], args: any): TransactionInstruction {
    const position = accountKeys.find(acc => acc.name === 'position')!.pubkey;
    const positionMint = accountKeys.find(acc => acc.name === 'positionMint')!.pubkey;
    const positionTokenAccount = accountKeys.find(acc => acc.name === 'positionTokenAccount')!.pubkey;
    const whirlpool = accountKeys.find(acc => acc.name === 'whirlpool')!.pubkey;
    const owner = accountKeys.find(acc => acc.name === 'owner')!.pubkey;

    const tickLowerIndex = args.tickLowerIndex || 0;
    const tickUpperIndex = args.tickUpperIndex || 0;
    const tickSpacing = args.tickSpacing || 1;

    const data = Buffer.alloc(10);
    data.writeInt32LE(tickLowerIndex, 0);
    data.writeInt32LE(tickUpperIndex, 4);
    data.writeUInt16LE(tickSpacing, 8);

    return new TransactionInstruction({
      keys: [
        { pubkey: position, isSigner: false, isWritable: true },
        { pubkey: positionMint, isSigner: false, isWritable: true },
        { pubkey: positionTokenAccount, isSigner: false, isWritable: true },
        { pubkey: whirlpool, isSigner: false, isWritable: false },
        { pubkey: owner, isSigner: true, isWritable: false },
      ],
      programId: new PublicKey('whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc'),
      data
    });
  }

  private buildMarinadeDeposit(accountKeys: any[], args: any): TransactionInstruction {
    const state = accountKeys.find(acc => acc.name === 'state')!.pubkey;
    const msolMint = accountKeys.find(acc => acc.name === 'msolMint')!.pubkey;
    const liqPoolSolLegPda = accountKeys.find(acc => acc.name === 'liqPoolSolLegPda')!.pubkey;
    const liqPoolMsolLeg = accountKeys.find(acc => acc.name === 'liqPoolMsolLeg')!.pubkey;
    const treasuryMsolAccount = accountKeys.find(acc => acc.name === 'treasuryMsolAccount')!.pubkey;
    const userSolPda = accountKeys.find(acc => acc.name === 'userSolPda')!.pubkey;
    const userMsolPda = accountKeys.find(acc => acc.name === 'userMsolPda')!.pubkey;
    const user = accountKeys.find(acc => acc.name === 'user')!.pubkey;

    const amount = BigInt(args.amount || 0);
    const data = Buffer.alloc(8);
    data.writeBigUInt64LE(amount, 0);

    return new TransactionInstruction({
      keys: [
        { pubkey: state, isSigner: false, isWritable: false },
        { pubkey: msolMint, isSigner: false, isWritable: false },
        { pubkey: liqPoolSolLegPda, isSigner: false, isWritable: true },
        { pubkey: liqPoolMsolLeg, isSigner: false, isWritable: true },
        { pubkey: treasuryMsolAccount, isSigner: false, isWritable: true },
        { pubkey: userSolPda, isSigner: false, isWritable: true },
        { pubkey: userMsolPda, isSigner: false, isWritable: true },
        { pubkey: user, isSigner: true, isWritable: false },
      ],
      programId: new PublicKey('MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD'),
      data
    });
  }

  private buildRaydiumSwap(accountKeys: any[], args: any): TransactionInstruction {
    // Extract all required accounts
    const keys = accountKeys.map(acc => ({
      pubkey: acc.pubkey,
      isSigner: acc.name.includes('owner') || acc.name.includes('signer'),
      isWritable: acc.name.includes('account') || acc.name.includes('pool') || acc.name.includes('market')
    }));

    const amountIn = BigInt(args.amountIn || 0);
    const minimumAmountOut = BigInt(args.minimumAmountOut || 0);

    const data = Buffer.alloc(16);
    data.writeBigUInt64LE(amountIn, 0);
    data.writeBigUInt64LE(minimumAmountOut, 8);

    return new TransactionInstruction({
      keys,
      programId: new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8'),
      data
    });
  }

  // ===== FLASH LOAN INSTRUCTIONS =====
  private buildKaminoFlashLoan(accountKeys: any[], args: any): TransactionInstruction {
    const lendingPool = accountKeys.find(acc => acc.name === 'lendingPool')!.pubkey;
    const borrowerTokenAccount = accountKeys.find(acc => acc.name === 'borrowerTokenAccount')!.pubkey;
    const borrower = accountKeys.find(acc => acc.name === 'borrower')!.pubkey;
    const tokenMint = accountKeys.find(acc => acc.name === 'tokenMint')!.pubkey;

    const amount = BigInt(args.amount || 0);
    const data = Buffer.alloc(8);
    data.writeBigUInt64LE(amount, 0);

    return new TransactionInstruction({
      keys: [
        { pubkey: lendingPool, isSigner: false, isWritable: true },
        { pubkey: borrowerTokenAccount, isSigner: false, isWritable: true },
        { pubkey: borrower, isSigner: true, isWritable: false },
        { pubkey: tokenMint, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      programId: new PublicKey('KLend2g3cP87fffoy8q1mQqGKjLj1d1M24gM4RdR7Kx'),
      data
    });
  }

  private buildKaminoFlashRepay(accountKeys: any[], args: any): TransactionInstruction {
    const lendingPool = accountKeys.find(acc => acc.name === 'lendingPool')!.pubkey;
    const borrowerTokenAccount = accountKeys.find(acc => acc.name === 'borrowerTokenAccount')!.pubkey;
    const borrower = accountKeys.find(acc => acc.name === 'borrower')!.pubkey;
    const tokenMint = accountKeys.find(acc => acc.name === 'tokenMint')!.pubkey;

    const repayAmount = BigInt(args.repayAmount || 0);
    const data = Buffer.alloc(8);
    data.writeBigUInt64LE(repayAmount, 0);

    return new TransactionInstruction({
      keys: [
        { pubkey: lendingPool, isSigner: false, isWritable: true },
        { pubkey: borrowerTokenAccount, isSigner: false, isWritable: true },
        { pubkey: borrower, isSigner: true, isWritable: false },
        { pubkey: tokenMint, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      programId: new PublicKey('KLend2g3cP87fffoy8q1mQqGKjLj1d1M24gM4RdR7Kx'),
      data
    });
  }

  private buildSolendFlashLoan(accountKeys: any[], args: any): TransactionInstruction {
    const lendingPool = accountKeys.find(acc => acc.name === 'lendingPool')!.pubkey;
    const borrowerTokenAccount = accountKeys.find(acc => acc.name === 'borrowerTokenAccount')!.pubkey;
    const borrower = accountKeys.find(acc => acc.name === 'borrower')!.pubkey;
    const tokenMint = accountKeys.find(acc => acc.name === 'tokenMint')!.pubkey;

    const amount = BigInt(args.amount || 0);
    const data = Buffer.alloc(8);
    data.writeBigUInt64LE(amount, 0);

    return new TransactionInstruction({
      keys: [
        { pubkey: lendingPool, isSigner: false, isWritable: true },
        { pubkey: borrowerTokenAccount, isSigner: false, isWritable: true },
        { pubkey: borrower, isSigner: true, isWritable: false },
        { pubkey: tokenMint, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      programId: new PublicKey('So1endDq2YkqhipRh3WViPa8hdiSpxWy6z3Z6tMCpAo'),
      data
    });
  }

  private buildSolendFlashRepay(accountKeys: any[], args: any): TransactionInstruction {
    const lendingPool = accountKeys.find(acc => acc.name === 'lendingPool')!.pubkey;
    const borrowerTokenAccount = accountKeys.find(acc => acc.name === 'borrowerTokenAccount')!.pubkey;
    const borrower = accountKeys.find(acc => acc.name === 'borrower')!.pubkey;
    const tokenMint = accountKeys.find(acc => acc.name === 'tokenMint')!.pubkey;

    const repayAmount = BigInt(args.repayAmount || 0);
    const data = Buffer.alloc(8);
    data.writeBigUInt64LE(repayAmount, 0);

    return new TransactionInstruction({
      keys: [
        { pubkey: lendingPool, isSigner: false, isWritable: true },
        { pubkey: borrowerTokenAccount, isSigner: false, isWritable: true },
        { pubkey: borrower, isSigner: true, isWritable: false },
        { pubkey: tokenMint, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      programId: new PublicKey('So1endDq2YkqhipRh3WViPa8hdiSpxWy6z3Z6tMCpAo'),
      data
    });
  }

  private buildMarginfiFlashLoan(accountKeys: any[], args: any): TransactionInstruction {
    try {
      const lendingPool = accountKeys.find(acc => acc.name === 'lendingPool');
      const borrowerTokenAccount = accountKeys.find(acc => acc.name === 'borrowerTokenAccount');
      const borrower = accountKeys.find(acc => acc.name === 'borrower');
      const tokenMint = accountKeys.find(acc => acc.name === 'tokenMint');

      if (!lendingPool) throw new Error('Missing account: lendingPool');
      if (!borrowerTokenAccount) throw new Error('Missing account: borrowerTokenAccount');
      if (!borrower) throw new Error('Missing account: borrower');
      if (!tokenMint) throw new Error('Missing account: tokenMint');

      const amount = BigInt(args.amount || 0);
      const data = Buffer.alloc(8);
      data.writeBigUInt64LE(amount, 0);

      return new TransactionInstruction({
        keys: [
          { pubkey: lendingPool.pubkey, isSigner: false, isWritable: true },
          { pubkey: borrowerTokenAccount.pubkey, isSigner: false, isWritable: true },
          { pubkey: borrower.pubkey, isSigner: true, isWritable: false },
          { pubkey: tokenMint.pubkey, isSigner: false, isWritable: false },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        ],
        programId: new PublicKey('So1endDq2YkqhipRh3WViPa8hdiSpxWy6z3Z6tMCpAo'), // Placeholder: Using Solend program ID for testing (Marginfi program ID was invalid)
        data
      });
    } catch (error: any) {
      throw new Error(`buildMarginfiFlashLoan failed: ${error.message}. AccountKeys: ${JSON.stringify(accountKeys.map(acc => ({ name: acc.name, pubkey: acc.pubkey?.toString() })))}`);
    }
  }

  private buildMarginfiFlashRepay(accountKeys: any[], args: any): TransactionInstruction {
    try {
      const lendingPool = accountKeys.find(acc => acc.name === 'lendingPool');
      const borrowerTokenAccount = accountKeys.find(acc => acc.name === 'borrowerTokenAccount');
      const borrower = accountKeys.find(acc => acc.name === 'borrower');
      const tokenMint = accountKeys.find(acc => acc.name === 'tokenMint');

      if (!lendingPool) throw new Error('Missing account: lendingPool');
      if (!borrowerTokenAccount) throw new Error('Missing account: borrowerTokenAccount');
      if (!borrower) throw new Error('Missing account: borrower');
      if (!tokenMint) throw new Error('Missing account: tokenMint');

      const repayAmount = BigInt(args.repayAmount || 0);
      const data = Buffer.alloc(8);
      data.writeBigUInt64LE(repayAmount, 0);

      return new TransactionInstruction({
        keys: [
          { pubkey: lendingPool.pubkey, isSigner: false, isWritable: true },
          { pubkey: borrowerTokenAccount.pubkey, isSigner: false, isWritable: true },
          { pubkey: borrower.pubkey, isSigner: true, isWritable: false },
          { pubkey: tokenMint.pubkey, isSigner: false, isWritable: false },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        ],
        programId: new PublicKey('So1endDq2YkqhipRh3WViPa8hdiSpxWy6z3Z6tMCpAo'), // Placeholder: Using Solend program ID for testing (Marginfi program ID was invalid)
        data
      });
    } catch (error: any) {
      throw new Error(`buildMarginfiFlashRepay failed: ${error.message}. AccountKeys: ${JSON.stringify(accountKeys.map(acc => ({ name: acc.name, pubkey: acc.pubkey?.toString() })))}`);
    }
  }

  // ===== NFT MARKETPLACE INSTRUCTIONS =====
  private buildMagicEdenBuyNow(accountKeys: any[], args: any): TransactionInstruction {
    const keys = accountKeys.map(acc => ({
      pubkey: acc.pubkey,
      isSigner: acc.name === 'buyer',
      isWritable: acc.name.includes('account') || acc.name.includes('treasury') || acc.name.includes('tradeState')
    }));

    const tradeStateBump = args.tradeStateBump || 0;
    const escrowPaymentBump = args.escrowPaymentBump || 0;
    const buyerPrice = BigInt(args.buyerPrice || 0);
    const tokenSize = BigInt(args.tokenSize || 1);

    const data = Buffer.alloc(18);
    data.writeUInt8(tradeStateBump, 0);
    data.writeUInt8(escrowPaymentBump, 1);
    data.writeBigUInt64LE(buyerPrice, 2);
    data.writeBigUInt64LE(tokenSize, 10);

    return new TransactionInstruction({
      keys,
      programId: new PublicKey('M2mx93ekt1fmXSVkTrUL9xVFHkmME8HTUi5Cyc5aF7K'),
      data
    });
  }

  // ===== CUSTOM INSTRUCTIONS =====
  private buildCustomInstruction(accountKeys: any[], args: any, template: any): TransactionInstruction {
    // For custom instructions, use the programId from template or args
    const programId = template.programId || args.programId;
    if (!programId) {
      throw new Error('Custom instruction requires a programId');
    }

    const keys = accountKeys.map(acc => ({
      pubkey: acc.pubkey,
      isSigner: acc.name.includes('signer') || acc.name.includes('authority'),
      isWritable: acc.name.includes('writable') || acc.name.includes('account')
    }));

    // Build data from args (simplified - in production would need proper serialization)
    const dataParts: Buffer[] = [];
    for (const [key, value] of Object.entries(args)) {
      if (key !== 'programId') {
        if (typeof value === 'number') {
          const buf = Buffer.alloc(8);
          buf.writeBigUInt64LE(BigInt(value), 0);
          dataParts.push(buf);
        } else if (typeof value === 'string') {
          dataParts.push(Buffer.from(value, 'utf8'));
        }
      }
    }

    return new TransactionInstruction({
      keys,
      programId: new PublicKey(programId),
      data: Buffer.concat(dataParts)
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
