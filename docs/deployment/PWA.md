# CineWrapped PWA

CineWrapped installs from https://cinewrapped.vercel.app using the browser’s Install menu or the in-app install banner when supported. On iPhone/iPad, open the site in Safari and choose Share → Add to Home Screen. No paid service or additional dependency is required.

## Build and deployment

`pnpm --filter @cinewrapped/mobile build:web` exports Expo’s single-page site, then runs `scripts/build-pwa.mjs`. The script links the manifest and Apple home-screen metadata and generates a versioned `/sw.js`. Icons use the existing CineWrapped artwork; the 512px icon has sufficient padding for maskable cropping. Vercel serves the worker without HTTP caching and the manifest with revalidation.

The `build` command for native exports does not generate the service worker. Production web deployments must use `build:web` (already configured in `apps/mobile/vercel.json`). Development builds do not register workers.

## Offline and privacy boundaries

The worker precaches only `/offline.html` and two public app icons. HTML navigation always uses the network, falling back to the offline page on connection failure. Account APIs, OAuth callback responses, search parameters, third-party media and mutations are never stored by this worker. The offline page has no account information.

This is an installable app with an offline startup fallback, not a full offline library. The existing viewing queue can save viewings from an already-loaded app and sync them when connectivity returns. Reloading while offline shows the fallback rather than a cached authenticated screen. Signing out retains the existing queue-clearing policy.

## Updates and recovery

Worker versions include the exported HTML, public fallback assets and worker source. Installation must cache every public fallback asset successfully before accepting a new worker. New workers wait until all old CineWrapped tabs/windows close; the app shows an update message and never forces a reload or interrupts an edit. Returning to a visible app checks for updates. Activation removes only outdated `cinewrapped-pwa-*` caches and claims open pages.

To recover from a faulty worker, ship a corrected `sw.js` and close/reopen all CineWrapped windows. Browser site settings can also unregister the worker and clear its caches; avoid clearing all site storage when pending viewings need preserving.

## Verification

`node --test apps/mobile/scripts/pwa-checks.mjs` verifies icon dimensions, public-only precaching, failed installation, scoped cache cleanup, online navigation, offline deep-link fallback, API/credential bypass and deterministic release versioning. Run the mobile TypeScript check, lint and production export before deploying. The Node test filename intentionally avoids Vitest’s test discovery patterns.

Manual device checks: install on desktop/Android and Safari iOS; open standalone; disconnect and reload to see the offline page; reconnect and retry; confirm an already-loaded viewing queues and later syncs; deploy an update with an open app, then close all windows and reopen to activate it. Browser-specific installation prompts require a real supported device/browser and may be suppressed by browser install policy.

### Production release · 2026-10-04

Deployment `dpl_ATpc5ANV9VwpS7GarHLrW77xys2A` reached READY and was aliased to `https://cinewrapped.vercel.app`. TypeScript, affected lint, formatting, eight PWA checks and 49 existing mobile library tests passed. Live checks returned HTTP 200 for the manifest, worker, icons, offline page and deep-link HTML. Manifest and worker MIME types were correct; the worker returned `Cache-Control: no-store` and `Service-Worker-Allowed: /`. Live HTML linked the manifest and Apple icon; the manifest used standalone display and the icon was 512×512.

The browser rendered the existing login screen before deployment, but the post-deployment automation connection detached. Actual device installation, standalone launch and browser network-offline checks remain manual; service-worker behavior was verified by the automated checks above. After upload, the Node check file was renamed to avoid Vitest discovery; this does not change the deployed web assets.
