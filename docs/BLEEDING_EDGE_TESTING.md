# Testing the Bleeding Edge Stack

## ✅ Installation Verified

Your packages are installed:
- ✅ `@mlc-ai/web-llm@0.2.79`
- ✅ `three@0.160.1`
- ✅ `zod@3.25.76`

## 🧪 Quick Test

### 1. Start Dev Server
```bash
npm run dev
```

### 2. Open in Chrome/Edge
Navigate to your app (usually `http://localhost:3000`)

### 3. Test WebGPU
Open browser console and check:
```javascript
console.log(navigator.gpu); // Should return GPU object
```

### 4. Test AI Initialization
1. Look for the command bar at the bottom
2. Click "Initialize AI Engine"
3. Watch the progress bar
4. First time: Will download ~4GB model (5-10 minutes)
5. Subsequent: Instant from cache

### 5. Test Generative UI
Type in command bar:
- "Show me a swap interface for 5 SOL to USDC"
- "Create a dashboard"
- "Display my wallet balance"

## 🎯 Expected Behavior

### WebGPU Scene
- ✅ Dark background with floating orbs
- ✅ Particles moving smoothly
- ✅ No lag or stuttering
- ✅ 60fps+ performance

### AI Engine
- ✅ Progress updates during download
- ✅ "AI ready!" message when complete
- ✅ Responds to commands
- ✅ Generates appropriate UI components

### Generative UI
- ✅ Components appear in center
- ✅ Smooth fade-in animation
- ✅ Close button works
- ✅ Multiple components can exist

## 🐛 Common Issues

### Issue: "WebGPU not supported"
**Solution**: 
- Update Chrome/Edge to latest version
- Enable: `chrome://flags/#enable-unsafe-webgpu`
- Restart browser

### Issue: "AI download fails"
**Solution**:
- Check internet connection
- Clear browser cache
- Check available disk space (need ~5GB free)
- Try different model: `"TinyLlama-1.1B-Chat-v0.1-q4f16_1-MLC"` (smaller, faster)

### Issue: "Slow performance"
**Solution**:
- Reduce particle count: `<WebGPUScene particleCount={200} />`
- Lower intensity: `<WebGPUScene intensity={0.1} />`
- Check GPU usage in Task Manager
- Close other GPU-intensive apps

### Issue: "TypeScript errors"
**Solution**:
```bash
npm install --save-dev @types/three
```

## 📊 Performance Benchmarks

### Expected Metrics
- **WebGPU Scene**: 60-120fps
- **AI Inference**: 500ms - 2s per query
- **UI Generation**: <1s
- **Memory Usage**: 4-8GB (including model)

### Test on Different Devices
- ✅ Desktop GPU: Full performance
- ✅ Apple M1/M2/M3: Full performance
- ⚠️ Integrated GPU: May be slower
- ❌ Low-end mobile: Not recommended

## 🎨 Customization Tests

### Test Different Colors
```tsx
<WebGPUScene color="#ff6b6b" /> // Red
<WebGPUScene color="#4ecdc4" /> // Teal
<WebGPUScene color="#ffe66d" /> // Yellow
```

### Test Particle Counts
```tsx
<WebGPUScene particleCount={100} />  // Minimal
<WebGPUScene particleCount={500} /> // Default
<WebGPUScene particleCount={2000} /> // Heavy
```

## ✅ Success Checklist

- [ ] WebGPU scene renders
- [ ] AI engine initializes
- [ ] Model downloads successfully
- [ ] Commands generate UI components
- [ ] Performance is smooth (60fps+)
- [ ] No console errors
- [ ] Components close properly
- [ ] Multiple components work

## 🚀 Next Steps

Once testing passes:
1. Integrate into main app
2. Add custom component types
3. Connect to your dApp features
4. Optimize for production

---

**Need Help?** Check the [Quick Start Guide](./BLEEDING_EDGE_QUICK_START.md) or [Migration Blueprint](./BLEEDING_EDGE_MIGRATION_BLUEPRINT.md)


