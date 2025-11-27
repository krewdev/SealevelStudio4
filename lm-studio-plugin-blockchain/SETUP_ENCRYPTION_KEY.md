# Setting Up Encryption Key for Production

LM Studio requires an encryption key for production use to ensure secure handling of blockchain operations.

## Quick Setup

### Step 1: Generate an Encryption Key

Run this command in the plugin directory:

```bash
npm run generate-key
```

This will output a 64-character hexadecimal string like:
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

**Or generate manually:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 2: Set the Encryption Key

#### Option A: Environment File (Recommended for Development)

1. Create a `.env` file in the plugin directory:
   ```bash
   cp .env.example .env
   ```

2. Add your encryption key:
   ```env
   LM_STUDIO_PLUGIN_ENCRYPTION_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
   ```

#### Option B: System Environment Variable (Recommended for Production)

**macOS/Linux:**
```bash
export LM_STUDIO_PLUGIN_ENCRYPTION_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

Add to `~/.zshrc` or `~/.bashrc` for persistence:
```bash
echo 'export LM_STUDIO_PLUGIN_ENCRYPTION_KEY=your_key_here' >> ~/.zshrc
source ~/.zshrc
```

**Windows (PowerShell):**
```powershell
$env:LM_STUDIO_PLUGIN_ENCRYPTION_KEY="a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2"
```

**Windows (Command Prompt):**
```cmd
set LM_STUDIO_PLUGIN_ENCRYPTION_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

#### Option C: LM Studio Plugin Settings

Some LM Studio versions allow setting environment variables in the plugin settings UI. Check your LM Studio version for this option.

### Step 3: Verify the Key is Set

Restart LM Studio and check the plugin logs. You should no longer see the encryption key warning.

## Security Best Practices

1. **Never commit the encryption key to version control**
   - The `.env` file is already in `.gitignore`
   - Never share your encryption key publicly

2. **Use different keys for different environments**
   - Development: Use a test key
   - Production: Use a strong, randomly generated key

3. **Rotate keys periodically**
   - Generate a new key every 6-12 months
   - Update all systems using the old key

4. **Store keys securely**
   - Use environment variables, not hardcoded values
   - Use secret management services for production (AWS Secrets Manager, etc.)

## Troubleshooting

### "Encryption key not set" warning

**Solution:** Make sure you've:
1. Generated a key using `npm run generate-key`
2. Set it in `.env` file or as an environment variable
3. Restarted LM Studio after setting the key

### Key not working

**Check:**
1. The key is exactly 64 hexadecimal characters
2. No extra spaces or quotes around the key
3. Environment variable name is correct: `LM_STUDIO_PLUGIN_ENCRYPTION_KEY`
4. You've restarted LM Studio

### Development vs Production

- **Development:** Encryption key is optional (warning only)
- **Production:** Encryption key is required (plugin may not work without it)

## Need Help?

If you're still seeing the encryption key warning:
1. Check LM Studio's plugin logs
2. Verify the environment variable is set: `echo $LM_STUDIO_PLUGIN_ENCRYPTION_KEY`
3. Try setting it directly in LM Studio's plugin configuration if available

