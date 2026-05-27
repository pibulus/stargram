# Stargram Deployment Checklist

Stargram is deploy-ready when the checks below pass and the PWA/mobile flow has
had a real-device or browser-device pass.

## Preflight

```bash
deno task check
deno task build
bash scripts/horoscope.sh --json --day today aries
```

Manual smoke test:

1. Open the app at `http://localhost:8002` or a temporary `PORT=8012` server.
2. Dismiss the welcome modal.
3. Select a long sign such as Sagittarius.
4. Confirm the loading sequence completes.
5. Switch daily/weekly/monthly.
6. Check iPhone width: no horizontal scroll, readable title bar, 44px+ buttons.
7. Install/cache pass: manifest loads, service worker registers, offline shell
   opens after first load.

## Deployment

If GitHub auto-deploy is connected:

```bash
git push origin main
```

Manual Deno Deploy fallback:

```bash
deployctl deploy --prod --token=$DENO_DEPLOY_TOKEN
```

Optional production env vars:

- `POSTHOG_KEY` - optional analytics key.
- `POSTHOG_HOST` - PostHog host, usually `https://us.i.posthog.com`.
- `HOROSCOPE_SCRIPT_PATH` - override path for the bundled daily oracle.

## Production URLs

- Canonical app: `https://stargram.app`
- Sitemap: `https://stargram.app/sitemap.xml`
- Social card: `https://stargram.app/og-image.jpg`
- Repo: `https://github.com/pibulus/stargram`

## Current Feature Surface

- 12 zodiac signs.
- Daily readings from the bundled `scripts/horoscope.sh` oracle.
- Weekly/monthly readings from `freehoroscopeapi.com`.
- Live cosmic context from local moon/Discordian calculations plus NOAA SWPC and
  NASA/JPL close-approach APIs when reachable.
- Terminal-style ASCII horoscope display with typed header/body.
- PWA manifest, install prompt, service worker cache, and app shortcuts.
- Optional PostHog analytics.
- Ko-fi support flow.

## Post-Deploy Checks

1. Open `https://stargram.app`.
2. Confirm title/OG metadata with a link preview debugger.
3. Confirm `/manifest.json`, `/sw.js`, `/robots.txt`, and `/sitemap.xml`.
4. On iOS Safari: Share -> Add to Home Screen.
5. After first load, enable airplane mode and reopen from the icon.
6. Check console for service worker or API errors.

## Later Ideas

- More share-native flows for iMessage/Instagram/Twitter/X.
- Horoscope history/archive.
- Daily PWA notifications.
- Tarot or Chinese zodiac expansion.
- Prune legacy alternate display/theme files once the current terminal flow is
  settled.

Last updated: 2026-05-27.
