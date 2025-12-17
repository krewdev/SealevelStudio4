# SEAL Presale Migration Plan: Client-Side to On-Chain

## Migration Overview

This document outlines the step-by-step plan to migrate from the current client-side presale implementation to a secure on-chain Anchor program.

## Current State (Client-Side)

### Issues
- ❌ All validation client-side
- ❌ State in memory (lost on refresh)
- ❌ Race conditions possible
- ❌ No audit trail
- ❌ Treasury dependency risks

### Files to Update
- `app/lib/seal-token/presale.ts` - Replace with program client
- `app/components/SealPresale.tsx` - Update to use program
- Remove in-memory state management

## Target State (On-Chain)

### Benefits
- ✅ All validation on-chain
- ✅ Persistent state in PDAs
- ✅ Atomic execution
- ✅ Event-based audit trail
- ✅ Secure treasury management

## Migration Steps

### Phase 1: Program Deployment (Week 1)

1. **Deploy Anchor Program**
   ```bash
   anchor build
   anchor deploy --provider.cluster devnet
   ```

2. **Initialize Presale**
   - Set all parameters
   - Fund treasury with SEAL tokens
   - Verify initialization

3. **Test Basic Operations**
   - Test contribution flow
   - Test validation
   - Test state updates

### Phase 2: Client Integration (Week 2)

1. **Install Dependencies**
   ```bash
   npm install @coral-xyz/anchor @solana/web3.js
   ```

2. **Create Program Client**
   - Create `app/lib/seal-token/presale-program.ts`
   - Implement program interface
   - Add helper functions

3. **Update SealPresale Component**
   - Replace client-side validation
   - Use program instructions
   - Read state from on-chain accounts

### Phase 3: Testing & Validation (Week 3)

1. **Unit Tests**
   - Test all program instructions
   - Test edge cases
   - Test error handling

2. **Integration Tests**
   - Test full user flow
   - Test concurrent contributions
   - Test cap enforcement

3. **Security Testing**
   - Penetration testing
   - Race condition testing
   - Overflow testing

### Phase 4: Security Audit (Week 4)

1. **Professional Audit**
   - Engage security firm
   - Review all code
   - Test all attack vectors

2. **Fix Issues**
   - Address audit findings
   - Re-test
   - Re-audit if needed

### Phase 5: Production Deployment (Week 5)

1. **Deploy to Mainnet**
   - Deploy program
   - Initialize presale
   - Fund treasury

2. **Update Production Client**
   - Deploy updated frontend
   - Monitor for issues
   - Collect feedback

## Code Changes Required

### 1. Create Program Client

**File**: `app/lib/seal-token/presale-program.ts`

```typescript
import { Program, AnchorProvider, web3 } from '@coral-xyz/anchor';
import { Connection, PublicKey } from '@solana/web3.js';
import { IDL } from './seal_presale_idl';

export class PresaleProgramClient {
  private program: Program;
  private connection: Connection;
  
  constructor(connection: Connection, wallet: any) {
    const provider = new AnchorProvider(connection, wallet, {});
    this.program = new Program(IDL, programId, provider);
    this.connection = connection;
  }
  
  async contribute(solAmount: number): Promise<string> {
    const presaleState = await this.getPresaleStatePDA();
    const contributor = await this.getContributorPDA();
    
    const tx = await this.program.methods
      .contribute(new BN(solAmount * web3.LAMPORTS_PER_SOL))
      .accounts({
        presaleState,
        contributor,
        contributorAccount: this.program.provider.wallet.publicKey,
        // ... other accounts
      })
      .rpc();
    
    return tx;
  }
  
  async getPresaleState(): Promise<PresaleState> {
    const presaleState = await this.getPresaleStatePDA();
    return await this.program.account.presaleState.fetch(presaleState);
  }
  
  // ... other methods
}
```

### 2. Update SealPresale Component

**Replace**:
```typescript
// ❌ Old: Client-side validation
const validation = validateContribution(solAmount, wallet, config);
if (!validation.valid) {
  setError(validation.error);
  return;
}

// ❌ Old: Manual transaction
const tx = createPresaleContribution(...);
await sendTransaction(tx);
```

**With**:
```typescript
// ✅ New: On-chain validation and execution
try {
  const tx = await presaleProgram.contribute(solAmount);
  setSuccess(`Contribution successful! Transaction: ${tx}`);
} catch (error) {
  setError(error.message);
}
```

### 3. Update State Reading

**Replace**:
```typescript
// ❌ Old: In-memory state
const stats = getPresaleStats(config);
```

**With**:
```typescript
// ✅ New: On-chain state
const presaleState = await presaleProgram.getPresaleState();
const stats = {
  totalRaised: presaleState.totalRaised / LAMPORTS_PER_SOL,
  totalContributors: presaleState.totalContributors,
  tokensSold: presaleState.tokensSold,
  // ...
};
```

## Testing Checklist

### Functional Tests
- [ ] Initialize presale
- [ ] Contribute SOL
- [ ] Receive SEAL tokens
- [ ] Check contribution limits
- [ ] Check time windows
- [ ] Check whitelist (if enabled)
- [ ] Check cap enforcement
- [ ] Check supply limits
- [ ] Finalize presale

### Security Tests
- [ ] Cannot contribute outside time window
- [ ] Cannot exceed individual cap
- [ ] Cannot exceed total cap
- [ ] Cannot contribute if supply exhausted
- [ ] Cannot bypass whitelist
- [ ] Race conditions handled
- [ ] Overflow protection works
- [ ] Unauthorized access blocked

### Edge Cases
- [ ] Minimum contribution
- [ ] Maximum contribution
- [ ] Exact cap amount
- [ ] Treasury balance edge cases
- [ ] Network congestion handling
- [ ] Transaction failures

## Rollback Plan

If issues arise:

1. **Pause Presale**
   - Call `finalize_presale` to stop accepting contributions
   - Keep program deployed for state access

2. **Revert Frontend**
   - Deploy previous version
   - Use client-side as fallback (if needed)

3. **Data Recovery**
   - All state is on-chain
   - Can query and recover data
   - No data loss

## Timeline

| Week | Phase | Deliverables |
|------|-------|--------------|
| 1 | Program Deployment | Deployed program, initialized presale |
| 2 | Client Integration | Updated frontend, program client |
| 3 | Testing | Test suite, test results |
| 4 | Security Audit | Audit report, fixes |
| 5 | Production | Mainnet deployment, monitoring |

## Success Criteria

- ✅ All critical security issues resolved
- ✅ All tests passing
- ✅ Security audit passed
- ✅ No data loss during migration
- ✅ User experience maintained or improved
- ✅ Performance acceptable

## Risk Mitigation

### Risks
1. **Program bugs** → Extensive testing + audit
2. **Migration issues** → Gradual rollout
3. **User confusion** → Clear communication
4. **Performance** → Optimize program code

### Mitigation
- Test thoroughly on devnet
- Start with small contributions
- Monitor closely
- Have rollback plan ready

---

**Status**: Ready to begin migration  
**Estimated Duration**: 5 weeks  
**Priority**: P0 (Critical)

