/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // Polyfill for Stellar SDK (uses Node.js Buffer)
    config.resolve.fallback = {
      ...config.resolve.fallback,
      buffer: false,
      crypto: false,
      stream: false,
      http: false,
      https: false,
      url: false,
    };
    return config;
  },
};

module.exports = nextConfig;
