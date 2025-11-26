# Bleeding Edge Stack Installation Guide

## Quick Start

### 1. Install Dependencies

```bash
npm install three @types/three zod
```

### 2. Optional: Install Local AI (WebLLM)

For full AI capabilities, install the WebLLM package:

```bash
npm install @mlc-ai/web-llm
```

**Note**: This will download ~4GB of model weights on first use. The app will work without it using a mock AI, but for production you'll want the real thing.

### 3. Enable in Your App

Wrap your main app content with `BleedingEdgeWrapper`:

```tsx
inp
```

### 4. Test It

1. Start your dev server: `npm run dev`
2. Open the app in Chrome/Edge (WebGPU support required)
3. Type a command like "Show me a swap interface for 5 SOL to USDC"
4. Watch the AI generate the UI component!

---

## Browser Requirements

### Supported Browsers
- ✅ Chrome 113+ (Recommended)
- ✅ Edge 113+
- ⚠️ Safari (WebGPU support coming in Safari 18+)
- ❌ Firefox (WebGPU support pending)

### Hardware Requirements
- **Minimum**: Dedicated GPU or Apple M1/M2/M3
- **Recommended**: Desktop GPU (NVIDIA/AMD) or Apple M2 Pro+
- **Mobile**: High-end devices only

---

## Features

### ✅ What Works Now
- WebGPU 3D background scene
- Generative UI component system
- Command bar interface
- Mock AI (for development)

### 🚧 Coming Soon
- Real local AI (install @mlc-ai/web-llm)
- More component types
- Voice commands
- WebXR support

---

## Troubleshooting

### WebGPU Not Available
If you see "WebGPU not supported", try:
1. Update Chrome/Edge to latest version
2. Enable WebGPU flag: `chrome://flags/#enable-unsafe-webgpu`
3. Use WebGL fallback (automatic)

### AI Not Loading
If AI initialization fails:
1. Check browser console for errors
2. Ensure WebGPU is enabled
3. Install @mlc-ai/web-llm for real AI
4. Check available GPU memory (need ~4GB free)

### Performance Issues
If the app is slow:
1. Reduce particle count in WebGPUScene
2. Lower WebGPU intensity
3. Disable bleeding edge mode: `enabled={false}`
4. Check GPU usage in Task Manager

---

## Next Steps

1. Read the [Migration Blueprint](./BLEEDING_EDGE_MIGRATION_BLUEPRINT.md)
2. Customize WebGPUScene colors/particles
3. Add your own component types to GenerativeUI
4. Integrate with your existing dApp features

---

## Support

For issues or questions:
- Check browser console for errors
- Review the blueprint document
- Test in Chrome/Edge first
- Ensure hardware meets requirements


