#!/usr/bin/env node

/**
 * CineWrapped Automated Security & Vulnerability Scanner
 * Runs automated dependency auditing and security compliance checks across all monorepo packages.
 */

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

console.log('🔒 Starting CineWrapped Security & Dependency Audit...\n');

let failed = false;
console.log('📦 Scanning dependencies for high and critical vulnerabilities...');
const audit = spawnSync('corepack', ['pnpm', 'audit', '--audit-level=high'], {
  cwd: resolve(import.meta.dirname, '../..'),
  encoding: 'utf8',
});
if (audit.stdout) process.stdout.write(audit.stdout);
if (audit.stderr) process.stderr.write(audit.stderr);
if (audit.status !== 0) failed = true;

const checks = [
  ['API rate limiting', 'apps/api/src/main.ts', /register\(rateLimit/u],
  ['Restricted proxy trust', 'apps/api/src/main.ts', /trustProxy: environment\.TRUST_PROXY/u],
  [
    'Upload signature rejection',
    'apps/api/src/common/file-upload-security.ts',
    /UNKNOWN_FILE_SIGNATURE/u,
  ],
  ['Object ownership checks', 'apps/api/src/common/object-ownership.guard.ts', /assertOwnership/u],
  ['Account identity deletion', 'apps/api/src/users/users.service.ts', /deleteIdentity/u],
];

console.log('\n🛡️ Verifying source-backed security controls:');
for (const [label, path, pattern] of checks) {
  const passed = pattern.test(readFileSync(resolve(import.meta.dirname, '../..', path), 'utf8'));
  console.log(`  [${passed ? '✓' : '✗'}] ${label}`);
  failed ||= !passed;
}

if (failed) {
  console.error('\nSecurity scan failed. Resolve the findings above before release.');
  process.exitCode = 1;
} else {
  console.log('\nSecurity scan completed successfully.');
}
