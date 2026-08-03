import type { NextConfig } from 'next';

const config: NextConfig = {
  images: { unoptimized: true },
  output: 'standalone',
  poweredByHeader: false,
  reactStrictMode: true,
  transpilePackages: ['@cinewrapped/ui-tokens'],
  headers() {
    return Promise.resolve([
      {
        source: '/:path*',
        headers: [
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ]);
  },
};

export default config;
