#!/bin/bash

# Test script for Agent API endpoints
# Tests agent creation, listing, and control

BASE_URL="http://localhost:3000"
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "🧪 Testing Agent API Endpoints..."
echo ""

# Test 1: Create Arbitrage Agent
echo "Test 1: Creating arbitrage agent..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/agents/create" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "arbitrage",
    "config": {
      "name": "Test Arbitrage Agent",
      "strategy": "arbitrage",
      "riskTolerance": "medium",
      "maxPositionSize": 1.0,
      "minProfitThreshold": 0.01,
      "slippageTolerance": 0.5,
      "priorityFee": 10000
    }
  }')

if echo "$RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✅ Agent created successfully${NC}"
  AGENT_WALLET=$(echo "$RESPONSE" | grep -o '"wallet":"[^"]*"' | cut -d'"' -f4)
  echo "   Agent Wallet: $AGENT_WALLET"
else
  echo -e "${RED}❌ Failed to create agent${NC}"
  echo "$RESPONSE"
  exit 1
fi

echo ""

# Test 2: List Agents
echo "Test 2: Listing all agents..."
RESPONSE=$(curl -s "$BASE_URL/api/agents/list")
if echo "$RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✅ Agents listed successfully${NC}"
  COUNT=$(echo "$RESPONSE" | grep -o '"count":[0-9]*' | cut -d':' -f2)
  echo "   Total agents: $COUNT"
else
  echo -e "${RED}❌ Failed to list agents${NC}"
fi

echo ""

# Test 3: Start Agent
if [ -n "$AGENT_WALLET" ]; then
  echo "Test 3: Starting agent..."
  RESPONSE=$(curl -s -X POST "$BASE_URL/api/agents/control" \
    -H "Content-Type: application/json" \
    -d "{
      \"action\": \"start\",
      \"wallet\": \"$AGENT_WALLET\"
    }")
  
  if echo "$RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ Agent started successfully${NC}"
  else
    echo -e "${RED}❌ Failed to start agent${NC}"
    echo "$RESPONSE"
  fi
fi

echo ""

# Test 4: Get Agent Status
if [ -n "$AGENT_WALLET" ]; then
  echo "Test 4: Getting agent status..."
  RESPONSE=$(curl -s -X POST "$BASE_URL/api/agents/control" \
    -H "Content-Type: application/json" \
    -d "{
      \"action\": \"status\",
      \"wallet\": \"$AGENT_WALLET\"
    }")
  
  if echo "$RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ Agent status retrieved${NC}"
    echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
  else
    echo -e "${RED}❌ Failed to get status${NC}"
  fi
fi

echo ""
echo "✅ All tests completed!"

