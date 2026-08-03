import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, '../..');
const sourcePath = resolve(repositoryRoot, 'docs/design/design-tokens.json');
const outputPath = resolve(repositoryRoot, 'packages/ui-tokens/src/generated/tokens.ts');

const source = await readFile(sourcePath, 'utf8');
const tokens = JSON.parse(source);
const output = `// Generated from docs/design/design-tokens.json. Do not edit directly.\n\nexport const tokens = ${JSON.stringify(tokens, null, 2)} as const;\n\nexport type DesignTokens = typeof tokens;\n`;

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, output, 'utf8');
