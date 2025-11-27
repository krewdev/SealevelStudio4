#!/bin/bash

# Cloudflare Tunnel Quick Start Script
# This script helps you quickly start a Cloudflare tunnel for local development

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚇 Cloudflare Tunnel Quick Start${NC}"
echo ""

# Check if cloudflared is installed
if ! command -v cloudflared &> /dev/null; then
    echo -e "${RED}❌ cloudflared is not installed${NC}"
    echo ""
    echo "Install it with:"
    echo "  macOS: brew install cloudflare/cloudflare/cloudflared"
    echo "  Linux: wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64"
    echo "  Windows: choco install cloudflared"
    exit 1
fi

echo -e "${GREEN}✅ cloudflared is installed${NC}"
echo ""

# Check if user is logged in
if ! cloudflared tunnel list &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not logged in to Cloudflare${NC}"
    echo "Running: cloudflared tunnel login"
    echo ""
    cloudflared tunnel login
fi

# Check for tunnel name argument
TUNNEL_NAME=${1:-sealevel-studio-dev}
PORT=${2:-3000}

echo -e "${GREEN}Starting tunnel: ${TUNNEL_NAME}${NC}"
echo -e "${GREEN}Forwarding to: http://localhost:${PORT}${NC}"
echo ""

# Check if tunnel exists
if cloudflared tunnel list | grep -q "$TUNNEL_NAME"; then
    echo -e "${GREEN}✅ Tunnel '$TUNNEL_NAME' exists${NC}"
    echo ""
    echo "Starting tunnel..."
    cloudflared tunnel run "$TUNNEL_NAME"
else
    echo -e "${YELLOW}⚠️  Tunnel '$TUNNEL_NAME' does not exist${NC}"
    echo ""
    echo "Options:"
    echo "  1. Create a named tunnel (recommended)"
    echo "  2. Use quick tunnel (temporary URL)"
    echo ""
    read -p "Choose option (1 or 2): " option
    
    if [ "$option" = "1" ]; then
        echo ""
        echo "Creating tunnel: $TUNNEL_NAME"
        cloudflared tunnel create "$TUNNEL_NAME"
        
        echo ""
        echo "Creating DNS record..."
        read -p "Enter your domain (e.g., yourdomain.com): " domain
        if [ -n "$domain" ]; then
            cloudflared tunnel route dns "$TUNNEL_NAME" "${TUNNEL_NAME}.${domain}"
            echo -e "${GREEN}✅ DNS record created: ${TUNNEL_NAME}.${domain}${NC}"
        fi
        
        echo ""
        echo "Starting tunnel..."
        cloudflared tunnel run "$TUNNEL_NAME"
    else
        echo ""
        echo "Starting quick tunnel..."
        echo -e "${YELLOW}Note: This creates a temporary URL that changes each time${NC}"
        echo ""
        cloudflared tunnel --url "http://localhost:${PORT}"
    fi
fi

