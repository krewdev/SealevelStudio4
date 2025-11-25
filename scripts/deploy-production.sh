#!/bin/bash
# ============================================
# Sealevel Studio - Production Deployment Script
# ============================================
# This script helps deploy Sealevel Studio to production
# Usage: ./scripts/deploy-production.sh [platform]
# Platforms: vercel, docker, railway, render

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Platform selection
PLATFORM=${1:-vercel}

echo -e "${GREEN}🚀 Sealevel Studio - Production Deployment${NC}"
echo "Platform: $PLATFORM"
echo ""

# Check if .env.production.local exists
if [ ! -f ".env.production.local" ]; then
    echo -e "${YELLOW}⚠️  Warning: .env.production.local not found${NC}"
    echo "Creating from template..."
    if [ -f ".env.production.template" ]; then
        cp .env.production.template .env.production.local
        echo -e "${YELLOW}⚠️  Please fill in .env.production.local with your production values${NC}"
        exit 1
    else
        echo -e "${RED}❌ Error: .env.production.template not found${NC}"
        exit 1
    fi
fi

# Pre-deployment checks
echo -e "${GREEN}📋 Running pre-deployment checks...${NC}"

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Error: Node.js 18+ required (found: $(node -v))${NC}"
    exit 1
fi
echo "✓ Node.js version: $(node -v)"

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi
echo "✓ Dependencies installed"

# Run linting
echo "Running linter..."
if npm run lint; then
    echo "✓ Linting passed"
else
    echo -e "${YELLOW}⚠️  Linting warnings (continuing anyway)${NC}"
fi

# Build production bundle
echo "Building production bundle..."
if npm run build; then
    echo "✓ Build successful"
else
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

# Platform-specific deployment
case $PLATFORM in
    vercel)
        echo -e "${GREEN}📦 Deploying to Vercel...${NC}"
        
        # Check if Vercel CLI is installed
        if ! command -v vercel &> /dev/null; then
            echo "Installing Vercel CLI..."
            npm install -g vercel
        fi
        
        # Deploy to production
        echo "Running: vercel --prod"
        vercel --prod
        ;;
    
    docker)
        echo -e "${GREEN}🐳 Building Docker image...${NC}"
        
        # Build Docker image
        docker build -f Dockerfile.prod -t sealevel-studio:latest .
        
        echo -e "${GREEN}✓ Docker image built successfully${NC}"
        echo ""
        echo "To run the container:"
        echo "  docker run -p 3000:3000 --env-file .env.production.local sealevel-studio:latest"
        echo ""
        echo "Or use docker-compose:"
        echo "  docker-compose -f docker-compose.prod.yml up -d"
        ;;
    
    railway)
        echo -e "${GREEN}🚂 Deploying to Railway...${NC}"
        
        # Check if Railway CLI is installed
        if ! command -v railway &> /dev/null; then
            echo "Installing Railway CLI..."
            npm install -g @railway/cli
        fi
        
        # Deploy
        railway up
        ;;
    
    render)
        echo -e "${GREEN}🎨 Render deployment${NC}"
        echo "Please deploy via Render dashboard:"
        echo "1. Connect your GitHub repository"
        echo "2. Create new Web Service"
        echo "3. Set build command: npm install && npm run build"
        echo "4. Set start command: npm start"
        echo "5. Add environment variables from .env.production.local"
        ;;
    
    *)
        echo -e "${RED}❌ Unknown platform: $PLATFORM${NC}"
        echo "Supported platforms: vercel, docker, railway, render"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}✅ Deployment process completed!${NC}"
echo ""
echo "Next steps:"
echo "1. Verify environment variables are set correctly"
echo "2. Test the production deployment"
echo "3. Update webhook URLs if needed"
echo "4. Monitor logs for any issues"
