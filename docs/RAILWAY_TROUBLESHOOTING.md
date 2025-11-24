# Railway Troubleshooting Guide

## railway.toml Not Found Error

### Important Note

**Railway auto-detects Next.js projects** and doesn't actually require `railway.toml` to deploy. If you see a "railway.toml not found" message, it's usually just a warning and won't prevent deployment.

### Solution 1: Railway Auto-Detection (Recommended)

Railway will automatically:
- Detect Next.js framework
- Run `npm install` and `npm run build`
- Start with `npm start`
- Set PORT automatically

**No configuration file needed!** Just deploy your repository.

### Solution 2: If You Need Explicit Configuration

If Railway still shows the error, ensure `railway.toml` is:

1. **In the root directory** (same level as `package.json`)
2. **Committed to git**:
   ```bash
   git add railway.toml
   git commit -m "Add railway.toml"
   git push
   ```
3. **Not in .gitignore** (check your `.gitignore` file)

### Solution 3: Service-Specific Configuration

If your Railway project has multiple services, you may need to configure the service root:

1. Go to Railway Dashboard → Your Service → Settings
2. Check **Root Directory** setting
3. Ensure it points to the directory containing `railway.toml`

### Solution 4: Use Railway Dashboard Configuration

Instead of `railway.toml`, configure via Railway Dashboard:

1. Go to Railway Dashboard → Your Project → Settings
2. Configure:
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
   - **Healthcheck Path**: `/`

### Current railway.toml Format

Your `railway.toml` should look like this:

```toml
[build]
builder = "NIXPACKS"
buildCommand = "npm ci && npm run build"

[deploy]
startCommand = "npm start"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
healthcheckPath = "/"
healthcheckTimeout = 100
```

### Verify File Location

Check that `railway.toml` is in the root:

```bash
# Should show the file
ls -la railway.toml

# Should be in root directory (same as package.json)
ls package.json railway.toml
```

### Check Git Status

Ensure the file is committed:

```bash
git status railway.toml
# Should show "nothing to commit" if already committed
```

If not committed:
```bash
git add railway.toml
git commit -m "Add Railway configuration"
git push
```

### Railway Service Detection

Railway detects services automatically. If you have issues:

1. **Check Service Type**: Railway Dashboard → Service → Settings
2. **Verify Root Directory**: Should be `/` or empty for root
3. **Check Build Logs**: Railway Dashboard → Deployments → View Logs

### Common Issues

#### Issue: "railway.toml not found" but deployment works

**Solution**: This is just a warning. Railway auto-detects Next.js, so the file isn't required. You can ignore this message.

#### Issue: File exists but Railway doesn't see it

**Possible causes:**
1. File not committed to git
2. File in wrong directory
3. Service root directory misconfigured

**Solution:**
```bash
# Verify file exists
ls railway.toml

# Commit if needed
git add railway.toml
git commit -m "Add Railway config"
git push

# Check Railway service settings
# Dashboard → Service → Settings → Root Directory
```

#### Issue: Build fails even with railway.toml

**Solution**: Check Railway build logs for actual errors. The `railway.toml` file won't fix build errors - it only configures the build process.

### Railway Auto-Detection vs Manual Configuration

**Auto-Detection (Default):**
- ✅ No configuration needed
- ✅ Works out of the box
- ✅ Railway detects Next.js automatically

**Manual Configuration (railway.toml):**
- ✅ Explicit control
- ✅ Custom build commands
- ✅ Service-specific settings

**Recommendation**: Use auto-detection unless you need specific customizations.

### Next Steps

1. **If deployment works**: Ignore the warning, Railway auto-detects Next.js
2. **If deployment fails**: Check build logs, not the railway.toml error
3. **If you need custom config**: Ensure file is committed and in root directory

### Still Having Issues?

1. Check Railway build logs for actual errors
2. Verify environment variables are set
3. Check Node.js version compatibility
4. Review Railway documentation: https://docs.railway.app


