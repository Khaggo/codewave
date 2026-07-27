/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  distDir: process.env.NEXT_DIST_DIR || '.next',
  outputFileTracingRoot: __dirname,
  transpilePackages: ['@codewave/contracts', '@codewave/domain-utils'],
  images: {
    formats: ['image/avif', 'image/webp'],
  },
}

module.exports = nextConfig
