/** Well-known Solana programs the firewall treats as first-party. */
export const KNOWN_PROGRAMS: Record<string, string> = {
  '11111111111111111111111111111111': 'System',
  // templates.ts historically used …12; treat both as System
  '11111111111111111111111111111112': 'System',
  ComputeBudget111111111111111111111111111111: 'ComputeBudget',
  TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA: 'Token',
  TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb: 'Token-2022',
  ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL: 'ATA',
  MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr: 'Memo',
  JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4: 'Jupiter',
  JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB: 'Jupiter v4',
  '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P': 'Pump.fun',
  PhoeNiXZ8ByJGLkxNfZRnkUfjvmuYqLR89jjFHGqdXY: 'Phoenix',
  whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc: 'Orca Whirlpool',
  CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK: 'Raydium CLMM',
  '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8': 'Raydium AMM',
  srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX: 'OpenBook',
  metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s: 'Metaplex',
  cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK: 'Account compression',
  BGUMAp9Gq7iTEuizy4pqaxsTyUCbk68f37Gc5o4tBzLb: 'Bubblegum',
  noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV: 'Noop',
  AddressLookupTab1e1111111111111111111111111: 'ALT',
};

export const DEFAULT_ALLOWED_PROGRAMS = Object.keys(KNOWN_PROGRAMS);

export function programLabel(id: string): string {
  return KNOWN_PROGRAMS[id] || `${id.slice(0, 4)}…${id.slice(-4)}`;
}
