# API Quick Reference Guide

## 🚀 Quick Start

### Most Used Endpoints

1. **Get Imbalance Signals** (with risk analysis)
   ```
   GET /api/pools/imbalance?enhanced=true&severity=high
   ```

2. **Get Prioritized Opportunities**
   ```
   GET /api/pools/signals/prioritized
   ```

3. **Predict Prices**
   ```
   GET /api/pools/predict?timeHorizon=60
   ```

4. **Analyze Opportunity Risk**
   ```
   GET /api/pools/analyze?minProfit=0.01
   ```

---

## 📊 Current Monitoring Status

**Pools Monitored:** 1,000-2,000+ pools
- Raydium: Hundreds
- Orca: Hundreds  
- Meteora: Dozens
- Lifinity: Dozens
- Jupiter: Aggregator

**Detection Capabilities:**
- ✅ Price deviations (arbitrage)
- ✅ Liquidity imbalances
- ✅ Volume spikes
- ✅ Graph-based multi-hop opportunities
- ✅ LSD de-pegging
- ✅ Perpetual premiums/discounts
- ✅ MEV opportunities (ShredStream ready)
- ✅ Whale activity

---

## 🎯 API Endpoints

### Core Monitoring
| Endpoint | Purpose | Key Features |
|----------|---------|--------------|
| `/api/pools/monitor` | Real-time monitoring | Enhanced caching, volatility-based TTL |
| `/api/pools/imbalance` | Imbalance detection | Risk analysis, predictions, pattern matching |
| `/api/pools/predict` | Price prediction | 30-60s ahead, confidence scoring |
| `/api/pools/graph` | Graph opportunities | Multi-hop, triangular, LSD arbitrage |
| `/api/pools/analyze` | Risk analysis | Execution probability, recommendations |
| `/api/pools/signals/prioritized` | AI prioritization | Composite scoring, action recommendations |

### Advanced Features
| Endpoint | Purpose | Key Features |
|----------|---------|--------------|
| `/api/mev/signals` | MEV detection | Sandwich, sniping, back-running |
| `/api/whales/track` | Whale tracking | Behavior prediction, follow opportunities |
| `/api/perpetuals/monitor` | Perp monitoring | Premium/discount, funding rate arbitrage |
| `/api/pools/patterns` | Pattern matching | Historical success prediction |

---

## 💡 Usage Tips

1. **Use Enhanced Mode** for best results:
   ```
   ?enhanced=true
   ```

2. **Filter by Severity** to reduce noise:
   ```
   ?severity=high
   ```

3. **Get Prioritized Signals** for actionable opportunities:
   ```
   GET /api/pools/signals/prioritized
   ```

4. **Monitor Specific Pools**:
   ```
   GET /api/pools/monitor?pools=pool1,pool2,pool3
   ```

---

## 🔥 Key Improvements Over Basic API

1. **Predictive:** Forecasts opportunities before they happen
2. **Risk-Aware:** Tells you execution probability and risk
3. **Pattern-Based:** Learns from historical successes
4. **Graph-Powered:** Finds complex multi-hop paths
5. **MEV-Ready:** Detects sandwich and sniping opportunities
6. **Whale-Aware:** Tracks and predicts large wallet moves
7. **Perp-Integrated:** Monitors perpetual contracts
8. **Smart Caching:** Optimized performance

---

## 📈 Response Format

All APIs return:
```json
{
  "success": true,
  "data": [...],
  "metadata": {
    "totalPools": 1247,
    "scanTime": 0.8,
    "cacheHitRate": 0.65
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

## 🎮 Integration with Bot Game

These APIs power the bot-building game:
- Bots can subscribe to signals
- Real-time updates via WebSocket
- Risk analysis guides bot decisions
- Pattern matching improves bot strategies
- Perpetual contracts expand trading options

---

## 📚 Full Documentation

See `API_DOCUMENTATION.md` for complete API reference.

