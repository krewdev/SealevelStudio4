import { InstructionTemplate } from './types';

export const INSTRUCTION_TEMPLATES: InstructionTemplate[] = [
  // ===== SYSTEM PROGRAM =====
  {
    id: 'system_transfer',
    programId: '11111111111111111111111111111112',
    name: 'Transfer SOL',
    description: 'Transfer SOL from one account to another',
    category: 'system',
    accounts: [
      { name: 'from', type: 'signer', description: 'Sender account' },
      { name: 'to', type: 'writable', description: 'Recipient account' }
    ],
    args: [{
      name: 'amount',
      type: 'u64',
      description: 'Amount in lamports (1 SOL = 1,000,000,000 lamports)',
      validation: { min: 1 }
    }]
  },

  {
    id: 'system_create_account',
    programId: '11111111111111111111111111111112',
    name: 'Create Account',
    description: 'Create a new account with specified space and owner',
    category: 'system',
    accounts: [
      { name: 'from', type: 'signer', description: 'Account paying for creation' },
      { name: 'newAccount', type: 'writable', description: 'New account to create' }
    ],
    args: [{
      name: 'space',
      type: 'u64',
      description: 'Number of bytes to allocate',
      validation: { min: 0 }
    }]
  },

  // ===== SPL TOKEN PROGRAM =====
  {
    id: 'spl_token_transfer',
    programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    name: 'Transfer Token',
    description: 'Transfer SPL tokens between accounts',
    category: 'token',
    accounts: [
      { name: 'source', type: 'writable', description: 'Source token account' },
      { name: 'destination', type: 'writable', description: 'Destination token account' },
      { name: 'authority', type: 'signer', description: 'Owner of source account' }
    ],
    args: [{
      name: 'amount',
      type: 'u64',
      description: 'Amount of tokens to transfer',
      validation: { min: 1 }
    }]
  },

  {
    id: 'spl_token_mint_to',
    programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    name: 'Mint Tokens',
    description: 'Mint new tokens to an account',
    category: 'token',
    accounts: [
      { name: 'mint', type: 'writable', description: 'Mint account' },
      { name: 'destination', type: 'writable', description: 'Destination token account' },
      { name: 'authority', type: 'signer', description: 'Mint authority' }
    ],
    args: [{
      name: 'amount',
      type: 'u64',
      description: 'Amount of tokens to mint',
      validation: { min: 1 }
    }]
  },

  {
    id: 'spl_token_burn',
    programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    name: 'Burn Tokens',
    description: 'Burn tokens from an account',
    category: 'token',
    accounts: [
      { name: 'source', type: 'writable', description: 'Token account to burn from' },
      { name: 'mint', type: 'writable', description: 'Mint account' },
      { name: 'authority', type: 'signer', description: 'Account authority' }
    ],
    args: [{
      name: 'amount',
      type: 'u64',
      description: 'Amount of tokens to burn',
      validation: { min: 1 }
    }]
  },

  {
    id: 'spl_token_approve',
    programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    name: 'Approve Delegate',
    description: 'Approve a delegate to transfer tokens',
    category: 'token',
    accounts: [
      { name: 'source', type: 'writable', description: 'Token account' },
      { name: 'delegate', type: 'readonly', description: 'Delegate account' },
      { name: 'authority', type: 'signer', description: 'Current authority' }
    ],
    args: [{
      name: 'amount',
      type: 'u64',
      description: 'Amount delegate can transfer',
      validation: { min: 0 }
    }]
  },

  // ===== ASSOCIATED TOKEN PROGRAM =====
  {
    id: 'spl_ata_create',
    programId: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
    name: 'Create Associated Token Account',
    description: 'Create an associated token account for a wallet and mint',
    category: 'token',
    accounts: [
      { name: 'funding', type: 'signer', description: 'Account paying for creation' },
      { name: 'associatedToken', type: 'writable', description: 'Associated token account to create' },
      { name: 'wallet', type: 'readonly', description: 'Wallet address' },
      { name: 'mint', type: 'readonly', description: 'Token mint' },
      { name: 'systemProgram', type: 'readonly', description: 'System program', pubkey: '11111111111111111111111111111112' },
      { name: 'tokenProgram', type: 'readonly', description: 'Token program', pubkey: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' }
    ],
    args: []
  },

  // ===== METAPLEX TOKEN METADATA =====
  {
    id: 'mpl_create_metadata',
    programId: 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
    name: 'Create Token Metadata',
    description: 'Create metadata account for an SPL token',
    category: 'nft',
    accounts: [
      { name: 'metadata', type: 'writable', description: 'Metadata account (PDA)' },
      { name: 'mint', type: 'readonly', description: 'Mint account' },
      { name: 'mintAuthority', type: 'signer', description: 'Mint authority' },
      { name: 'payer', type: 'signer', description: 'Account paying for transaction' },
      { name: 'updateAuthority', type: 'signer', description: 'Update authority' },
      { name: 'systemProgram', type: 'readonly', description: 'System program', pubkey: '11111111111111111111111111111112' },
      { name: 'rent', type: 'readonly', description: 'Rent sysvar', pubkey: 'SysvarRent111111111111111111111111111111111' }
    ],
    args: [
      { name: 'name', type: 'string', description: 'Token name' },
      { name: 'symbol', type: 'string', description: 'Token symbol' },
      { name: 'uri', type: 'string', description: 'Metadata URI' },
      { name: 'sellerFeeBasisPoints', type: 'u16', description: 'Royalty percentage (0-10000)', defaultValue: 500 },
      { name: 'creators', type: 'bool', description: 'Whether to include creators', defaultValue: false }
    ]
  },

  {
    id: 'mpl_update_metadata',
    programId: 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
    name: 'Update Token Metadata',
    description: 'Update existing token metadata',
    category: 'nft',
    accounts: [
      { name: 'metadata', type: 'writable', description: 'Metadata account' },
      { name: 'updateAuthority', type: 'signer', description: 'Update authority' }
    ],
    args: [
      { name: 'name', type: 'string', description: 'New token name', isOptional: true },
      { name: 'symbol', type: 'string', description: 'New token symbol', isOptional: true },
      { name: 'uri', type: 'string', description: 'New metadata URI', isOptional: true },
      { name: 'sellerFeeBasisPoints', type: 'u16', description: 'New royalty percentage', isOptional: true }
    ]
  },

  // ===== JUPITER AGGREGATOR =====
  {
    id: 'jupiter_swap',
    programId: 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',
    name: 'Jupiter Swap',
    description: 'Swap tokens using Jupiter aggregator',
    category: 'defi',
    accounts: [
      { name: 'userTransferAuthority', type: 'signer', description: 'User transfer authority' },
      { name: 'userSourceTokenAccount', type: 'writable', description: 'User source token account' },
      { name: 'userDestinationTokenAccount', type: 'writable', description: 'User destination token account' },
      { name: 'destinationTokenAccount', type: 'writable', description: 'Destination token account' },
      { name: 'destinationMint', type: 'readonly', description: 'Destination token mint' },
      { name: 'platformFeeAccount', type: 'writable', description: 'Platform fee account', isOptional: true }
    ],
    args: [
      { name: 'amount', type: 'u64', description: 'Amount to swap', validation: { min: 1 } },
      { name: 'minAmountOut', type: 'u64', description: 'Minimum amount out', validation: { min: 0 } }
    ]
  },

  // ===== ORCA WHIRLPOOL =====
  {
    id: 'orca_open_position',
    programId: 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',
    name: 'Open Orca Position',
    description: 'Open a liquidity position in Orca Whirlpool',
    category: 'defi',
    accounts: [
      { name: 'position', type: 'writable', description: 'Position account' },
      { name: 'positionMint', type: 'writable', description: 'Position mint' },
      { name: 'positionTokenAccount', type: 'writable', description: 'Position token account' },
      { name: 'whirlpool', type: 'readonly', description: 'Whirlpool account' },
      { name: 'owner', type: 'signer', description: 'Position owner' }
    ],
    args: [
      { name: 'tickLowerIndex', type: 'i32', description: 'Lower tick index' },
      { name: 'tickUpperIndex', type: 'i32', description: 'Upper tick index' },
      { name: 'tickSpacing', type: 'u16', description: 'Tick spacing' }
    ]
  },

  // ===== MARINADE STAKING =====
  {
    id: 'marinade_deposit',
    programId: 'MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD',
    name: 'Marinade Deposit',
    description: 'Deposit SOL to Marinade for staking',
    category: 'defi',
    accounts: [
      { name: 'state', type: 'readonly', description: 'Marinade state account' },
      { name: 'msolMint', type: 'readonly', description: 'mSOL mint' },
      { name: 'liqPoolSolLegPda', type: 'writable', description: 'Liquidity pool SOL PDA' },
      { name: 'liqPoolMsolLeg', type: 'writable', description: 'Liquidity pool mSOL account' },
      { name: 'treasuryMsolAccount', type: 'writable', description: 'Treasury mSOL account' },
      { name: 'userSolPda', type: 'writable', description: 'User SOL PDA' },
      { name: 'userMsolPda', type: 'writable', description: 'User mSOL PDA' },
      { name: 'user', type: 'signer', description: 'User account' }
    ],
    args: [{
      name: 'amount',
      type: 'u64',
      description: 'Amount of SOL to deposit',
      validation: { min: 1 }
    }]
  },

  // ===== RAYDIUM AMM =====
  {
    id: 'raydium_swap',
    programId: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
    name: 'Raydium Swap',
    description: 'Swap tokens on Raydium AMM',
    category: 'defi',
    accounts: [
      { name: 'ammId', type: 'readonly', description: 'AMM account' },
      { name: 'ammAuthority', type: 'readonly', description: 'AMM authority' },
      { name: 'ammOpenOrders', type: 'writable', description: 'AMM open orders' },
      { name: 'ammTargetOrders', type: 'writable', description: 'AMM target orders' },
      { name: 'poolCoinTokenAccount', type: 'writable', description: 'Pool coin token account' },
      { name: 'poolPcTokenAccount', type: 'writable', description: 'Pool PC token account' },
      { name: 'serumProgramId', type: 'readonly', description: 'Serum program ID' },
      { name: 'serumMarket', type: 'writable', description: 'Serum market' },
      { name: 'serumBids', type: 'writable', description: 'Serum bids' },
      { name: 'serumAsks', type: 'writable', description: 'Serum asks' },
      { name: 'serumEventQueue', type: 'writable', description: 'Serum event queue' },
      { name: 'serumCoinVaultAccount', type: 'writable', description: 'Serum coin vault' },
      { name: 'serumPcVaultAccount', type: 'writable', description: 'Serum PC vault' },
      { name: 'serumVaultSigner', type: 'readonly', description: 'Serum vault signer' },
      { name: 'userSourceTokenAccount', type: 'writable', description: 'User source token account' },
      { name: 'userDestinationTokenAccount', type: 'writable', description: 'User destination token account' },
      { name: 'userSourceOwner', type: 'signer', description: 'User source owner' }
    ],
    args: [
      { name: 'amountIn', type: 'u64', description: 'Amount to swap in', validation: { min: 1 } },
      { name: 'minimumAmountOut', type: 'u64', description: 'Minimum amount out', validation: { min: 0 } }
    ]
  },

  // ===== MAGIC EDEN =====
  {
    id: 'me_buy_now',
    programId: 'M2mx93ekt1fmXSVkTrUL9xVFHkmME8HTUi5Cyc5aF7K',
    name: 'Magic Eden Buy Now',
    description: 'Buy NFT from Magic Eden marketplace',
    category: 'nft',
    accounts: [
      { name: 'auctionHouse', type: 'readonly', description: 'Auction house account' },
      { name: 'auctionHouseFeeAccount', type: 'writable', description: 'Fee account' },
      { name: 'auctionHouseTreasury', type: 'writable', description: 'Treasury account' },
      { name: 'buyerTradeState', type: 'writable', description: 'Buyer trade state' },
      { name: 'sellerTradeState', type: 'readonly', description: 'Seller trade state' },
      { name: 'freeSellerTradeState', type: 'readonly', description: 'Free seller trade state' },
      { name: 'buyer', type: 'signer', description: 'Buyer wallet' },
      { name: 'seller', type: 'readonly', description: 'Seller wallet' },
      { name: 'tokenAccount', type: 'readonly', description: 'Token account' },
      { name: 'tokenMint', type: 'readonly', description: 'Token mint' },
      { name: 'treasuryMint', type: 'readonly', description: 'Treasury mint' },
      { name: 'buyerReceiptTokenAccount', type: 'writable', description: 'Buyer receipt token account' }
    ],
    args: [
      { name: 'tradeStateBump', type: 'u8', description: 'Trade state bump' },
      { name: 'escrowPaymentBump', type: 'u8', description: 'Escrow payment bump' },
      { name: 'buyerPrice', type: 'u64', description: 'Purchase price' },
      { name: 'tokenSize', type: 'u64', description: 'Token size', defaultValue: 1 }
    ]
  },

  // ===== CUSTOM INSTRUCTIONS =====
  {
    id: 'custom_instruction',
    programId: '', // User will provide
    name: 'Custom Instruction',
    description: 'Add a custom instruction with your own program ID',
    category: 'custom',
    accounts: [], // User will add accounts
    args: [] // User will add args
  }
];

// ===== UTILITY FUNCTIONS =====

// Helper to get templates by category
export function getTemplatesByCategory(category: string): InstructionTemplate[] {
  return INSTRUCTION_TEMPLATES.filter(template => template.category === category);
}

// Helper to get template by ID
export function getTemplateById(id: string): InstructionTemplate | undefined {
  return INSTRUCTION_TEMPLATES.find(template => template.id === id);
}

// Helper to get all categories
export function getAllCategories(): string[] {
  return [...new Set(INSTRUCTION_TEMPLATES.map(template => template.category))];
}

// Helper to search templates
export function searchTemplates(query: string): InstructionTemplate[] {
  const lowercaseQuery = query.toLowerCase();
  return INSTRUCTION_TEMPLATES.filter(template =>
    template.name.toLowerCase().includes(lowercaseQuery) ||
    template.description.toLowerCase().includes(lowercaseQuery) ||
    template.category.toLowerCase().includes(lowercaseQuery)
  );
}



