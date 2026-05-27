# Stargram PWA Icons

Current app icons:

- `icon-192x192.png`
- `icon-512x512.png`
- `icon-maskable-512x512.png`

These are referenced by `static/manifest.json` and cached by `static/sw.js`.
When replacing icons, keep the filenames stable or update both files in the same
change.

Maskable icons should keep important artwork inside the center safe area so iOS
and Android launchers can crop without cutting off the symbol.
