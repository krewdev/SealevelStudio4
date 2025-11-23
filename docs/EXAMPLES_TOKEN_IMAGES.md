# Token Image Generator - Usage Examples

This document provides practical examples for using the Token Image Generator and Gallery features.

## Table of Contents
1. [Basic AI Generation](#basic-ai-generation)
2. [Custom Prompt Generation](#custom-prompt-generation)
3. [Manual Image Upload](#manual-image-upload)
4. [Social Media Auto-Posting](#social-media-auto-posting)
5. [Image Gallery Management](#image-gallery-management)
6. [Advanced Integration](#advanced-integration)

---

## Basic AI Generation

### Example 1: Simple Token Logo Generation

```typescript
import { TokenImageUploader } from '@/app/components/TokenImageUploader';

function MyTokenLaunch() {
  const [tokenImage, setTokenImage] = useState('');

  return (
    <TokenImageUploader
      tokenSymbol="SEAL"
      tokenName="Sealevel Protocol"
      onImageChange={(imageUrl) => setTokenImage(imageUrl)}
    />
  );
}
```

**What happens:**
1. User clicks "Generate with AI"
2. System auto-generates professional prompt
3. DALL-E 3 creates logo in ~15 seconds
4. Image preview appears
5. Image URL stored in state

**Generated Prompt (Auto):**
```
Create a professional cryptocurrency token logo for "Sealevel Protocol". 
The logo should feature the symbol "SEAL" prominently and be suitable for 
use on social media, trading platforms, and cryptocurrency exchanges.
- Modern, clean, and professional appearance
- Vibrant colors that stand out on dark backgrounds
- Circular or square format suitable for profile pictures
- Tech-forward aesthetic with blockchain/crypto themes
```

---

## Custom Prompt Generation

### Example 2: Branded Token with Specific Style

```typescript
function BrandedTokenLaunch() {
  const [tokenImage, setTokenImage] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');

  const generateCustom = async () => {
    const prompt = `
      Minimalist cryptocurrency logo for $MOON token.
      Design: Crescent moon silhouette with circuit board texture.
      Colors: Electric blue (#00D4FF) and deep purple (#8B00FF) gradient.
      Style: Futuristic, clean lines, geometric.
      Background: Dark navy with subtle star pattern.
      Format: Circular, suitable for 400x400 profile picture.
    `;

    const response = await fetch('/api/ai/image-gen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tokenSymbol: 'MOON',
        tokenName: 'Moonshot Token',
        prompt,
        quality: 'hd',
        style: 'natural' // 'natural' for more literal interpretation
      })
    });

    const data = await response.json();
    if (data.success) {
      setTokenImage(data.imageUrl);
    }
  };

  return (
    <div>
      <textarea
        value={customPrompt}
        onChange={(e) => setCustomPrompt(e.target.value)}
        placeholder="Describe your ideal token logo..."
      />
      <button onClick={generateCustom}>Generate Custom Logo</button>
    </div>
  );
}
```

**Tips for Great Custom Prompts:**
- Be specific about colors (use hex codes)
- Mention style keywords: "minimalist", "futuristic", "retro", "abstract"
- Specify format: "circular logo", "square icon", "profile picture"
- Include composition: "centered", "left-aligned", "geometric pattern"
- Note what to avoid: "no text", "no gradients", "simple design"

---

## Manual Image Upload

### Example 3: Upload Pre-Designed Logo

```typescript
function CustomLogoUpload() {
  const [tokenImage, setTokenImage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    // Validate file
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB');
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setTokenImage(result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(file);
        }}
        hidden
      />
      <button onClick={() => fileInputRef.current?.click()}>
        Upload Custom Logo
      </button>
    </div>
  );
}
```

**Supported Formats:**
- PNG (recommended for transparency)
- JPEG/JPG
- GIF (animated supported)
- WEBP

**Requirements:**
- Min: 400x400 pixels
- Max: 4096x4096 pixels
- Max size: 5MB

---

## Social Media Auto-Posting

### Example 4: Auto-Post on Launch

```typescript
import { RuglessLaunchpad } from '@/app/components/RuglessLaunchpad';

function TokenLaunchWithSocial() {
  const [autoPost, setAutoPost] = useState(true);
  const [tokenImage, setTokenImage] = useState('');

  const handleLaunch = async () => {
    // ... launch token logic ...
    const mintAddress = 'NewTokenMint123...';

    if (autoPost && tokenImage) {
      await postToSocial({
        tokenSymbol: 'SEAL',
        tokenName: 'Sealevel Protocol',
        tokenMintAddress: mintAddress,
        imageUrl: tokenImage,
        totalSupply: 1000000000,
        liquidityAmount: 100
      });
    }
  };

  const postToSocial = async (data: any) => {
    const response = await fetch('/api/social/post-token-launch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        platforms: ['twitter', 'telegram']
      })
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('Posted to social media!', result.results);
    }
  };

  return (
    <div>
      <TokenImageUploader
        tokenSymbol="SEAL"
        tokenName="Sealevel Protocol"
        onImageChange={setTokenImage}
      />
      
      <label>
        <input
          type="checkbox"
          checked={autoPost}
          onChange={(e) => setAutoPost(e.target.checked)}
        />
        Auto-post to Twitter & Telegram
      </label>

      <button onClick={handleLaunch}>
        Launch Token
      </button>
    </div>
  );
}
```

**Generated Post:**
```
🚀 Sealevel Protocol ($SEAL) is now LIVE on Solana!

📊 Total Supply: 1,000,000,000
💧 Initial Liquidity: 100 SOL
✅ Rugless Launch Protection Enabled
🔒 Liquidity Locked for 7 Days

📍 Mint: NewTokenMint123...

Built with Sealevel Studio 🌊
#Solana #DeFi #SEAL #TokenLaunch
```

---

## Image Gallery Management

### Example 5: Display All Token Images

```typescript
import { TokenImageGallery } from '@/app/components/TokenImageGallery';

function MyTokensPage() {
  return (
    <div className="container mx-auto p-6">
      <h1>My Token Images</h1>
      <TokenImageGallery />
    </div>
  );
}
```

**Gallery Features:**
- Grid view of all token images
- Quick actions (download, share, delete)
- Platform-specific downloads
- Metadata display
- Full-screen modal view

### Example 6: Programmatic Image Retrieval

```typescript
import { 
  getTokenImage, 
  getAllTokenImages,
  storeTokenImage 
} from '@/app/lib/token-images/storage';

async function manageTokenImages() {
  // Get a specific token image
  const sealImage = await getTokenImage('SEAL');
  console.log(sealImage);
  // {
  //   tokenSymbol: 'SEAL',
  //   tokenName: 'Sealevel Protocol',
  //   imageUrl: 'https://...',
  //   imageType: 'ai-generated',
  //   generatedAt: '2024-01-15T10:30:00.000Z',
  //   mintAddress: 'TokenMint123...',
  //   socialMediaReady: true
  // }

  // Get all images
  const allImages = await getAllTokenImages();
  console.log(`Total images: ${allImages.length}`);

  // Store a new image
  await storeTokenImage('MOON', 'https://image-url', {
    tokenName: 'Moonshot',
    imageType: 'uploaded',
    mintAddress: 'MintAddress...'
  });
}
```

### Example 7: Manual Social Sharing

```typescript
import { optimizeForSocialMedia } from '@/app/lib/token-images/storage';

async function shareToTwitter(tokenImage: string, tokenSymbol: string) {
  // Optimize image for Twitter (400x400)
  const optimizedBlob = await optimizeForSocialMedia(
    tokenImage, 
    'twitter'
  );

  // Post to Twitter
  const response = await fetch('/api/social/post-token-launch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tokenSymbol,
      tokenName: 'My Token',
      imageUrl: tokenImage,
      platforms: ['twitter']
    })
  });

  const result = await response.json();
  
  if (result.results.twitter.success) {
    console.log('Tweet posted!', result.results.twitter.url);
  }
}
```

---

## Advanced Integration

### Example 8: Multi-Token Batch Generation

```typescript
async function batchGenerateTokenLogos(tokens: Array<{symbol: string, name: string}>) {
  const results = [];

  for (const token of tokens) {
    try {
      const response = await fetch('/api/ai/image-gen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenSymbol: token.symbol,
          tokenName: token.name,
          quality: 'standard', // Use 'standard' for batch to save costs
          style: 'vivid'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        results.push({
          symbol: token.symbol,
          imageUrl: data.imageUrl
        });

        // Store in gallery
        await storeTokenImage(token.symbol, data.imageUrl, {
          tokenName: token.name,
          imageType: 'ai-generated'
        });
      }

      // Wait to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`Failed to generate for ${token.symbol}:`, error);
    }
  }

  return results;
}

// Usage
const tokens = [
  { symbol: 'SEAL', name: 'Sealevel Protocol' },
  { symbol: 'MOON', name: 'Moonshot' },
  { symbol: 'WAVE', name: 'Wave Finance' }
];

batchGenerateTokenLogos(tokens).then(results => {
  console.log('Generated logos:', results);
});
```

### Example 9: Custom Style Presets

```typescript
const stylePresets = {
  minimalist: {
    prompt: (symbol: string) => `
      Ultra-minimalist logo for $${symbol} cryptocurrency token.
      Single geometric shape. Monochromatic with one accent color.
      Clean lines. White background. Professional. Simple.
    `,
    style: 'natural' as const
  },
  
  futuristic: {
    prompt: (symbol: string) => `
      Futuristic cyberpunk logo for $${symbol} token.
      Neon colors. Circuit patterns. Holographic effects.
      Dark background. High-tech aesthetic. Glowing accents.
    `,
    style: 'vivid' as const
  },
  
  organic: {
    prompt: (symbol: string) => `
      Nature-inspired organic logo for $${symbol} token.
      Flowing curves. Earth tones. Natural textures.
      Peaceful. Harmonious. Eco-friendly aesthetic.
    `,
    style: 'natural' as const
  }
};

async function generateWithPreset(
  tokenSymbol: string, 
  tokenName: string,
  presetName: keyof typeof stylePresets
) {
  const preset = stylePresets[presetName];
  
  const response = await fetch('/api/ai/image-gen', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tokenSymbol,
      tokenName,
      prompt: preset.prompt(tokenSymbol),
      style: preset.style,
      quality: 'hd'
    })
  });

  return await response.json();
}

// Usage
const result = await generateWithPreset('SEAL', 'Sealevel', 'futuristic');
```

### Example 10: Image Validation Before Launch

```typescript
import { validateImageForSocialMedia } from '@/app/lib/token-images/storage';

async function launchTokenWithValidation(
  tokenImage: string,
  tokenData: any
) {
  // Validate image first
  const validation = await validateImageForSocialMedia(tokenImage);
  
  if (!validation.valid) {
    console.error('Image validation failed:', validation.issues);
    alert(`Image issues:\n${validation.issues.join('\n')}`);
    return;
  }

  // Proceed with launch
  console.log('Image validated! Proceeding with launch...');
  
  // ... launch logic ...
}
```

---

## Error Handling

### Example 11: Robust Error Handling

```typescript
async function generateWithRetry(
  tokenSymbol: string,
  tokenName: string,
  maxRetries = 3
) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch('/api/ai/image-gen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenSymbol,
          tokenName,
          quality: 'hd'
        })
      });

      if (!response.ok) {
        const error = await response.json();
        
        if (response.status === 429) {
          // Rate limit - wait and retry
          console.log(`Rate limited. Waiting before retry ${attempt}/${maxRetries}...`);
          await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 1 minute
          continue;
        }
        
        throw new Error(error.error || 'Generation failed');
      }

      const data = await response.json();
      
      if (data.success) {
        return data;
      }
    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

// Usage
try {
  const result = await generateWithRetry('SEAL', 'Sealevel Protocol');
  console.log('Generated successfully:', result.imageUrl);
} catch (error) {
  console.error('All attempts failed:', error);
  // Fallback to upload or default image
}
```

---

## Testing

### Example 12: Unit Test for Image Generation

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('Token Image Generation', () => {
  it('should generate image successfully', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        imageUrl: 'https://example.com/image.png',
        metadata: {
          tokenSymbol: 'TEST',
          tokenName: 'Test Token'
        }
      })
    });

    global.fetch = mockFetch;

    const response = await fetch('/api/ai/image-gen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tokenSymbol: 'TEST',
        tokenName: 'Test Token'
      })
    });

    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.imageUrl).toBeDefined();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('should handle rate limiting', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({
        error: 'Rate limit exceeded'
      })
    });

    global.fetch = mockFetch;

    const response = await fetch('/api/ai/image-gen', {
      method: 'POST',
      body: JSON.stringify({ tokenSymbol: 'TEST' })
    });

    expect(response.status).toBe(429);
  });
});
```

---

## Best Practices Summary

1. **Always validate images** before launching
2. **Use rate limiting** wisely (10 requests/hour)
3. **Store images** in gallery for reuse
4. **Optimize for platforms** when sharing
5. **Handle errors gracefully** with retries
6. **Test social posts** before auto-enabling
7. **Backup important images** to local storage
8. **Use custom prompts** for unique branding
9. **Consider costs** - use 'standard' for testing
10. **Verify API keys** are properly configured

---

## Support & Resources

- **Full Documentation**: [TOKEN_IMAGE_GENERATOR.md](./TOKEN_IMAGE_GENERATOR.md)
- **API Reference**: [API_DOCUMENTATION.md](../API_DOCUMENTATION.md)
- **GitHub Issues**: Report bugs and feature requests
- **Discord Community**: Get help from other developers

---

*Last Updated: 2024*

