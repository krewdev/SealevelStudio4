/**
 * MCP Resource: Complex Transaction Examples
 * Provides access to real-world complex transaction examples from the codebase
 */

export interface TransactionExample {
  id: string;
  name: string;
  description: string;
  category: 'simple' | 'multi-step' | 'arbitrage' | 'defi' | 'nft' | 'advanced';
  complexity: 'basic' | 'intermediate' | 'advanced' | 'expert';
  instructions: InstructionExample[];
  codeSnippet?: string;
  explanation?: string;
  relatedFiles?: string[];
}

export interface InstructionExample {
  type: string;
  program: string;
  accounts: Record<string, string>;
  args: Record<string, any>;
  description: string;
}

/**
 * Real transaction examples from the codebase
 */
export const TRANSACTION_EXAMPLES: TransactionExample[] = [
  {
    id: 'system-transfer',
    name: 'System Transfer',
    description: 'Simple SOL transfer between wallets',
    category: 'simple',
    complexity: 'basic',
    instructions: [
      {
        type: 'system_transfer',
        program: 'SystemProgram',
        accounts: {
          from: 'payer.publicKey',
          to: 'recipient.publicKey'
        },
        args: {
          amount: 'lamports (number)'
        },
        description: 'Transfers SOL from payer to recipient'
      }
    ],
    codeSnippet: `const transaction = new Transaction();
transaction.add(
  SystemProgram.transfer({
    fromPubkey: payer.publicKey,
    toPubkey: recipient.publicKey,
    lamports: amount * LAMPORTS_PER_SOL
  })
);`,
    relatedFiles: ['app/lib/transaction-builder.ts', 'scripts/devnet-transaction-tests.ts']
  },
  {
    id: 'create-token-and-mint',
    name: 'Create Token and Mint',
    description: 'Creates a new SPL token mint, associated token account, and mints initial supply in a single transaction',
    category: 'multi-step',
    complexity: 'intermediate',
    instructions: [
      {
        type: 'spl_token_create_mint',
        program: 'SPL Token Program',
        accounts: {
          payer: 'payer.publicKey',
          mint: 'mintKeypair.publicKey (generated)',
          tokenAccountOwner: 'owner.publicKey'
        },
        args: {
          decimals: 9,
          initialSupply: 'BigInt value',
          tokenName: 'string',
          tokenSymbol: 'string',
          enableFreeze: 'boolean',
          supplyCap: 'BigInt (optional)'
        },
        description: 'Creates token mint with initial minting operation'
      }
    ],
    codeSnippet: `const built: BuiltInstruction = {
  template: expectTemplate('spl_token_create_mint'),
  accounts: {
    payer: ctx.payer.publicKey.toBase58(),
    tokenAccountOwner: ctx.payer.publicKey.toBase58()
  },
  args: {
    _operation: 'create_token_and_mint',
    decimals: 9,
    initialSupply: BigInt(2_000_000_000),
    tokenName: 'My Token',
    tokenSymbol: 'MTK',
    enableFreeze: true,
    freezeInitialAccount: false,
    supplyCap: BigInt(10_000_000_000)
  }
};`,
    explanation: 'This is a composite operation that creates the mint, derives the ATA, and mints tokens in one transaction. The mint keypair needs to be added as an additional signer.',
    relatedFiles: ['app/lib/transaction-builder.ts', 'scripts/devnet-transaction-tests.ts']
  },
  {
    id: 'simple-arbitrage',
    name: 'Simple 2-Pool Arbitrage',
    description: 'Execute arbitrage between two DEX pools',
    category: 'arbitrage',
    complexity: 'advanced',
    instructions: [
      {
        type: 'swap',
        program: 'Jupiter Aggregator or DEX Program',
        accounts: {
          user: 'payer.publicKey',
          tokenAMint: 'first token mint',
          tokenBMint: 'second token mint',
          poolA: 'first pool address',
          poolB: 'second pool address'
        },
        args: {
          amountIn: 'input amount',
          minAmountOut: 'minimum expected output'
        },
        description: 'Swap on first pool (buy)'
      },
      {
        type: 'swap',
        program: 'Jupiter Aggregator or DEX Program',
        accounts: {
          user: 'payer.publicKey',
          tokenBMint: 'second token mint',
          tokenAMint: 'first token mint',
          poolB: 'second pool address',
          poolA: 'first pool address'
        },
        args: {
          amountIn: 'amount from first swap',
          minAmountOut: 'minimum expected output'
        },
        description: 'Swap on second pool (sell) to complete arbitrage'
      }
    ],
    codeSnippet: `async function addSimpleArbitrageInstructions(
  transaction: Transaction,
  connection: Connection,
  payer: PublicKey,
  opportunity: ArbitrageOpportunity,
  config: ExecutionConfig
): Promise<void> {
  // Add priority fee first
  transaction.add(
    SystemProgram.transfer({
      fromPubkey: payer,
      toPubkey: payer,
      lamports: config.priorityFee
    })
  );

  // First swap: Buy on pool A
  const swap1 = await buildSwapInstruction(poolA, tokenA, tokenB, amount);
  transaction.add(swap1);

  // Second swap: Sell on pool B
  const swap2 = await buildSwapInstruction(poolB, tokenB, tokenA, amount);
  transaction.add(swap2);
}`,
    explanation: 'This executes a simple arbitrage by buying low on one pool and selling high on another. Both swaps happen in the same transaction atomically.',
    relatedFiles: ['app/lib/pools/execution.ts', 'app/lib/transaction-builder.ts']
  },
  {
    id: 'flash-loan-stack',
    name: 'Flash Loan Stack',
    description: 'Borrow from multiple protocols, execute operations, and repay in a single transaction',
    category: 'defi',
    complexity: 'expert',
    instructions: [
      {
        type: 'borrow',
        program: 'Lending Protocol 1',
        accounts: {
          borrower: 'payer.publicKey',
          lender: 'protocol1Address',
          tokenMint: 'token mint address'
        },
        args: {
          amount: 'borrow amount'
        },
        description: 'Borrow from first protocol'
      },
      {
        type: 'borrow',
        program: 'Lending Protocol 2',
        accounts: {
          borrower: 'payer.publicKey',
          lender: 'protocol2Address',
          tokenMint: 'token mint address'
        },
        args: {
          amount: 'borrow amount'
        },
        description: 'Borrow from second protocol'
      },
      {
        type: 'user_operations',
        program: 'Multiple',
        accounts: {},
        args: {},
        description: 'Execute user operations (arbitrage, swaps, etc.)'
      },
      {
        type: 'repay',
        program: 'Lending Protocol 2',
        accounts: {
          borrower: 'payer.publicKey',
          lender: 'protocol2Address'
        },
        args: {
          amount: 'repay amount'
        },
        description: 'Repay second protocol (reverse order)'
      },
      {
        type: 'repay',
        program: 'Lending Protocol 1',
        accounts: {
          borrower: 'payer.publicKey',
          lender: 'protocol1Address'
        },
        args: {
          amount: 'repay amount'
        },
        description: 'Repay first protocol'
      }
    ],
    codeSnippet: `async buildStackedTransaction(
  userInstructions: TransactionInstruction[],
  borrower: PublicKey
): Promise<Transaction> {
  const transaction = new Transaction();

  // Step 1: Add all borrow instructions
  for (const item of this.stack) {
    transaction.add(item.borrowInstruction);
  }

  // Step 2: Add user's operations
  for (const instruction of userInstructions) {
    transaction.add(instruction);
  }

  // Step 3: Add all repay instructions (reverse order)
  for (let i = this.stack.length - 1; i >= 0; i--) {
    transaction.add(this.stack[i].repayInstruction);
  }

  return transaction;
}`,
    explanation: 'Flash loans allow borrowing without collateral, but all operations must happen in a single transaction. The order is critical: all borrows, then user operations, then all repays in reverse order.',
    relatedFiles: ['app/lib/lending/flash-loan-stack.ts']
  },
  {
    id: 'multi-send',
    name: 'Multi-Send Transaction',
    description: 'Send SOL to multiple recipients in a single transaction, with optional account creation',
    category: 'multi-step',
    complexity: 'intermediate',
    instructions: [
      {
        type: 'create_account',
        program: 'SystemProgram',
        accounts: {
          from: 'payer.publicKey',
          newAccount: 'recipient1.publicKey (generated)'
        },
        args: {
          lamports: 'rent exempt + amount',
          space: 0
        },
        description: 'Create account for recipient 1 if needed'
      },
      {
        type: 'transfer',
        program: 'SystemProgram',
        accounts: {
          from: 'payer.publicKey',
          to: 'recipient1.publicKey'
        },
        args: {
          lamports: 'amount in lamports'
        },
        description: 'Transfer to recipient 1'
      },
      {
        type: 'transfer',
        program: 'SystemProgram',
        accounts: {
          from: 'payer.publicKey',
          to: 'recipient2.publicKey'
        },
        args: {
          lamports: 'amount in lamports'
        },
        description: 'Transfer to recipient 2'
      }
    ],
    codeSnippet: `for (const recipient of config.recipients) {
  // Handle new account creation
  if (recipient.address === 'new') {
    const newKeypair = Keypair.generate();
    signers.push(newKeypair);
    recipientPubkey = newKeypair.publicKey;
    
    // Create account first
    transaction.add(
      SystemProgram.createAccount({
        fromPubkey: payer,
        newAccountPubkey: recipientPubkey,
        lamports: rentExempt + (recipient.amount * LAMPORTS_PER_SOL),
        space: 0,
        programId: SystemProgram.programId
      })
    );
  } else {
    // Regular transfer
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: payer,
        toPubkey: recipientPubkey,
        lamports: recipient.amount * LAMPORTS_PER_SOL
      })
    );
  }
}`,
    explanation: 'Batching multiple transfers into one transaction saves on fees. Can optionally create new accounts for recipients in the same transaction.',
    relatedFiles: ['app/lib/bundler/multi-send.ts']
  },
  {
    id: 'nft-mint-with-metadata',
    name: 'NFT Mint with Metadata',
    description: 'Create NFT mint with Metaplex metadata in a single transaction',
    category: 'nft',
    complexity: 'advanced',
    instructions: [
      {
        type: 'create_mint',
        program: 'SPL Token Program',
        accounts: {
          mint: 'mintKeypair.publicKey',
          payer: 'payer.publicKey'
        },
        args: {
          decimals: 0
        },
        description: 'Create token mint with 0 decimals (NFT)'
      },
      {
        type: 'create_metadata',
        program: 'Metaplex Token Metadata',
        accounts: {
          metadata: 'metadata PDA',
          mint: 'mintKeypair.publicKey',
          mintAuthority: 'payer.publicKey'
        },
        args: {
          name: 'NFT Name',
          symbol: 'SYMBOL',
          uri: 'metadata URI'
        },
        description: 'Create metadata account'
      }
    ],
    explanation: 'NFTs are created by minting a token with 0 decimals and attaching metadata through Metaplex. The metadata PDA is derived from the mint address.',
    relatedFiles: ['app/lib/transaction-builder.ts']
  },
  {
    id: 'priority-fee-with-transfers',
    name: 'Priority Fee with Transaction',
    description: 'Transaction with priority fee instruction for faster confirmation',
    category: 'advanced',
    complexity: 'intermediate',
    instructions: [
      {
        type: 'priority_fee',
        program: 'ComputeBudget',
        accounts: {},
        args: {
          microLamports: 'priority fee amount'
        },
        description: 'Set compute budget and priority fee'
      },
      {
        type: 'transfer',
        program: 'SystemProgram',
        accounts: {
          from: 'payer.publicKey',
          to: 'recipient.publicKey'
        },
        args: {
          lamports: 'amount'
        },
        description: 'Main transfer operation'
      }
    ],
    codeSnippet: `// Add priority fee first
transaction.add(
  ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: priorityFee
  })
);

// Add main instructions
transaction.add(
  SystemProgram.transfer({
    fromPubkey: payer,
    toPubkey: recipient,
    lamports: amount
  })
);`,
    explanation: 'Priority fees help get transactions processed faster during network congestion. Should be added before other instructions.',
    relatedFiles: ['app/lib/transaction-builder.ts']
  }
];

/**
 * Get all transaction examples
 */
export function getAllExamples(): TransactionExample[] {
  return TRANSACTION_EXAMPLES;
}

/**
 * Get examples by category
 */
export function getExamplesByCategory(category: TransactionExample['category']): TransactionExample[] {
  return TRANSACTION_EXAMPLES.filter(ex => ex.category === category);
}

/**
 * Get examples by complexity
 */
export function getExamplesByComplexity(complexity: TransactionExample['complexity']): TransactionExample[] {
  return TRANSACTION_EXAMPLES.filter(ex => ex.complexity === complexity);
}

/**
 * Get example by ID
 */
export function getExampleById(id: string): TransactionExample | undefined {
  return TRANSACTION_EXAMPLES.find(ex => ex.id === id);
}

/**
 * Search examples by keyword
 */
export function searchExamples(keyword: string): TransactionExample[] {
  const lowerKeyword = keyword.toLowerCase();
  return TRANSACTION_EXAMPLES.filter(ex => 
    ex.name.toLowerCase().includes(lowerKeyword) ||
    ex.description.toLowerCase().includes(lowerKeyword) ||
    ex.category.toLowerCase().includes(lowerKeyword)
  );
}
