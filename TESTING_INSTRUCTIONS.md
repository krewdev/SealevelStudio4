# Testing Instructions - Complete Workflow & On-Chain Testing

## Quick Start

### 1. Automated On-Chain Tests

Run the automated test script to verify basic on-chain functionality:

```bash
# Install dependencies if needed
npm install

# Run automated tests
npx ts-node scripts/run-comprehensive-tests.ts
```

This will:
- Create test wallets
- Test basic on-chain operations (transfers, airdrops, simulations)
- Generate a test report

### 2. Manual Workflow Testing

Follow the **COMPREHENSIVE_TESTING_PLAN.md** document to test all user workflows manually.

---

## Testing Checklist

### Phase 1: Core Features (Priority: HIGH)

#### Account Inspector
- [ ] Test TC-001: Inspect system account
- [ ] Test TC-002: Inspect SPL token account
- [ ] Test TC-003: Inspect program account
- [ ] Test TC-004: Inspect PDA
- [ ] Test TC-005: Invalid address handling
- [ ] Test TC-006: Non-existent account

#### Transaction Builder
- [ ] Test TC-007: Build SOL transfer transaction
- [ ] Test TC-008: Build create account transaction
- [ ] Test TC-009: Execute SOL transfer (devnet)
- [ ] Test TC-010: Build token transfer transaction
- [ ] Test TC-011: Build create token account transaction
- [ ] Test TC-012: Build mint tokens transaction
- [ ] Test TC-013: Build burn tokens transaction
- [ ] Test TC-014: Execute token transfer (devnet)
- [ ] Test TC-015: Build multi-instruction transaction
- [ ] Test TC-016: Build transaction with compute budget
- [ ] Test TC-017: Transaction simulation
- [ ] Test TC-018: Transaction signing and sending

#### Arbitrage Scanner
- [ ] Test TC-019: Scan for arbitrage opportunities
- [ ] Test TC-020: View opportunity details
- [ ] Test TC-021: Build arbitrage transaction
- [ ] Test TC-022: Execute arbitrage (devnet)
- [ ] Test TC-023: Real-time opportunity updates

### Phase 2: On-Chain Functions (Priority: HIGH)

#### Smart Contract Programs
- [ ] Test TC-058: Initialize attestation program
- [ ] Test TC-059: Mint attestation
- [ ] Test TC-060: Verify attestation
- [ ] Test TC-061: Initialize presale
- [ ] Test TC-062: Contribute to presale
- [ ] Test TC-063: Claim vested tokens
- [ ] Test TC-064: Withdraw funds (admin)
- [ ] Test TC-065: Update presale config (admin)

#### Direct On-Chain Operations
- [ ] Test TC-066: SystemProgram.transfer
- [ ] Test TC-067: SystemProgram.createAccount
- [ ] Test TC-068: TokenProgram.transfer
- [ ] Test TC-069: TokenProgram.mintTo
- [ ] Test TC-070: TokenProgram.burn
- [ ] Test TC-071: Associated Token Account creation
- [ ] Test TC-072: Marinade deposit
- [ ] Test TC-073: Jito stake
- [ ] Test TC-074: Native stake delegation
- [ ] Test TC-075: Jupiter swap
- [ ] Test TC-076: Raydium swap
- [ ] Test TC-077: Orca swap

### Phase 3: Additional Features (Priority: MEDIUM)

#### SEAL Presale
- [ ] Test TC-027 through TC-036 (all presale tests)

#### Staking Operations
- [ ] Test TC-037: Stake with Marinade
- [ ] Test TC-038: Stake with Jito
- [ ] Test TC-039: Stake with Lido
- [ ] Test TC-040: Native Solana staking

#### Send Operations
- [ ] Test TC-041: Send SOL to address
- [ ] Test TC-042: Send SOL to contact
- [ ] Test TC-043: Send SPL token
- [ ] Test TC-044: Send validation

#### Other Features
- [ ] Test TC-024 through TC-026: Transaction Bundler
- [ ] Test TC-045 through TC-047: Airdrop Operations
- [ ] Test TC-048 through TC-050: AI Cyber Playground
- [ ] Test TC-051 through TC-054: Wallet Management
- [ ] Test TC-055 through TC-056: Rent Reclaimer
- [ ] Test TC-057: Devnet Faucet

### Phase 4: API Endpoints (Priority: MEDIUM)

- [ ] Test TC-078 through TC-085: All API endpoints

### Phase 5: Integration Tests (Priority: HIGH)

- [ ] Test TC-086: Complete arbitrage workflow
- [ ] Test TC-087: Complete presale workflow
- [ ] Test TC-088: Complete staking workflow
- [ ] Test TC-089: Multi-wallet transaction

---

## Testing Environment Setup

### 1. Network Configuration

**IMPORTANT**: All testing must be done on **DEVNET** only!

```bash
# Verify network is devnet
# Check .env or environment variables
SOLANA_RPC_URL=https://api.devnet.solana.com
```

### 2. Test Wallet Setup

Create a test wallet with devnet SOL:

```bash
# Option 1: Use automated test script (creates wallet automatically)
npx ts-node scripts/run-comprehensive-tests.ts

# Option 2: Manual wallet creation
solana-keygen new --outfile test-wallet.json
solana airdrop 10 $(solana address -k test-wallet.json) --url devnet
```

### 3. Smart Contract Deployment

Deploy all smart contracts to devnet:

```bash
# Deploy attestation program
cd programs/attestation-program
anchor build
anchor deploy --provider.cluster devnet

# Deploy presale program (if exists)
cd ../seal-presale
anchor build
anchor deploy --provider.cluster devnet
```

### 4. Test Tokens

Create test SPL tokens on devnet:

```bash
# Use Solana CLI or create via Transaction Builder
# Mint address will be needed for token transfer tests
```

---

## Test Execution Workflow

### For Each Test Case:

1. **Read the test description** in COMPREHENSIVE_TESTING_PLAN.md
2. **Set up prerequisites** (wallets, tokens, contracts)
3. **Execute the workflow** step-by-step
4. **Verify on-chain** using Solana Explorer:
   - Go to: `https://explorer.solana.com/tx/{signature}?cluster=devnet`
   - Verify transaction succeeded
   - Verify state changes
   - Verify balance changes
5. **Record results**:
   - ✅ PASS: Test worked as expected
   - ❌ FAIL: Document the issue
   - ⏭️ SKIP: Document why skipped
6. **Save transaction signatures** for verification

### Test Result Template

```markdown
## Test: TC-XXX - [Test Name]

**Date**: [Date]
**Tester**: [Name]
**Status**: PASS / FAIL / SKIP

**Steps Executed**:
1. [Step 1]
2. [Step 2]
3. [Step 3]

**On-Chain Verification**:
- Transaction Signature: [Signature]
- Explorer Link: [Link]
- Balance Before: [Amount]
- Balance After: [Amount]
- State Changes: [Description]

**Issues/Notes**:
[Any issues or observations]
```

---

## Critical Tests (Must Pass Before Production)

These tests are **MANDATORY** and must all pass:

1. ✅ **TC-007**: SOL transfer transaction
2. ✅ **TC-010**: Token transfer transaction
3. ✅ **TC-017**: Transaction simulation
4. ✅ **TC-018**: Transaction signing and sending
5. ✅ **TC-031**: Presale contribution (if presale is active)
6. ✅ **TC-041**: Send SOL
7. ✅ **TC-045**: Airdrop on devnet
8. ✅ **TC-066**: SystemProgram.transfer
9. ✅ **TC-068**: TokenProgram.transfer

---

## On-Chain Verification Checklist

For every on-chain operation, verify:

- [ ] **Transaction Sent**: Signature obtained
- [ ] **Transaction Confirmed**: Confirmed on-chain
- [ ] **No Errors**: Transaction succeeded (no error logs)
- [ ] **State Changed**: On-chain state matches expected
- [ ] **Balance Updated**: Account balances correct
- [ ] **Event Logged**: Transaction logs contain expected events
- [ ] **Explorer Verified**: Checked on Solana Explorer

### Verification Tools

1. **Solana Explorer**: 
   - URL: `https://explorer.solana.com/tx/{signature}?cluster=devnet`
   - Verify: Status, logs, account changes

2. **Solscan**:
   - URL: `https://solscan.io/tx/{signature}?cluster=devnet`
   - Verify: Transaction details, token transfers

3. **RPC Direct**:
   ```typescript
   const tx = await connection.getTransaction(signature);
   console.log(tx);
   ```

---

## Common Issues & Solutions

### Issue: Transaction Fails with "Insufficient Funds"

**Solution**: 
- Request more devnet SOL: `solana airdrop 10 [address] --url devnet`
- Check account balance before transaction

### Issue: "Account Not Found"

**Solution**:
- Verify account address is correct
- Check if account exists on devnet
- Some accounts may need to be created first

### Issue: "Program Not Found"

**Solution**:
- Deploy program to devnet first
- Verify program ID is correct
- Check program is deployed: `solana program show [programId] --url devnet`

### Issue: "Invalid Instruction"

**Solution**:
- Verify instruction parameters are correct
- Check account ordering (signers first, writable accounts, readonly accounts)
- Verify program ID matches instruction

### Issue: "Simulation Failed"

**Solution**:
- Check compute units (may need to increase)
- Verify all required accounts are included
- Check account states (balances, ownership)

---

## Test Report Generation

After completing tests, generate a summary report:

```bash
# The automated test script generates a report automatically
# Check: test-results/test-report-[timestamp].json

# For manual tests, create a summary document:
# - Total tests executed
# - Pass/Fail/Skip counts
# - List of failed tests with issues
# - Transaction signatures for verification
# - Screenshots/evidence
```

---

## Next Steps After Testing

1. **Fix All Failures**: Address any failed tests
2. **Re-test**: Re-run failed tests after fixes
3. **Document Issues**: Update known issues list
4. **Production Checklist**: Create deployment checklist
5. **Monitoring Setup**: Set up monitoring for on-chain operations
6. **Security Review**: Conduct security review of on-chain functions

---

## Support & Resources

- **Test Plan**: `COMPREHENSIVE_TESTING_PLAN.md`
- **Automated Tests**: `scripts/run-comprehensive-tests.ts`
- **Solana Docs**: https://docs.solana.com/
- **Anchor Docs**: https://www.anchor-lang.com/
- **Devnet Explorer**: https://explorer.solana.com/?cluster=devnet

---

**Status**: Ready for Testing  
**Last Updated**: January 23, 2026
