# Local AI Only Setup Guide

This guide explains how to run Sealevel Studio using **only local AI** without any external API keys.

## ✅ What Works with Local AI Only

- ✅ **Text Generation** (marketing posts, agent responses, chat)
- ✅ **AI Consensus System** (can use local AI as primary)
- ✅ **Service Bot** (if configured to use local AI)
- ✅ **Arbitrage Analysis** (if using local AI)
- ✅ **All agent features** that use text generation

## ❌ What Still Requires External APIs

- ❌ **Image Generation** (`/api/ai/image-gen`) - Currently requires OpenAI DALL-E 3
  - **Workaround**: Use manual image upload instead
  - Future: Could integrate Stable Diffusion or other local image models

## Quick Setup (Local AI Only)

### 1. Install Local AI Server

**Option A: LM Studio (Recommended)**
```bash
# Download from https://lmstudio.ai/
# Start server:
lms server start
# Default endpoint: http://localhost:1234/v1
```

**Option B: Ollama**
```bash
# Install from https://ollama.ai/
ollama pull llama2
ollama serve
# Default endpoint: http://localhost:11434
```

### 2. Configure Environment Variables

In your `.env.local` file:

```bash
# Enable Local AI
LOCAL_AI_ENABLED=true
LOCAL_AI_ENDPOINT=http://localhost:1234/v1  # LM Studio
# OR
LOCAL_AI_ENDPOINT=http://localhost:11434     # Ollama

LOCAL_AI_TYPE=lmstudio  # or 'ollama'
LOCAL_AI_MODEL=your-model-name

# Leave external API keys EMPTY (optional fallback only)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GEMINI_API_KEY=
DEEPSEEK_API_KEY=
```

### 3. Verify Setup

1. Start your local AI server
2. Start Next.js: `npm run dev`
3. Check console for: `✅ Core AI Model initialized`
4. Test marketing generation or any AI feature

## Error Handling

The system now gracefully handles missing API keys:

- **Missing OpenAI**: Falls back to local AI (or shows helpful error)
- **Missing Local AI**: Shows clear error with setup instructions
- **Both Missing**: Returns 503 with helpful suggestions

## API Endpoints Behavior

### `/api/ai/marketing-gen`
- ✅ Tries local AI first
- ✅ Falls back to OpenAI if available (optional)
- ❌ Returns helpful error if both unavailable

### `/api/ai/image-gen`
- ❌ Requires `OPENAI_API_KEY` (DALL-E 3)
- 💡 **Solution**: Use manual image upload feature instead

### `/api/openai/chat`
- ✅ Checks for local AI first
- ✅ Falls back to OpenAI if key available
- ❌ Returns helpful error if neither available

### `/api/gemini/analyze`
- ❌ Requires `GEMINI_API_KEY`
- 💡 **Solution**: Use local AI consensus system instead

## Troubleshooting

### Local AI Not Working

1. **Check server is running**:
   ```bash
   curl http://localhost:1234/v1/models  # LM Studio
   curl http://localhost:11434/api/tags   # Ollama
   ```

2. **Check endpoint URL**:
   - LM Studio: `http://localhost:1234/v1` (note `/v1`)
   - Ollama: `http://localhost:11434`

3. **Check model is loaded**:
   - LM Studio: Model must be loaded in UI
   - Ollama: Model must be pulled (`ollama pull llama2`)

4. **Check firewall/network**: Ensure localhost is accessible

### Still Getting API Key Errors

- Check `.env.local` has `LOCAL_AI_ENABLED=true`
- Restart Next.js dev server after changing env vars
- Check console logs for initialization messages

## Benefits of Local AI Only

- 🆓 **Free** - No API costs
- 🔒 **Private** - Data never leaves your machine
- ⚡ **Fast** - No network latency (after initial load)
- 🚫 **No Rate Limits** - Use as much as you want
- 🎛️ **Full Control** - Choose your model, parameters, etc.

## Recommended Models

### For Text Generation (Marketing, Chat)
- **LM Studio**: `llama-3.1-8b-instruct`, `mistral-7b-instruct`
- **Ollama**: `llama3.1`, `mistral`, `phi3`

### For Code Analysis
- **LM Studio**: `codellama-7b-instruct`, `deepseek-coder`
- **Ollama**: `codellama`, `deepseek-coder`

## Next Steps

1. ✅ Set `LOCAL_AI_ENABLED=true`
2. ✅ Configure `LOCAL_AI_ENDPOINT`
3. ✅ Start your local AI server
4. ✅ Test the features
5. ❌ Remove external API keys (optional - they're only used as fallback)

Your app will now run completely on local AI! 🎉

