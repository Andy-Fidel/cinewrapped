import type { ConfigContext, ExpoConfig } from 'expo/config';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const rootEnvironmentFile = resolve(__dirname, '../../.env');

// Expo resolves dotenv files from apps/mobile, while CineWrapped keeps one environment file at
// the monorepo root. Load it before Metro replaces EXPO_PUBLIC_* references in the client bundle.
if (existsSync(rootEnvironmentFile)) process.loadEnvFile(rootEnvironmentFile);

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? 'CineWrapped',
  slug: config.slug ?? 'cinewrapped',
});
