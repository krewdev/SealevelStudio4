#!/bin/bash

# Interactive setup script for local AI
# This script helps you choose and configure your local AI setup

set -e

echo "🚀 Sealevel Studio - Local AI Setup"
echo "===================================="
echo ""

# Check prerequisites
echo "🔍 Checking prerequisites..."

# Check Docker
if command -v docker &> /dev/null && docker info &> /dev/null; then
    DOCKER_AVAILABLE=true
    echo "✅ Docker is available"
else
    DOCKER_AVAILABLE=false
    echo "⚠️  Docker is not available (optional)"
fi

# Check Ollama (native)
if command -v ollama &> /dev/null; then
    OLLAMA_AVAILABLE=true
    echo "✅ Ollama is installed"
else
    OLLAMA_AVAILABLE=false
    echo "⚠️  Ollama is not installed (optional)"
fi

echo ""

# Choose setup method
echo "Choose your setup method:"
echo "1) Docker (Recommended - Isolated, portable)"
echo "2) Native Ollama (Direct installation)"
echo "3) Both (Docker + Native)"
echo ""
read -p "Enter choice [1-3]: " choice

case $choice in
    1)
        if [ "$DOCKER_AVAILABLE" = false ]; then
            echo "❌ Docker is required for this option"
            exit 1
        fi
        echo ""
        echo "🐳 Setting up Docker-based local AI..."
        ./scripts/setup-docker-ai.sh
        SETUP_METHOD="docker"
        ;;
    2)
        if [ "$OLLAMA_AVAILABLE" = false ]; then
            echo "📥 Installing Ollama..."
            if [[ "$OSTYPE" == "darwin"* ]]; then
                echo "   macOS detected. Install with: brew install ollama"
                read -p "Press Enter after installing Ollama..."
            elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
                echo "   Linux detected. Installing Ollama..."
                curl -fsSL https://ollama.ai/install.sh | sh
            else
                echo "   Please install Ollama manually from https://ollama.ai"
                exit 1
            fi
        fi
        
        echo ""
        echo "🔧 Setting up native Ollama..."
        
        # Start Ollama service
        if ! pgrep -x "ollama" > /dev/null; then
            echo "🚀 Starting Ollama service..."
            ollama serve &
            sleep 3
        fi
        
        # Download default model
        echo "📦 Downloading default model (llama2)..."
        ollama pull llama2
        
        SETUP_METHOD="native"
        ;;
    3)
        echo ""
        echo "🐳 Setting up Docker-based local AI..."
        if [ "$DOCKER_AVAILABLE" = true ]; then
            ./scripts/setup-docker-ai.sh
        fi
        
        echo ""
        echo "🔧 Setting up native Ollama..."
        if [ "$OLLAMA_AVAILABLE" = false ]; then
            echo "📥 Please install Ollama first"
        else
            if ! pgrep -x "ollama" > /dev/null; then
                ollama serve &
                sleep 3
            fi
            ollama pull llama2
        fi
        
        SETUP_METHOD="both"
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""

# MCP setup
echo "🔌 Do you want to set up MCP (Model Context Protocol) server? [y/N]"
read -p "Enter choice: " mcp_choice

if [[ "$mcp_choice" =~ ^[Yy]$ ]]; then
    if [ "$DOCKER_AVAILABLE" = true ]; then
        echo ""
        ./scripts/setup-mcp-server.sh
        MCP_ENABLED=true
    else
        echo "⚠️  MCP server requires Docker. Skipping..."
        MCP_ENABLED=false
    fi
else
    MCP_ENABLED=false
fi

echo ""

# GPU check
echo "🔍 Checking GPU availability..."
./scripts/check-gpu.sh
echo ""

# Generate .env.local configuration
echo "📝 Generating .env.local configuration..."

ENV_FILE=".env.local"
if [ ! -f "$ENV_FILE" ]; then
    cp env.template "$ENV_FILE"
fi

# Update LOCAL_AI configuration
if [ "$SETUP_METHOD" = "docker" ] || [ "$SETUP_METHOD" = "both" ]; then
    sed -i.bak 's/^LOCAL_AI_ENABLED=.*/LOCAL_AI_ENABLED=true/' "$ENV_FILE"
    sed -i.bak 's/^LOCAL_AI_ENDPOINT=.*/LOCAL_AI_ENDPOINT=http:\/\/localhost:11434/' "$ENV_FILE"
    sed -i.bak 's/^LOCAL_AI_MODEL=.*/LOCAL_AI_MODEL=llama2/' "$ENV_FILE"
    sed -i.bak 's/^LOCAL_AI_TYPE=.*/LOCAL_AI_TYPE=ollama/' "$ENV_FILE"
    sed -i.bak 's/^DOCKER_AI_ENABLED=.*/DOCKER_AI_ENABLED=true/' "$ENV_FILE" 2>/dev/null || echo "DOCKER_AI_ENABLED=true" >> "$ENV_FILE"
fi

if [ "$SETUP_METHOD" = "native" ] || [ "$SETUP_METHOD" = "both" ]; then
    sed -i.bak 's/^LOCAL_AI_ENABLED=.*/LOCAL_AI_ENABLED=true/' "$ENV_FILE"
    sed -i.bak 's/^LOCAL_AI_ENDPOINT=.*/LOCAL_AI_ENDPOINT=http:\/\/localhost:11434/' "$ENV_FILE"
    sed -i.bak 's/^LOCAL_AI_MODEL=.*/LOCAL_AI_MODEL=llama2/' "$ENV_FILE"
    sed -i.bak 's/^LOCAL_AI_TYPE=.*/LOCAL_AI_TYPE=ollama/' "$ENV_FILE"
fi

if [ "$MCP_ENABLED" = true ]; then
    sed -i.bak 's/^MCP_ENABLED=.*/MCP_ENABLED=true/' "$ENV_FILE" 2>/dev/null || echo "MCP_ENABLED=true" >> "$ENV_FILE"
    sed -i.bak 's/^MCP_SERVER_URL=.*/MCP_SERVER_URL=http:\/\/localhost:8000/' "$ENV_FILE" 2>/dev/null || echo "MCP_SERVER_URL=http://localhost:8000" >> "$ENV_FILE"
fi

# Clean up backup files
rm -f "$ENV_FILE.bak"

echo "✅ Configuration updated in .env.local"
echo ""

echo "✅ Local AI setup complete!"
echo ""
echo "Next steps:"
echo "1. Review .env.local configuration"
echo "2. Restart your Next.js application: npm run dev"
echo "3. Test the connection: curl http://localhost:3000/api/ai/core?action=status"
echo ""
echo "For more information, see:"
echo "  - docs/LOCAL_AI_SETUP.md"
echo "  - docs/MCP_GUIDE.md"
echo ""

