# CineWrapped Design System

**Name:** Cinema Ledger  
**Status:** Task 4 foundation  
**Token version:** 0.1.0  
**Machine-readable tokens:** [`design-tokens.json`](./design-tokens.json)

## 1. Visual direction

Cinema Ledger combines the quiet structure of an editorial journal with the atmosphere of a dark screening room. Poster art supplies variation; the interface itself uses warm neutral surfaces, restrained amber emphasis, and a violet secondary accent.

The system must feel:

- Cinematic without imitating a theater marquee or streaming service.
- Premium through typography, spacing, and image treatment rather than ornament.
- Personal enough for journals and wraps, but calm enough for daily logging.
- Equally complete in dark and light themes.
- Configurable so the product name, logo, icon, palette, typefaces, and motion personality can change without rewriting feature components.

Avoid:

- Unreadable text directly over posters.
- Permanent neon glows, heavy glassmorphism, or excessive gradients.
- Red as the primary brand color or rating color.
- Tiny metadata, dense rails, and icon-only controls without labels.
- Motion that competes with content or blocks quick logging.

## 2. Token architecture

Tokens have three layers:

1. **Primitive:** raw palette, scale, type, and geometry values.
2. **Semantic:** theme-aware meanings such as `background`, `textPrimary`, `brand`, and `danger`.
3. **Component:** aliases such as button background or card border, created in the UI package during Task 5.

Feature code may use semantic or component tokens only. It must not import raw color hex values. Theme resolution occurs at the app root and supports `system`, `light`, and `dark` preferences.

Brand configuration owns:

- Product name and wordmark
- App icon and launch artwork
- Brand and accent semantic token mappings
- Display and body typeface mappings
- Default poster and avatar fallbacks
- Wrap visual themes

## 3. Color system

### 3.1 Dark theme

| Role            |     Value | Use                                      |
| --------------- | --------: | ---------------------------------------- |
| Background      | `#090A0F` | App canvas and immersive story backdrop  |
| Surface         | `#12141C` | Cards, fields, navigation                |
| Raised surface  | `#1A1D28` | Sheets, elevated cards                   |
| Overlay surface | `#242735` | Menus and nested overlays                |
| Primary text    | `#F7F5F0` | Titles and body                          |
| Secondary text  | `#A9ACB8` | Supporting metadata                      |
| Brand           | `#FFC65C` | Primary action and active emphasis       |
| Accent          | `#8C7CFF` | Secondary insights and selection support |
| Success         | `#4FD1A5` | Confirmed/synced states                  |
| Warning         | `#F6C85F` | Attention/offline pending states         |
| Danger          | `#FF7A88` | Destructive/error states                 |

### 3.2 Light theme

| Role           |     Value | Use                                      |
| -------------- | --------: | ---------------------------------------- |
| Background     | `#F7F5F0` | Warm app canvas                          |
| Surface        | `#FFFFFF` | Cards, fields, navigation                |
| Raised surface | `#EFECE5` | Secondary grouping                       |
| Primary text   | `#171820` | Titles and body                          |
| Secondary text | `#5E6170` | Supporting metadata                      |
| Brand          | `#8A4E00` | Primary action and active emphasis       |
| Accent         | `#5142C2` | Secondary insights and selection support |
| Success        | `#087A5B` | Confirmed/synced states                  |
| Warning        | `#73510A` | Attention/offline pending states         |
| Danger         | `#B4233A` | Destructive/error states                 |

Semantic colors change by theme so both modes meet contrast requirements. The primitive amber is not used as small text on the light canvas; the darker brand semantic is used instead.

### 3.3 Color usage rules

- Brand color identifies the principal action, active tab detail, focus emphasis, and selected high-value choices.
- Accent color supports recommendation reasons, wrap highlights, and secondary selection—not competing primary actions.
- Success is reserved for completed/synced/unlocked states, not decoration.
- Warning indicates pending, offline, stale, or attention-needed states.
- Danger is reserved for errors and destructive intent.
- Status always combines color with icon, text, position, or shape.
- Poster-derived colors may decorate a media hero or wrap slide but cannot replace semantic text/control colors without runtime contrast validation.

### 3.4 Verified contrast pairs

| Pair                                    | Contrast ratio |
| --------------------------------------- | -------------: |
| Dark primary text / dark background     |        18.15:1 |
| Dark secondary text / dark background   |         8.74:1 |
| Dark on-brand / dark brand              |        11.43:1 |
| Light primary text / light background   |        16.22:1 |
| Light secondary text / light background |         5.64:1 |
| Light brand / light background          |         6.08:1 |
| Light on-brand / light brand            |         6.62:1 |
| Light danger / light background         |         5.94:1 |

Runtime poster/backdrop combinations are not presumed safe. They use a near-opaque scrim or place text outside the image.

## 4. Typography

### 4.1 Families

- **Display:** Plus Jakarta Sans, weights 600 and 700.
- **Body:** Inter, weights 400, 500, 600, and 700.
- **Fallback:** platform system sans serif until fonts load or when custom fonts are unavailable.

Font licenses and exact packages are verified before Task 5 dependency installation. The launch screen does not wait indefinitely for a font download; bundled fonts or system fallback prevent invisible text.

### 4.2 Type scale

| Style       | Size / line | Weight | Typical use                              |
| ----------- | ----------: | -----: | ---------------------------------------- |
| Hero        |     48 / 56 |    700 | Wrap statement, rare onboarding emphasis |
| Display     |     40 / 48 |    700 | Major statistics and wrap values         |
| Headline    |     32 / 38 |    700 | Screen titles and media hero title       |
| Title       |     24 / 31 |    600 | Section/page title                       |
| Title small |     20 / 26 |    600 | Card group and modal title               |
| Body large  |     18 / 28 |    400 | Lead explanation                         |
| Body        |     16 / 24 |    400 | Primary reading and inputs               |
| Body small  |     14 / 20 |    400 | Metadata and compact cards               |
| Label small |     13 / 18 |    600 | Chips, badges, field support             |
| Caption     |     12 / 16 |    500 | Non-essential compact metadata only      |

Dynamic type may replace these exact values with scaled equivalents. Components expand vertically; text is not clipped to preserve a fixed card height.

### 4.3 Typography rules

- Titles use sentence case, not all caps.
- Eyebrows may use uppercase only for short labels and include expanded letter spacing.
- Body copy uses the body family; display type is not used for long reading.
- Numbers in statistics use tabular figures where supported.
- Rating values include their scale in accessible labels.
- Limit font weights to two adjacent emphasis levels in a single compact component.

## 5. Spacing and layout

The system uses a 4-point base grid. Standard page horizontal padding is 16 points on compact phones, 20 on wide phones, and 24–32 on tablets.

Common rhythms:

| Relationship                 |                                   Space |
| ---------------------------- | --------------------------------------: |
| Icon to label                |                                       8 |
| Label to field               |                                       8 |
| Elements within compact card |                                    8–12 |
| Card internal padding        |                                      16 |
| Section heading to content   |                                   12–16 |
| Between cards                |                                   12–16 |
| Between major sections       |                                      32 |
| Screen top content inset     |                    16–24 plus safe area |
| Bottom content clearance     | Tab/action height plus safe area and 16 |

Reading/form content caps at 720 points. Discovery grids cap at 1,200 points. Tablet screens center content instead of stretching body text.

## 6. Shape, border, elevation, and imagery

### 6.1 Radius

- Small 6: badges, compact controls.
- Medium 10: fields, buttons, chips.
- Large 16: cards, sheets, dialogs.
- Extra-large 24: immersive hero and wrap containers.
- Pill 999: chips, avatars, segmented selections.

Nested components use a radius smaller than their parent. Poster images may use medium radius; full-bleed hero imagery follows the screen edge instead.

### 6.2 Borders and elevation

- Default cards use a one-point semantic border and little or no shadow.
- Raised sheets and menus use medium elevation plus a border in dark mode.
- Focus rings use three points and remain visible against the current surface.
- Do not stack shadows on nested cards.
- Android elevation and iOS shadow tokens describe equivalent hierarchy, not pixel-identical rendering.

### 6.3 Poster and backdrop imagery

- Poster ratio is 2:3; backdrop ratio is 16:9.
- Reserve layout before load to avoid shift.
- Use provider-approved transformations and attribution.
- Fallback poster uses a restrained gradient, media-type icon, and title outside the image.
- `contentFit="cover"` is the default for posters; faces/important crops require provider focal data before customization.
- Loading, error, and adult-content covers are distinct states.

## 7. Motion

### 7.1 Durations

| Token       | Duration | Use                                |
| ----------- | -------: | ---------------------------------- |
| Instant     |     0 ms | Reduced motion and immediate state |
| Fast        |   120 ms | Press, selection, icon state       |
| Standard    |   220 ms | Sheet/card transition              |
| Slow        |   360 ms | Screen continuity and large reveal |
| Celebration |   700 ms | Single wrap/achievement emphasis   |

### 7.2 Motion rules

- Routine actions finish within the standard duration.
- Spring motion uses the responsive token for direct manipulation and gentle token for sheets.
- Only one celebratory element animates at a time.
- Route transitions communicate hierarchy: horizontal for peer push, vertical for modal creation, fade for state replacement.
- Motion never delays form submission or content availability.
- Reduced motion sets duration to zero and removes parallax, shimmer, auto-advance, count-up, and overshoot.

## 8. Iconography

Use one rounded, medium-stroke icon family throughout the mobile app. Icons render at 16, 20, 24, or 32 points and inherit semantic color.

Rules:

- Navigation icons include text labels.
- Icon-only controls require an accessible label and at least 44/48-point target.
- Filled and outline variants may indicate selected state only when state is also exposed semantically.
- Custom icons are limited to product-specific concepts such as Movie DNA, wrap, and the Add or Log aperture.
- Platform logos and streaming provider marks use approved assets, never approximated glyphs.

## 9. Core component inventory

### 9.1 Foundations

| Component              | Variants/states                     | Contract                                             |
| ---------------------- | ----------------------------------- | ---------------------------------------------------- |
| `Screen`               | standard, immersive, keyboard-aware | Safe areas, theme canvas, max width, scroll behavior |
| `Stack`, `Row`, `Grid` | token spacing/alignment             | Layout primitives only; no feature semantics         |
| `Text`                 | full type scale and semantic color  | Dynamic type and truncation policy                   |
| `Divider`              | subtle, strong                      | Decorative separator hidden from accessibility tree  |
| `Surface`              | base, raised, overlay               | Theme-aware background/border/elevation              |
| `PosterImage`          | poster, backdrop, avatar fallback   | Reserved ratio, loading/error/adult states           |

### 9.2 Actions and selection

| Component                     | Variants/states                                          | Contract                                                           |
| ----------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------ |
| `Button`                      | primary, secondary, tertiary, danger; small/medium/large | Loading retains label width; disabled is semantic and visual       |
| `IconButton`                  | standard, filled, danger                                 | Accessible label mandatory; visible pressed/focus state            |
| `FloatingLogButton`           | tab-bar center action                                    | Opens modal hub and restores prior focus                           |
| `Chip`                        | choice, filter, suggestion                               | Selected check/icon plus state; removable chip has separate target |
| `SegmentedControl`            | 2–4 options                                              | Text labels; roving/selected semantics                             |
| `Checkbox`, `Radio`, `Switch` | standard states                                          | Entire labeled row is interactive where appropriate                |
| `MenuItem`                    | standard, selected, destructive                          | Icon optional; destructive items visually separated                |

### 9.3 Inputs and forms

| Component       | Variants/states                     | Contract                                                  |
| --------------- | ----------------------------------- | --------------------------------------------------------- |
| `TextField`     | text, email, password, username     | Persistent label, support/error, clear/visibility actions |
| `SearchField`   | idle, focused, loading, populated   | Clear button, cancel action, accessible search role       |
| `TextArea`      | standard, review, notes             | Dynamic height with maximum; count near limit             |
| `SelectField`   | single, multi                       | Opens accessible sheet/screen; value is readable text     |
| `DateTimeField` | date, time, combined                | Locale display, canonical stored value                    |
| `RangeControl`  | runtime, mainstream balance         | Numeric labels and step buttons as alternatives to drag   |
| `FormField`     | default, invalid, disabled, success | Label/help/error relationship IDs and focus behavior      |
| `AvatarPicker`  | empty, selected, uploading, failed  | Crop/replace/remove; upload state and retry               |

### 9.4 Feedback and overlays

| Component            | Variants/states                      | Contract                                               |
| -------------------- | ------------------------------------ | ------------------------------------------------------ |
| `Toast`              | info, success, warning, error, undo  | Non-blocking; does not carry critical-only information |
| `InlineAlert`        | info, warning, error                 | Title, message, optional action; semantic announcement |
| `StatusBanner`       | offline, syncing, conflict, degraded | Compact and persistent until state resolves            |
| `Skeleton`           | text, poster, card, row              | Matches geometry; static under reduce motion           |
| `EmptyState`         | compact, screen                      | Concise message and one primary action                 |
| `ErrorState`         | section, screen, fatal               | Safe message, retry, optional reference ID             |
| `Modal`              | confirmation, form, immersive        | Focus trap/restore and back/escape policy              |
| `BottomSheet`        | selection, action, preview           | Accessible title; snap points do not hide actions      |
| `ConfirmationDialog` | standard, destructive                | Exact consequence; safe default focus                  |
| `ProgressIndicator`  | determinate, indeterminate, story    | Label/value and reduced-motion alternative             |

### 9.5 Media components

| Component              | Variants/states                           | Contract                                                 |
| ---------------------- | ----------------------------------------- | -------------------------------------------------------- |
| `PosterCard`           | standard, compact, selectable, progress   | Image, title/year, status/progress, overflow             |
| `MediaRow`             | standard, search, history                 | Poster thumbnail and adaptable metadata                  |
| `MediaHero`            | movie, show                               | Backdrop/poster, readable title/facts, primary actions   |
| `MediaRail`            | posters, people, activities               | Heading, optional explanation, See All, virtualized list |
| `CreditCard`           | cast, crew                                | Photo fallback, name, character/job                      |
| `StreamingProviderRow` | flatrate, rent, buy, free, ads            | Provider mark, monetization text, freshness/deep link    |
| `EpisodeRow`           | unwatched, progress, completed, rewatched | Season/episode label and explicit progress state         |
| `WatchStatusBadge`     | all six statuses                          | Text plus icon; color is supplemental                    |
| `ProgressTracker`      | title, episode, onboarding                | Label, numeric/context value, non-color completion       |
| `RatingControl`        | five-star, ten-point, like/dislike        | Exact spoken value; keyboard/step alternatives           |

### 9.6 Social components

| Component           | Variants/states                                   | Contract                                                 |
| ------------------- | ------------------------------------------------- | -------------------------------------------------------- |
| `Avatar`            | image, initials, deleted                          | Status is not color-only; no private status leakage      |
| `UserCard`          | discovery, friend, request                        | Identity, shared context, relationship action            |
| `ActivityCard`      | watched, rated, reviewed, list, achievement, wrap | Typed sentence, entity preview, timestamp, interactions  |
| `ReviewCard`        | summary, full, spoiler-covered, deleted           | Author/media context, visibility, reaction/comment state |
| `CommentRow`        | root, reply, deleted, spoiler-covered             | Thread connector, actions, readable indentation limit    |
| `ReactionBar`       | compact, expanded                                 | Counts, viewer selection, picker                         |
| `CompatibilityCard` | summary, detail                                   | Approximate label, sample size, shared/different factors |
| `VisibilityBadge`   | public, friends, private, club-only               | Icon and label; tappable only when it opens explanation  |

### 9.7 Insights and wraps

| Component         | Variants/states                                 | Contract                                                 |
| ----------------- | ----------------------------------------------- | -------------------------------------------------------- |
| `StatCard`        | value, comparison, progress                     | Period and unit always visible                           |
| `ChartCard`       | bar, line, donut, heatmap                       | Text summary and accessible data alternative             |
| `InsightList`     | genres, people, countries, languages            | Ranked values with counts/percent and sample size        |
| `AchievementCard` | locked, progress, unlocked                      | Criteria, progress, tier, date                           |
| `WrapCard`        | pending, generating, complete, failed           | Period/type/status and permitted actions                 |
| `StoryFrame`      | intro, stat, chart, media, personality, closing | Structured JSON input; safe areas and text length limits |
| `StoryProgress`   | motion, reduced motion                          | Pause/previous/next and explicit page count              |
| `SharePreview`    | story card, square card                         | Exact included data and privacy acknowledgment           |

## 10. Component behavior specifications

### 10.1 Button

- Minimum height: 44 points iOS and 48 dp Android; large is 52.
- Horizontal padding: 16 for medium, 20 for large.
- Primary uses brand/on-brand; only one primary button appears in a local action group.
- Secondary uses transparent or surface background with strong border.
- Tertiary uses text/icon without a persistent container but retains touch target.
- Danger uses danger fill for irreversible confirmation and danger text for lower-risk entry.
- Loading shows progress plus the original accessible label and prevents repeat submission.
- Disabled state uses both reduced contrast and disabled semantics; explanatory text appears nearby when the reason is not obvious.

### 10.2 Text field

- Default body-sized text and 48-point minimum height.
- Label never disappears; optional/required state is explicit.
- Error border alone is insufficient: display icon/message and connect it to the field semantics.
- Password reveal is a labeled icon button and does not change cursor position.
- Username availability uses neutral checking, success, and conflict states; no result is announced before debounce completes.

### 10.3 Poster card

- Minimum poster width is 136 points in grids.
- Use two visible text lines for title in discovery cards and one in dense rails; full title remains accessible.
- Year/media type distinguish remakes and movie/show collisions.
- Progress overlay has an accompanying numeric or status label outside/under the image.
- Selectable onboarding cards add a strong border and check badge without resizing.

### 10.4 Review card and spoiler cover

- Author and media context precede body.
- Spoiler cover occupies the body region and prevents hidden text from entering the accessibility tree.
- Visibility and publication status appear for the author but only applicable visibility appears to viewers.
- Reaction/comment actions use text labels at large text sizes.

### 10.5 Wrap story

- Base aspect is 9:16, with safe zones for platform sharing overlays.
- Each slide has one dominant statement and at most two supporting facts.
- Text bounds are defined per slide type; content that exceeds bounds uses a different layout, not smaller inaccessible type.
- Automatic progress pauses on touch hold, screen-reader mode, app background, and reduced motion.
- Screen-reader mode presents each slide as a page with heading, narrative, previous, next, share, and close controls.

## 11. Charts and data visualization

- Default chart palette uses brand, accent, success, warning, and neutral values with at least 3:1 against adjacent regions where the graphic conveys meaning.
- Direct labels are preferred to legends for small category counts.
- Donut charts are limited to five visible categories plus Other.
- Time series use sensible intervals and never imply data between missing periods without explanation.
- Every chart supplies a concise natural-language summary and a navigable list/table alternative.
- Statistics show period, sample size, unit, and data freshness.
- Compatibility and Movie DNA do not use scientific/medical visual language.

## 12. Content design

Voice is warm, direct, and specific. Avoid judging taste or watch frequency.

Examples:

- Prefer “Nothing logged this month yet” over “You haven't watched enough.”
- Prefer “Because you rated three psychological thrillers highly” over “AI picked this for you.”
- Prefer “Your entertainment similarity is 78% based on 24 shared titles” over “You are a 78% match.”
- Prefer “Waiting to sync” over “Saved” for offline-only operations.
- Prefer action errors with recovery: “We couldn't publish this review. Your draft is safe—try again.”

Wrapped language may be celebratory but must remain supported by the period data and avoid sensitive inferences.

## 13. Implementation and quality gates

Task 5 will transform tokens into a typed `packages/ui-tokens` module and build primitive component shells. Required gates:

- JSON token schema validation and generated TypeScript types.
- No raw feature-level hex colors, spacing numbers, or ad hoc font scales.
- Light/dark visual regression stories for each primitive state.
- Automated contrast tests for semantic text/control pairs.
- Accessibility label/role/state tests for interactive primitives.
- Dynamic-type snapshots at default, large, and accessibility sizes.
- Reduced-motion tests for animated components.
- iOS and Android touch-target checks.
- Poster error/loading and right-to-left layout checks where applicable.

## 14. Task 4 design-system checklist

- [x] Configurable cinematic visual direction
- [x] Dark and light semantic palettes
- [x] Typography, spacing, radius, shadow, motion, z-index, breakpoint, and icon tokens
- [x] Core component inventory
- [x] Component states and behavioral contracts
- [x] Chart, image, content, and wrap-story guidance
- [x] Accessibility and implementation quality gates
- [x] Machine-readable token artifact
