/**
 * Fallback Transaction Examples Resource (JavaScript)
 * Simple implementation if TypeScript module can't be loaded
 */

// Transaction examples data (simplified from TypeScript version)
const TRANSACTION_EXAMPLES = [
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
        accounts: { from: 'payer.publicKey', to: 'recipient.publicKey' },
        args: { amount: 'lamports (number)' },
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
    description: 'Creates a new SPL token mint, associated token account, and mints initial supply',
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
          tokenSymbol: 'string'
        },
        description: 'Creates token mint with initial minting operation'
      }
    ],
    relatedFiles: ['app/lib/transaction-builder.ts', 'scripts/devnet-transaction-tests.ts']
  },
  {
    id: 'simple-arbitrage',
    name: 'Simple 2-Pool Arbitrage',
    description: 'Execute arbitrage between two DEX pools',
    category: 'arbitrage',
    complexity: 'advanced',
    relatedFiles: ['app/lib/pools/execution.ts']
  },
  {
    id: 'flash-loan-stack',
    name: 'Flash Loan Stack',
    description: 'Borrow from multiple protocols, execute operations, and repay in a single transaction',
    category: 'defi',
    complexity: 'expert',
    relatedFiles: ['app/lib/lending/flash-loan-stack.ts']
  },
  {
    id: 'multi-send',
    name: 'Multi-Send Transaction',
    description: 'Send SOL to multiple recipients in a single transaction',
    category: 'multi-step',
    complexity: 'intermediate',
    relatedFiles: ['app/lib/bundler/multi-send.ts']
  }
];

function getAllExamples() {
  return TRANSACTION_EXAMPLES;
}

function getExamplesByCategory(category) {
  return TRANSACTION_EXAMPLES.filter(ex => ex.category === category);
}

function getExamplesByComplexity(complexity) {
  return TRANSACTION_EXAMPLES.filter(ex => ex.complexity === complexity);
}

function getExampleById(id) {
  return TRANSACTION_EXAMPLES.find(ex => ex.id === id);
}

function searchExamples(keyword) {
  const lowerKeyword = keyword.toLowerCase();
  return TRANSACTION_EXAMPLES.filter(ex => 
    ex.name.toLowerCase().includes(lowerKeyword) ||
    ex.description.toLowerCase().includes(lowerKeyword) ||
    ex.category.toLowerCase().includes(lowerKeyword)
  );
}

module.exports = {
  getAllExamples,
  getExamplesByCategory,
  getExamplesByComplexity,
  getExampleById,
  searchExamples,
  TRANSACTION_EXAMPLES
};
