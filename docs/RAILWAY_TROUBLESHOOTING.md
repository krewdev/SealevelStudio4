# Railway Build Troubleshooting

## Build Hanging/Not Finishing

If your build hangs or doesn't finish on Railway, try these solutions:

### Solution 1: Increase Memory Limits

Update `railway.toml`:
```toml
[build]
builder = "NIXPACKS"
buildCommand = "NODE_OPTIONS='--max-old-space-size=4096' npm ci --legacy-peer-deps && NODE_OPTIONS='--max-old-space-size=4096' npm run build"
```

### Solution 2: Disable Standalone Output for Railway

The standalone output mode can cause build issues on Railway. Update `next.config.js`:

```js
// Disable standalone for Railway
output: process.env.RAILWAY_ENVIRONMENT ? undefined : (process.env.NODE_ENV === 'production' ? 'standalone' : undefined),
```

### Solution 3: Simplify Build Command

If the build still hangs, try a simpler build command:

```toml
[build]
builder = "NIXPACKS"
buildCommand = "npm install --legacy-peer-deps && npm run build"
```

### Solution 4: Check Environment Variables

Ensure all required environment variables are set in Railway dashboard before building.

### Solution 5: Check Build Logs

1. Go to Railway Dashboard → Your Project → Deployments
2. Click on the failed deployment
3. Check the build logs for specific errors

### Solution 6: Increase Build Timeout

In Railway Dashboard:
1. Go to Project Settings → Build Settings
2. Increase build timeout if needed
3. Default is usually 15-20 minutes

### Common Issues

**Issue: Build times out**
- Increase memory allocation
- Disable standalone output
- Check for memory leaks in build process

**Issue: npm ci hangs**
- Try `npm install` instead
- Check for corrupted package-lock.json
- Clear npm cache: `npm cache clean --force`

**Issue: Out of memory**
- Increase `--max-old-space-size` value
- Remove unnecessary dependencies
- Split build into multiple steps

## Quick Fix Checklist

- [ ] Updated `railway.toml` with memory limits
- [ ] Disabled standalone output for Railway
- [ ] Set all required environment variables
- [ ] Checked build logs for specific errors
- [ ] Increased build timeout if needed
- [ ] Verified Node.js version (18+)
