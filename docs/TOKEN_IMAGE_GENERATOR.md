# Token Image Generator & Manager

## Overview

The Token Image Generator is an integrated AI-powered system that allows you to create professional token logos for your launches. Images can be uploaded manually or generated using OpenAI's DALL-E 3 API, and are automatically optimized for social media platforms like Twitter and Telegram.

## Features

### 🎨 AI Image Generation
- **Automatic Token Branding**: Generate professional logos based on token symbol and name
- **Custom Prompts**: Describe your ideal logo for unique, branded results
- **High Quality**: Uses DALL-E 3 for HD-quality 1024x1024 images
- **Smart Optimization**: Automatically formats images for social media

### 📤 Manual Upload
- **Multiple Formats**: Supports PNG, JPG, GIF, and WEBP
- **Size Validation**: Max 5MB file size
- **Preview**: Instant preview before confirming
- **Dimension Check**: Ensures images meet social media requirements

### 🚀 Social Media Integration
- **Auto-Posting**: Automatically post launch announcements with images
- **Platform-Specific Optimization**: Resizes for Twitter (400x400) and Telegram (512x512)
- **Announcement Templates**: Professional launch messages with token details
- **Manual Sharing**: Share images from gallery to social platforms

### 📚 Image Gallery
- **Storage**: All images stored in browser IndexedDB
- **Gallery View**: Browse all your token images
- **Quick Actions**: Download, share, or delete images
- **Metadata**: Track creation date, type, and mint address

## Usage Guide

### 1. Generating an AI Image

When launching a token in the Rugless Launchpad:

1. Enter your token name and symbol
2. Click **"Generate with AI"** button
3. (Optional) Click "Show Custom Prompt" for detailed control
4. Wait 10-20 seconds for generation
5. Preview and approve the image

**Example Auto-Generated Prompt:**
```
Create a professional cryptocurrency token logo for "Sealevel Protocol". 
The logo should feature the symbol "SEAL" prominently and be suitable 
for use on social media, trading platforms, and cryptocurrency exchanges.
- Modern, clean, and professional appearance
- Vibrant colors that stand out on dark backgrounds
- Circular or square format suitable for profile pictures
- Tech-forward aesthetic with blockchain/crypto themes
```

**Custom Prompt Example:**
```
A futuristic minimalist logo for $SEAL token featuring an ocean wave 
with circuit board patterns, holographic blue and purple gradient, 
geometric seal silhouette, glowing neon accents, dark background
```

### 2. Uploading a Custom Image

1. Click **"Upload Image"** button
2. Select image file (PNG, JPG, GIF, WEBP)
3. Image will be validated and previewed
4. Confirm to use for launch

**Requirements:**
- Min dimensions: 400x400 pixels
- Max dimensions: 4096x4096 pixels
- Max file size: 5MB
- Aspect ratio: Between 1:2 and 2:1

### 3. Auto-Posting to Social Media

Enable automatic launch announcements:

1. Upload or generate a token image
2. Check the **"Auto-post launch announcement"** box
3. Launch your token
4. System automatically posts to configured platforms

**Posted Message Format:**
```
🚀 [Token Name] ($SYMBOL) is now LIVE on Solana!

📊 Total Supply: [supply]
💧 Initial Liquidity: [amount] SOL
✅ Rugless Launch Protection Enabled
🔒 Liquidity Locked for 7 Days

📍 Mint: [address]

Built with Sealevel Studio 🌊
#Solana #DeFi #[SYMBOL] #TokenLaunch
```

### 4. Managing Token Images

Access the Token Image Gallery to:

- **View All Images**: See all generated/uploaded token images
- **Download Originals**: Full-resolution download
- **Platform-Optimized Downloads**: Pre-sized for Twitter/Telegram
- **Share to Social**: Post individual images to platforms
- **Delete**: Remove images you no longer need

## API Configuration

### Required Environment Variables

Add to your `.env.local`:

```bash
# OpenAI for AI Image Generation
OPENAI_API_KEY=sk-...

# Twitter (for auto-posting)
TWITTER_API_KEY=your_twitter_api_key
TWITTER_API_SECRET=your_twitter_api_secret
TWITTER_ACCESS_TOKEN=your_access_token
TWITTER_ACCESS_TOKEN_SECRET=your_access_token_secret

# Telegram (for auto-posting)
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHANNEL_ID=@your_channel
```

### OpenAI Setup

1. Get API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Ensure you have DALL-E 3 access (requires paid plan)
3. Add to environment variables

### Twitter Setup

1. Create Twitter Developer account
2. Create a new app with read/write permissions
3. Generate API keys and access tokens
4. Add to environment variables

### Telegram Setup

1. Create bot via [@BotFather](https://t.me/botfather)
2. Get bot token
3. Add bot to your channel as admin
4. Get channel ID
5. Add to environment variables

## API Endpoints

### Image Generation

**POST** `/api/ai/image-gen`

Generate token logo with AI:

```typescript
{
  tokenSymbol: string;      // Required
  tokenName?: string;       // Optional
  prompt?: string;          // Optional custom prompt
  size?: '1024x1024';       // Default
  quality?: 'hd' | 'standard';  // Default: 'hd'
  style?: 'vivid' | 'natural';  // Default: 'vivid'
}
```

**Response:**
```typescript
{
  success: true,
  imageUrl: string,
  revisedPrompt: string,    // DALL-E's interpretation
  metadata: { ... }
}
```

### Image Upload

**POST** `/api/ai/image-upload`

Upload custom token image:

```typescript
FormData {
  image: File,
  tokenSymbol: string,
  tokenName: string
}
```

**Response:**
```typescript
{
  success: true,
  imageUrl: string,         // Base64 data URL
  metadata: { ... }
}
```

### Social Media Post

**POST** `/api/social/post-token-launch`

Post launch announcement:

```typescript
{
  tokenSymbol: string,
  tokenName: string,
  tokenMintAddress?: string,
  imageUrl: string,
  totalSupply?: number,
  liquidityAmount?: number,
  platforms: ['twitter', 'telegram'],
  customMessage?: string
}
```

**Response:**
```typescript
{
  success: boolean,
  message: string,
  results: {
    twitter?: { success: boolean, tweetId?: string, error?: string },
    telegram?: { success: boolean, messageId?: string, error?: string }
  }
}
```

## Storage Management

Images are stored in browser's IndexedDB under `TokenImagesDB`.

### Storage Structure

```typescript
interface TokenImageMetadata {
  tokenSymbol: string;        // Primary key
  tokenName: string;
  imageUrl: string;           // Base64 or URL
  imageType: 'uploaded' | 'ai-generated';
  generatedAt: string;        // ISO timestamp
  mintAddress?: string;       // Added after launch
  socialMediaReady: boolean;
}
```

### Storage Utilities

```typescript
import { 
  storeTokenImage,
  getTokenImage,
  getAllTokenImages,
  deleteTokenImage 
} from '@/app/lib/token-images/storage';

// Store an image
await storeTokenImage('SEAL', imageUrl, {
  tokenName: 'Sealevel',
  imageType: 'ai-generated',
  mintAddress: '...'
});

// Retrieve an image
const image = await getTokenImage('SEAL');

// Get all images
const allImages = await getAllTokenImages();

// Delete an image
await deleteTokenImage('SEAL');
```

## Best Practices

### Image Generation Tips

1. **Be Specific**: Detailed prompts yield better results
2. **Include Style**: Mention "minimalist", "futuristic", "retro", etc.
3. **Specify Colors**: Guide the color palette for brand consistency
4. **Mention Use Case**: "logo", "profile picture", "banner"
5. **Iterate**: Try multiple generations with different prompts

### Social Media Optimization

1. **Test First**: Generate image and verify quality before launch
2. **Square Format**: Best for profile pictures on all platforms
3. **High Contrast**: Ensure visibility on both light and dark backgrounds
4. **Clear Symbol**: Token symbol should be easily readable at small sizes
5. **Professional Look**: Avoid cluttered designs

### Storage Management

1. **Regular Cleanup**: Delete unused images to save space
2. **Backup Important Images**: Download to local storage
3. **Metadata**: Always include mint address after launch
4. **Gallery Review**: Periodically review and organize images

## Troubleshooting

### Common Issues

**Q: Image generation is slow**
- A: DALL-E 3 typically takes 10-20 seconds. Be patient.

**Q: Rate limit exceeded**
- A: Built-in rate limiting allows 10 requests per hour per IP. Wait or try later.

**Q: Upload fails**
- A: Check file size (<5MB) and format (PNG/JPG/GIF/WEBP)

**Q: Social media post fails**
- A: Verify API credentials in environment variables

**Q: Image not showing in gallery**
- A: Check browser console for IndexedDB errors, clear cache

### Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "OpenAI API key not configured" | Missing env variable | Add `OPENAI_API_KEY` |
| "Rate limit exceeded" | Too many requests | Wait 1 hour or contact support |
| "Invalid file type" | Wrong image format | Use PNG, JPG, GIF, or WEBP |
| "Image size exceeds 5MB" | File too large | Compress image |
| "Twitter API not configured" | Missing credentials | Add Twitter env variables |

## Pricing

### OpenAI DALL-E 3 Costs
- **Standard Quality**: ~$0.040 per image
- **HD Quality**: ~$0.080 per image
- **Size**: 1024x1024 (default)

### Tips to Reduce Costs
1. Use standard quality for testing
2. Generate once with a good prompt
3. Upload custom images when possible
4. Reuse generated images for similar tokens

## Future Enhancements

Planned features:
- [ ] Batch image generation
- [ ] Multiple size exports
- [ ] Image editing tools
- [ ] Template library
- [ ] Style presets
- [ ] NFT metadata integration
- [ ] Cloud storage option
- [ ] Team collaboration
- [ ] Version history

## Support

For issues or questions:
- GitHub Issues: [Repository Link]
- Discord: [Community Link]
- Documentation: [Docs Link]

## License

This feature is part of Sealevel Studio and follows the main project license.

