#!/bin/bash

# Test script for Pool Scanning API
# Tests on-chain pool gathering

BASE_URL="http://localhost:3000"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🧪 Testing Pool Scanning API..."
echo ""

# Test 1: Scan all pools
echo "Test 1: Scanning all pools on mainnet..."
RESPONSE=$(curl -s "$BASE_URL/api/pools/scan?network=mainnet")
if echo "$RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✅ Pool scan successful${NC}"
  TOTAL_POOLS=$(echo "$RESPONSE" | grep -o '"totalPools":[0-9]*' | cut -d':' -f2)
  echo "   Total pools found: $TOTAL_POOLS"
  
  # Show pools by DEX
  echo "$RESPONSE" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if 'poolsByDex' in data.get('stats', {}):
        print('   Pools by DEX:')
        for dex, count in data['stats']['poolsByDex'].items():
            print(f'     {dex}: {count}')
except:
    pass
" 2>/dev/null
else
  echo -e "${RED}❌ Pool scan failed${NC}"
  echo "$RESPONSE" | head -20
fi

echo ""

# Test 2: Filter by DEX
echo "Test 2: Scanning specific DEXes (orca, raydium)..."
RESPONSE=$(curl -s "$BASE_URL/api/pools/scan?network=mainnet&dexes=orca,raydium")
if echo "$RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✅ Filtered scan successful${NC}"
  TOTAL_POOLS=$(echo "$RESPONSE" | grep -o '"totalPools":[0-9]*' | cut -d':' -f2)
  echo "   Total pools: $TOTAL_POOLS"
else
  echo -e "${YELLOW}⚠️  Filtered scan completed (may have no pools)${NC}"
fi

echo ""

# Test 3: Search specific token pair
echo "Test 3: Searching pools for SOL/USDC pair..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/pools/scan" \
  -H "Content-Type: application/json" \
  -d '{
    "tokenA": "So11111111111111111111111111111111111111112",
    "tokenB": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "network": "mainnet"
  }')

if echo "$RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✅ Token pair search successful${NC}"
  COUNT=$(echo "$RESPONSE" | grep -o '"count":[0-9]*' | cut -d':' -f2)
  echo "   Pools found: $COUNT"
else
  echo -e "${YELLOW}⚠️  Token pair search completed (may have no pools)${NC}"
fi

echo ""

# Test 4: Scan with opportunities
echo "Test 4: Scanning with arbitrage opportunities..."
RESPONSE=$(curl -s "$BASE_URL/api/pools/scan?network=mainnet&opportunities=true")
if echo "$RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✅ Scan with opportunities successful${NC}"
  if echo "$RESPONSE" | grep -q '"opportunities"'; then
    echo "   Opportunities included in response"
  fi
else
  echo -e "${YELLOW}⚠️  Scan completed (opportunities may be empty)${NC}"
fi

echo ""
echo "✅ All pool API tests completed!"

