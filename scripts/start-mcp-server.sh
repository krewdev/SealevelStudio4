#!/bin/bash

# Start MCP Server Script
# Starts the MCP server for local AI resource access

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MCP_SERVER_PATH="$PROJECT_ROOT/app/lib/ai/mcp/server.js"
PORT=${MCP_PORT:-8000}

echo "🚀 Starting MCP Server..."
echo "=================================="
echo "Port: $PORT"
echo "Server: $MCP_SERVER_PATH"
echo ""

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if server file exists
if [ ! -f "$MCP_SERVER_PATH" ]; then
    echo "❌ MCP server file not found at $MCP_SERVER_PATH"
    exit 1
fi

# Check if port is already in use
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  Port $PORT is already in use. Trying to use existing server..."
    curl -s http://localhost:$PORT/health > /dev/null && {
        echo "✅ MCP server is already running on port $PORT"
        echo ""
        echo "Test it:"
        echo "  curl http://localhost:$PORT/health"
        echo "  curl http://localhost:$PORT/resources"
        exit 0
    } || {
        echo "❌ Port $PORT is in use but server is not responding"
        echo "   Please free the port or change MCP_PORT in your environment"
        exit 1
    }
fi

# Start the server
cd "$PROJECT_ROOT"
echo "Starting server..."
echo ""

node "$MCP_SERVER_PATH" &
MCP_PID=$!

# Wait a moment for server to start
sleep 2

# Check if server started successfully
if ! kill -0 $MCP_PID 2>/dev/null; then
    echo "❌ MCP server failed to start"
    exit 1
fi

# Test health endpoint
if curl -s http://localhost:$PORT/health > /dev/null; then
    echo "✅ MCP server started successfully (PID: $MCP_PID)"
    echo ""
    echo "Server is running on http://localhost:$PORT"
    echo ""
    echo "Available endpoints:"
    echo "  - Health: http://localhost:$PORT/health"
    echo "  - Resources: http://localhost:$PORT/resources"
    echo "  - Tools: http://localhost:$PORT/tools"
    echo ""
    echo "To stop the server, run:"
    echo "  kill $MCP_PID"
    echo ""
    echo "Or press Ctrl+C to stop"
    
    # Save PID to file for easy cleanup
    echo $MCP_PID > "$PROJECT_ROOT/.mcp-server.pid"
    
    # Wait for user interrupt
    trap "echo ''; echo 'Stopping MCP server...'; kill $MCP_PID 2>/dev/null; rm -f '$PROJECT_ROOT/.mcp-server.pid'; exit 0" INT TERM
    wait $MCP_PID
else
    echo "❌ MCP server started but health check failed"
    kill $MCP_PID 2>/dev/null
    exit 1
fi

