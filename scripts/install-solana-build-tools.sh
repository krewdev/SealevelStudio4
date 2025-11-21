#!/bin/bash

# Script to install Solana build tools (cargo build-sbf)
# This fixes the "build-sbf not found" error

set -e

echo "🔧 Installing Solana Build Tools..."

# Check if Solana CLI is installed
if ! command -v solana &> /dev/null; then
    echo "❌ Solana CLI not found. Please install it first:"
    echo "   sh -c \"\$(curl -sSfL https://release.solana.com/stable/install)\""
    exit 1
fi

echo "✅ Solana CLI found: $(solana --version)"

# Check if we're on macOS (Homebrew) or Linux
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "🍎 Detected macOS"
    
    # Check if Solana was installed via Homebrew
    if [ -f "/opt/homebrew/bin/solana" ] || [ -f "/usr/local/bin/solana" ]; then
        echo "📦 Solana installed via Homebrew"
        
        # For Homebrew installations, platform tools might be separate
        # Try to install via cargo
        echo "🔨 Attempting to install platform tools..."
        
        # Check if we can install via Solana's installer
        if command -v solana-install &> /dev/null; then
            echo "📥 Installing platform tools via solana-install..."
            solana-install init
        else
            echo "⚠️  solana-install not found. Trying alternative method..."
            
            # Try to download and install platform tools manually
            SOLANA_VERSION=$(solana --version | awk '{print $2}')
            echo "🔍 Detected Solana version: $SOLANA_VERSION"
            
            # For Homebrew installations, we might need to install platform tools separately
            echo "💡 For Homebrew installations, you may need to:"
            echo "   1. Install platform tools: brew install solana-platform-tools"
            echo "   2. Or use: cargo install --git https://github.com/solana-labs/solana cargo-build-sbf"
        fi
    else
        # Standard Solana installation
        echo "📥 Installing platform tools..."
        
        # Add Solana to PATH if not already there
        if [ -d "$HOME/.local/share/solana/install/active_release/bin" ]; then
            export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
            echo "✅ Added Solana to PATH"
        fi
        
        # Try to initialize platform tools
        if command -v solana-install &> /dev/null; then
            solana-install init
        else
            echo "⚠️  solana-install command not found"
            echo "💡 Try running: sh -c \"\$(curl -sSfL https://release.solana.com/stable/install)\""
        fi
    fi
else
    echo "🐧 Detected Linux"
    # Similar process for Linux
    if [ -d "$HOME/.local/share/solana/install/active_release/bin" ]; then
        export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
    fi
    
    if command -v solana-install &> /dev/null; then
        solana-install init
    else
        echo "⚠️  solana-install not found. Please install Solana platform tools."
    fi
fi

# Verify installation
echo ""
echo "🔍 Verifying installation..."

# Add common Solana paths to PATH for this session
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
export PATH="/opt/homebrew/bin:$PATH"
export PATH="/usr/local/bin:$PATH"

if command -v cargo-build-sbf &> /dev/null || cargo build-sbf --version &> /dev/null; then
    echo "✅ cargo build-sbf is now available!"
    cargo build-sbf --version
elif [ -f "$HOME/.local/share/solana/install/active_release/bin/cargo-build-sbf" ]; then
    echo "✅ cargo-build-sbf found at: $HOME/.local/share/solana/install/active_release/bin/cargo-build-sbf"
    echo "💡 Add this to your PATH:"
    echo "   export PATH=\"\$HOME/.local/share/solana/install/active_release/bin:\$PATH\""
    echo "   (Add to ~/.zshrc or ~/.bashrc to make permanent)"
else
    echo "⚠️  cargo build-sbf still not found"
    echo ""
    echo "📚 Alternative solutions:"
    echo "   1. Install via Homebrew (macOS):"
    echo "      brew install solana-platform-tools"
    echo ""
    echo "   2. Use Docker for building:"
    echo "      docker run --rm -v \"\$(pwd)\":/workspace -w /workspace projectserum/build:v0.32.1 anchor build"
    echo ""
    echo "   3. For now, you can generate IDL without building:"
    echo "      cd programs/attestation-program && anchor idl build"
fi

echo ""
echo "✅ Installation script completed!"

