# Stargram Quick Reference

For when this app has not been touched in a while and the map is needed fast.

## Run It

```bash
deno task dev      # http://localhost:8002
deno task check    # fmt + lint + typecheck
deno task build    # production build into _fresh/
deno task audit    # oracle entropy harness (slow; writes a report)
```

Different port when `8002` is busy:

```bash
PORT=8012 deno run -A --unstable-kv --unstable-cron --watch=static/,routes/ dev.ts
```

`--unstable-kv` matters: without it the oracle has no canon and divines on every
request. `--unstable-cron` matters: without it the 1:33am rite never fires
locally.

## Shape

The annotated tree lives in [`INDEX.md`](INDEX.md). The three things worth
holding in memory:

1. `routes/api/horoscope.ts` is the door; `utils/oracle/sources.ts` decides who
   speaks; `utils/oracle/ritual.ts` owns the KV canon.
2. `utils/oracle/voice.ts` is the prose. Its `IDENTITY` block is the taste knob:
   change the school it imitates and the readings change character.
3. `READING_SCHEMA` in `ritual.ts` is the invalidation lever. Bump it after a
   source or voice change and the next request divines fresh instead of serving
   the locked reading until the next rite.

## Main Flow

1. `routes/index.tsx` renders the shell, background canvas, welcome/about
   modals, and `HomeIsland`.
2. `HomeIsland` mounts `ZodiacPicker`.
3. `ZodiacPicker` shows the sign grid. Picking a sign:
   - saves the sign in localStorage,
   - fetches `/api/cosmic-context` (the Signal Room packet),
   - fetches `/api/horoscope` (the reading),
   - generates ASCII with `generateHoroscopeAscii`,
   - colorizes it with `applyColorToArt`,
   - types header/body with `TypedWriter`.
4. The reading comes from the first source with something to say: the external
   APIs, then the Oracle voice off the computed sky, then the composer floor.
   The response's `source` field names the winner.

## Common Tweaks

### Change Homepage Copy

- Welcome modal: `islands/WelcomeModal.tsx`
- About modal: `islands/AboutModal.tsx`
- SEO/social copy: `routes/_app.tsx`
- Launch hints: `.launch-hints.yaml`

### Adjust Mobile Horoscope Layout

- Terminal layout: `islands/ZodiacPicker.tsx` (`.cosmic-stage` owns the single
  viewport; the content div is the only scroller)
- Typing behaviour: `components/TypedWriter.tsx`
- ASCII title scale/color: `utils/colorEffects.ts`
- Figlet width/font: `utils/asciiArtGenerator.ts`

### Change the Voice of the Readings

- `utils/oracle/voice.ts` — `IDENTITY` is the school being imitated,
  `buildPrompt` decides what the model is allowed to see
- `utils/oracle/compose.ts` — what the packet contains in the first place
- Bump `READING_SCHEMA` afterwards, or nothing visibly changes until 1:33am

### Add or Change Zodiac Data

- Edit `utils/zodiac.ts`
- Keep `VALID_SIGNS` in `routes/api/horoscope.ts` and the `ZODIAC` table in
  `utils/oracle/sky.ts` in sync if sign names change.

### Update PWA Assets

- Manifest: `static/manifest.json`
- Service worker cache list/version: `static/sw.js`
- Icons: `static/icons/`
- Social card: `static/og-card.png` (referenced as `/og-card.png`), plus
  `static/og-image.jpg`
- Search metadata: `static/robots.txt`, `static/sitemap.xml`, and the IndexNow
  key file `static/a0552eef2ac650e8f232139261f7e997.txt`

## Deployment

```bash
deno task check
deno task build
git push origin main        # Deno Deploy's GitHub integration builds main
```

Manual fallback:

```bash
deno task build && DENO_DEPLOY_TOKEN="$DENO_DEPLOY_TOKEN_NEW" deno deploy --prod --non-interactive
```

Then prove it, because a green deploy is not a working app:

```bash
curl -s https://stargram.app/version.json
curl -s "https://stargram.app/api/horoscope?sign=libra&period=daily" | jq -r '.data.source'
```

Environment variables:

```bash
STARGRAM_GEMINI_KEY=...        # the Oracle voice; without it you get the floor
POSTHOG_KEY=...                # optional analytics
POSTHOG_HOST=https://us.i.posthog.com
```

`HOROSCOPE_SCRIPT_PATH` is gone: the bundled `scripts/horoscope.sh` was removed
in the Sep 2026 oracle rewrite.

## When Things Break

### Port Busy

```bash
lsof -nP -iTCP:8002 -sTCP:LISTEN     # then kill by PID, never by name
PORT=8012 deno run -A --unstable-kv --unstable-cron --watch=static/,routes/ dev.ts
```

### Readings Look Wrong or Samey

1. Ask the endpoint who is talking:
   ```bash
   curl -s "http://localhost:8002/api/horoscope?sign=libra&period=daily" | jq -r '.data.source'
   ```
2. `api-freehoroscope` / `api-ohmanda` — an external API answered. Its text is
   not ours; see `utils/oracle/sources.ts`.
3. `oracle-voice` — the model wrote it. Check `STARGRAM_GEMINI_KEY` and the
   `IDENTITY` block.
4. `oracle-fallback` — the deterministic composer. The logs say whether the key
   was missing.
5. A stale reading is a KV lock, not a bug: bump `READING_SCHEMA`.

### Readings Are Frozen All Day

That is the design: one reading per (schema, period, sign), locked at 1:33am
Melbourne. If they are frozen _across days_, look at the cron in `main.ts` and
the KV database attachment on Deno Deploy.

### PWA Cache Looks Stale

1. Bump `CACHE_NAME` in `static/sw.js`.
2. `deno task build`.
3. Devtools -> Application -> Clear storage.

### Mobile Layout Regresses

Longest sign first:

```bash
PORT=8012 deno run -A --unstable-kv --unstable-cron --watch=static/,routes/ dev.ts
# 375px wide, select Sagittarius
```

Check for: no horizontal page scroll, readable title bar, 44px+ buttons, body
text not clipped, ASCII header inside the terminal frame.

Last updated: 2026-11-02 (source chain, schema lever, stamp).
