# Stargram Quick Reference

For when you have not touched this app in a while and need the map fast.

## Run It

```bash
# Dev server
deno task dev
# Opens: http://localhost:8002

# Full local check
deno task check

# Production build
deno task build
```

Use a different port when `8002` is busy:

```bash
PORT=8012 deno run -A --watch=static/,routes/ dev.ts
```

## Current Shape

```text
stargram/
├── routes/
│   ├── index.tsx             # Home page wrapper and background
│   ├── _app.tsx              # SEO, PWA tags, analytics env, SW registration
│   ├── thanks.tsx            # Supporter thank-you page
│   └── api/
│       ├── horoscope.ts      # Horoscope oracle + upstream fallback
│       └── cosmic-context.ts # Moon, Discordian date, NOAA, JPL, dice context
├── islands/
│   ├── ZodiacPicker.tsx      # Main picker + horoscope terminal flow
│   ├── BackgroundCanvas.tsx  # Starfield/background animation
│   ├── WelcomeModal.tsx      # First-visit intro
│   ├── InstallPrompt.tsx     # PWA install prompt
│   ├── KofiModal.tsx         # Support modal
│   └── AboutModal.tsx        # About/info modal
├── components/
│   ├── TypedWriter.tsx       # typed.js wrapper + keyboard sounds
│   └── StructuredData.tsx    # JSON-LD schema
├── utils/
│   ├── zodiac.ts             # Sign metadata + localStorage helpers
│   ├── asciiArtGenerator.ts  # Figlet header/body formatter
│   ├── colorEffects.ts       # HTML colorization for ASCII sections
│   ├── sounds.ts             # Web Audio sound engine
│   └── analytics.ts          # Optional PostHog wrapper
└── static/
    ├── manifest.json         # PWA manifest
    ├── sw.js                 # Service worker
    ├── og-image.jpg          # 1200x630 social card
    └── icons/                # PWA icons
```

The legacy/alternate surfaces (`HoroscopeDisplay`, `TerminalDisplay`,
`ThemeIsland`, and related theme/dropdown components) were pruned in the Jul
2026 v1.0 cleanup. The live home route goes through `ZodiacPicker`.

## Main Flow

1. `routes/index.tsx` renders the app shell, background canvas, welcome/about
   modals, and `HomeIsland`.
2. `HomeIsland` mounts `ZodiacPicker`.
3. `ZodiacPicker` shows the sign grid. Clicking a sign:
   - saves the sign in localStorage,
   - fetches `/api/cosmic-context`,
   - fetches `/api/horoscope`,
   - generates ASCII with `generateHoroscopeAscii`,
   - colorizes it with `applyColorToArt`,
   - types the header/body with `TypedWriter`.
4. Daily readings prefer `scripts/horoscope.sh`. Weekly/monthly readings use
   `freehoroscopeapi.com`.

## Common Tweaks

### Change Homepage Copy

- Welcome modal: `islands/WelcomeModal.tsx`
- About modal: `islands/AboutModal.tsx`
- SEO/social copy: `routes/_app.tsx`
- Launch hints: `.launch-hints.yaml`

### Adjust Mobile Horoscope Layout

- Main terminal layout: `islands/ZodiacPicker.tsx`
- Header/body typing behavior: `components/TypedWriter.tsx`
- ASCII title scale/color: `utils/colorEffects.ts`
- Figlet generation width/font: `utils/asciiArtGenerator.ts`

### Add or Change Zodiac Data

- Edit `utils/zodiac.ts`
- Keep `routes/api/horoscope.ts` validation in sync if sign names change.

### Update PWA Assets

- Manifest: `static/manifest.json`
- Service worker cache list/version: `static/sw.js`
- Icons: `static/icons/`
- Social card: `static/og-image.jpg` (1200x630)
- Search metadata: `static/robots.txt`, `static/sitemap.xml`

## Deployment

```bash
deno task check
deno task build
git push origin main
```

If Deno Deploy is not connected to GitHub auto-deploy:

```bash
deno task build && DENO_DEPLOY_TOKEN="$DENO_DEPLOY_TOKEN_NEW" deno deploy --prod --non-interactive  # verified 2026-08-09; deployctl/classic died 2026-07-20
```

Optional environment variables:

```bash
POSTHOG_KEY=...
POSTHOG_HOST=https://us.i.posthog.com
HOROSCOPE_SCRIPT_PATH=/absolute/path/to/scripts/horoscope.sh
```

## When Things Break

### Port Busy

```bash
lsof -nP -iTCP:8002 -sTCP:LISTEN
PORT=8012 deno run -A --watch=static/,routes/ dev.ts
```

### PWA Cache Looks Stale

1. Bump `CACHE_NAME` in `static/sw.js`.
2. Run `deno task build`.
3. In browser devtools: Application -> Clear storage.

### Horoscope API Fails

1. Test the local oracle:
   ```bash
   bash scripts/horoscope.sh --json --day today aries
   ```
2. Smoke-test the Fresh handler:
   ```bash
   deno eval 'import { handler } from "./routes/api/horoscope.ts"; const r = await handler(new Request("http://local/api/horoscope?sign=aries&period=daily&day=today"), {}); console.log(r.status, await r.text());'
   ```

### Mobile Layout Regresses

Use the longest sign first:

```bash
PORT=8012 deno run -A --watch=static/,routes/ dev.ts
# In browser/devtools or Playwright: 375px wide, select Sagittarius
```

Check for:

- no horizontal page scroll,
- readable title bar,
- 44px+ button height,
- body text not clipped,
- ASCII header staying inside the terminal frame.

## Known Housekeeping Notes

- The main user-facing domain in docs and metadata is `https://stargram.app`.

Last updated: 2026-07-10 (legacy surfaces and theme system pruned in the v1.0
cleanup; recover from git history if ever needed).
