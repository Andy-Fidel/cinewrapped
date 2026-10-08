import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// Expo's single output is public HTML. Never precache authenticated API responses or URLs.
const directory = resolve(process.argv[2] ?? 'dist');
const indexPath = resolve(directory, 'index.html');
const index = await readFile(indexPath, 'utf8');
const viewportIndex = index.replace(
  /(<meta[^>]*name=["']viewport["'][^>]*content=["'])([^"']*)(["'][^>]*>)/u,
  (_match, before, content, after) =>
    `${before}${content.replace(/,?\s*(?:viewport-fit|interactive-widget)=[^,]*/gu, '')}, viewport-fit=cover, interactive-widget=resizes-content${after}`,
);
if (viewportIndex !== index) await writeFile(indexPath, viewportIndex);
const metadata = `<link rel="manifest" href="/manifest.webmanifest" />
<meta name="theme-color" content="#0B0F19" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-title" content="CineWrapped" />
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />`;
if (!viewportIndex.includes('rel="manifest"')) {
  if (!viewportIndex.includes('</head>')) throw new Error('Expo output is missing its HTML head.');
  await writeFile(indexPath, viewportIndex.replace('</head>', `${metadata}</head>`));
}
const assets = ['/offline.html', '/icons/icon-192.png', '/icons/icon-512.png'];
const hash = createHash('sha256').update(await readFile(indexPath));
for (const asset of assets) hash.update(await readFile(resolve(directory, `.${asset}`)));
const template = await readFile(new URL('./service-worker.template.js', import.meta.url), 'utf8');
hash.update(template);
await writeFile(
  resolve(directory, 'sw.js'),
  template
    .replace('__VERSION__', hash.digest('hex').slice(0, 20))
    .replace('__ASSETS__', JSON.stringify(assets)),
);
console.log('PWA manifest, metadata and offline service worker ready.');
