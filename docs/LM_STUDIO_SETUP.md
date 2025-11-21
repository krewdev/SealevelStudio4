# LM Studio Setup Guide

Complete guide for setting up LM Studio with Sealevel Studio.

## Step 1: Install LM Studio

1. **Download LM Studio:**
   - Visit [lmstudio.ai](https://lmstudio.ai/)
   - Download for macOS (or your platform)
   - Install the application

2. **Launch LM Studio:**
   - Open LM Studio from Applications
   - You'll see the main interface

## Step 2: Download a Model

1. **Go to the "Search" tab** in LM Studio
2. **Search for a model** (recommended for Mac):
   - **Llama 3.2 3B** - Fast, good for Apple Silicon
   - **Mistral 7B** - Balanced performance
   - **Phi-3 Mini** - Very fast, smaller model
   - **Qwen2.5 7B** - Good quality

3. **Download the model:**
   - Click on a model
   - Click "Download"
   - Choose a quantization (Q4_K_M is a good balance)
   - Wait for download to complete

## Step 3: Load the Model in LM Studio

1. **Go to the "Chat" tab**
2. **Select your downloaded model** from the dropdown
3. **Click "Load Model"**
4. **Wait for the model to load** (you'll see it in the status bar)

## Step 4: Start the Local Server

1. **Go to the "Local Server" tab** in LM Studio
2. **Configure the server:**
   - **Port:** `1234` (default, keep this)
   - **Host:** `localhost` (default)
   - **API Type:** `OpenAI Compatible` (important!)

3. **Click "Start Server"**
   - You should see "Server running on http://localhost:1234"
   - Keep LM Studio running (don't close it)

## Step 5: Test the Server

Open a terminal and test the connection:

```bash
curl http://localhost:1234/v1/models
```

You should see a JSON response with your model information.

## Step 6: Configure Sealevel Studio

1. **Open or create `.env.local`** in your project root:
   ```bash
   cp env.template .env.local
   ```

2. **Add these environment variables:**
   ```env
   # Enable Local AI
   LOCAL_AI_ENABLED=true
   
   # LM Studio endpoint (default port is 1234)
   LOCAL_AI_ENDPOINT=http://localhost:1234
   
   # Model name - use the exact name from LM Studio
   # Check in LM Studio: Chat tab → model dropdown
   # Examples: "llama-3.2-3b-instruct-q4_K_M", "mistral-7b-instruct", etc.
   LOCAL_AI_MODEL=llama-3.2-3b-instruct-q4_K_M
   
   # API type - use 'lmstudio' or 'openai-compatible'
   LOCAL_AI_TYPE=lmstudio
   
   # Use as primary model (higher weight in consensus)
   LOCAL_AI_PRIMARY=true
   
   # Weight in consensus (1.5 = 50% more influence)
   LOCAL_AI_WEIGHT=1.5
   
   # Request timeout (30 seconds)
   LOCAL_AI_TIMEOUT=30000
   ```

3. **Find your exact model name:**
   - In LM Studio, go to "Chat" tab
   - Look at the model dropdown - that's your exact model name
   - Copy it exactly (case-sensitive!)

## Step 7: Restart Your Dev Server

```bash
# Stop your current dev server (Ctrl+C)
# Then restart it
npm run dev
```

## Step 8: Verify Connection

The app will automatically:
1. Detect LM Studio when `LOCAL_AI_ENABLED=true`
2. Connect to `http://localhost:1234`
3. Use the OpenAI-compatible API endpoint

Check the console logs - you should see:
```
✅ Core AI Model initialized: Local AI (your-model-name)
Registered consensus provider: Local AI (your-model-name) (local-ai)
```

## Troubleshooting

### "Connection refused" or "Cannot connect"

1. **Check LM Studio is running:**
   - Make sure LM Studio is open
   - Check the "Local Server" tab shows "Server running"

2. **Check the port:**
   - Default is `1234`
   - If you changed it, update `LOCAL_AI_ENDPOINT` in `.env.local`

3. **Check the model is loaded:**
   - Go to "Chat" tab in LM Studio
   - Make sure a model is loaded

### "Model not found" error

1. **Check model name:**
   - The model name in `.env.local` must match exactly
   - Go to LM Studio → Chat tab → model dropdown
   - Copy the exact name (including quantization suffix)

2. **Common model name formats:**
   - `llama-3.2-3b-instruct-q4_K_M`
   - `mistral-7b-instruct-v0.2-q4_K_M`
   - `phi-3-mini-4k-instruct-q4_K_M`

### Slow responses

1. **Use a smaller model:**
   - Try Q4_K_M or Q3_K_M quantization
   - Smaller models = faster responses

2. **Check your Mac's resources:**
   - Close other apps
   - Make sure you have enough RAM

3. **Adjust context size:**
   - In LM Studio → Settings
   - Reduce context size if needed

### Model keeps unloading

1. **Keep LM Studio in foreground:**
   - Don't minimize LM Studio
   - Keep it active

2. **Check memory:**
   - Make sure you have enough RAM
   - Try a smaller model

## Advanced Configuration

### Using a Different Port

If port 1234 is in use:

1. In LM Studio → Local Server tab:
   - Change port to something else (e.g., `1235`)

2. In `.env.local`:
   ```env
   LOCAL_AI_ENDPOINT=http://localhost:1235
   ```

### Using Multiple Models

You can switch models by:
1. Loading a different model in LM Studio
2. Updating `LOCAL_AI_MODEL` in `.env.local`
3. Restarting your dev server

### Performance Tips

1. **For Apple Silicon (M1/M2/M3):**
   - Use Metal acceleration (automatic in LM Studio)
   - Models with "Metal" in name work best

2. **For Intel Macs:**
   - Use smaller quantizations (Q4_K_M or smaller)
   - Consider CPU-only models

3. **Memory Management:**
   - 8GB RAM: Use 3B-7B models
   - 16GB RAM: Can use 7B-13B models
   - 32GB+ RAM: Can use larger models

## Testing the Connection

You can test the connection programmatically:

```typescript
// In your app or a test script
const response = await fetch('http://localhost:1234/v1/chat/completions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'your-model-name',
    messages: [{ role: 'user', content: 'Hello!' }],
  }),
});

const data = await response.json();
console.log(data.choices[0].message.content);
```

## Next Steps

Once LM Studio is connected:

1. **Test AI features** in Sealevel Studio
2. **Check consensus system** - your local model will be weighted higher
3. **Monitor performance** - check response times in console

## Comparison: LM Studio vs Ollama

| Feature | LM Studio | Ollama |
|---------|-----------|--------|
| GUI | ✅ Yes | ❌ CLI only |
| Model Management | ✅ Easy | ⚠️ Command line |
| Server Setup | ✅ One click | ⚠️ Manual |
| Mac Support | ✅ Native | ✅ Native |
| API Type | OpenAI-compatible | Custom |
| Best For | Beginners, GUI users | Advanced users |

## Need Help?

- **LM Studio Docs:** [lmstudio.ai/docs](https://lmstudio.ai/docs)
- **Check logs:** Look at your Next.js console for connection errors
- **Test endpoint:** Use `curl` to verify LM Studio is responding

