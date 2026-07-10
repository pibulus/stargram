# Stargram Glossary

## Live User Flow

- `routes/index.tsx` - App shell for the home page. Mounts background,
  welcome/about modals, and `HomeIsland`.
- `islands/HomeIsland.tsx` - Centers the main interactive surface.
- `islands/ZodiacPicker.tsx` - Primary live island. Handles sign selection,
  cosmic context loading, horoscope fetches, ASCII rendering, period switches,
  and mobile terminal layout.
- `components/TypedWriter.tsx` - `typed.js` wrapper with keyboard sounds and
  optional layout reservation for typed content.

## API Routes

- `GET /api/horoscope?sign=aries&period=daily` - Validates sign/period, uses the
  bundled oracle for daily readings, and falls back to `freehoroscopeapi.com`.
- `GET /api/cosmic-context?sign=aries&period=daily` - Builds the "Signal Room"
  packet from moon phase, Discordian date, NOAA space weather, NASA/JPL close
  approach data, and a crypto-random d23 roll.

## Important Utilities

- `utils/zodiac.ts` - Zodiac metadata and saved-sign localStorage helpers.
- `utils/asciiArtGenerator.ts` - Figlet font loading and horoscope ASCII
  formatter.
- `utils/colorEffects.ts` - Converts header/body ASCII sections into escaped
  HTML spans with color effects and responsive header sizing.
- `utils/sounds.ts` - Web Audio sound engine.
- `utils/simple-typewriter.js` - Mechanical keyboard sample playback for typed
  text.
- `utils/analytics.ts` - Optional PostHog wrapper. No analytics are sent unless
  `POSTHOG_KEY` is configured.

## Modals and Support

- `islands/WelcomeChecker.tsx` - Opens the welcome modal on first visit.
- `islands/WelcomeModal.tsx` - First-run terminal intro.
- `islands/AboutModal.tsx` - About/info modal, opened by the `[about]` button in
  the terminal title bar.
- `islands/KofiModal.tsx` - In-app Ko-fi iframe modal, opened by the SUPPORT
  CREATOR button under a reading.
- `islands/InstallPrompt.tsx` - PWA install prompt. Waits for the
  `stargram:reading-complete` event (fired when a reading finishes typing) plus
  a short settle, with a 90s fallback for visitors who never pull one.
- `routes/thanks.tsx` - Supporter thank-you route.

## Assets and PWA

- `static/manifest.json` - PWA manifest and shortcuts.
- `static/sw.js` - Service worker. Network-first for HTML navigations (so
  deploys land immediately), network-only for `/api/*` and cross-origin,
  cache-first for same-origin static assets, disabled on localhost.
- `static/icons/` - PWA icons.
- `static/og-image.jpg` - 1200x630 Open Graph/Twitter image.
- `static/robots.txt` and `static/sitemap.xml` - Search crawler metadata for
  `stargram.app`.

## Analytics Event Names

Captured by `utils/analytics.ts` from `ZodiacPicker` (no-op unless a `phc_...`
`POSTHOG_KEY` is configured):

- `sign_selected`
- `horoscope_viewed`
- `error_occurred`

## Core Concepts

- **Fresh Islands** - Server-rendered routes with selective client hydration.
- **Cosmic Context** - The non-horoscope "signal room" packet shown before the
  reading: moon, calendar, space weather, JPL visitor, d23 roll, glitch level,
  charm.
- **Oracle Script** - `scripts/horoscope.sh`, used for daily readings before
  falling back to the external API.
- **Typed ASCII Header** - The sign/date header generated with Figlet and typed
  into a reserved box so mobile layout does not grow sideways.
- **Typing Choreography** - The terminal snaps to the top when a reading
  appears, the header types first in full view, then the body types while the
  scroll follows the caret — standing down if the reader scrolls away.
- **PWA Shell** - Home page, manifest, icons, styles, and core assets cached by
  the service worker.
