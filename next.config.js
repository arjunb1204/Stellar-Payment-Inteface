/** @type {import('next').NextConfig} */

const isProd = process.env.NODE_ENV === 'production';
const repoName = 'Stellar-Payment-Inteface';

const nextConfig = {
  reactStrictMode: true,

  // Static export for GitHub Pages (no Node.js server needed)
  output: 'export',

  // GitHub Pages serves at: https://<username>.github.io/<repo>/
  basePath: isProd ? `/${repoName}` : '',
  assetPrefix: isProd ? `/${repoName}/` : '',

  // Disable image optimization (not available in static export)
  images: {
    unoptimized: true,
  },

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
