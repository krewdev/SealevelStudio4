# Logo Files - Complete Guide

## Main Logo File
- **File**: `sea-level-logo.png`
- **Location**: `/public/sea-level-logo.png`
- **Usage**: Background watermark on ALL pages
- **Style**: Semi-transparent watermark with hue rotation
- **Specs**:
  - Format: PNG (recommended for transparency)
  - Size: 400-800px width (maintain aspect ratio)
  - Opacity: 5% (very subtle background watermark)
  - Filter: hue-rotate-[90deg] saturate-75 brightness-110

## Pages with Logo Watermarks

### Core Application Pages
1. **Landing Page** (`app/components/LandingPage.tsx`)
   - Logo in hero section (round format)
   - Video logo in footer section

2. **Account Inspector** (`app/page.tsx`)
   - Background watermark

3. **Simulation View** (`app/page.tsx`)
   - Background watermark

4. **Code Exporter** (`app/page.tsx`)
   - Background watermark

5. **Charts View** (`app/components/ChartsView.tsx`)
   - Background watermark

6. **Documentation** (`app/components/DocsView.tsx`)
   - Background watermark (both auth and main views)

7. **Tools Hub** (`app/components/ToolsHub.tsx`)
   - Background watermark

8. **Transaction Builder** (`app/components/UnifiedTransactionBuilder.tsx`)
   - Header logo (32px height)
   - Background watermark

9. **Arbitrage Scanner** (`app/components/ArbitrageScanner.tsx`)
   - Background watermark

10. **Developer Community** (`app/components/DeveloperCommunity.tsx`)
    - Header logo (40px height)

### Coming Soon Pages (All have logo watermarks)
- **API Keys** (`app/web2/api-keys/page.tsx`)
- **Integrations** (`app/web2/integrations/page.tsx`)
- **Webhooks** (`app/web2/webhooks/page.tsx`)
- **Data Export** (`app/web2/export/page.tsx`)
- **Analytics** (`app/web2/analytics/page.tsx`)
- **Market Maker** (`app/premium/market-maker/page.tsx`)

## Transaction Builder Specific Logo
- **File**: `transaction-builder-logo.jpeg`
- **Location**: `/public/transaction-builder-logo.jpeg`
- **Usage**: Advanced tab button in transaction builder
- **Specs**:
  - Format: JPEG or PNG
  - Size: 400-800px width
  - Display: 40px height with rounded corners

## Video Animation
- **File**: `sea-lion-animation.mp4`
- **Location**: `/public/sea-lion-animation.mp4`
- **Usage**: Loading screen animation
- **Specs**:
  - Format: MP4 (H.264)
  - Size: Under 5MB
  - Duration: 3-10 seconds
  - Background: Transparent or dark

## Additional Assets
- `apple-touch-icon.png`: iOS app icon
- `sea-level-logo1.jpeg`: Alternative logo format

## Implementation Details

### Logo Watermark Pattern
```jsx
<img
  src="/sea-level-logo.png"
  alt="Sealevel Studio Background"
  className="absolute inset-0 w-full h-full object-contain opacity-[0.05] filter hue-rotate-[90deg] saturate-75 brightness-110 pointer-events-none"
  style={{
    objectPosition: 'center right',
    transform: 'scale(0.6) rotate(-5deg)',
    zIndex: 0
  }}
  onError={(e) => {
    (e.target as HTMLImageElement).style.display = 'none';
  }}
/>
```

### Container Structure
```jsx
<div className="relative">
  {/* Logo watermark */}
  <img ... />

  {/* Content with higher z-index */}
  <div style={{ zIndex: 1, position: 'relative' }}>
    {/* Page content */}
  </div>
</div>
```

## Files to Update for New Logos

1. Replace `/public/sea-level-logo.png` - affects all page watermarks
2. Replace `/public/transaction-builder-logo.jpeg` - affects transaction builder tab
3. Replace `/public/sea-lion-animation.mp4` - affects loading animation
4. Update header logos in specific components as needed

## Notes
- All logo watermarks are very subtle (5% opacity) to not interfere with content
- Logos gracefully hide if files are missing (onError handler)
- Watermarks are positioned behind content with proper z-indexing
- All pages now have consistent branding through logo watermarks
