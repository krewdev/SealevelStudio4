#!/bin/bash

# ============================================
# Platform Fee Setup Script
# ============================================
# This script helps you configure the platform fee address
# for Sealevel Studio

echo "🤑 Sealevel Studio Platform Fee Setup"
echo "====================================="
echo ""

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "📝 Creating .env.local file..."
    cat > .env.local << 'EOF'
# ============================================
# Sealevel Studio - Local Environment Variables
# ============================================
# This file contains your local environment configuration
# DO NOT commit this file to git!

# ============================================
# Platform Fee Configuration
# ============================================
# Replace with your actual wallet address to receive platform fees
# This address will receive 0.0002 SOL from each transaction

NEXT_PUBLIC_PLATFORM_FEE_ADDRESS=YourWalletAddressHere

# Alternative treasury address (used as fallback)
NEXT_PUBLIC_TREASURY_ADDRESS=YourTreasuryWalletAddressHere

# ============================================
# Other Environment Variables
# ============================================
# Copy and configure other variables from env.template as needed
EOF
    echo "✅ Created .env.local file"
    echo ""
fi

echo "📋 Current platform fee configuration:"
if [ -f ".env.local" ]; then
    grep -E "(PLATFORM_FEE_ADDRESS|TREASURY_ADDRESS)" .env.local 2>/dev/null || echo "No platform fee address configured yet"
else
    echo ".env.local file not found"
fi
echo ""

echo "💰 Platform Fee Details:"
echo "  - Fee Amount: 0.0002 SOL per transaction"
echo "  - Fee is collected automatically on every transaction"
echo "  - Fee is added as a separate instruction to the transaction"
echo "  - If no address is configured, no fee is collected"
echo ""

echo "🔧 To configure your platform fee address:"
echo "  1. Edit .env.local file"
echo "  2. Replace 'YourWalletAddressHere' with your actual Solana wallet address"
echo "  3. Restart your development server: npm run dev"
echo ""

echo "🧪 To test the platform fee:"
echo "  npm run test:devnet-tx  # Run devnet transaction tests"
echo "  (This will include the platform fee in test transactions)"
echo ""

echo "⚠️  Important Notes:"
echo "  - The platform fee address must be a valid Solana wallet address"
echo "  - Fees are collected in SOL, not SPL tokens"
echo "  - The fee is 0.0002 SOL = 200,000 lamports per transaction"
echo "  - Fee collection is optional - set invalid address to disable"
echo ""

echo "📊 Revenue Estimation:"
echo "  At 0.0002 SOL per transaction:"
echo "  - 1,000 transactions = 0.2 SOL"
echo "  - 10,000 transactions = 2 SOL"
echo "  - 100,000 transactions = 200 SOL"
echo "  - 1,000,000 transactions = 2,000 SOL"
echo ""

read -p "Would you like to edit .env.local now? (y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command -v code &> /dev/null; then
        code .env.local
    elif command -v nano &> /dev/null; then
        nano .env.local
    else
        echo "Please edit .env.local manually with your preferred editor"
        echo "Example: nano .env.local or code .env.local"
    fi
fi

echo ""
echo "🎉 Platform fee setup complete!"
echo "Restart your server to apply changes: npm run dev"
