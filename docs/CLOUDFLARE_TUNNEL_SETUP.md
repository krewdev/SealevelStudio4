# Cloudflare Tunnel Setup Guide

This guide will help you set up a Cloudflare tunnel to expose your local Sealevel Studio development server to the internet securely.

## What is Cloudflare Tunnel?

Cloudflare Tunnel (formerly Argo Tunnel) creates a secure connection between your local server and Cloudflare's network without exposing your local IP address or opening ports on your firewall. This is perfect for:
- Testing webhooks locally
- Sharing your development environment
- OAuth callbacks during development
- Secure access without port forwarding

## Prerequisites

1. A Cloudflare account (free tier works)
2. A domain managed by Cloudflare (or add a domain to Cloudflare)
3. `cloudflared` CLI installed on your machine

## Step 1: Install cloudflared

### macOS
```bash
brew install cloudflare/cloudflare/cloudflared
```

### Linux
```bash
# Download the latest release
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
chmod +x cloudflared-linux-amd64
sudo mv cloudflared-linux-amd64 /usr/local/bin/cloudflared
```

### Windows
Download from: https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe

Or use Chocolatey:
```powershell
choco install cloudflared
```

## Step 2: Login to Cloudflare

```bash
cloudflared tunnel login
```

This will:
1. Open your browser
2. Ask you to select a domain from your Cloudflare account
3. Authorize the tunnel to create DNS records

## Step 3: Create a Tunnel

```bash
# Create a named tunnel
cloudflared tunnel create sealevel-studio-dev

# This will output a tunnel ID (save this for later)
```

## Step 4: Configure the Tunnel

Create a configuration file at `~/.cloudflared/config.yml`:

```yaml
tunnel: <YOUR_TUNNEL_ID>
credentials-file: /Users/<YOUR_USERNAME>/.cloudflared/<TUNNEL_ID>.json

ingress:
  # Route all traffic to local Next.js server
  - hostname: sealevel-studio-dev.yourdomain.com
    service: http://localhost:3000
  
  # Catch-all rule (must be last)
  - service: http_status:404
```

**Or** create a project-specific config file at `cloudflared-config.yml`:

```yaml
tunnel: <YOUR_TUNNEL_ID>
credentials-file: /Users/<YOUR_USERNAME>/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: sealevel-studio-dev.yourdomain.com
    service: http://localhost:3000
  - service: http_status:404
```

## Step 5: Create DNS Record

```bash
# Create a CNAME record pointing to your tunnel
cloudflared tunnel route dns sealevel-studio-dev sealevel-studio-dev.yourdomain.com
```

Or manually in Cloudflare Dashboard:
1. Go to your domain → DNS → Records
2. Add a CNAME record:
   - **Name**: `sealevel-studio-dev`
   - **Target**: `<TUNNEL_ID>.cfargotunnel.com`
   - **Proxy status**: Proxied (orange cloud)

## Step 6: Start the Tunnel

### Option A: Using config file
```bash
cloudflared tunnel --config cloudflared-config.yml run sealevel-studio-dev
```

### Option B: Quick start (one-liner)
```bash
cloudflared tunnel --url http://localhost:3000
```

This creates a temporary tunnel with a random URL (e.g., `https://random-name.trycloudflare.com`)

## Step 7: Run Your Next.js Server

In a separate terminal:

```bash
npm run dev
```

Your app will be accessible at:
- `https://sealevel-studio-dev.yourdomain.com` (if using named tunnel)
- `https://random-name.trycloudflare.com` (if using quick start)

## Step 8: Update Environment Variables

Update your `.env.local` to use the Cloudflare tunnel URL:

```env
# Use your Cloudflare tunnel URL
NEXT_PUBLIC_APP_URL=https://sealevel-studio-dev.yourdomain.com
NEXT_PUBLIC_BASE_URL=https://sealevel-studio-dev.yourdomain.com
```

## Running Tunnel as a Service (Optional)

### macOS (using launchd)

Create `~/Library/LaunchAgents/com.cloudflare.tunnel.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.cloudflare.tunnel</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/cloudflared</string>
        <string>tunnel</string>
        <string>--config</string>
        <string>/Users/<YOUR_USERNAME>/.cloudflared/config.yml</string>
        <string>run</string>
        <string>sealevel-studio-dev</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
```

Load the service:
```bash
launchctl load ~/Library/LaunchAgents/com.cloudflare.tunnel.plist
```

### Linux (using systemd)

Create `/etc/systemd/system/cloudflared.service`:

```ini
[Unit]
Description=Cloudflare Tunnel
After=network.target

[Service]
Type=simple
User=<YOUR_USERNAME>
ExecStart=/usr/local/bin/cloudflared tunnel --config /home/<YOUR_USERNAME>/.cloudflared/config.yml run sealevel-studio-dev
Restart=on-failure
RestartSec=5s

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
sudo systemctl status cloudflared
```

## Quick Start Script

We've included a helper script to make this easier. See `scripts/start-cloudflare-tunnel.sh`.

## Troubleshooting

### Tunnel won't start
- Check that `cloudflared` is installed: `cloudflared --version`
- Verify you're logged in: `cloudflared tunnel list`
- Check tunnel credentials exist: `ls ~/.cloudflared/`

### DNS not resolving
- Wait a few minutes for DNS propagation
- Check DNS record in Cloudflare dashboard
- Verify tunnel is running: `cloudflared tunnel info sealevel-studio-dev`

### Connection refused
- Ensure Next.js server is running on `localhost:3000`
- Check firewall isn't blocking localhost connections
- Verify tunnel config points to correct port

### SSL Certificate Issues
- Cloudflare automatically provides SSL certificates
- If issues persist, check Cloudflare SSL/TLS settings (should be "Full" or "Full (strict)")

## Environment Variables for Cloudflare Tunnel

Add to your `.env.local`:

```env
# Cloudflare Tunnel URL (for development)
CLOUDFLARE_TUNNEL_URL=https://sealevel-studio-dev.yourdomain.com

# Use tunnel URL for OAuth callbacks
NEXT_PUBLIC_APP_URL=${CLOUDFLARE_TUNNEL_URL}
```

## Benefits of Cloudflare Tunnel

✅ **Secure**: No need to open ports or expose your IP  
✅ **Free**: Included in Cloudflare's free tier  
✅ **SSL**: Automatic HTTPS with Cloudflare certificates  
✅ **Reliable**: Cloudflare's global network  
✅ **Easy**: Simple setup and configuration  

## Next Steps

1. Set up webhook endpoints to use your tunnel URL
2. Configure OAuth callbacks to use tunnel URL
3. Share your development environment with team members
4. Test production-like scenarios locally

## Additional Resources

- [Cloudflare Tunnel Documentation](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
- [cloudflared CLI Reference](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/tunnel-guide/)
- [Cloudflare Dashboard](https://dash.cloudflare.com/)


