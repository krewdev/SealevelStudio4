# Local AI Model Setup Guide

This guide explains how to set up a downloaded/local AI model as the core intelligence for Sea Level Studio.

## Overview

The Local AI system allows you to use a downloaded model (via Ollama, LM Studio, or custom endpoints) as the primary AI, with optional consensus from cloud models.

## Supported Platforms

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

## Next Steps

1. Install Ollama or LM Studio
2. Download a model
3. Set environment variables
4. Restart the application
5. Test with `/api/ai/core?action=status`

The core model will automatically integrate with:
- AI Cyber Playground
- Consensus system
- Agent expressions
- All AI-powered features

