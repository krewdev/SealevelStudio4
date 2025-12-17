#!/bin/bash
# Helper script to find SEAL mint and treasury token account addresses

echo "🔍 Finding SEAL Token Addresses..."
echo ""

# Get wallet address
WALLET=$(solana address --url devnet)
echo "Your Wallet: $WALLET"
echo ""

# Check for token accounts
echo "📋 Token Accounts:"
spl-token accounts --url devnet 2>&1 | grep -E "(Token|Account|Address)" || echo "No token accounts found"

echo ""
echo "💡 If you created the mint recently, check:"
echo "   1. The output from 'anchor run create-seal-token'"
echo "   2. Your Solana transaction history"
echo "   3. Run: solana transaction-history --url devnet | grep -i mint"
echo ""
echo "Once you have the addresses, set them:"
echo "   export SEAL_MINT=<mint_address>"
echo "   export TREASURY_TOKEN=<token_account>"
echo ""
echo "Then run: anchor run initialize"


