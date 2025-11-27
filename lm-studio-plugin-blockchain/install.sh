#!/bin/bash

# LM Studio Blockchain Plugin Installation Script

set -e

echo "🚀 Installing LM Studio Blockchain Plugin..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the plugin
echo ""
echo "🔨 Building plugin..."
npm run build

# Check if build was successful
if [ ! -f "dist/index.js" ]; then
    echo "❌ Build failed! dist/index.js not found."
    exit 1
fi

echo ""
echo "✅ Plugin built successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Open LM Studio"
echo "2. Go to Settings → Plugins"
echo "3. Click 'Add Plugin' or 'Install from Folder'"
echo "4. Select this directory: $(pwd)"
echo "5. Enable the plugin in the chat interface"
echo ""
echo "🎉 Installation complete!"

