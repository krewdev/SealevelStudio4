/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Disable strict mode to prevent hydration issues
  experimental: {
    optimizeCss: false,
  },
  // Enable standalone output for Docker deployments (only in production builds, not dev)
  // Disable standalone for Vercel - Vercel doesn't use standalone builds
  output: process.env.NODE_ENV === 'production' && process.env.VERCEL !== '1' ? 'standalone' : undefined,
  // Allow ngrok and other dev origins for webhook testing
  allowedDevOrigins: [
    '*.ngrok-free.dev',
    '*.ngrok.io',
    '*.ngrok.app',
    'localhost',
    '127.0.0.1',
  ],
  images: {
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  // Production source maps - set to false to disable, or 'hidden-source-map' to generate but not reference
  productionBrowserSourceMaps: false,
  // Suppress source map warnings in console
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      // Suppress source map warnings for third-party code
      config.ignoreWarnings = [
        { module: /node_modules/ },
        { file: /\.map$/ },
      ];
    }
    
    // Fix chunk loading issues in development
    if (dev) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
          },
        },
      };
    }
    
    return config;
  },
}

module.exports = nextConfig
