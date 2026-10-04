# Share cards

Review cards and slide summaries use the same SVG model for the preview and the exported 1080 × 1920 PNG. No new dependency or paid service is required.

## Privacy and content

Public review listings expose an author's rating only to the owner, to everyone when ratings are PUBLIC, or to an accepted friend when ratings are FRIENDS. Missing privacy settings fail closed. Blocks in either direction exclude the author's reviews. Hidden ratings return null value and scale; review visibility does not override rating privacy.

The original five- or ten-point rating scale is preserved, including fractional values. Missing or invalid ratings display Unrated. Spoiler reviews require explicit confirmation before their card is prepared, and the card includes a SPOILERS label. Confirmation applies to the exact review content.

Only public TMDB raster posters are embedded, without credentials. A failed, unsupported or oversized poster uses a visible placeholder. Long text is shortened in both preview and export. Slide exports produce a card summary of the selected slide, including rankings and metrics, rather than a screenshot of the animated presentation.

## Sharing and recovery

Web prepares a PNG before enabling Share, preserving browser user activation. Supported browsers share a File through the operating system; other browsers download the PNG. Download PNG is always available on web. Cancellation does not copy text or download a file. Actual rendering or sharing failures appear in the modal, and preparation failures can be retried.

Native uses react-native-svg to render PNG bytes, writes a temporary cache file and opens expo-sharing. Temporary files are removed after the share sheet completes or fails. Saving to photos/files depends on the device's share-sheet destinations. Presentation JSON export also downloads or shares an actual file.

No review body, graphic or caption is copied to the clipboard or uploaded to an image service. Graphics stay in memory until exported; the PWA worker does not cache them.

## Validation

Regression tests cover rating formatting, text escaping, fractional stars, multilingual truncation, color contrast, portable base64 bytes, web share cancellation/failure/download, poster origin restrictions, native file creation and cleanup, and real PostgreSQL privacy relationships. Browser verification checks actual canvas PNG dimensions and a 320-pixel viewport. Native bundle exports verify compilation; a physical iOS/Android share-sheet check is still required to confirm device destinations and rendering.

## App-wide sharing fixes (4 October 2026)

Publishing a review never enables account-wide Social sharing. A separate button opens Privacy settings, where past/future sharing effects and the audience are explicit. Canonical recipient links default to https://cinewrapped.vercel.app; PUBLIC_WEB_ORIGIN (API) and EXPO_PUBLIC_WEB_ORIGIN (mobile/web build) can override the origin. Public media/trivia destinations are retained through sign-in, with an allowlist preventing redirects to external or private routes. Browser persistence uses per-tab session storage containing only the public route, with an in-memory fallback on native.

Text sharing invokes the browser from the original click without fetching a receipt. Unsupported browsers offer a confirmed text-file download. Cancellation never triggers a clipboard write or fallback. Actual failures appear in the existing dialog system. Native uses the same HTTPS recipient link in the message.

Year in Pixels exports a 1080 × 1920 PNG containing all 12 month grids, leap days when applicable, daily activity intensities, a legend, the selected heatmap palette and author. The image is previewed before sharing. Story PNGs preserve the viewer-selected background/accent; presentation JSON preserves that selected theme across slides. Narrative slides omit the rating section.

Calendar ICS exports use a real browser download or a unique native temporary file with cleanup. Paragraphs are escaped once and an empty reminder list means no alarms. Inline export failures are visible. Opening Google Calendar creates a template the user still needs to save. Both calendar export implementations use canonical branding links.

The unused expiring-wrap-link API returns PUBLIC_WRAP_LINKS_UNAVAILABLE (501) for an owner’s ready wrap, rather than returning a placeholder URL or unenforced expiry. An invalid slide is rejected and non-owners remain denied. PNG and JSON exports continue to work; no public wrap access or paid resource was introduced.

## Designer cards (October 4, 2026)

The review card composer now offers Classic, Cinema ticket, Festival poster, and Minimal cover templates. Story (1080×1920), square (1080×1080), feed portrait (1080×1350), and landscape (1920×1080) formats use the same dimensions for SVG preview, browser PNG conversion, and native capture. Heatmap SVG overrides retain their existing portrait dimensions.

Users can select up to four film posters in display order through the existing authenticated search API. Selections affect only the exported card, not profile favorites or account privacy. Only public TMDB raster images are embedded, without credentials; failed images use visible placeholders. Loading is bounded by the existing timeout and image size limits. Spoiler consent continues to gate rendering and the spoiler warning remains in every format.

Personal branding supports author initials, an optional signature, hex background/accent colors, and a watermark toggle. The author remains credited. Color values are validated and text is XML-escaped; only raster data URLs can enter the renderer. Long titles, signatures, and reviews are shortened as shown in the preview. These are still PNG cards, with no new dependencies, schema changes, paid services, subscriptions, or storage costs.

Verification: 104 mobile tests passed, including every template/format combination, spoiler and rating integrity, ordered collage limits, branding escaping, and unsafe image/color rejection. Browser canvas conversion produced 16 valid PNGs at their advertised dimensions, with visual inspection of text bounds and placeholder layouts. Mobile typechecking and changed-file lint passed; Expo web/iOS/Android exports passed. Full authenticated composer interactions and physical-device native share sheets still need manual verification.
