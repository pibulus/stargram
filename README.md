# Stargram

Your horoscope as shareable cosmic art.

Stargram is a little mystical terminal: simple, fast, a bit haunted, a bit
funny, and grounded in real cosmic signals where possible.

Pick your sign. Get daily, weekly, or monthly readings. Watch the Signal Room
load live context. Share the vibe.

## Features

- 12 zodiac signs with dates, elements, bios, and dossier details.
- Daily, weekly, and monthly readings.
- Daily readings from the bundled `scripts/horoscope.sh` oracle, with
  `freehoroscopeapi.com` as fallback.
- Weekly/monthly readings from `freehoroscopeapi.com`.
- Live cosmic context from moon phase, Discordian calendar, NOAA SWPC, NASA/JPL
  close-approach data, and a crypto-random d23 roll.
- Terminal-style ASCII horoscope display with typed header/body.
- 12 color effects and 12 reusable themes.
- PWA manifest, install prompt, service worker, app shortcuts, and icons.
- Optional PostHog analytics.
- SEO metadata, Open Graph/Twitter cards, JSON-LD, sitemap, and robots file.

## Quick Start

```bash
brew install deno
deno task dev      # http://localhost:8002
deno task check
deno task build
```

Use a temporary port if `8002` is busy:

```bash
PORT=8012 deno run -A --watch=static/,routes/ dev.ts
```

## Tech Stack

- Runtime: Deno 2+
- Framework: Fresh 1.7, Preact, islands
- Styling: Tailwind CSS plus app CSS
- Typewriter: `typed.js`
- Export/share helpers: `html-to-image`
- Analytics: PostHog, optional
- Deployment: Deno Deploy / GitHub auto-deploy

## Project Map

```text
stargram/
├── routes/
│   ├── index.tsx             # Home app shell
│   ├── _app.tsx              # SEO, PWA, analytics env, SW registration
│   ├── thanks.tsx            # Supporter thank-you page
│   └── api/
│       ├── horoscope.ts      # Horoscope oracle + upstream fallback
│       └── cosmic-context.ts # Moon/calendar/NOAA/JPL/dice context
├── islands/
│   ├── ZodiacPicker.tsx      # Main live app flow
│   ├── HomeIsland.tsx        # Main page layout wrapper
│   ├── BackgroundCanvas.tsx  # Animated starfield
│   ├── WelcomeModal.tsx      # First-visit modal
│   ├── InstallPrompt.tsx     # PWA install prompt
│   ├── KofiModal.tsx         # Support modal
│   └── AboutModal.tsx        # About modal
├── components/
│   ├── TypedWriter.tsx       # typed.js wrapper + keyboard sounds
│   └── StructuredData.tsx    # JSON-LD schema
├── utils/
│   ├── zodiac.ts             # Zodiac data + localStorage
│   ├── asciiArtGenerator.ts  # Figlet formatter
│   ├── colorEffects.ts       # ASCII colorization and responsive sizing
│   ├── sounds.ts             # Web Audio sound engine
│   └── analytics.ts          # Optional PostHog wrapper
└── static/
    ├── manifest.json
    ├── sw.js
    ├── og-image.jpg
    ├── robots.txt
    ├── sitemap.xml
    └── icons/
```

## Main Flow

`routes/index.tsx` -> `islands/HomeIsland.tsx` -> `islands/ZodiacPicker.tsx`

When a user selects a sign:

1. The sign is saved locally.
2. `/api/cosmic-context` returns the Signal Room packet.
3. `/api/horoscope` returns the reading.
4. `generateHoroscopeAscii` creates the terminal output.
5. `applyColorToArt` returns escaped HTML spans for header/body sections.
6. `TypedWriter` types the reading into a reserved responsive box.

## PWA

The app shell caches:

- `/`
- `/styles.css`
- `/manifest.json`
- PWA icons
- favicon

API routes stay network-only so horoscope data is not cached accidentally.

## Analytics

Analytics are disabled unless `POSTHOG_KEY` is present. Event names:

- `horoscope_viewed`
- `sign_selected`
- `export_clicked`
- `theme_changed`
- `error_occurred`

## Deployment

```bash
deno task check
deno task build
git push origin main
```

Manual deploy fallback:

```bash
deployctl deploy --prod --token=$DENO_DEPLOY_TOKEN
```

Canonical URL: `https://stargram.app`

## Docs

- `CLAUDE.md` - agent orientation and current flow.
- `GLOSSARY.md` - glossary of modules, APIs, and concepts.
- `TINKER.md` - practical quick reference for local changes.
- `DEPLOYMENT_READY.md` - deploy and post-deploy checklist.

## Built by Pablo

Part of the SoftStack suite of pastel-punk tools.

- Portfolio: https://pibul.us
- GitHub: https://github.com/pibulus

## License

MIT.
