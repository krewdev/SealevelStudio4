#!/bin/bash

# Setup script for MCP Server
# This script sets up the Model Context Protocol server

set -e

echo "🚀 Setting up MCP Server for Sealevel Studio"
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

# Generate API key if not set
if [ -z "$MCP_API_KEY" ]; then
    if [ -f .env.local ] && grep -q "MCP_API_KEY" .env.local; then
        echo "✅ MCP_API_KEY found in .env.local"
    else
        echo "🔑 Generating MCP API key..."
        MCP_API_KEY=$(openssl rand -hex 32 2>/dev/null || python3 -c "import secrets; print(secrets.token_hex(32))" 2>/dev/null || echo "change-me-$(date +%s)")
        echo "   Generated key: $MCP_API_KEY"
        echo ""
        echo "⚠️  Add this to your .env.local:"
        echo "   MCP_API_KEY=$MCP_API_KEY"
        echo ""
    fi
fi

# Build MCP server image
echo "🔨 Building MCP server image..."
$DOCKER_COMPOSE build mcp-server
echo ""

# Start MCP server
echo "🚀 Starting MCP server..."
$DOCKER_COMPOSE up -d mcp-server
echo ""

# Wait for server to be ready
echo "⏳ Waiting for MCP server to start..."
sleep 3

# Check health
echo "🏥 Checking MCP server health..."
for i in {1..30}; do
    if curl -f http://localhost:8000/health &> /dev/null; then
        echo "✅ MCP server is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ MCP server failed to start. Check logs with: docker-compose logs mcp-server"
        exit 1
    fi
    sleep 1
done
echo ""

# Test API
echo "🧪 Testing MCP server API..."
if curl -f http://localhost:8000/tools &> /dev/null; then
    echo "✅ MCP server API is responding"
else
    echo "⚠️  MCP server API test failed"
fi
echo ""

# Display status
echo "📊 MCP Server Status:"
$DOCKER_COMPOSE ps mcp-server
echo ""

echo "✅ MCP Server setup complete!"
echo ""
echo "Next steps:"
echo "1. Add to your .env.local:"
echo "   MCP_ENABLED=true"
echo "   MCP_SERVER_URL=http://localhost:8000"
echo "   MCP_API_KEY=your_api_key_here"
echo ""
echo "2. Restart your Next.js application"
echo ""
echo "3. Test the connection:"
echo "   curl http://localhost:8000/health"
echo "   curl http://localhost:8000/tools"
echo ""
echo "Useful commands:"
echo "  - View logs: docker-compose logs -f mcp-server"
echo "  - Stop server: docker-compose stop mcp-server"
echo "  - Restart server: docker-compose restart mcp-server"
echo ""

