import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { fileURLToPath } from 'node:url';

const template = await readFile(new URL('./service-worker.template.js', import.meta.url), 'utf8');
const assets = ['/offline.html', '/icons/icon-192.png', '/icons/icon-512.png'];
function worker({ offline = false, missing = false, installFails = false } = {}) {
  const listeners = {};
  const cached = [];
  const deleted = [];
  const fetched = [];
  runInNewContext(
    template.replace('__VERSION__', 'test').replace('__ASSETS__', JSON.stringify(assets)),
    {
      self: {
        clients: { claim: async () => {} },
        location: { origin: 'https://cinewrapped.test' },
        addEventListener: (name, handler) => {
          listeners[name] = handler;
        },
      },
      caches: {
        open: async () => ({
          addAll: async (urls) => {
            if (installFails) throw new Error('Storage unavailable');
            cached.push(...urls);
          },
          match: async (url) => (missing ? undefined : new Response(`cached:${url}`)),
        }),
        keys: async () => ['cinewrapped-pwa-old', 'cinewrapped-pwa-test', 'another-app-cache'],
        delete: async (name) => {
          deleted.push(name);
          return true;
        },
      },
      fetch: async (request) => {
        fetched.push(request.url);
        if (offline) throw new Error('offline');
        return new Response('network');
      },
      URL,
      Response,
    },
  );
  const dispatch = async (name, request) => {
    let response;
    listeners[name]({
      request,
      waitUntil: (promise) => {
        response = promise;
      },
      respondWith: (promise) => {
        response = promise;
      },
    });
    return await response;
  };
  return { dispatch, cached, deleted, fetched };
}
const request = (path, options = {}) => ({
  url: `https://cinewrapped.test${path}`,
  method: 'GET',
  mode: 'cors',
  ...options,
});

test('manifest uses valid install icons with real matching PNG dimensions', async () => {
  const manifest = JSON.parse(
    await readFile(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8'),
  );
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.start_url, '/');
  assert.equal(manifest.scope, '/');
  for (const icon of manifest.icons) {
    const data = await readFile(new URL(`../public${icon.src}`, import.meta.url));
    assert.equal(data.subarray(1, 4).toString(), 'PNG');
    assert.equal(`${data.readUInt32BE(16)}x${data.readUInt32BE(20)}`, icon.sizes);
  }
});

test('precaches only public offline assets and deletes only obsolete app caches', async () => {
  const sw = worker();
  await sw.dispatch('install');
  assert.deepEqual(sw.cached, assets);
  await sw.dispatch('activate');
  assert.deepEqual(sw.deleted, ['cinewrapped-pwa-old']);
});
test('failed precache rejects installation instead of accepting a broken offline release', async () => {
  await assert.rejects(worker({ installFails: true }).dispatch('install'), /Storage unavailable/);
});
test('online navigation always returns the network without storing URLs or responses', async () => {
  const sw = worker();
  const response = await sw.dispatch(
    'fetch',
    request('/auth/callback?code=private', { mode: 'navigate' }),
  );
  assert.equal(await response.text(), 'network');
  assert.deepEqual(sw.cached, []);
});
test('offline deep links serve the public fallback, with a safe response if storage is lost', async () => {
  const response = await worker({ offline: true }).dispatch(
    'fetch',
    request('/settings/preferences', { mode: 'navigate' }),
  );
  assert.equal(await response.text(), 'cached:/offline.html');
  const missing = await worker({ offline: true, missing: true }).dispatch(
    'fetch',
    request('/', { mode: 'navigate' }),
  );
  assert.equal(missing.status, 503);
});
test('API, mutations, third-party requests and asset query strings bypass the worker', async () => {
  const sw = worker();
  for (const input of [
    request('/api/v1/me'),
    request('/icons/icon-192.png?token=private'),
    request('/api/v1/viewings', { method: 'POST' }),
    request('/', { url: 'https://api.example/me' }),
  ]) {
    assert.equal(await sw.dispatch('fetch', input), undefined);
  }
  assert.deepEqual(sw.fetched, []);
});
test('public icons remain available offline', async () => {
  const response = await worker({ offline: true }).dispatch(
    'fetch',
    request('/icons/icon-192.png'),
  );
  assert.equal(await response.text(), 'cached:/icons/icon-192.png');
});
test('build adds install metadata once and changes worker version with the release', async () => {
  const directory = await mkdtemp(resolve(tmpdir(), 'cinewrapped-pwa-'));
  try {
    await mkdir(resolve(directory, 'icons'));
    await writeFile(
      resolve(directory, 'index.html'),
      '<html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>release one</body></html>',
    );
    for (const path of assets) await writeFile(resolve(directory, `.${path}`), path);
    const build = () =>
      execFileSync(process.execPath, [
        fileURLToPath(new URL('./build-pwa.mjs', import.meta.url)),
        directory,
      ]);
    build();
    const first = await readFile(resolve(directory, 'sw.js'), 'utf8');
    build();
    assert.equal(await readFile(resolve(directory, 'sw.js'), 'utf8'), first);
    const html = await readFile(resolve(directory, 'index.html'), 'utf8');
    assert.equal(html.match(/rel="manifest"/g).length, 1);
    assert.match(html, /apple-touch-icon/);
    assert.equal(html.match(/viewport-fit=cover/g).length, 1);
    assert.equal(html.match(/interactive-widget=resizes-content/g).length, 1);
    assert.doesNotMatch(html, /maximum-scale|user-scalable=no/);
    await writeFile(resolve(directory, 'index.html'), html.replace('release one', 'release two'));
    build();
    assert.notEqual(await readFile(resolve(directory, 'sw.js'), 'utf8'), first);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
