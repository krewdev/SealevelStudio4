# LM Studio Setup for Bleeding Edge UI

## ✅ Quick Setup

Your code is now configured to use LM Studio! Here's how to get it running:

### 1. Start LM Studio

1. Open **LM Studio** on your computer
2. Load a model (any model you have downloaded)
3. Click **"Start Server"** in the bottom-left
4. Make sure it's running on **port 1234** (default)

### 2. Verify Connection

The app will automatically connect to:
- **Endpoint**: `http://localhost:1234/v1`
- **API**: OpenAI-compatible format

### 3. Test It

1. Start your dev server: `npm run dev`
2. Open the app in your browser
3. Look for the command bar at the bottom
4. Click **"Initialize AI Engine"**
5. You should see: **"Connected to LM Studio!"**

## 🎯 Using the Generative UI

Once connected, try commands like:
- "Show me a swap interface for 5 SOL to USDC"
- "Create a dashboard for my token launches"
- "Display my wallet balance"

## ⚙️ Configuration

### Default Endpoint
The app uses `http://localhost:1234/v1` by default.

### Custom Endpoint
If your LM Studio is running on a different port or URL, add to `.env.local`:

```bash
NEXT_PUBLIC_LM_STUDIO_ENDPOINT=http://localhost:1234/v1
```

Or if running on a different machine:
```bash
NEXT_PUBLIC_LM_STUDIO_ENDPOINT=http://192.168.1.100:1234/v1
```

## 🐛 Troubleshooting

### "LM Studio connection failed"
**Solutions**:
1. ✅ Make sure LM Studio is running
2. ✅ Check that a model is loaded in LM Studio
3. ✅ Verify the server is started (green indicator)
4. ✅ Check the port (should be 1234 by default)
5. ✅ Try accessing `http://localhost:1234/v1/models` in your browser - should return JSON

### "CORS Error"
If you see CORS errors:
1. In LM Studio, go to **Server Settings**
2. Enable **"CORS"** or **"Allow CORS"**
3. Restart the server

### "Model not found"
- LM Studio uses whatever model is currently loaded
- The `model: 'local-model'` parameter is usually ignored
- Make sure you have a model loaded in LM Studio

### "Connection timeout"
- Check your firewall settings
- Make sure port 1234 is not blocked
- Try restarting LM Studio

## 📊 Performance Tips

### Model Selection
- **Smaller models** (7B-13B): Faster responses, less accurate
- **Larger models** (30B+): Slower, more accurate
- **Quantized models** (Q4, Q5): Good balance

### LM Studio Settings
- **Context Length**: 2048-4096 for most use cases
- **GPU Layers**: Use as many as your GPU can handle
- **Threads**: Auto-detect usually works best

## 🚀 Advanced Usage

### Multiple Models
You can switch models in LM Studio and the app will use whatever is currently loaded.

### Remote Access
To use LM Studio from another device:
1. In LM Studio, change server binding to `0.0.0.0`
2. Update `.env.local`:
   ```bash
   NEXT_PUBLIC_LM_STUDIO_ENDPOINT=http://YOUR_IP:1234/v1
   ```

### API Key (Optional)
LM Studio supports API keys for security:
1. Enable API key in LM Studio settings
2. Add to requests (if needed):
   ```typescript
   headers: {
     'Authorization': `Bearer ${apiKey}`
   }
   ```

## ✅ Success Checklist

- [ ] LM Studio is running
- [ ] Model is loaded
- [ ] Server is started (port 1234)
- [ ] App connects successfully
- [ ] Commands generate UI components
- [ ] No CORS errors

## 🎉 You're Ready!

Your LM Studio model is now powering the Generative UI. Enjoy instant, local AI responses!

---

**Need Help?** Check the [Bleeding Edge Quick Start](./BLEEDING_EDGE_QUICK_START.md) guide.
