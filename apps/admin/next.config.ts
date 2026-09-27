import type { NextConfig } from 'next';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const rootEnvironmentFile = resolve(__dirname, '../../.env');

// Keep local development consistent with the rest of the monorepo, which owns one root .env file.
// Render and CI inject these values directly, so no file is loaded in those environments.
if (existsSync(rootEnvironmentFile)) process.loadEnvFile(rootEnvironmentFile);

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
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Resource-Policy', value: 'same-site' },
          {
            key: 'Content-Security-Policy',
            value:
              "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; object-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://cinewrapped-api.onrender.com https://qptbvrfrelkqoesaulyp.supabase.co; upgrade-insecure-requests",
          },
        ],
      },
    ]);
  },
};

export default config;
