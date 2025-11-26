# Quick Start: Bleeding Edge Stack

## ✅ Installation Complete!

You've successfully installed:
- ✅ `@mlc-ai/web-llm` - Local AI engine
- ✅ `three` - WebGPU 3D graphics
- ✅ `zod` - Schema validation

## 🚀 Next Steps

### 1. Test the Setup

Create a test route to see it in action:

```tsx
// app/bleeding-edge-demo/page.tsx
import { BleedingEdgeDemo } from '../components/BleedingEdgeDemo';

export default function BleedingEdgeDemoPage() {
  return <BleedingEdgeDemo />;
}
```

### 2. Integrate into Your App

Wrap your main app in `app/page.tsx`:

```tsx
import { BleedingEdgeWrapper } from './components/BleedingEdgeWrapper';

// In your AppContent component, wrap the main content:
<BleedingEdgeWrapper enabled={true}>
  <div className="h-screen flex flex-col bg-gray-900">
    {/* Your existing app */}
  </div>
</BleedingEdgeWrapper>
```

### 3. First Run

1. Start dev server: `npm run dev`
2. Open in **Chrome/Edge** (WebGPU required)
3. Click "Initialize AI Engine" in the command bar
4. Wait for model download (~4GB, one-time)
5. Try commands like:
   - "Show me a swap interface for 5 SOL to USDC"
   - "Create a dashboard"
   - "Display my wallet balance"

## ⚠️ Important Notes

### Browser Requirements
- **Chrome 113+** or **Edge 113+** required
- WebGPU must be enabled (usually automatic)
- If not working, enable: `chrome://flags/#enable-unsafe-webgpu`

### First Load
- **Model Download**: ~4GB on first use
- **Time**: 5-10 minutes depending on connection
- **Storage**: Cached in browser (IndexedDB)
- **Subsequent Loads**: Instant from cache

### Performance
- Requires **dedicated GPU** or **Apple M1/M2/M3**
- May struggle on low-end devices
- Reduce particle count if laggy: `<WebGPUScene particleCount={200} />`

## 🎨 Customization

### Adjust WebGPU Scene
```tsx
<WebGPUScene 
  intensity={0.2}        // Opacity (0-1)
  particleCount={500}    // Number of particles
  color="#8b5cf6"        // Primary color
/>
```

### Add Custom Components
Edit `app/components/GenerativeUI.tsx` to add new component types:

```tsx
case "my_custom_component":
  return <MyCustomComponent config={component.config} />;
```

## 🐛 Troubleshooting

### "WebGPU not supported"
- Update Chrome/Edge to latest
- Enable WebGPU flag
- Falls back to WebGL automatically

### "AI not loading"
- Check browser console for errors
- Ensure WebGPU is enabled
- Check available GPU memory (need ~4GB free)

### "Model download failed"
- Check internet connection
- Clear browser cache and retry
- Check available disk space

## 📚 Documentation

- [Migration Blueprint](./BLEEDING_EDGE_MIGRATION_BLUEPRINT.md) - Full technical details
- [Installation Guide](./BLEEDING_EDGE_INSTALLATION.md) - Setup instructions

## 🎉 You're Ready!

The bleeding edge stack is now installed and ready to use. Start experimenting with generative UI commands!


