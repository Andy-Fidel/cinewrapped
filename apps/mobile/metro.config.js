const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files within the monorepo while preserving Expo's defaults.
config.watchFolders = [...new Set([...(config.watchFolders ?? []), monorepoRoot])];

// 2. Let Metro resolve packages from both project and monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// 3. Ensure symlinks are handled smoothly in pnpm workspace
config.resolver.disableHierarchicalLookup = false;

module.exports = config;
