# Mac Server Setup Guide

This guide explains how to set up a dedicated Mac server for running local AI models, accessible remotely from multiple clients.

## Overview

Deploying local AI on a Mac server provides:
- **Dedicated Resources** - Full GPU/CPU power for AI inference
- **Remote Access** - Multiple clients can connect
- **Team Sharing** - Shared model cache and resources
- **Production Ready** - Stable, always-on service

## Prerequisites

- Mac with Apple Silicon (M1/M2/M3) or Intel with NVIDIA GPU
- macOS 12.0 (Monterey) or later
- Docker Desktop for Mac installed
- Network access to the Mac server

## Server Setup

### 1. Install Docker Desktop

1. Download Docker Desktop for Mac:
   - [Apple Silicon](https://www.docker.com/products/docker-desktop/)
   - [Intel](https://www.docker.com/products/docker-desktop/)

2. Install and start Docker Desktop

3. Verify installation:
   ```bash
   docker --version
   docker-compose --version
   ```

### 2. Clone and Configure

1. Clone the repository on the Mac server:
   ```bash
   git clone <repository-url>
   cd SealevelStudio-3
   ```

2. Copy environment template:
   ```bash
   cp env.template .env.local
   ```

3. Configure for server use:
   ```env
   # Local AI Configuration
   LOCAL_AI_ENABLED=true
   LOCAL_AI_ENDPOINT=http://0.0.0.0:11434
   LOCAL_AI_MODEL=llama2
   LOCAL_AI_TYPE=ollama
   
   # Docker Configuration
   DOCKER_AI_ENABLED=true
   
   # Remote Access
   REMOTE_AI_ENABLED=true
   REMOTE_AI_ENDPOINT=http://your-mac-ip:11434
   ```

### 3. Start Services

```bash
# Start Ollama and MCP server
docker-compose up -d

# Verify services are running
docker-compose ps

# Check logs
docker-compose logs -f ollama
```

### 4. Download Models

```bash
# Pull recommended models
docker-compose exec ollama ollama pull llama2
docker-compose exec ollama ollama pull codellama
docker-compose exec ollama ollama pull mistral
```

## Network Configuration

### 1. Find Mac Server IP Address

```bash
# Get local IP address
ifconfig | grep "inet " | grep -v 127.0.0.1

# Or use
ipconfig getifaddr en0  # For Wi-Fi
ipconfig getifaddr en1  # For Ethernet
```

### 2. Configure Firewall

1. Open System Settings → Network → Firewall

2. Allow incoming connections for:
   - Port 11434 (Ollama)
   - Port 8000 (MCP server, if enabled)

3. Or use command line:
   ```bash
   # Allow Ollama port
   sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/local/bin/ollama
   sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblock /usr/local/bin/ollama
   ```

### 3. Configure Router (Optional)

For external access:
1. Set static IP for Mac server
2. Port forward 11434 to Mac server IP
3. Use dynamic DNS service (e.g., DuckDNS)

## Client Configuration

### 1. Local Network Access

On client machines, configure `.env.local`:

```env
# Remote AI Configuration
REMOTE_AI_ENABLED=true
REMOTE_AI_ENDPOINT=http://192.168.1.100:11434  # Mac server IP
LOCAL_AI_ENABLED=false  # Disable local AI
```

### 2. External Network Access

For access from outside local network:

```env
REMOTE_AI_ENABLED=true
REMOTE_AI_ENDPOINT=https://your-domain.com:11434
REMOTE_AI_SSL=true
```

### 3. Test Connection

```bash
# Test from client
curl http://your-mac-ip:11434/api/tags

# Or use the API
curl http://localhost:3000/api/ai/core?action=status
```

## SSL/TLS Setup (Optional)

For secure remote access:

### 1. Install Caddy (Reverse Proxy)

```bash
# Install Caddy
brew install caddy

# Or download from https://caddyserver.com/
```

### 2. Configure Caddy

Create `Caddyfile`:

```
your-domain.com {
    reverse_proxy localhost:11434
    reverse_proxy localhost:8000 {
        /mcp localhost:8000
    }
}
```

### 3. Start Caddy

```bash
caddy run
```

### 4. Update Client Configuration

```env
REMOTE_AI_ENDPOINT=https://your-domain.com
REMOTE_AI_SSL=true
```

## Performance Optimization

### 1. Apple Silicon Optimization

For M1/M2/M3 Macs:

1. **Use Metal Acceleration:**
   - Automatic with Docker Desktop
   - Monitor with Activity Monitor

2. **Memory Management:**
   - Unified memory is shared
   - Monitor memory pressure
   - Use smaller models if memory constrained

3. **CPU Optimization:**
   ```bash
   # Set CPU priority
   sudo renice -10 $(pgrep ollama)
   ```

### 2. NVIDIA GPU (Intel Macs)

If using external NVIDIA GPU:

1. Install NVIDIA drivers
2. Install NVIDIA Container Toolkit
3. Configure Docker for GPU:
   ```yaml
   deploy:
     resources:
       reservations:
         devices:
           - driver: nvidia
             count: all
             capabilities: [gpu]
   ```

### 3. Resource Limits

Set Docker resource limits in `docker-compose.yml`:

```yaml
services:
  ollama:
    deploy:
      resources:
        limits:
          cpus: '8'
          memory: 16G
        reservations:
          cpus: '4'
          memory: 8G
```

## Monitoring

### 1. System Monitoring

```bash
# CPU and Memory
top
htop  # if installed

# GPU (Apple Silicon)
sudo powermetrics --samplers gpu_power -i 1000

# Disk usage
df -h
docker system df
```

### 2. Service Monitoring

```bash
# Docker stats
docker stats

# Service logs
docker-compose logs -f ollama

# Health checks
curl http://localhost:11434/api/tags
curl http://localhost:8000/health  # MCP server
```

### 3. Set Up Alerts

Create monitoring script:

```bash
#!/bin/bash
# scripts/monitor-ai-server.sh

# Check Ollama
if ! curl -f http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "Ollama is down!" | mail -s "AI Server Alert" admin@example.com
fi

# Check MCP server
if ! curl -f http://localhost:8000/health > /dev/null 2>&1; then
    echo "MCP server is down!" | mail -s "AI Server Alert" admin@example.com
fi
```

Add to crontab:
```bash
# Check every 5 minutes
*/5 * * * * /path/to/scripts/monitor-ai-server.sh
```

## Backup and Recovery

### 1. Backup Models

```bash
# Backup Ollama models
docker run --rm \
  -v ollama-data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/ollama-backup-$(date +%Y%m%d).tar.gz /data
```

### 2. Restore Models

```bash
# Restore from backup
docker run --rm \
  -v ollama-data:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/ollama-backup-YYYYMMDD.tar.gz -C /
```

### 3. Automated Backups

Create backup script:

```bash
#!/bin/bash
# scripts/backup-ai-models.sh

BACKUP_DIR="/backups/ollama"
DATE=$(date +%Y%m%d)

mkdir -p $BACKUP_DIR

docker run --rm \
  -v ollama-data:/data \
  -v $BACKUP_DIR:/backup \
  alpine tar czf /backup/ollama-$DATE.tar.gz /data

# Keep only last 7 days
find $BACKUP_DIR -name "ollama-*.tar.gz" -mtime +7 -delete
```

## Security Best Practices

### 1. Firewall Rules

- Only expose necessary ports
- Use VPN for remote access when possible
- Implement IP whitelisting

### 2. Authentication

- Use API keys for MCP server
- Implement rate limiting
- Use SSL/TLS for external access

### 3. Updates

```bash
# Update Docker images
docker-compose pull
docker-compose up -d

# Update models
docker-compose exec ollama ollama pull llama2:latest
```

## Troubleshooting

### Connection Refused

1. Check firewall settings
2. Verify service is running:
   ```bash
   docker-compose ps
   ```
3. Test local connection:
   ```bash
   curl http://localhost:11434/api/tags
   ```

### Slow Performance

1. Check system resources:
   ```bash
   top
   docker stats
   ```

2. Reduce model size
3. Limit concurrent connections
4. Check network latency

### Service Crashes

1. Check logs:
   ```bash
   docker-compose logs ollama
   ```

2. Check disk space:
   ```bash
   df -h
   docker system df
   ```

3. Restart services:
   ```bash
   docker-compose restart
   ```

## Next Steps

1. Set up monitoring and alerts
2. Configure automated backups
3. Implement SSL/TLS for external access
4. Set up client connections
5. Test performance and optimize

For Docker-specific issues, see [LOCAL_AI_SETUP.md](./LOCAL_AI_SETUP.md).

