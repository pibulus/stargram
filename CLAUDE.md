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

## Layout Contract (added 2026-07-31 — don't undo this by accident)

The app is viewport-locked: the page itself never scrolls, only content inside
the terminal does.

- `.cosmic-stage` (in `ZodiacPicker.tsx`) owns exactly one viewport —
  `height: 100dvh` with a `100vh` line above it as the iOS 15.0-15.3 fallback,
  and `env(safe-area-inset-*)` padding. It is the ONLY element that should set a
  viewport height.
- `.terminal-shell` fills the stage (`height: 100%`; capped at
  `min(100%, 900px)` from `sm:` up) in **both** picker and horoscope mode. The
  old mode-conditional heights are gone — reintroducing them is what made the
  frame resize between the loading screen and the reading.
- The content div is the single scroller: `flex-1 min-h-0 overflow-y-auto`.
  `TypedWriter` finds it via `.closest(".overflow-y-auto")` to follow the caret,
  so keep that class on it.
- Ancestors (`routes/index.tsx`, `HomeIsland.tsx`) just pass height down — they
  must not add padding or a second `100dvh`.
- The dossier panel is `hidden lg:block`: it's hover-driven, so it's dead weight
  on touch.
- Landscape phones (`max-height: 520px`) hide `.picker-crown` and go to a
  4-column grid, or the ASCII title eats the whole screen.

## Boundaries

- `routes/_app.tsx` owns SEO, PWA metadata, analytics env injection, global CSS,
  and service worker registration.
- `routes/api/horoscope.ts` owns horoscope source selection and validation.
- `routes/api/cosmic-context.ts` owns live sky/context signals.
- `static/manifest.json`, `static/sw.js`, and `static/icons/` own PWA behavior.
  **Bump `CACHE_NAME` in `sw.js` on any deploy that changes an unhashed asset**
  (`styles.css`, `modal-shell.css`, icons) — they're served cache-first, so
  installed-PWA users keep the old copy until the name changes. Hashed JS chunks
  are fine.
- `scripts/horoscope.sh` is the bundled daily oracle.

## House Style

- Keep mobile first. Test at 375px wide, especially with Sagittarius.
- Preserve the terminal/CRT aesthetic, but do not allow horizontal overflow.
- Keep touch targets at least 44px high.
- Use `rg` for search.
- Do not revert unrelated local changes.
- Do not commit secrets; `.env.example` should use placeholders only.

## History Note

The legacy alternate surfaces (`HoroscopeDisplay`, `TerminalDisplay`,
`ThemeIsland`, `TabSwitcher`, `MagicDropdown`, and friends) were pruned in the
v1.0 cleanup pass. Everything in `islands/`, `components/`, and `utils/` is
live; recover old experiments from git history if ever needed.
