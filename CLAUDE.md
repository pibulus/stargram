# CLAUDE.md

Stargram is a Deno/Fresh Preact app for terminal-styled horoscope readings. Use
this file as the quick local orientation for Claude/Codex-style agents.

## Commands

```bash
deno task dev      # http://localhost:8002
deno task check    # fmt, lint, deno check
deno task build    # Fresh production build
```

When port `8002` is busy:

```bash
PORT=8012 deno run -A --watch=static/,routes/ dev.ts
```

## Primary Flow

`routes/index.tsx` -> `islands/HomeIsland.tsx` -> `islands/ZodiacPicker.tsx`

`ZodiacPicker` owns the live user flow:

1. user selects a zodiac sign,
2. `/api/cosmic-context` builds the Signal Room packet,
3. `/api/horoscope` fetches the reading,
4. `utils/asciiArtGenerator.ts` formats the ASCII,
5. `utils/colorEffects.ts` colorizes responsive header/body HTML,
6. `components/TypedWriter.tsx` types the output.

## Boundaries

- `routes/_app.tsx` owns SEO, PWA metadata, analytics env injection, global CSS,
  and service worker registration.
- `routes/api/horoscope.ts` owns horoscope source selection and validation.
- `routes/api/cosmic-context.ts` owns live sky/context signals.
- `static/manifest.json`, `static/sw.js`, and `static/icons/` own PWA behavior.
- `scripts/horoscope.sh` is the bundled daily oracle.

## House Style

- Keep mobile first. Test at 375px wide, especially with Sagittarius.
- Preserve the terminal/CRT aesthetic, but do not allow horizontal overflow.
- Keep touch targets at least 44px high.
- Use `rg` for search.
- Do not revert unrelated local changes.
- Do not commit secrets; `.env.example` should use placeholders only.

## Known Legacy Files

These are not the current home flow, but still exist:

- `islands/HoroscopeDisplay.tsx`
- `components/TerminalDisplay.tsx`
- `islands/ThemeIsland.tsx`
- `islands/TabSwitcher.tsx`
- `components/MagicDropdown.tsx`

Treat them as legacy/alternate surfaces unless the task explicitly revives them.
