# ✨ Stargram

**Your horoscope as shareable cosmic art.**

Stargram is a little mystical terminal: simple, fast, a bit haunted, a bit
funny, but grounded in real cosmic signals where possible.

Pick your sign. Get daily, weekly, or monthly readings. Apply cosmic gradients.
Export as images. Share the vibe.

Quick, free, no fuss.

## ✨ Features

- 🌙 **12 Zodiac Signs** - All signs supported with emoji + date ranges
- 📅 **3 Reading Types** - Daily, weekly, monthly horoscopes
- 🎨 **11 Cosmic Themes** - Purple oracle, neon dreams, stardust shimmer
- 🌈 **6 Gradient Effects** - Unicorn, fire, cyberpunk, vaporwave, sunset, ocean
- 💾 **Export as PNG** - Save and share your cosmic readings
- 📱 **PWA Support** - Install on iOS/Android for quick access
- ♿ **Accessible** - WCAG compliant with aria-labels and keyboard navigation
- 🔍 **SEO Optimized** - Open Graph, Twitter Cards, JSON-LD

## 🚀 Quick Start

```bash
# Install Deno
brew install deno

# Start dev server
deno task dev

# Build for production
deno task build
```

## 🛠️ Tech Stack

- **Runtime**: Deno 2.0+
- **Framework**: Fresh (Preact + Islands)
- **Styling**: Tailwind CSS + CSS Variables
- **Analytics**: PostHog (optional)
- **Deployment**: Deno Deploy

## 📁 Project Structure

```
stargram/
├── routes/
│   ├── index.tsx           # Main page
│   ├── _app.tsx           # App wrapper with SEO
│   └── api/
│       └── horoscope.ts   # Horoscope API proxy
├── islands/
│   ├── ZodiacPicker.tsx   # Interactive zodiac selector
│   ├── HoroscopeDisplay.tsx # Reading display + export
│   ├── ThemeIsland.tsx    # Theme switcher
│   └── WelcomeModal.tsx   # First-visit modal
├── utils/
│   ├── zodiac.ts          # Zodiac data + localStorage
│   ├── themes.ts          # Theme system (60/30/10 rule)
│   ├── colorEffects.ts    # Gradient generators
│   └── analytics.ts       # PostHog tracking
└── static/
    ├── styles.css         # Global styles + theme vars
    ├── manifest.json      # PWA manifest
    ├── sw.js             # Service worker
    └── og-image.jpg      # Social share image
```

## 🎨 Theme System

Stargram uses a universal theme system with 11 curated cosmic themes:

- **Light Themes**: Turquoise, Coral, Purple, Cyber, Magenta, Teal, Riso, Cherry
- **Dark Themes**: Midnight, Neon Oracle, Terminal
- **Special**: Stardust (angel diva pop energy)

Each theme follows the 60/30/10 color rule:

- 60% base (background)
- 30% secondary (cards/sections)
- 10% accent (CTAs/highlights)

## 🔌 API Integration

Uses Stargram's bundled `scripts/horoscope.sh` oracle for daily readings, with
freehoroscopeapi.com as the fallback and source for weekly/monthly readings:

- No auth required
- Daily, weekly, monthly endpoints
- Timezone-aware (Melbourne → tomorrow reading for accuracy)

## 📱 PWA Features

- Installable on home screen
- Offline-capable
- App shortcuts (daily/weekly readings)
- Splash screens
- iOS/Android optimized

## 🚢 Deployment

```bash
# Deploy to Deno Deploy
deployctl deploy --prod --token=$DENO_DEPLOY_TOKEN

# Or push to GitHub (auto-deploys if connected)
git push origin main
```

## 📊 Analytics (Optional)

PostHog events tracked:

- `horoscope_viewed` - Sign + period
- `theme_changed` - Theme name
- `gradient_applied` - Effect name
- `export_png` - Format type

Set `POSTHOG_KEY` and `POSTHOG_HOST` in environment variables.

## 🎸 Built by Pablo

Part of the SoftStack suite of pastel-punk tools.

- Portfolio: https://pibul.us
- GitHub: https://github.com/pibulus

## 📄 License

MIT - Do whatever you want with this!
