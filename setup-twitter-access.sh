#!/bin/bash

# ============================================
# Twitter Access Token Setup Script
# ============================================
# This script helps you configure Twitter access tokens
# for Sealevel Studio (development/testing only)

echo "🐦 Twitter Access Token Setup"
echo "============================"
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
NEXT_PUBLIC_PLATFORM_FEE_ADDRESS=11111111111111111111111111111112
NEXT_PUBLIC_TREASURY_ADDRESS=11111111111111111111111111111112

# ============================================
# Twitter Direct Access (Development/Testing Only)
# ============================================
# WARNING: Never use access tokens in production!
# Tokens expire and are insecure. Use OAuth flow instead.

# Twitter Access Token (from your Twitter app)
TWITTER_ACCESS_TOKEN=your_twitter_access_token_here

# Twitter Bearer Token (optional, for read-only operations)
TWITTER_BEARER_TOKEN=your_twitter_bearer_token_here

# ============================================
# Other Environment Variables
# ============================================
# Add your other API keys and configuration here from env.template
EOF
    echo "✅ Created .env.local file"
    echo ""
fi

echo "🔑 Twitter Access Token Configuration:"
echo ""

# Check current configuration
if [ -f ".env.local" ]; then
    if grep -q "TWITTER_ACCESS_TOKEN=" .env.local; then
        echo "Current access token configuration:"
        grep "TWITTER_ACCESS_TOKEN=" .env.local || echo "Not set"
        grep "TWITTER_BEARER_TOKEN=" .env.local || echo "Bearer token not set"
    else
        echo "❌ Twitter access token not configured in .env.local"
    fi
else
    echo "❌ .env.local file not found"
fi

echo ""
echo "📝 To configure your Twitter access token:"
echo "  1. Go to https://developer.twitter.com/"
echo "  2. Navigate to your Twitter app"
echo "  3. Go to 'Keys and Tokens' tab"
echo "  4. Copy your 'Access Token and Secret'"
echo "  5. Edit .env.local file"
echo "  6. Replace 'your_twitter_access_token_here' with your actual token"
echo "  7. Restart your development server: npm run dev"
echo ""

echo "⚠️  Important Security Notes:"
echo "  - Access tokens should NEVER be used in production"
echo "  - Use OAuth 2.0 flow for production authentication"
echo "  - Access tokens expire and need to be refreshed"
echo "  - Keep tokens secure and never commit to git"
echo ""

echo "🚀 To test the Twitter bot with direct access:"
echo "  1. Configure your access token above"
echo "  2. Restart the server: npm run dev"
echo "  3. Go to the Twitter Bot page"
echo "  4. Click 'Login with Direct Access Token'"
echo ""

echo "🔧 Alternative: OAuth 2.0 Setup (Recommended for Production)"
echo "  If you want proper OAuth setup, configure these instead:"
echo "  - TWITTER_CLIENT_ID"
echo "  - TWITTER_CLIENT_SECRET"
echo "  - TWITTER_CALLBACK_URL"
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
echo "🎉 Twitter access token setup complete!"
echo "Restart your server to apply changes: npm run dev"
