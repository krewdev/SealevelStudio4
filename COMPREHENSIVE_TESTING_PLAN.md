# Comprehensive Testing Plan - Sealevel Studio

## Overview

This document provides a complete testing plan for all user workflows and on-chain functions in Sealevel Studio. Every feature must be tested end-to-end with human verification.

**Last Updated**: January 23, 2026  
**Status**: Testing Required

---

## Table of Contents

1. [Core Features - User Workflows](#core-features---user-workflows)
2. [On-Chain Functions - Test Cases](#on-chain-functions---test-cases)
3. [Smart Contract Interactions](#smart-contract-interactions)
4. [API Endpoints Testing](#api-endpoints-testing)
5. [Integration Testing](#integration-testing)
6. [Test Execution Checklist](#test-execution-checklist)

---

## Core Features - User Workflows

### 1. Account Inspector

**Workflow Steps:**
1. User navigates to Account Inspector
2. User pastes a Solana account address
3. System fetches account data from blockchain
4. System deserializes account data
5. System displays human-readable account information
6. User can view account owner, balance, data length
7. User can view token account details (if applicable)
8. User can view program-derived account (PDA) details (if applicable)

**Test Cases:**
- [ ] **TC-001**: Inspect system account (wallet address)
  - Input: Valid Solana wallet address
  - Expected: Shows balance, owner (System Program), executable: false
  - On-chain: `connection.getAccountInfo(address)`

- [ ] **TC-002**: Inspect SPL token account
  - Input: Valid SPL token account address
  - Expected: Shows token balance, mint, owner, decimals
  - On-chain: `connection.getAccountInfo()` + token deserialization

- [ ] **TC-003**: Inspect program account
  - Input: Valid program account address
  - Expected: Shows program data, owner program ID
  - On-chain: `connection.getAccountInfo()`

- [ ] **TC-004**: Inspect PDA (Program Derived Address)
  - Input: Valid PDA address
  - Expected: Shows PDA details, seeds, program ID
  - On-chain: `PublicKey.findProgramAddress()` + account fetch

- [ ] **TC-005**: Invalid address handling
  - Input: Invalid address string
  - Expected: Error message, no on-chain call

- [ ] **TC-006**: Non-existent account
  - Input: Valid format but non-existent address
  - Expected: "Account not found" message
  - On-chain: `connection.getAccountInfo()` returns null

---

### 2. Transaction Builder

**Workflow Steps:**
1. User navigates to Transaction Builder
2. User selects instruction type (System, SPL Token, Custom Program)
3. User fills in required parameters
4. System validates inputs
5. System builds transaction
6. User reviews transaction details
7. User simulates transaction (optional)
8. User signs and sends transaction
9. System displays transaction signature

**Test Cases:**

#### System Program Instructions

- [ ] **TC-007**: Build SOL transfer transaction
  - Steps: Select System Program → Transfer → Enter amount & recipient
  - Expected: Transaction built with SystemProgram.transfer instruction
  - On-chain: `SystemProgram.transfer()` instruction created
  - Validation: Amount > 0, valid recipient address

- [ ] **TC-008**: Build create account transaction
  - Steps: Select System Program → Create Account → Enter parameters
  - Expected: Transaction with SystemProgram.createAccount
  - On-chain: `SystemProgram.createAccount()` instruction
  - Validation: Space, lamports, owner program ID

- [ ] **TC-009**: Execute SOL transfer (devnet)
  - Steps: Build → Sign → Send
  - Expected: Transaction succeeds, signature returned
  - On-chain: `sendTransaction()` → `connection.confirmTransaction()`
  - Verify: Balance changes on-chain

#### SPL Token Instructions

- [ ] **TC-010**: Build token transfer transaction
  - Steps: Select SPL Token → Transfer → Enter token mint, amount, recipient
  - Expected: Transaction with TokenProgram.transfer
  - On-chain: `createTransferInstruction()` from @solana/spl-token
  - Validation: Token account exists, sufficient balance

- [ ] **TC-011**: Build create token account transaction
  - Steps: Select SPL Token → Create Account → Enter mint, owner
  - Expected: Transaction with createAssociatedTokenAccountInstruction
  - On-chain: `getAssociatedTokenAddress()` + `createAssociatedTokenAccountInstruction()`

- [ ] **TC-012**: Build mint tokens transaction
  - Steps: Select SPL Token → Mint → Enter mint authority, amount, destination
  - Expected: Transaction with mintTo instruction
  - On-chain: `createMintToInstruction()` from @solana/spl-token
  - Validation: Mint authority is signer

- [ ] **TC-013**: Build burn tokens transaction
  - Steps: Select SPL Token → Burn → Enter token account, amount
  - Expected: Transaction with burn instruction
  - On-chain: `createBurnInstruction()` from @solana/spl-token

- [ ] **TC-014**: Execute token transfer (devnet)
  - Steps: Build → Sign → Send
  - Expected: Transaction succeeds
  - On-chain: Full transaction execution
  - Verify: Token balances updated on-chain

#### Advanced Transaction Building

- [ ] **TC-015**: Build multi-instruction transaction
  - Steps: Add multiple instructions (transfer + create account)
  - Expected: Single transaction with multiple instructions
  - On-chain: Transaction with multiple instructions array
  - Validation: All instructions valid, accounts properly ordered

- [ ] **TC-016**: Build transaction with compute budget
  - Steps: Add compute budget instructions
  - Expected: Transaction includes compute budget program instructions
  - On-chain: `ComputeBudgetProgram.setComputeUnitLimit()` + `setComputeUnitPrice()`

- [ ] **TC-017**: Transaction simulation
  - Steps: Build transaction → Click "Simulate"
  - Expected: Simulation result shows logs, compute units, account changes
  - On-chain: `connection.simulateTransaction()`
  - Verify: Simulation matches actual execution

- [ ] **TC-018**: Transaction signing and sending
  - Steps: Build → Review → Sign → Send
  - Expected: Transaction sent, signature returned
  - On-chain: `wallet.sendTransaction()` → `connection.confirmTransaction()`
  - Verify: Transaction appears on-chain

---

### 3. Arbitrage Scanner

**Workflow Steps:**
1. User navigates to Arbitrage Scanner
2. System scans DEX pools (Raydium, Orca, Jupiter)
3. System detects arbitrage opportunities
4. System displays opportunities with profit estimates
5. User selects an opportunity
6. User builds transaction for opportunity
7. User executes arbitrage transaction

**Test Cases:**

- [ ] **TC-019**: Scan for arbitrage opportunities
  - Steps: Open scanner → Click "Scan"
  - Expected: List of opportunities with profit % and amounts
  - On-chain: API calls to `/api/pools/scan` (no direct on-chain, but uses on-chain data)

- [ ] **TC-020**: View opportunity details
  - Steps: Click on opportunity
  - Expected: Shows route, DEXs, expected profit, gas costs
  - On-chain: None (UI only)

- [ ] **TC-021**: Build arbitrage transaction
  - Steps: Select opportunity → Click "Build Transaction"
  - Expected: Transaction builder opens with pre-filled swap instructions
  - On-chain: Jupiter swap quote + transaction building

- [ ] **TC-022**: Execute arbitrage (devnet)
  - Steps: Build → Sign → Send
  - Expected: Transaction executes swaps, profit realized
  - On-chain: Multiple swap instructions executed
  - Verify: Token balances updated, profit calculated

- [ ] **TC-023**: Real-time opportunity updates
  - Steps: Keep scanner open
  - Expected: Opportunities update as prices change
  - On-chain: WebSocket or polling for pool updates

---

### 4. Transaction Bundler

**Workflow Steps:**
1. User navigates to Transaction Bundler
2. User adds multiple transactions
3. User configures bundling options
4. System bundles transactions
5. User reviews bundled transaction
6. User signs and sends bundle

**Test Cases:**

- [ ] **TC-024**: Add transactions to bundle
  - Steps: Add transaction 1, transaction 2, etc.
  - Expected: Transactions added to bundle list
  - On-chain: None (UI state)

- [ ] **TC-025**: Build transaction bundle
  - Steps: Click "Build Bundle"
  - Expected: Single transaction with multiple instructions
  - On-chain: Transaction with all instructions combined
  - Validation: Total size < 1232 bytes, compute units within limit

- [ ] **TC-026**: Execute transaction bundle (devnet)
  - Steps: Build → Sign → Send
  - Expected: All transactions execute atomically
  - On-chain: `sendTransaction()` with bundled instructions
  - Verify: All operations succeed or all fail (atomicity)

---

### 5. SEAL Token Presale

**Workflow Steps:**
1. User navigates to SEAL Presale
2. User views presale countdown and tier information
3. User enters SOL amount to contribute
4. System calculates SEAL tokens and bonus
5. User confirms contribution
6. User signs and sends transaction
7. System records contribution
8. User can view contribution and vesting schedule

**Test Cases:**

- [ ] **TC-027**: View presale information
  - Steps: Navigate to presale page
  - Expected: Shows tiers, bonuses, vesting schedule, countdown
  - On-chain: `connection.getAccountInfo(presaleState)` (if deployed)

- [ ] **TC-028**: Calculate contribution (Tier 1: 1-9.99 SOL)
  - Steps: Enter 5 SOL
  - Expected: Shows 15% bonus, total SEAL tokens
  - Calculation: `(5 SOL / pricePerSeal) * 1.15`
  - On-chain: None (calculation only)

- [ ] **TC-029**: Calculate contribution (Tier 2: 10-49.99 SOL)
  - Steps: Enter 25 SOL
  - Expected: Shows 25% bonus
  - Calculation: `(25 SOL / pricePerSeal) * 1.25`

- [ ] **TC-030**: Calculate contribution (Tier 3: 50+ SOL)
  - Steps: Enter 100 SOL
  - Expected: Shows 35% bonus
  - Calculation: `(100 SOL / pricePerSeal) * 1.35`

- [ ] **TC-031**: Contribute to presale (devnet)
  - Steps: Enter amount → Confirm → Sign → Send
  - Expected: Transaction succeeds, contribution recorded
  - On-chain: Smart contract call to presale program
    - Instruction: `contribute(amount)`
    - Verify: Contribution stored on-chain
    - Verify: SOL transferred to treasury

- [ ] **TC-032**: View contribution details
  - Steps: After contributing, view "My Contribution"
  - Expected: Shows contributed SOL, SEAL tokens, tier, vesting schedule
  - On-chain: `connection.getAccountInfo(contributorAccount)`

- [ ] **TC-033**: Claim vested tokens (after presale ends)
  - Steps: Navigate to presale → Click "Claim Vested"
  - Expected: Transaction to claim available vested tokens
  - On-chain: Smart contract call `claimVested()`
  - Verify: Tokens transferred to user wallet

- [ ] **TC-034**: Presale validation
  - Steps: Try to contribute below minimum (0.1 SOL)
  - Expected: Error message, transaction not built
  - Validation: `amount >= minPurchase`

- [ ] **TC-035**: Presale validation - max purchase
  - Steps: Try to contribute above max (1000 SOL)
  - Expected: Error message
  - Validation: `amount <= maxPurchase`

- [ ] **TC-036**: Presale validation - total cap
  - Steps: Try to contribute when cap reached
  - Expected: Error message "Presale cap reached"
  - On-chain: Check `presaleState.totalRaised >= totalRaiseCap`

---

### 6. Staking Operations

**Workflow Steps:**
1. User requests staking via AI or navigates to staking
2. System shows available staking providers
3. User selects provider (Marinade, Jito, Lido)
4. User enters amount
5. System builds staking transaction
6. User signs and sends transaction
7. System confirms staking

**Test Cases:**

- [ ] **TC-037**: Stake with Marinade Finance
  - Steps: Select Marinade → Enter 200 SOL → Confirm
  - Expected: Transaction with Marinade deposit instruction
  - On-chain: Call to Marinade program `deposit()`
  - Verify: mSOL tokens received

- [ ] **TC-038**: Stake with Jito
  - Steps: Select Jito → Enter 200 SOL → Confirm
  - Expected: Transaction with Jito staking instruction
  - On-chain: Call to Jito staking program
  - Verify: jitoSOL tokens received

- [ ] **TC-039**: Stake with Lido
  - Steps: Select Lido → Enter 200 SOL → Confirm
  - Expected: Transaction with Lido staking instruction
  - On-chain: Call to Lido program
  - Verify: stSOL tokens received

- [ ] **TC-040**: Native Solana staking
  - Steps: Select Native → Choose validator → Enter amount
  - Expected: Transaction with stake account creation + delegation
  - On-chain: `StakeProgram.delegate()` instruction
  - Verify: Stake account created and delegated

---

### 7. Send SOL/Token Operations

**Workflow Steps:**
1. User requests to send SOL/tokens (via AI or UI)
2. System searches contacts for recipient
3. User enters/confirms recipient address
4. User enters amount
5. System builds transfer transaction
6. User signs and sends transaction
7. System confirms transfer

**Test Cases:**

- [ ] **TC-041**: Send SOL to address
  - Steps: Enter recipient address → Enter amount → Send
  - Expected: SOL transferred successfully
  - On-chain: `SystemProgram.transfer()` instruction
  - Verify: Recipient balance increased, sender balance decreased

- [ ] **TC-042**: Send SOL to contact
  - Steps: Select contact from list → Enter amount → Send
  - Expected: Uses contact's wallet address
  - On-chain: Same as TC-041

- [ ] **TC-043**: Send SPL token
  - Steps: Select token → Enter recipient → Enter amount → Send
  - Expected: Token transferred successfully
  - On-chain: `createTransferInstruction()` from @solana/spl-token
  - Verify: Token balances updated

- [ ] **TC-044**: Send validation - insufficient balance
  - Steps: Try to send more than balance
  - Expected: Error message before transaction building
  - Validation: Check balance on-chain first

---

### 8. Airdrop Operations (Devnet Only)

**Workflow Steps:**
1. User requests airdrop (must be on devnet)
2. System checks network
3. System requests airdrop from faucet
4. System confirms airdrop transaction

**Test Cases:**

- [ ] **TC-045**: Request airdrop on devnet
  - Steps: Switch to devnet → Request airdrop
  - Expected: SOL airdropped to wallet
  - On-chain: `connection.requestAirdrop(publicKey, amount)`
  - Verify: Balance increased

- [ ] **TC-046**: Airdrop validation - mainnet blocked
  - Steps: On mainnet → Try to request airdrop
  - Expected: Error message "Airdrops only on devnet"
  - Validation: Network check before airdrop call

- [ ] **TC-047**: Airdrop rate limiting
  - Steps: Request multiple airdrops quickly
  - Expected: Rate limit message after first request
  - Validation: Cooldown timer

---

### 9. AI Cyber Playground

**Workflow Steps:**
1. User navigates to AI Cyber Playground
2. User creates AI agent
3. User configures agent strategy
4. User deploys agent
5. Agent monitors and executes trades
6. User views agent performance

**Test Cases:**

- [ ] **TC-048**: Create arbitrage agent
  - Steps: Create agent → Select "Arbitrage" strategy → Configure
  - Expected: Agent created with strategy
  - On-chain: None (agent state stored off-chain)

- [ ] **TC-049**: Agent executes trade
  - Steps: Agent detects opportunity → Executes
  - Expected: Transaction sent on-chain
  - On-chain: Agent's wallet sends transaction
  - Verify: Transaction succeeds, agent balance updated

- [ ] **TC-050**: Agent risk management
  - Steps: Set max loss limit → Agent hits limit
  - Expected: Agent stops trading
  - Validation: Off-chain monitoring

---

### 10. Wallet Management

**Workflow Steps:**
1. User navigates to Wallet Manager
2. User creates new wallet
3. User imports existing wallet
4. User exports wallet
5. User manages multiple wallets

**Test Cases:**

- [ ] **TC-051**: Create new wallet
  - Steps: Click "Create Wallet" → Save keypair
  - Expected: New wallet with address and keypair
  - On-chain: None (keypair generation only)

- [ ] **TC-052**: Import wallet from private key
  - Steps: Enter private key → Import
  - Expected: Wallet imported, address matches
  - Validation: Keypair derivation

- [ ] **TC-053**: Export wallet
  - Steps: Select wallet → Export
  - Expected: Private key exported (encrypted)
  - Security: Encryption verified

- [ ] **TC-054**: Send from managed wallet
  - Steps: Select wallet → Send SOL
  - Expected: Transaction signed with managed wallet
  - On-chain: Transaction signed with imported keypair

---

### 11. Rent Reclaimer

**Workflow Steps:**
1. User navigates to Rent Reclaimer
2. System scans wallet for rent-paying accounts
3. System displays accounts eligible for rent reclamation
4. User selects accounts to close
5. User confirms closure
6. System closes accounts and reclaims rent

**Test Cases:**

- [ ] **TC-055**: Scan for rent-paying accounts
  - Steps: Enter wallet address → Scan
  - Expected: List of accounts with rent amounts
  - On-chain: `connection.getProgramAccounts()` to find owned accounts

- [ ] **TC-056**: Close account and reclaim rent
  - Steps: Select account → Close
  - Expected: Account closed, rent returned to wallet
  - On-chain: `closeAccount()` instruction (SPL Token) or account closure
  - Verify: Rent SOL returned to wallet

---

### 12. Devnet Faucet

**Workflow Steps:**
1. User navigates to Devnet Faucet
2. User enters wallet address
3. User requests airdrop
4. System airdrops SOL

**Test Cases:**

- [ ] **TC-057**: Request faucet airdrop
  - Steps: Enter address → Request
  - Expected: SOL airdropped
  - On-chain: `connection.requestAirdrop(address, amount)`
  - Verify: Balance increased

---

## On-Chain Functions - Test Cases

### Smart Contract Programs

#### 1. Attestation Program

**Program ID**: (Check Anchor.toml)

**Functions to Test:**

- [ ] **TC-058**: Initialize attestation program
  - Instruction: `initialize()`
  - On-chain: `program.methods.initialize().rpc()`
  - Verify: Program state initialized on-chain

- [ ] **TC-059**: Mint attestation
  - Instruction: `mintAttestation(attestationType, data)`
  - On-chain: `program.methods.mintAttestation().rpc()`
  - Verify: Attestation NFT minted on-chain

- [ ] **TC-060**: Verify attestation
  - Instruction: `verifyAttestation(attestationId)`
  - On-chain: `program.methods.verifyAttestation().rpc()`
  - Verify: Attestation verified on-chain

---

#### 2. SEAL Presale Program

**Program ID**: (Check config)

**Functions to Test:**

- [ ] **TC-061**: Initialize presale
  - Instruction: `initialize(startTime, endTime, config)`
  - On-chain: `program.methods.initialize().rpc()`
  - Verify: Presale state initialized

- [ ] **TC-062**: Contribute to presale
  - Instruction: `contribute(amount)`
  - On-chain: `program.methods.contribute(amount).rpc()`
  - Verify: Contribution recorded, SOL transferred

- [ ] **TC-063**: Claim vested tokens
  - Instruction: `claimVested()`
  - On-chain: `program.methods.claimVested().rpc()`
  - Verify: Vested tokens transferred

- [ ] **TC-064**: Withdraw funds (admin only)
  - Instruction: `withdrawFunds(amount)`
  - On-chain: `program.methods.withdrawFunds().rpc()`
  - Verify: Funds withdrawn to treasury

- [ ] **TC-065**: Update presale config (admin only)
  - Instruction: `updateConfig(newConfig)`
  - On-chain: `program.methods.updateConfig().rpc()`
  - Verify: Config updated on-chain

---

### Direct On-Chain Operations

#### System Program

- [ ] **TC-066**: SystemProgram.transfer
  - On-chain: `SystemProgram.transfer({ fromPubkey, toPubkey, lamports })`
  - Verify: Balance transfer confirmed

- [ ] **TC-067**: SystemProgram.createAccount
  - On-chain: `SystemProgram.createAccount({ fromPubkey, newAccountPubkey, space, lamports, programId })`
  - Verify: Account created on-chain

#### SPL Token Program

- [ ] **TC-068**: TokenProgram.transfer
  - On-chain: `createTransferInstruction(source, destination, owner, amount)`
  - Verify: Token balance transfer confirmed

- [ ] **TC-069**: TokenProgram.mintTo
  - On-chain: `createMintToInstruction(mint, destination, authority, amount)`
  - Verify: Tokens minted, balance increased

- [ ] **TC-070**: TokenProgram.burn
  - On-chain: `createBurnInstruction(account, mint, owner, amount)`
  - Verify: Tokens burned, supply decreased

- [ ] **TC-071**: Associated Token Account creation
  - On-chain: `getAssociatedTokenAddress()` + `createAssociatedTokenAccountInstruction()`
  - Verify: ATA created on-chain

#### Staking Programs

- [ ] **TC-072**: Marinade deposit
  - On-chain: Call to Marinade program `deposit()`
  - Verify: mSOL received

- [ ] **TC-073**: Jito stake
  - On-chain: Call to Jito staking program
  - Verify: jitoSOL received

- [ ] **TC-074**: Native stake delegation
  - On-chain: `StakeProgram.delegate()`
  - Verify: Stake account delegated to validator

#### DEX Interactions

- [ ] **TC-075**: Jupiter swap
  - On-chain: Jupiter swap transaction
  - Verify: Tokens swapped, balances updated

- [ ] **TC-076**: Raydium swap
  - On-chain: Raydium swap instruction
  - Verify: Swap executed

- [ ] **TC-077**: Orca swap
  - On-chain: Orca swap instruction
  - Verify: Swap executed

---

## API Endpoints Testing

### Core APIs

- [ ] **TC-078**: `/api/pools/scan` - Pool scanning
  - Test: GET request
  - Verify: Returns pool data

- [ ] **TC-079**: `/api/pools/imbalance` - Imbalance detection
  - Test: GET with parameters
  - Verify: Returns imbalance signals

- [ ] **TC-080**: `/api/arbitrage/analyze` - Arbitrage analysis
  - Test: POST with opportunity data
  - Verify: Returns analysis

- [ ] **TC-081**: `/api/jupiter/quote` - Jupiter quote
  - Test: GET with swap parameters
  - Verify: Returns quote

- [ ] **TC-082**: `/api/jupiter/swap` - Jupiter swap
  - Test: POST with swap data
  - Verify: Returns swap transaction

### Wallet APIs

- [ ] **TC-083**: `/api/wallet/create` - Create wallet
  - Test: POST request
  - Verify: Returns wallet address (no private key in response)

- [ ] **TC-084**: `/api/wallet/recover` - Recover wallet
  - Test: POST with recovery data
  - Verify: Wallet recovered

### Attestation APIs

- [ ] **TC-085**: `/api/attestation/presale/check` - Check presale attestation
  - Test: GET with wallet address
  - Verify: Returns attestation status

---

## Integration Testing

### End-to-End Workflows

- [ ] **TC-086**: Complete arbitrage workflow
  - Steps: Scan → Find opportunity → Build transaction → Execute
  - Verify: All steps work, profit realized

- [ ] **TC-087**: Complete presale workflow
  - Steps: View presale → Contribute → View contribution → Claim vested
  - Verify: All steps work, tokens received

- [ ] **TC-088**: Complete staking workflow
  - Steps: Select provider → Enter amount → Stake → View staked tokens
  - Verify: Staking successful, tokens received

- [ ] **TC-089**: Multi-wallet transaction
  - Steps: Create multiple wallets → Send between them
  - Verify: All transactions succeed

---

## Test Execution Checklist

### Pre-Testing Setup

- [ ] Devnet RPC endpoint configured
- [ ] Test wallet with devnet SOL created
- [ ] All smart contracts deployed to devnet
- [ ] Test tokens minted on devnet
- [ ] API keys configured (if needed)

### Testing Environment

- [ ] **Network**: Devnet only (mainnet blocked)
- [ ] **Wallet**: Test wallet with sufficient SOL
- [ ] **Contracts**: All programs deployed
- [ ] **Monitoring**: Transaction explorer ready

### Test Execution Order

1. **Phase 1**: Core Features (TC-001 to TC-023)
2. **Phase 2**: On-Chain Functions (TC-024 to TC-077)
3. **Phase 3**: API Endpoints (TC-078 to TC-085)
4. **Phase 4**: Integration Tests (TC-086 to TC-089)

### Test Results Tracking

For each test case:
- [ ] Test executed
- [ ] Result: PASS / FAIL
- [ ] On-chain transaction signature (if applicable)
- [ ] Screenshot/evidence
- [ ] Notes/issues

### Critical Tests (Must Pass)

These tests are critical for core functionality:

- TC-007: SOL transfer transaction
- TC-010: Token transfer transaction
- TC-017: Transaction simulation
- TC-018: Transaction signing and sending
- TC-031: Presale contribution
- TC-041: Send SOL
- TC-045: Airdrop on devnet

---

## On-Chain Verification Steps

For each on-chain operation, verify:

1. **Transaction Sent**: Transaction signature obtained
2. **Transaction Confirmed**: `connection.confirmTransaction(signature)`
3. **State Changed**: On-chain state matches expected
4. **Balance Updated**: Account balances match expected
5. **Event Logged**: Transaction logs contain expected events

### Verification Tools

- Solana Explorer: `https://explorer.solana.com/tx/{signature}?cluster=devnet`
- Solscan: `https://solscan.io/tx/{signature}?cluster=devnet`
- Program logs: Check transaction logs for program output

---

## Known Issues & Limitations

- [ ] List any known issues discovered during testing
- [ ] Document workarounds
- [ ] Track fixes needed

---

## Test Report Template

For each test session:

```
Test Session: [Date]
Tester: [Name]
Environment: Devnet
Wallet: [Address]

Results:
- Total Tests: X
- Passed: Y
- Failed: Z
- Skipped: W

Failed Tests:
- TC-XXX: [Description] - [Issue]

On-Chain Transactions:
- [Signature 1]: [Description]
- [Signature 2]: [Description]

Notes:
[Any observations or issues]
```

---

## Next Steps

1. Execute all test cases systematically
2. Document all results
3. Fix any failures
4. Re-test failed cases
5. Create production deployment checklist
6. Set up monitoring for on-chain operations

---

**Status**: Ready for Testing  
**Priority**: High  
**Estimated Time**: 2-3 days for complete testing
