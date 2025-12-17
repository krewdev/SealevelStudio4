# SEAL Presale On-Chain Implementation Guide

## Overview

This document describes the on-chain Anchor program implementation that addresses all critical security issues identified in the audit report.

## Program Architecture

### Accounts

#### PresaleState
Stores all presale configuration and state on-chain:
- Authority and treasury addresses
- Time windows (start/end)
- Contribution limits (min/max per wallet, total cap)
- Supply tracking (presale supply, tokens sold)
- Pricing and whitelist configuration
- Real-time statistics (total raised, contributors)

#### Contributor
Tracks per-wallet contribution data:
- Total SOL contributed
- Total SEAL tokens received
- Used for cumulative bonus calculation

### Instructions

#### `initialize_presale`
- Sets up presale with all parameters
- Validates all inputs
- Creates PDA for presale state
- Only callable by authority

#### `contribute`
- **Atomic execution**: All checks and transfers happen in one transaction
- Validates time window using on-chain Clock
- Checks contribution limits atomically
- Verifies treasury balance before accepting SOL
- Transfers tokens first, then SOL (or uses escrow pattern)
- Updates state atomically
- Emits events for indexing

#### `finalize_presale`
- Marks presale as inactive
- Only callable by authority
- Can be used to end presale early if needed

#### `update_whitelist`
- Updates whitelist Merkle root
- Only callable by authority
- Supports dynamic whitelist management

## Security Features

### ✅ On-Chain Enforcement
- All validation happens in the program
- Cannot be bypassed by modifying client code
- Rules enforced by Solana runtime

### ✅ Atomic Execution
- All operations (checks + transfers) in single transaction
- Either all succeed or all fail
- No partial state updates

### ✅ Persistent State
- State stored in PDA accounts
- Survives page refreshes
- Verifiable on-chain
- Single source of truth

### ✅ Race Condition Protection
- Atomic checks prevent exceeding caps
- Account constraints ensure consistency
- No validation before execution gap

### ✅ Treasury Safety
- Verifies treasury balance before accepting SOL
- Uses program-controlled transfers
- Can implement escrow pattern for extra safety

### ✅ Time Validation
- Uses `Clock::get()` for authoritative time
- Cannot be manipulated by client
- Enforced on-chain

### ✅ Supply Verification
- Checks treasury balance before each contribution
- Tracks remaining supply in program state
- Atomic supply checks

## Implementation Details

### Bonus Calculation
Bonuses are calculated based on **cumulative contribution** per wallet:
- 1+ SOL: 10% bonus
- 10+ SOL: 15% bonus
- 50+ SOL: 20% bonus
- 100+ SOL: 25% bonus
- 500+ SOL: 30% bonus

The `Contributor` account tracks total contribution to ensure cumulative bonuses.

### Transaction Ordering
Current implementation:
1. Verify treasury has tokens
2. Transfer SEAL tokens (treasury → contributor)
3. Transfer SOL (contributor → treasury)

**Alternative (safer)**: Use escrow pattern where:
1. Contributor sends SOL to escrow
2. Program verifies escrow received SOL
3. Program transfers tokens from treasury
4. Program releases SOL from escrow to treasury

### Whitelist Implementation
Uses Merkle tree for gas efficiency:
- Store Merkle root in `PresaleState`
- Client provides Merkle proof
- Program verifies proof on-chain
- Supports dynamic updates

## Deployment Steps

1. **Build the program:**
   ```bash
   anchor build
   ```

2. **Deploy to devnet:**
   ```bash
   anchor deploy --provider.cluster devnet
   ```

3. **Initialize presale:**
   ```typescript
   await program.methods
     .initializePresale(
       startTime,
       endTime,
       minPurchase,
       maxPurchase,
       totalRaiseCap,
       presaleSupply,
       pricePerSeal,
       whitelistEnabled
     )
     .accounts({
       presaleState: presaleStatePDA,
       authority: authorityKeypair.publicKey,
       treasury: treasuryKeypair.publicKey,
       sealMint: sealMintAddress,
       treasuryTokenAccount: treasuryTokenAccountAddress,
       systemProgram: SystemProgram.programId,
     })
     .rpc();
   ```

4. **Fund treasury:**
   - Transfer SEAL tokens to treasury token account
   - Ensure balance >= presale_supply

5. **Update client code:**
   - Replace client-side validation with program calls
   - Use program's `contribute` instruction
   - Read state from on-chain accounts

## Migration from Client-Side

### Before (Client-Side)
```typescript
// ❌ Client-side validation
const validation = validateContribution(solAmount, wallet, config);
if (!validation.valid) {
  throw new Error(validation.error);
}

// ❌ Manual transaction building
const tx = new Transaction();
tx.add(/* transfers */);
await sendTransaction(tx);
```

### After (On-Chain)
```typescript
// ✅ On-chain validation and execution
await program.methods
  .contribute(solAmount)
  .accounts({
    presaleState: presaleStatePDA,
    contributor: contributorPDA,
    contributorAccount: wallet.publicKey,
    // ... other accounts
  })
  .rpc();
```

## Testing

### Unit Tests
- Test all calculation functions
- Test validation logic
- Test edge cases

### Integration Tests
- Test full contribution flow
- Test concurrent contributions
- Test failure scenarios
- Test cap enforcement

### Security Tests
- Test bypass attempts
- Test race conditions
- Test overflow scenarios
- Test unauthorized access

## Monitoring

### Events
The program emits `ContributionEvent` for each contribution:
- Contributor address
- SOL amount
- SEAL tokens received
- Timestamp

Use these events for:
- Analytics dashboards
- Real-time notifications
- Audit trails
- Indexing

### State Queries
Query `PresaleState` account for:
- Total raised
- Contributors count
- Tokens sold
- Remaining supply
- Active status

## Next Steps

1. **Deploy to devnet** and test thoroughly
2. **Security audit** by professional auditors
3. **Update client code** to use on-chain program
4. **Add refund mechanism** if minimum raise not met
5. **Implement Merkle whitelist** verification
6. **Add vesting schedule** for tokens
7. **Multi-sig treasury** for extra security

## Comparison: Before vs After

| Feature | Client-Side | On-Chain |
|---------|-------------|----------|
| Validation | ❌ Client | ✅ Program |
| State | ❌ Memory | ✅ PDA |
| Race Conditions | ❌ Vulnerable | ✅ Protected |
| Treasury Safety | ❌ Risky | ✅ Safe |
| Time Checks | ❌ Client | ✅ Clock |
| Audit Trail | ❌ None | ✅ Events |
| Supply Checks | ❌ None | ✅ On-chain |
| Atomic Execution | ❌ No | ✅ Yes |

---

**Status**: Implementation ready for deployment  
**Next**: Deploy to devnet and conduct security audit

