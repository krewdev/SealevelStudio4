/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Disable strict mode to prevent hydration issues
  experimental: {
    optimizeCss: false,
  },
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
    return config;
  },
}

module.exports = nextConfig
