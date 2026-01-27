#!/bin/bash

# SEAL Presale MultiversX Deployment Script
# Usage: ./scripts/deploy-multiversx-presale.sh [devnet|mainnet]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default to devnet
NETWORK=${1:-devnet}

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  SEAL Presale MultiversX Deployment${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Set network parameters
if [ "$NETWORK" == "mainnet" ]; then
    PROXY="https://gateway.multiversx.com"
    CHAIN_ID="1"
    echo -e "${RED}⚠️  WARNING: Deploying to MAINNET!${NC}"
    echo ""
    read -p "Are you sure you want to deploy to mainnet? (yes/no): " CONFIRM
    if [ "$CONFIRM" != "yes" ]; then
        echo "Deployment cancelled."
        exit 1
    fi
else
    PROXY="https://devnet-gateway.multiversx.com"
    CHAIN_ID="D"
    echo -e "${YELLOW}📡 Deploying to DEVNET${NC}"
fi

echo ""
echo "Network: $NETWORK"
echo "Proxy: $PROXY"
echo "Chain ID: $CHAIN_ID"
echo ""

# Check for wallet file
WALLET_FILE="${WALLET_PEM:-wallet.pem}"
if [ ! -f "$WALLET_FILE" ]; then
    echo -e "${RED}Error: Wallet file not found: $WALLET_FILE${NC}"
    echo "Set WALLET_PEM environment variable or create wallet.pem"
    echo ""
    echo "To create a new wallet:"
    echo "  mxpy wallet new --format pem --outfile wallet.pem"
    exit 1
fi

echo -e "${GREEN}✓ Wallet file found: $WALLET_FILE${NC}"

# Check for required environment variables
if [ -z "$SEAL_TOKEN_ID" ]; then
    echo -e "${YELLOW}⚠️  SEAL_TOKEN_ID not set. Using placeholder.${NC}"
    SEAL_TOKEN_ID="SEAL-000000"
fi

if [ -z "$TREASURY_ADDRESS" ]; then
    echo -e "${RED}Error: TREASURY_ADDRESS environment variable not set${NC}"
    echo "Export your treasury address:"
    echo "  export TREASURY_ADDRESS=erd1..."
    exit 1
fi

# Calculate start timestamp (default: now + 1 hour)
if [ -z "$START_TIMESTAMP" ]; then
    START_TIMESTAMP=$(($(date +%s) + 3600))
    echo -e "${YELLOW}⚠️  START_TIMESTAMP not set. Using: $START_TIMESTAMP (1 hour from now)${NC}"
fi

# Duration in seconds (default: 90 days)
DURATION=${DURATION:-7776000}

echo ""
echo "Configuration:"
echo "  SEAL Token ID: $SEAL_TOKEN_ID"
echo "  Treasury: $TREASURY_ADDRESS"
echo "  Start Timestamp: $START_TIMESTAMP ($(date -r $START_TIMESTAMP 2>/dev/null || date -d @$START_TIMESTAMP))"
echo "  Duration: $DURATION seconds ($(($DURATION / 86400)) days)"
echo ""

# Navigate to contract directory
CONTRACT_DIR="$(dirname "$0")/../contracts/seal-presale-multiversx"
cd "$CONTRACT_DIR"

echo -e "${GREEN}📦 Building contract...${NC}"

# Check if mxpy is installed
if ! command -v mxpy &> /dev/null; then
    echo -e "${RED}Error: mxpy not found. Install with:${NC}"
    echo "  pip3 install multiversx-sdk-cli --upgrade"
    exit 1
fi

# Build the contract
mxpy contract build

if [ ! -f "output/seal-presale-multiversx.wasm" ]; then
    echo -e "${RED}Error: Build failed. WASM file not found.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Contract built successfully${NC}"
echo ""

# Deploy
echo -e "${GREEN}🚀 Deploying contract...${NC}"

DEPLOY_OUTPUT=$(mxpy contract deploy \
    --project . \
    --pem "../../$WALLET_FILE" \
    --gas-limit 100000000 \
    --proxy "$PROXY" \
    --chain "$CHAIN_ID" \
    --arguments \
        "str:$SEAL_TOKEN_ID" \
        "$TREASURY_ADDRESS" \
        "$START_TIMESTAMP" \
        "$DURATION" \
    --recall-nonce \
    --send 2>&1)

echo "$DEPLOY_OUTPUT"

# Extract contract address from output
CONTRACT_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep -oE "erd1[a-z0-9]{58}" | head -1)

if [ -z "$CONTRACT_ADDRESS" ]; then
    echo -e "${RED}Error: Could not extract contract address from deployment output${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Contract Address: $CONTRACT_ADDRESS"
echo "Network: $NETWORK"
echo ""
echo "Next steps:"
echo "1. Fund the contract with SEAL tokens"
echo "2. Start the presale: mxpy contract call $CONTRACT_ADDRESS --function startPresale ..."
echo ""

# Save deployment info
DEPLOY_INFO_FILE="../../deployments/multiversx-$NETWORK.json"
mkdir -p "$(dirname "$DEPLOY_INFO_FILE")"
cat > "$DEPLOY_INFO_FILE" << EOF
{
  "network": "$NETWORK",
  "contractAddress": "$CONTRACT_ADDRESS",
  "sealTokenId": "$SEAL_TOKEN_ID",
  "treasury": "$TREASURY_ADDRESS",
  "startTimestamp": $START_TIMESTAMP,
  "duration": $DURATION,
  "deployedAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "proxy": "$PROXY",
  "chainId": "$CHAIN_ID"
}
EOF

echo -e "${GREEN}✓ Deployment info saved to: $DEPLOY_INFO_FILE${NC}"
