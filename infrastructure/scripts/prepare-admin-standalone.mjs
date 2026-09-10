import { cp, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const adminRoot = resolve(import.meta.dirname, '../../apps/admin');
const standaloneAdminRoot = resolve(adminRoot, '.next/standalone/apps/admin');

await mkdir(resolve(standaloneAdminRoot, '.next'), { recursive: true });
await cp(resolve(adminRoot, '.next/static'), resolve(standaloneAdminRoot, '.next/static'), {
  recursive: true,
});
await cp(resolve(adminRoot, 'public'), resolve(standaloneAdminRoot, 'public'), {
  recursive: true,
});
