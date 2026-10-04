# App-wide share button audit — 4 October 2026

Implementation status: all nine findings below have been addressed. See [current sharing behavior](../deployment/SHARE_CARDS.md). The findings describe the pre-fix audit baseline.

Scope: all mobile/web routes and reusable components, related API handlers, calendar and account exports, and the admin application. Application code and deployments were not changed during the audit; implementation followed in the subsequent user-authorized task.

Result: **2 P1 issues, 6 P2 issues, and 1 P3 issue**. P1 means fix first because of privacy scope or a broken core destination. P2 means a functional or recovery defect. P3 means incorrect secondary presentation content.

## Button inventory

| Entry point                                               | Actual operation                                                                         | Result                                                                                    |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Media detail header Share Title and action-row Share      | POST share receipt, then React Native text/URL share                                     | Broken URL; browser activation/scheme risks; no visible error                             |
| Quick-preview Share movie                                 | React Native text share with hard-coded app link                                         | Domain did not resolve during audit; no fallback/error handling                           |
| Trivia Share Score                                        | React Native text share                                                                  | Text payload is accurate; unsupported browsers and cancellation reject without feedback   |
| Calendar Share Year in Pixels                             | React Native text share of counts, streak and persona                                    | No heatmap image; same browser/error gaps                                                 |
| Own-review CineWrapped Share Card                         | Opens confirmed-spoiler card preview                                                     | Uses fixed PNG flow; previously corrected rating and spoiler handling retained            |
| Community-review visual card                              | Opens card with public-review DTO                                                        | Uses fixed PNG flow; hidden rating remains null; spoiler confirmation retained            |
| Share PNG image and Download PNG in review/story previews | Shares PNG File or downloads PNG on web; temporary PNG plus native share sheet on device | Existing regression tests pass; device destinations not exercised here                    |
| Story viewer Share Slide                                  | Opens selected slide's summary-card export                                               | Viewer-selected theme is lost; statistic-free summaries gain an unrelated Unrated label   |
| Export presentation JSON                                  | Downloads entire presentation JSON on web or shares a temporary JSON file on native      | Produces a real file; error feedback and cleanup present                                  |
| Settings Download account export                          | Reads paginated owner data, then downloads/shares JSON                                   | Owner-change checks, visible errors and native cleanup present; no new defect established |
| Calendar event Apple Cal and modal Apple Calendar / iOS   | Writes ICS to native cache, opens file share sheet                                       | Web incompatible; repeat export/file cleanup defects; ICS note formatting defect          |
| Calendar event Google Cal and modal Google Calendar       | Opens Google event-template URL                                                          | Real template, not completed synchronization; inline failures are uncaught                |
| Calendar Sync / More export options                       | Opens provider picker                                                                    | Both providers mapped to real handlers; picker shows failures, unlike inline actions      |
| Also share published review to Social feed                | Enables global shareReviewActivity privacy setting after publishing                      | Misleading single-review scope; can restore older activities and enable future ones       |
| Privacy share-activity toggles                            | Updates explicitly account-wide settings                                                 | Clearer scope than review checkbox; same global setting underneath                        |
| Admin application                                         | No share controls found                                                                  | No additional share implementation to audit                                               |

## Findings

### 1. P1 — Sharing one review changes account-wide privacy

Evidence: `apps/mobile/src/components/tracking-panel.tsx:200` and `:589`; `apps/api/src/social/social.service.ts:667`, `:719`, and `:751`.

When global review sharing is off, checking “Also share published review to Social feed” PATCHes `users/me/privacy` with `shareReviewActivity: true`. The feed synchronizer subsequently scans published reviews and reconciles **all** review activities for that author, including restoring deleted activity rows. The checkbox does not grant permission for only the current review. Older review activities can reappear and future reviews are eligible under the global audience setting.

Fix: model an explicit per-review feed-publication action, or clearly disclose the account-wide past/future effect before enabling that setting. Do not describe a global privacy mutation as sharing one item.

### 2. P1 — Movie shares send broken destinations

Evidence: `apps/api/src/social/social.service.ts:577`; `apps/mobile/src/components/netflix-quick-preview-modal.tsx:97`.

Both media-detail buttons receive `https://cinewrapped.example/media/...`, a placeholder domain. Quick-preview shares instead point to `https://cinewrapped.app/media/...`; a direct DNS/HTTPS check could not resolve that domain in this audit environment. Neither handler uses the live `https://cinewrapped.vercel.app` origin.

Fix: define one configurable public web origin and use it for every public title link. Keep native deep links separate from links intended for recipients without the app. Verify the recipient's signed-out/login-and-return path.

### 3. P2 — Text sharing has no unsupported-browser fallback or visible recovery

Evidence: `apps/mobile/app/trivia/index.tsx:143`; `apps/mobile/app/calendar/index.tsx:267`; `apps/mobile/src/components/netflix-quick-preview-modal.tsx:94`; `apps/mobile/app/media/[mediaId].tsx:244`.

Installed react-native-web Share rejects if navigator.share is unavailable and forwards AbortError when the browser share sheet is cancelled. Trivia, Year in Pixels and quick-preview invoke their async handlers with void and no catch. Media detail stores mutation errors without rendering them. Users get no usable result on unsupported browsers and no visible explanation for real failures. Inline Apple/Google calendar actions likewise discard their rejected promises; only the provider picker catches them.

Reproduction: executing the installed web Share implementation with navigator.share absent rejected with “Share is not supported in this browser”; a cancelled stub propagated AbortError.

Fix: use a shared text/link helper with explicit feature detection, cancellation handling and visible errors. Offer an explicit copy/download fallback without copying anything merely because the user cancelled.

### 4. P2 — Media-detail sharing can lose browser activation and sends a native URI as the web URL

Evidence: `apps/mobile/app/media/[mediaId].tsx:244`.

The share sheet is opened only after an authenticated API request completes. A delayed response can exhaust transient browser activation. The handler also puts `cinewrapped://media/...` in the url field sent through react-native-web. Web Share validates shareable URL schemes; a custom CineWrapped scheme is not guaranteed to be accepted. This is a portability failure in addition to the placeholder HTTPS URL in the message.

Fix: prepare a canonical HTTPS payload before the user clicks and call browser sharing directly from that click. Public title sharing should not require a network round trip just to construct a URL.

Primary documentation: https://www.w3.org/TR/web-share/#share-method and https://www.w3.org/TR/web-share/#validate-share-data.

### 5. P2 — Apple/ICS export fails on web and leaves files that break repeat native exports

Evidence: `apps/mobile/src/lib/calendar-integration.ts:24`.

The helper unconditionally constructs expo-file-system File and calls create/write before detecting sharing support. The installed web file-system implementation lacks the native file methods; the fallback is reached too late. On native it uses a deterministic filename with default create options and never deletes the file. Re-exporting an event can therefore fail with an existing-file error, and calendar notes remain in cache after success or failure. Truncating the event ID also makes filenames vulnerable to collisions.

Reproduction using the actual helper with explicit filesystem ports: one file remained after a successful share; a second export of the same event failed with “File already exists”; the web port failed before reaching a share/download fallback.

Fix: use a browser Blob download branch; use unique native temporary files and finally cleanup; route inline actions through visible error handling. Opening a provider picker should not imply that an event was already synchronized.

### 6. P2 — Year in Pixels shares text rather than the visual heatmap

Evidence: `apps/mobile/app/calendar/index.tsx:271`.

The button sends only a text message containing total viewings, streak, peak night and persona. No pixel-grid image or PNG is created. This remains a feature gap for a control named Share Year in Pixels.

Fix: export the actual year grid with its year and legend, or relabel the action as sharing a year summary. The existing PNG card path can provide file-sharing behavior, but the heatmap still needs its own renderer.

### 7. P2 — Story export ignores the theme selected in the viewer

Evidence: `apps/mobile/src/components/story-presentation/story-viewer.tsx:37`, `:43`, and `:231`; `apps/mobile/src/components/story-presentation/story-export-modal.tsx:62`.

The viewer displays activeSlide with currentTheme. Export receives the original presentation and slide index, then chooses its card theme from the original slide.theme. Cycling the viewer palette has no effect on export. The exported card does match the export-modal preview, but it does not reflect the user's theme choice in the story viewer.

Fix: pass the effective selected slide/theme to export explicitly. Document any deliberate conversion from story presets to the four card palettes.

### 8. P2 — ICS notes and explicit empty reminders are transformed incorrectly

Evidence: `apps/mobile/src/lib/calendar-integration-core.ts:87` and `:94`.

Notes are joined with literal backslash-n sequences and then escaped again. The ICS DESCRIPTION contains doubled backslashes, so imported content can display literal newline escapes instead of paragraph breaks. Also, an explicit empty reminder list is replaced with a 30-minute alarm rather than preserving no reminders.

Reproduction with the actual serializer confirmed doubled escaped DESCRIPTION separators and TRIGGER:-PT30M for reminderMinutes: [].

Fix: join notes with real newline characters and escape once; distinguish omitted reminder configuration from an explicitly empty list. Add behavior tests for imported text and empty alarms.

### 9. P3 — Statistic-free story slides display an unrelated Unrated label

Evidence: `apps/mobile/src/lib/share-card-model.ts:124`; `apps/mobile/src/components/story-presentation/story-export-modal.tsx:107`.

The new generic card renderer always falls back to ratingLabel when a metric is absent. Story cards do not supply a rating, so introductory or narrative slides display Unrated even though they are not film reviews. This was introduced with the recent shared renderer.

Fix: distinguish a review's missing rating from a story card with no rating section; omit the section for the latter.

## Related API issue outside the current button path

`apps/api/src/insights/insights.service.ts:498` still returns a placeholder wrap URL and an expiresAt timestamp without creating a public share token or expiry enforcement. No current UI caller of this endpoint was found. The existing wrap route is owner-scoped. Do not connect this endpoint as a public or expiring share-link feature without defining and implementing its access contract.

## Evidence and limits

- Searched every app route and component for share controls, React Native Share, browser sharing, clipboard actions, and file exports; traced the handlers and API receipts.
- Ran **39 existing focused tests**, all passing: PNG sharing/native cleanup, calendar serialization, social service and insights service. Passing tests do not cover all defects identified above.
- Used isolated source-execution harnesses for installed web Share behavior and the calendar helper/serializer; no production account records or privacy settings were changed.
- Checked the quick-preview domain from outside the filesystem sandbox; DNS resolution failed at audit time. This is an observation from this environment, not a claim about permanent DNS state.
- No authenticated end-to-end run or physical iOS/Android share-sheet interaction was performed. Those checks remain necessary after fixes, including recipient navigation after login, mobile destinations and imported calendar content.
