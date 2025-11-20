# Helius API Call Optimization

## Why You're Using Too Many API Calls

The pool scanner can make **hundreds or thousands of API calls** per scan because:

1. **Pagination Loops**: Each DEX fetcher can paginate through up to 50 pages (reduced from 1000)
2. **Multiple DEXs**: Scanning 5+ DEXs in parallel multiplies the calls
3. **No Rate Limiting**: Requests were sent too quickly
4. **No Caching**: Every scan made fresh API calls

## What We Fixed

### 1. Reduced Pagination Limits
- **Before**: Up to 1000 pages per DEX = potentially 10,000,000 accounts
- **After**: Max 50 pages per DEX = max 500,000 accounts per DEX
- **Impact**: Reduces max API calls per DEX from 1000 to 50

### 2. Added Rate Limiting
- **Request Delay**: 100ms between pagination requests
- **Scan Interval**: Minimum 30 seconds between full scans
- **DEX Staggering**: 200ms delay between each DEX fetch

### 3. Added Caching
- **Cache TTL**: 60 seconds (pools cached for 1 minute)
- **Cache Key**: Based on enabled DEXs
- **Impact**: Repeated scans within 60s use cache, not API

### 4. API Call Tracking
- Logs estimated API calls per scan
- Helps identify which DEXs are using the most calls

## API Call Estimates

### Per Scan (All DEXs):
- **Before**: ~500-5000+ calls (depending on pool counts)
- **After**: ~50-500 calls (with caching, often 0 if cached)

### Per DEX:
- **Raydium**: ~10-50 calls (depending on pool count)
- **Orca**: ~10-50 calls
- **Meteora**: ~10-50 calls
- **Lifinity**: ~5-20 calls
- **Helius**: ~10-50 calls

## Best Practices

### 1. Use Caching
The scanner now automatically caches results for 60 seconds. Don't scan more frequently than every 30 seconds.

### 2. Limit DEXs
Only scan the DEXs you need:
```typescript
const scanner = new PoolScanner({
  enabledDEXs: ['raydium', 'orca'] // Only scan these
});
```

### 3. Monitor API Usage
Check Helius dashboard regularly:
- Go to https://dashboard.helius.dev/
- Check "API Usage" section
- Monitor daily/monthly limits

### 4. Upgrade Plan if Needed
If you're hitting limits:
- **Free Tier**: 100k requests/month
- **Starter**: 1M requests/month ($99/mo)
- **Pro**: 10M requests/month ($499/mo)

## Reducing API Calls Further

### Option 1: Increase Cache TTL
Edit `app/lib/pools/scanner.ts`:
```typescript
private readonly CACHE_TTL = 300000; // 5 minutes instead of 1 minute
```

### Option 2: Reduce Max Pages
Edit `app/lib/pools/fetchers/pagination.ts`:
```typescript
const maxPages = 20; // Even fewer pages (max 200k accounts per DEX)
```

### Option 3: Scan Specific DEXs Only
Only enable the DEXs you actually need:
```typescript
enabledDEXs: ['raydium'] // Only Raydium
```

### Option 4: Use Birdeye Instead
Birdeye aggregates all DEXs in one API call:
- Set `NEXT_PUBLIC_BIRDEYE_API_KEY`
- Disable individual DEX fetchers
- Use Birdeye fetcher only

## Monitoring API Usage

### Check Current Usage
1. Go to https://dashboard.helius.dev/
2. Navigate to "API Usage"
3. View daily/monthly usage

### Set Up Alerts
1. In Helius dashboard → Settings → Alerts
2. Set alert at 80% of monthly limit
3. Get notified before hitting limits

## Emergency: If You Hit Limits

1. **Stop Scanning**: Don't run more scans until limit resets
2. **Check Cache**: Use cached results if available
3. **Reduce DEXs**: Scan only essential DEXs
4. **Increase Delays**: Temporarily increase `REQUEST_DELAY` to 500ms
5. **Upgrade Plan**: If needed for production

## Expected API Usage

### Conservative Usage (with caching):
- **1 scan per minute**: ~50-500 calls
- **Daily**: ~72,000 - 720,000 calls
- **Monthly**: ~2.16M - 21.6M calls

### With Current Optimizations:
- **Cached scans**: 0 calls (use cache)
- **Fresh scans**: ~50-500 calls
- **With 60s cache**: Max 1,440 scans/day = ~72k-720k calls/day

## Recommendations

1. ✅ **Use caching** (already implemented)
2. ✅ **Don't scan more than once per minute**
3. ✅ **Limit to essential DEXs only**
4. ✅ **Monitor Helius dashboard**
5. ✅ **Consider upgrading plan for production**

