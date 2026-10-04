# Additional appearance themes

Settings → Appearance now offers Ocean, Forest, Amethyst, Rose and Sunset alongside System, Light and Dark. Ocean, Forest and Amethyst use dark palettes; Rose and Sunset use light palettes. Each palette defines the complete semantic color set in `docs/design/design-tokens.json`; the existing token generator publishes them to all theme-aware mobile/web controls. Logos and status bars retain a separate light/dark mode, and the browser theme-color follows the selected background.

The choice uses the existing authenticated preferences PATCH/GET endpoints and saves to the account. Invalid names are rejected server-side. Selection controls disable during a save and display an error on failure rather than silently changing the selection. System still follows the device appearance; explicit palettes remain stable across system changes. Auth and onboarding retain their existing light appearance override.

## Rollout and recovery

1. Apply the additive `20261004130000_add_appearance_themes` enum migration.
2. Deploy the API with the expanded validation and regenerated Prisma client.
3. Deploy the web app. Native clients receive the variations in their next app build.

Existing choices and the SYSTEM default remain valid. No database, paid integration or new dependency is introduced. For a web rollback, keep the expanded API and database enum so saved new choices continue to serialize. Prefer a corrected API release over rolling back to a Prisma client that does not recognize already-saved enum values.

## Validation

Automated tests cover all eight valid preferences, unknown-name rejection, fixed palette resolution independent of system appearance, complete token keys and normal-text contrast of at least 4.5:1 across surfaces and semantic control labels. Isolated PostgreSQL integration tests exercise authenticated HTTP save/reload for all five additions, preserve unrelated preferences, enforce account isolation, reject unauthorized/invalid updates, and retain the three original choices. TypeScript checks pass for both API and mobile.

Real signed-in browser and native-device appearance checks still require a test session/device; integration coverage uses fixture identities only in the isolated local test database.

### Production verification · 2026-10-04

API deployment `dpl_5BjBbeyGzVfLdh23Jo6DFxjUXBjy` and web deployment `dpl_DpCaXKdk4jpzVtgbqkyq3KPqNAcQ` reached READY on their existing production aliases. The production enum and Prisma migration history include all five additions. The API readiness check returned 200; anonymous preferences returned 401. The live web bundle returned 200 and included every new palette and the updated appearance controls. The deployed login route rendered in Chrome; a signed-in session was unavailable for theme-screen visual verification. The post-release API error-level log query returned no logs for the last five minutes, which is a limited observation window.

Validation passed: 99 relevant Vitest tests (including nine authenticated PostgreSQL preference tests), eight PWA checks, API/mobile type checks, affected lint without errors, formatting and exports for web/iOS/Android. Native exports were verified locally; no native build was submitted or published. Hosting plans and paid integrations were unchanged.
