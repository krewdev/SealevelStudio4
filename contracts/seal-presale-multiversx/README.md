# SEAL Presale MultiversX Smart Contract

A secure, on-chain presale smart contract for the SEAL token on MultiversX blockchain.

## Features

- **3-Tier Bonus Structure**:
  - Tier 1 (1-9.99 EGLD): 15% bonus
  - Tier 2 (10-49.99 EGLD): 25% bonus
  - Tier 3 (50+ EGLD): 35% bonus

- **Security Features**:
  - On-chain enforcement of all limits
  - Whitelist support
  - Emergency pause functionality
  - Owner-only admin functions

- **Configuration**:
  - Min Purchase: 0.1 EGLD
  - Max Purchase: 1,000 EGLD per wallet
  - Total Raise Cap: 10,000 EGLD
  - Duration: 90 days
  - Price: ~20,000 SEAL per EGLD

## Prerequisites

1. **Install Rust** (if not already installed):
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   rustup default stable
   rustup target add wasm32-unknown-unknown
   ```

2. **Install MultiversX SDK**:
   ```bash
   pip3 install multiversx-sdk-cli --upgrade
   ```

3. **Create a wallet** (if you don't have one):
   ```bash
   mxpy wallet new --format pem --outfile wallet.pem
   ```

## Building the Contract

```bash
cd contracts/seal-presale-multiversx

# Build the contract
mxpy contract build

# Or using cargo directly:
cargo build --release --target wasm32-unknown-unknown
```

The compiled WASM file will be at: `output/seal-presale-multiversx.wasm`

## Deployment

### 1. Deploy to Devnet (Testing)

```bash
# Set environment
export PROXY="https://devnet-gateway.multiversx.com"
export CHAIN_ID="D"

# Deploy contract
mxpy contract deploy \
    --project . \
    --pem wallet.pem \
    --gas-limit 100000000 \
    --proxy $PROXY \
    --chain $CHAIN_ID \
    --arguments \
        str:SEAL-XXXXXX \
        erd1YOUR_TREASURY_ADDRESS \
        UNIX_START_TIMESTAMP \
        7776000 \
    --recall-nonce \
    --send
```

### 2. Deploy to Mainnet

```bash
# Set environment
export PROXY="https://gateway.multiversx.com"
export CHAIN_ID="1"

# Deploy contract
mxpy contract deploy \
    --project . \
    --pem wallet.pem \
    --gas-limit 100000000 \
    --proxy $PROXY \
    --chain $CHAIN_ID \
    --arguments \
        str:SEAL-XXXXXX \
        erd1YOUR_TREASURY_ADDRESS \
        UNIX_START_TIMESTAMP \
        7776000 \
    --recall-nonce \
    --send
```

## Post-Deployment Setup

### 1. Fund the Contract with SEAL Tokens

Before starting the presale, transfer SEAL tokens to the contract:

```bash
mxpy tx new \
    --pem wallet.pem \
    --receiver CONTRACT_ADDRESS \
    --gas-limit 5000000 \
    --proxy $PROXY \
    --chain $CHAIN_ID \
    --function "ESDTTransfer" \
    --arguments str:SEAL-XXXXXX AMOUNT_IN_WEI \
    --recall-nonce \
    --send
```

### 2. Start the Presale

```bash
mxpy contract call CONTRACT_ADDRESS \
    --pem wallet.pem \
    --gas-limit 5000000 \
    --proxy $PROXY \
    --chain $CHAIN_ID \
    --function "startPresale" \
    --recall-nonce \
    --send
```

## Contract Interactions

### View Functions

```bash
# Get presale stats
mxpy contract query CONTRACT_ADDRESS \
    --proxy $PROXY \
    --function "getPresaleStats"

# Get contributor info
mxpy contract query CONTRACT_ADDRESS \
    --proxy $PROXY \
    --function "getContributor" \
    --arguments erd1USER_ADDRESS

# Check if whitelisted
mxpy contract query CONTRACT_ADDRESS \
    --proxy $PROXY \
    --function "isWhitelisted" \
    --arguments erd1USER_ADDRESS

# Calculate tokens for contribution
mxpy contract query CONTRACT_ADDRESS \
    --proxy $PROXY \
    --function "calculateTokensForContribution" \
    --arguments EGLD_AMOUNT_IN_WEI
```

### Contribute (User)

```bash
mxpy contract call CONTRACT_ADDRESS \
    --pem user-wallet.pem \
    --gas-limit 10000000 \
    --proxy $PROXY \
    --chain $CHAIN_ID \
    --function "contribute" \
    --value 1000000000000000000 \  # 1 EGLD
    --recall-nonce \
    --send
```

### Admin Functions

```bash
# Pause presale
mxpy contract call CONTRACT_ADDRESS \
    --pem wallet.pem \
    --gas-limit 5000000 \
    --proxy $PROXY \
    --chain $CHAIN_ID \
    --function "pausePresale" \
    --recall-nonce \
    --send

# End presale
mxpy contract call CONTRACT_ADDRESS \
    --pem wallet.pem \
    --gas-limit 5000000 \
    --proxy $PROXY \
    --chain $CHAIN_ID \
    --function "endPresale" \
    --recall-nonce \
    --send

# Add to whitelist
mxpy contract call CONTRACT_ADDRESS \
    --pem wallet.pem \
    --gas-limit 10000000 \
    --proxy $PROXY \
    --chain $CHAIN_ID \
    --function "addToWhitelist" \
    --arguments erd1ADDRESS1 erd1ADDRESS2 \
    --recall-nonce \
    --send

# Enable whitelist
mxpy contract call CONTRACT_ADDRESS \
    --pem wallet.pem \
    --gas-limit 5000000 \
    --proxy $PROXY \
    --chain $CHAIN_ID \
    --function "setWhitelistEnabled" \
    --arguments 1 \
    --recall-nonce \
    --send

# Withdraw remaining tokens after presale ends
mxpy contract call CONTRACT_ADDRESS \
    --pem wallet.pem \
    --gas-limit 10000000 \
    --proxy $PROXY \
    --chain $CHAIN_ID \
    --function "withdrawRemainingTokens" \
    --recall-nonce \
    --send
```

## Security Considerations

1. **Before Deployment**:
   - Audit the contract code
   - Test thoroughly on devnet
   - Use a secure wallet (preferably hardware wallet or multi-sig)

2. **Treasury Security**:
   - Use a multi-sig wallet for the treasury address
   - Never share your PEM file

3. **Monitoring**:
   - Monitor contract events for contributions
   - Track total raised vs cap
   - Watch for any suspicious activity

## Contract Addresses

| Network | Contract Address | Status |
|---------|-----------------|--------|
| Devnet  | TBD             | -      |
| Mainnet | TBD             | -      |

## Support

For issues or questions, contact the Sealevel Studios team.
