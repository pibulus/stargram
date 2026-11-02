# Stargram

Your horoscope as shareable cosmic art.

Stargram is a little mystical terminal: simple, fast, a bit haunted, a bit
funny, and grounded in real cosmic signals where possible.

Pick your sign. Get daily, weekly, or monthly readings. Watch the Signal Room
load live context. Share the vibe.

## Features

- 12 zodiac signs with dates, elements, bios, and dossier details.
- Daily, weekly, and monthly readings, sourced in this order: Ohmanda (real
  astrologers reading actual transits; the API is dead, and every response came
  back empty, so it currently never wins), then `freehoroscopeapi.com`, then the
  local Oracle voice writing from the computed sky, then a deterministic
  composer as the floor. The chain lives in `utils/oracle/sources.ts` and every
  response names which source answered.
- Live cosmic context from moon phase, Discordian calendar, NOAA SWPC, NASA/JPL
  close-approach data, and a crypto-random d23 roll.
- Terminal-style ASCII horoscope display with typed header/body choreography:
  the title types first in full view, then the body follows with caret-aware
  scrolling.
- Trinity color treatment (purple/green/orange sweep with warm gold headers).
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
- Analytics: PostHog, optional
- Deployment: Deno Deploy / GitHub auto-deploy

## Project Map

The tree, the folder rules, and the traps live in one place now:
[`docs/INDEX.md`](docs/INDEX.md).

The short version: `routes/` is the HTTP surface, `islands/` is the interactive
Preact, `utils/oracle/` is the reading brain, `data/oracle/` is the draw tables,
`static/` is PWA shell and art, `docs/` is documentation.

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

API routes stay network-only so readings and the live sky packet are never
served stale, and HTML navigations are network-first so deploys land immediately
for returning visitors.

## Analytics

Analytics are disabled unless `POSTHOG_KEY` is present. Event names:

- `sign_selected`
- `horoscope_viewed`
- `error_occurred`

## Deployment

```bash
deno task check
deno task build
git push origin main
```

Manual deploy fallback:

```bash
deno task build && DENO_DEPLOY_TOKEN="$DENO_DEPLOY_TOKEN_NEW" deno deploy --prod --non-interactive  # verified 2026-08-09; deployctl/classic died 2026-07-20
```

Canonical URL: `https://stargram.app`

Prove what is live:

```bash
curl -s https://stargram.app/version.json
```

`deploymentId` changes on every deploy. `commit` reads `unknown` on this lane,
because Deno Deploy runs `main.ts` and never executes a build step — that is
honest, not broken.

## Docs

- [`docs/INDEX.md`](docs/INDEX.md) - where everything lives, plus the traps.
- [`docs/TINKER.md`](docs/TINKER.md) - cold-start quick reference.
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) - deploy and post-deploy checklist.
- [`docs/GLOSSARY.md`](docs/GLOSSARY.md) - modules, APIs, and concepts.
- [`docs/ORACLE_AUDIT.md`](docs/ORACLE_AUDIT.md) - how the readings were
  measured.
- [`CLAUDE.md`](CLAUDE.md) - agent orientation for this repo.

## Built by Pablo

Part of the SoftStack suite of pastel-punk tools.

- Portfolio: https://pibul.us
- GitHub: https://github.com/pibulus

## License

MIT.
