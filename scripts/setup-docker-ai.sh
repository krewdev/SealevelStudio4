#!/bin/bash

# Setup script for Docker-based local AI
# This script sets up Ollama and MCP server using Docker

set -e

echo "🚀 Setting up Docker-based Local AI for Sealevel Studio"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker Desktop first:"
    echo "   https://www.docker.com/products/docker-desktop/"
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "❌ Docker is not running. Please start Docker Desktop."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ docker-compose is not available."
    exit 1
fi

# Use docker compose (v2) if available, otherwise docker-compose (v1)
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
else
    DOCKER_COMPOSE="docker-compose"
fi

echo "✅ Docker is installed and running"
echo ""

# Check GPU availability
echo "🔍 Checking GPU availability..."
if ./scripts/check-gpu.sh; then
    echo "✅ GPU detected"
else
    echo "⚠️  No GPU detected, will use CPU (slower)"
fi
echo ""

# Pull Docker images
echo "📥 Pulling Docker images..."
$DOCKER_COMPOSE pull
echo ""

# Start services
echo "🚀 Starting services..."
$DOCKER_COMPOSE up -d
echo ""

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 5

# Check Ollama health
echo "🏥 Checking Ollama health..."
for i in {1..30}; do
    if curl -f http://localhost:11434/api/tags &> /dev/null; then
        echo "✅ Ollama is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Ollama failed to start. Check logs with: docker-compose logs ollama"
        exit 1
    fi
    sleep 1
done
echo ""

# Download default model
echo "📦 Downloading default model (llama2)..."
echo "   This may take a few minutes depending on your internet connection..."
$DOCKER_COMPOSE exec -T ollama ollama pull llama2 || {
    echo "⚠️  Failed to pull llama2. You can pull it manually later with:"
    echo "   docker-compose exec ollama ollama pull llama2"
}
echo ""

# Check MCP server if enabled
if [ "$MCP_ENABLED" = "true" ] || grep -q "MCP_ENABLED=true" .env.local 2>/dev/null; then
    echo "🔍 Checking MCP server..."
    for i in {1..30}; do
        if curl -f http://localhost:8000/health &> /dev/null; then
            echo "✅ MCP server is ready"
            break
        fi
        if [ $i -eq 30 ]; then
            echo "⚠️  MCP server not responding. Check logs with: docker-compose logs mcp-server"
        fi
        sleep 1
    done
    echo ""
fi

# Display status
echo "📊 Service Status:"
$DOCKER_COMPOSE ps
echo ""

# Display available models
echo "📋 Available models:"
$DOCKER_COMPOSE exec -T ollama ollama list || echo "No models installed yet"
echo ""

echo "✅ Docker-based Local AI setup complete!"
echo ""
echo "Next steps:"
echo "1. Add to your .env.local:"
echo "   LOCAL_AI_ENABLED=true"
echo "   LOCAL_AI_ENDPOINT=http://localhost:11434"
echo "   LOCAL_AI_MODEL=llama2"
echo "   LOCAL_AI_TYPE=ollama"
echo "   DOCKER_AI_ENABLED=true"
echo ""
echo "2. Restart your Next.js application"
echo ""
echo "3. Test the connection:"
echo "   curl http://localhost:3000/api/ai/core?action=status"
echo ""
echo "Useful commands:"
echo "  - View logs: docker-compose logs -f ollama"
echo "  - Stop services: docker-compose down"
echo "  - Pull more models: docker-compose exec ollama ollama pull <model-name>"
echo "  - Check GPU usage: docker stats"
echo ""

