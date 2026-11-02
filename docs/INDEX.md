# Where everything lives

One page, kept honest. If a path here is wrong, fix the path, not the habit.

## Start here

| question                                | file                                 |
| --------------------------------------- | ------------------------------------ |
| What is this and how do I run it?       | [`../README.md`](../README.md)       |
| Rules for an agent working in this repo | [`../CLAUDE.md`](../CLAUDE.md)       |
| Cold-start map of the code              | [`TINKER.md`](TINKER.md)             |
| Words this project uses                 | [`GLOSSARY.md`](GLOSSARY.md)         |
| How to ship it and prove it shipped     | [`DEPLOYMENT.md`](DEPLOYMENT.md)     |
| Why the readings read the way they do   | [`ORACLE_AUDIT.md`](ORACLE_AUDIT.md) |

## The code, in one pass

```text
routes/            HTTP surface (pages + api)
  index.tsx          the app shell
  _app.tsx           SEO, PWA metadata, analytics env, service worker
  thanks.tsx         supporter page
  version.json.ts    deploy stamp (deployment id; commit when the env has one)
  api/
    horoscope.ts     reading endpoint: validation, caching, source chain call
    cosmic-context.ts  Signal Room packet: moon, Discordian date, NOAA, JPL, d23
islands/           interactive Preact islands (ZodiacPicker is the whole flow)
components/        TypedWriter, ModalShell
utils/
  oracle/            the reading brain
    sources.ts         external readings first (the chain, and why)
    voice.ts           Gemini writes from the computed sky
    compose.ts         sky packet assembly + the deterministic floor
    sky.ts             planetary positions, aspects, stations, ingresses
    count.ts           moon state, planetary hour
    draw.ts            date-seeded tarot / hexagram / rune draw
    sigil.ts           braille talisman
    live-sky.ts        NOAA SWPC, JPL close approaches
    ritual.ts          the nightly rite, KV canon, schema version
  asciiArtGenerator.ts, colorEffects.ts, sounds.ts, zodiac.ts, analytics.ts
data/oracle/       tarot, hexagram and rune tables (JSON, imported)
static/            manifest, icons, service worker, og cards, robots, sitemap
scripts/           oracle-audit.ts (entropy harness), stats.ts
docs/              this folder; screenshots/ is local-only and gitignored
```

## Reading chain, in one line

`utils/oracle/sources.ts` → Ohmanda is dead (see the tombstone in that file) →
freehoroscopeapi → `voice.ts` off the computed sky → `compose.ts` floor. The
response's `source` field names which one answered.

## Two things that are easy to get wrong

- `routes/version.json.ts` cannot know the git commit on Deno Deploy, because
  that lane runs `main.ts` and never builds. It reports `deploymentId` and says
  `unknown` for the commit. Do not "fix" that into a guess.
- `READING_SCHEMA` in `utils/oracle/ritual.ts` is the lever for forcing fresh
  readings after a source or voice change. Bump it; the old keys age out.
