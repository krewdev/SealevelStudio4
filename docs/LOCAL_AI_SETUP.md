# Local AI Model Setup Guide

This guide explains how to set up a downloaded/local AI model as the core intelligence for Sea Level Studio.

## Overview

The Local AI system allows you to use a downloaded model (via Ollama, LM Studio, or custom endpoints) as the primary AI, with optional consensus from cloud models. This guide covers:

- **Docker Deployment** - Isolated, portable containers with GPU support
- **Native Installation** - Direct Ollama/LM Studio setup
- **MCP Integration** - Model Context Protocol for standardized tool access
- **GPU Acceleration** - NVIDIA CUDA and Apple Silicon Metal support
- **Mac Server Setup** - Remote server deployment instructions

## Quick Start

Choose your preferred setup method:

1. **Docker (Recommended)** - See [Docker Setup](#docker-setup) section
2. **Native Installation** - See [Native Setup](#native-setup) section
3. **MCP Integration** - See [MCP Setup](#mcp-integration) section

For detailed MCP information, see [MCP_GUIDE.md](./MCP_GUIDE.md).

## Docker Setup

Docker provides an isolated, portable environment for running local AI models with GPU support.

### Prerequisites

- Docker Desktop installed ([Download](https://www.docker.com/products/docker-desktop/))
- For NVIDIA GPU: NVIDIA Container Toolkit installed
- For Apple Silicon: Docker Desktop with Apple Silicon support

### Quick Start with Docker

1. **Check GPU availability:**
   ```bash
   ./scripts/check-gpu.sh
   ```

2. **Run the Docker setup script:**
   ```bash
   ./scripts/setup-docker-ai.sh
   ```

3. **Or manually start with docker-compose:**
   ```bash
   docker-compose up -d
   ```

4. **Configure environment variables:**
   ```env
   LOCAL_AI_ENABLED=true
   LOCAL_AI_ENDPOINT=http://localhost:11434
   LOCAL_AI_MODEL=llama2
   LOCAL_AI_TYPE=ollama
   DOCKER_AI_ENABLED=true
   ```

### Docker Services

The `docker-compose.yml` includes:

- **Ollama Service** - Local AI inference with GPU support
- **MCP Server** (optional) - Model Context Protocol server for tool access

### GPU Configuration

#### NVIDIA GPU

1. Install NVIDIA Container Toolkit:
   ```bash
   # Ubuntu/Debian
   distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
   curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
   curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | sudo tee /etc/apt/sources.list.d/nvidia-docker.list
   sudo apt-get update && sudo apt-get install -y nvidia-container-toolkit
   sudo systemctl restart docker
   ```

2. Verify GPU access:
   ```bash
   docker run --rm --gpus all nvidia/cuda:11.0.3-base-ubuntu20.04 nvidia-smi
   ```

#### Apple Silicon (M1/M2/M3)

Docker Desktop on Apple Silicon automatically uses Metal for GPU acceleration. No additional setup needed.

### Docker Commands

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f ollama

# Stop services
docker-compose down

# Pull a new model
docker-compose exec ollama ollama pull codellama

# Check GPU usage
docker stats
```

### Docker Volumes

Models are stored in Docker volumes:
- `ollama-data` - Model files and cache
- `mcp-data` - MCP server data (if enabled)

To backup models:
```bash
docker run --rm -v ollama-data:/data -v $(pwd):/backup alpine tar czf /backup/ollama-backup.tar.gz /data
```

## Native Setup

### 1. Ollama (Recommended)

Ollama is the easiest way to run local models.

#### Installation

```bash
# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.ai/install.sh | sh

# Windows
# Download from https://ollama.ai/download
```

#### Setup

1. Start Ollama:
```bash
ollama serve
```

2. Download a model:
```bash
# Recommended models for Solana development
ollama pull llama2
ollama pull codellama
ollama pull mistral
ollama pull phi
```

3. Configure environment variables:
```env
LOCAL_AI_ENABLED=true
LOCAL_AI_ENDPOINT=http://localhost:11434
LOCAL_AI_MODEL=llama2
LOCAL_AI_TYPE=ollama
LOCAL_AI_PRIMARY=true
LOCAL_AI_WEIGHT=1.5
```

### 2. LM Studio

LM Studio provides a GUI for managing local models.

#### Setup

1. Download and install from https://lmstudio.ai
2. Download a model through the GUI
3. Start the local server (usually on port 1234)
4. Configure:
```env
LOCAL_AI_ENABLED=true
LOCAL_AI_ENDPOINT=http://localhost:1234
LOCAL_AI_MODEL=your-model-name
LOCAL_AI_TYPE=lmstudio
LOCAL_AI_PRIMARY=true
```

### 3. Custom Endpoint

For other inference servers (vLLM, text-generation-webui, etc.):

```env
LOCAL_AI_ENABLED=true
LOCAL_AI_ENDPOINT=http://localhost:8000
LOCAL_AI_MODEL=your-model
LOCAL_AI_TYPE=openai-compatible
LOCAL_AI_PRIMARY=true
```

## MCP Integration

Model Context Protocol (MCP) provides standardized access to tools, resources, and data sources for AI models.

### When to Use MCP

✅ **Use MCP if you need:**
- Standardized tool access across different AI models
- Expose Solana-specific tools/resources to AI models
- Better context management for AI agents
- Production system with multiple AI integrations

❌ **Skip MCP if:**
- Simple local inference is sufficient
- Only need basic chat/completion
- Minimal tooling requirements

### MCP Setup

1. **Enable MCP in docker-compose.yml:**
   ```yaml
   mcp-server:
     build:
       context: .
       dockerfile: Dockerfile.mcp-server
     ports:
       - "8000:8000"
     environment:
       - MCP_API_KEY=your_api_key_here
     volumes:
       - mcp-data:/data
   ```

2. **Configure environment variables:**
   ```env
   MCP_ENABLED=true
   MCP_SERVER_URL=http://localhost:8000
   MCP_API_KEY=your_mcp_api_key
   ```

3. **Start MCP server:**
   ```bash
   docker-compose up -d mcp-server
   # Or use the setup script
   ./scripts/setup-mcp-server.sh
   ```

For detailed MCP information, see [MCP_GUIDE.md](./MCP_GUIDE.md).

## GPU Support

### GPU Detection

Run the GPU detection script:
```bash
./scripts/check-gpu.sh
```

This will detect:
- NVIDIA CUDA GPUs
- Apple Silicon Metal support
- GPU memory and capabilities
- Performance recommendations

### GPU Configuration

```env
# Enable GPU acceleration
GPU_ENABLED=true

# Auto-detect GPU type (auto, nvidia, apple-silicon, cpu)
GPU_TYPE=auto

# GPU memory limit in MB (optional)
GPU_MEMORY_LIMIT=8192
```

### Performance Tuning

**For NVIDIA GPUs:**
- Use `nvidia-smi` to monitor GPU usage
- Set `GPU_MEMORY_LIMIT` based on available VRAM
- Larger models require more VRAM (e.g., llama2:70b needs ~40GB)

**For Apple Silicon:**
- Metal acceleration is automatic
- Unified memory is shared between CPU and GPU
- Monitor Activity Monitor for memory pressure

**For CPU-only:**
- Use smaller models (phi, mistral:7b)
- Reduce `maxTokens` in queries
- Consider cloud models for heavy tasks

## Configuration Options

| Variable | Description | Default |
|----------|-------------|---------|
| `LOCAL_AI_ENABLED` | Enable local AI | `false` |
| `LOCAL_AI_ENDPOINT` | API endpoint URL | `http://localhost:11434` |
| `LOCAL_AI_MODEL` | Model name to use | `llama2` |
| `LOCAL_AI_TYPE` | API type: `ollama`, `lmstudio`, `openai-compatible`, `custom` | `ollama` |
| `LOCAL_AI_PRIMARY` | Use as primary/core model | `true` |
| `LOCAL_AI_WEIGHT` | Weight in consensus (higher = more influence) | `1.5` |
| `LOCAL_AI_TIMEOUT` | Request timeout in ms | `30000` |
| `DOCKER_AI_ENABLED` | Use Docker for local AI | `false` |
| `DOCKER_AI_CONTAINER` | Docker container name | `sealevel-ollama` |
| `MCP_ENABLED` | Enable MCP server | `false` |
| `MCP_SERVER_URL` | MCP server endpoint | `http://localhost:8000` |
| `MCP_API_KEY` | MCP server API key | (required if enabled) |
| `GPU_ENABLED` | Enable GPU acceleration | `true` |
| `GPU_TYPE` | GPU type: `auto`, `nvidia`, `apple-silicon`, `cpu` | `auto` |
| `GPU_MEMORY_LIMIT` | GPU memory limit in MB | (unlimited) |
| `REMOTE_AI_ENABLED` | Use remote Mac server | `false` |
| `REMOTE_AI_ENDPOINT` | Remote server endpoint | (required if enabled) |
| `REMOTE_AI_SSL` | Use SSL for remote connection | `false` |

## API Usage

### Query Core Model

```typescript
// Direct query
const response = await fetch('/api/ai/core', {
  method: 'POST',
  body: JSON.stringify({
    action: 'query',
    prompt: 'Explain Solana transactions',
    options: {
      temperature: 0.7,
      maxTokens: 1000,
    },
  }),
});

// With consensus (includes cloud models)
const consensus = await fetch('/api/ai/core', {
  method: 'POST',
  body: JSON.stringify({
    action: 'consensus',
    prompt: 'What is the best arbitrage strategy?',
    includeCloudModels: true, // Optional, default true
  }),
});
```

### Get Status

```typescript
const status = await fetch('/api/ai/core?action=status');
// Returns: { name, endpoint, apiType, enabled, isPrimary, connected }
```

### Switch Models

```typescript
const result = await fetch('/api/ai/core', {
  method: 'POST',
  body: JSON.stringify({
    action: 'switch-model',
    model: 'codellama',
  }),
});
```

### List Available Models (Ollama only)

```typescript
const models = await fetch('/api/ai/core?action=models');
// Returns: { models: ['llama2', 'codellama', ...] }
```

## Recommended Models

### For General Development
- **llama2** - Good balance of speed and quality
- **mistral** - Fast and efficient
- **phi** - Small but capable

### For Code/Solana Development
- **codellama** - Specialized for code
- **deepseek-coder** - Excellent code understanding

### For High Quality (slower)
- **llama2:70b** - Large model, requires more RAM
- **mixtral** - Mixture of experts, high quality

## Integration with Consensus

When `LOCAL_AI_PRIMARY=true`, the local model:
- Has higher weight in consensus decisions
- Is queried first
- Can work standalone or with cloud models

Example consensus flow:
1. Query local model (fast, private)
2. Optionally query cloud models (OpenAI, Claude, etc.)
3. Weighted voting with local model having 1.5x weight
4. Return consensus result

## Troubleshooting

### Connection Failed

1. Check if the inference server is running:
```bash
# Ollama
curl http://localhost:11434/api/tags

# LM Studio
curl http://localhost:1234/v1/models
```

2. Verify endpoint URL in environment variables
3. Check firewall settings

### Model Not Found

1. For Ollama, list available models:
```bash
ollama list
```

2. Download the model:
```bash
ollama pull <model-name>
```

3. Update `LOCAL_AI_MODEL` environment variable

### Slow Responses

1. Use a smaller model (e.g., `phi` instead of `llama2:70b`)
2. Reduce `maxTokens` in queries
3. Increase `LOCAL_AI_TIMEOUT` if needed
4. Check system resources (RAM, CPU)

### Out of Memory

1. Use a smaller model
2. Close other applications
3. Consider using cloud models for heavy tasks

## Privacy & Security

✅ **Benefits of Local AI:**
- No data sent to external APIs
- Complete privacy
- No API costs
- Works offline

⚠️ **Considerations:**
- Requires local compute resources
- May be slower than cloud APIs
- Model files can be large (several GB)

## Mac Server Setup

For deploying local AI on a dedicated Mac server, see [MAC_SERVER_SETUP.md](./MAC_SERVER_SETUP.md).

This is useful for:
- Team/enterprise deployments
- Dedicated GPU resources
- Remote access from multiple clients
- Production environments

## Performance Optimization

### Model Selection

**Fast & Efficient:**
- `phi` - 2.7B parameters, ~2GB RAM
- `mistral:7b` - 7B parameters, ~4GB RAM
- `llama2:7b` - 7B parameters, ~4GB RAM

**Code-Specialized:**
- `codellama:7b` - Optimized for code
- `deepseek-coder:6.7b` - Excellent code understanding

**High Quality (slower):**
- `llama2:70b` - Requires ~40GB RAM/VRAM
- `mixtral` - Mixture of experts, high quality

### Resource Recommendations

| Model Size | RAM/VRAM | CPU | GPU | Use Case |
|------------|----------|-----|-----|----------|
| 2-7B | 4-8GB | 4+ cores | Optional | Development, testing |
| 13B | 16GB | 8+ cores | Recommended | Production, quality |
| 30B+ | 32GB+ | 16+ cores | Required | High-quality inference |

### Monitoring

Check system resources:
```bash
# CPU and Memory
top
htop  # if installed

# GPU (NVIDIA)
nvidia-smi

# GPU (Apple Silicon)
# Use Activity Monitor or:
sudo powermetrics --samplers gpu_power -i 1000
```

## Troubleshooting

### Docker Issues

**Container won't start:**
```bash
# Check logs
docker-compose logs ollama

# Verify Docker is running
docker ps

# Check GPU access
docker run --rm --gpus all nvidia/cuda:11.0.3-base-ubuntu20.04 nvidia-smi
```

**Out of memory:**
- Reduce model size
- Set `GPU_MEMORY_LIMIT` in environment
- Close other applications

### GPU Issues

**NVIDIA GPU not detected:**
1. Verify NVIDIA drivers: `nvidia-smi`
2. Install NVIDIA Container Toolkit
3. Restart Docker: `sudo systemctl restart docker`

**Apple Silicon performance:**
- Ensure Docker Desktop is updated
- Check Activity Monitor for memory pressure
- Use smaller models if memory constrained

### Connection Issues

**Cannot connect to local AI:**
1. Verify service is running:
   ```bash
   # Docker
   docker-compose ps
   
   # Native
   curl http://localhost:11434/api/tags
   ```

2. Check firewall settings
3. Verify endpoint URL in environment variables
4. Check port conflicts: `lsof -i :11434`

## Next Steps

1. Choose setup method (Docker or Native)
2. Install and configure GPU support (if available)
3. Download a model
4. Set environment variables
5. Optionally set up MCP server
6. Restart the application
7. Test with `/api/ai/core?action=status`

The core model will automatically integrate with:
- AI Cyber Playground
- Consensus system
- Agent expressions
- All AI-powered features
- MCP tools (if enabled)

