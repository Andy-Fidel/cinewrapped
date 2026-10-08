# Responsive PWA implementation

The shared Expo app now uses a centered, fluid shell capped at 1440px. The library chooses one to six columns from available width and native text scale. Carousels measure their parent instead of the entire browser window. Home, calendar, media, clubs, settings and statistics controls wrap when space is limited.

Stories use a scrollable content area with explicit previous/next controls. Long handles and revision labels wrap, poster sizes are constrained, and large numeric facts use smaller type without dropping digits. Export, preview, calendar, report and confirmation dialogs scroll so their actions remain reachable in short windows.

The web viewport follows the visible browser height when the keyboard resizes it, uses dynamic viewport height as a fallback, supports safe-area layout, and preserves pinch zoom. Touch inputs use at least 16px type to avoid iOS focus zoom. Keyboard focus remains visible. Native orientation is unlocked; the web manifest remains unrestricted.

Protected screens wait for session restoration before redirecting. This fixes bookmarked pages and installed-app deep links that previously bounced to Home during cold startup. Server authentication and authorization are unchanged.

No dependencies, infrastructure services, paid features or database migrations were added. Existing public-only PWA caching and user-controlled update activation remain unchanged; see [PWA.md](PWA.md).

## Verification

The browser harness uses the compiled production Expo app with intercepted API responses, a dummy local session, long titles/handles, 12 library items and large statistic values. Remote traffic is intercepted; no real accounts or API mutations are used. It checks route restoration, document width, text bounds and visible viewport height. It also exercises story navigation/export and confirmation cancellation. Horizontal carousels are intentional scroll containers.

```sh
npm --prefix apps/mobile run typecheck
npm --prefix apps/mobile run lint
npm --prefix apps/mobile test
npm --prefix apps/mobile run build
npm --prefix apps/mobile run build:web
PLAYWRIGHT_CORE_PATH=/path/to/installed/playwright-core node apps/mobile/scripts/responsive-checks.cjs
```

`playwright-core` and Chrome are optional local verification tools, not application dependencies. The harness reads only the public Supabase URL from the existing root `.env` to intercept authentication traffic. `RESPONSIVE_ROUTES`, `RESPONSIVE_MATRIX` and `RESPONSIVE_OUTPUT_DIR` can narrow checks or change artifact locations. Run exports before starting the harness; rebuilding replaces the directory being served.

The main matrix covers Home, Discover, Library, Social, Settings, Insights, Calendar, Media, Wraps, six settings screens, Journal, Clubs and Soundtracks at:

| Layout           | Browser viewport     |
| ---------------- | -------------------- |
| Small phone      | 280 × 653            |
| Phone            | 320 × 568, 390 × 844 |
| Phone landscape  | 568 × 320            |
| Tablet portrait  | 768 × 1024           |
| Tablet landscape | 1024 × 768           |
| Desktop          | 1440 × 900           |
| Ultrawide        | 2560 × 1440          |

Automated browser sizing does not certify every physical device. Installation, real keyboards, notched-device safe areas and Safari/Android standalone behavior still require device testing. Native exports verify compilation, not device rendering.

## Release

Verified on 2026-10-08: 144 main screen/viewport combinations and 15 additional checks for AI, Roulette, Trivia, Scene Identification and Achievements passed. No page overflow, out-of-viewport non-carousel text, route-restoration failures, visible-height mismatches or JavaScript errors were detected. Story next/previous/export controls and confirmation cancellation were exercised. Phone and landscape wrap screenshots were visually inspected.

115 mobile tests and eight PWA checks passed. TypeScript passed. Lint reported no errors and two existing warnings in the push notification provider. Web, Android and iOS exports compiled successfully.

The additional feature matrix can be rerun with `RESPONSIVE_ROUTES=/ai,/roulette,/trivia,/scene-identification,/gamification` and `RESPONSIVE_MATRIX='[[320,568],[568,320],[1024,768]]'`.

Production target: `cinewrapped` / `prj_uR8bFl2DPntgKULFZl5HoYMofGaS`, existing Vercel team `team_tdnGf34gNQdl7Y2lcaKWNRFZ`, source based on commit `3940076` plus the uncommitted responsive changes. No commit or push was made.

Previous production deployment for rollback: `dpl_ASVEg5dDkDAVJMZpM3W5TH3APYiq`.

Production deployment `dpl_8znRUvkpw9XvZsBfgQdio1Z3TNVu` reached READY and was aliased to https://cinewrapped.vercel.app. The remote build used the existing basic plan build machine (2 cores / 8 GB). Live HTML includes safe-area and keyboard-resize viewport metadata; the page, manifest, service worker, offline page and both icons returned HTTP 200 with the expected MIME types. The worker uses `Cache-Control: no-store`; the manifest uses `no-cache`.

The live anonymous login screen passed browser checks at 320 × 568, 568 × 320, 768 × 1024 and 1440 × 900: buttons remained within the viewport, page width matched the viewport and visible height updated correctly. The browser registered the production service worker; offline navigation to `/insights` served the public fallback without login fields, and reconnecting restored online navigation. No browser JavaScript errors were observed.
