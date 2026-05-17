# 🔧 TINKER.md - COSMIC HOROSCOPE Quick Reference

_For when you haven't touched this in 6 months and need to change something NOW_

**ADHD MODE**: Jump to [QUICK WINS](#-quick-wins---80-of-what-youll-change) or
[WHEN SHIT BREAKS](#-when-shit-breaks---top-3-fixes)

---

## 🚀 START HERE - RUN THE DAMN THING

### Dev Mode

```bash
# STACK: DENO/FRESH
deno task dev
# Opens: http://localhost:8000
```

### Production Build

```bash
deno task build
```

### Deploy

```bash
deployctl deploy --prod --token=$DENO_DEPLOY_TOKEN
```

---

## 📁 FILE MAP - WHERE SHIT LIVES

```
cosmic-horoscope/
├── routes/
│   ├── index.tsx           # Main page - zodiac picker + horoscope display
│   ├── _app.tsx           # SEO, PWA meta tags, structured data
│   └── api/
│       └── horoscope.ts   # API proxy with timezone logic
├── islands/
│   ├── ZodiacPicker.tsx   # The zodiac grid selector
│   ├── HoroscopeDisplay.tsx # Display + gradient + export
│   ├── ThemeIsland.tsx    # Floating theme button
│   ├── WelcomeModal.tsx   # First-visit modal
│   └── AboutModal.tsx     # About modal
├── utils/
│   ├── zodiac.ts          # Zodiac data + localStorage
│   ├── themes.ts          # THE THEME SYSTEM (11 cosmic themes)
│   ├── colorEffects.ts    # Gradient generators
│   └── analytics.ts       # PostHog tracking
└── static/
    ├── styles.css        # Global CSS + theme vars
    ├── manifest.json     # PWA manifest
    ├── sw.js            # Service worker
    └── og-image.jpg     # Social share image (1200x630)
```

### The Files You'll Actually Touch:

1. **utils/themes.ts** - Add/remove themes, change colors
2. **routes/_app.tsx** - Change page title, meta descriptions
3. **islands/AboutModal.tsx** - Update about copy
4. **utils/colorEffects.ts** - Add new gradient effects
5. **static/styles.css** - Global styles, CSS variables

---

## 🎯 QUICK WINS - 80% OF WHAT YOU'LL CHANGE

### 1. Add a New Theme

```
File: utils/themes.ts
Line: ~215 (asciifierThemes array)
Current: 11 themes (TURQUOISE, CORAL, PURPLE, etc.)

Add new theme:
{
  name: "YOUR_THEME",
  vibe: "your vibe description",
  base: "#XXXXXX",        // 60% - main background
  secondary: "#XXXXXX",   // 30% - cards/sections
  accent: "#XXXXXX",      // 10% - CTAs/highlights
  text: "#XXXXXX",        // Primary text
  border: "#XXXXXX",      // Border color
}
```

### 2. Change Page Title/SEO

```
File: routes/_app.tsx
Line: 21
Current: "Cosmic Horoscope • Horoscopes That Look As Good As They Read"
Change: Update <title> tag

Line: 22-24
Current: Meta description
Change: Update description for SEO
```

### 3. Add New Gradient Effect

```
File: utils/colorEffects.ts
Line: 4 (COLOR_EFFECTS)
Current: unicorn, fire, cyberpunk, vaporwave, sunset, ocean

Add to array:
{ value: "your-effect", label: "Your Effect ✨" }

Then add case in applyColorToArt() function (line ~20)
```

### 4. Change About Modal Copy

```
File: islands/AboutModal.tsx
Line: 109-115
Current: "Your horoscope as shareable cosmic art..."
Change: Update the story text

Keep Pablo's voice: confident, warm, not corporate
```

---

## 🔧 COMMON TWEAKS

### Change Port

```bash
File: deno.json
Look for: "start": "deno run -A --watch=static/,routes/ dev.ts"
Change dev.ts or add PORT=8002 before command
```

### Remove a Theme

```bash
File: utils/themes.ts
Line: ~215 (asciifierThemes array)
Delete the theme object
Save, refresh - theme gone
```

### Change Default Theme

```bash
File: utils/themes.ts
Line: ~41 (ThemeSystem constructor)
Change: defaultTheme: "THEME_NAME"
Or line ~349 - change initial random pick
```

### Add New Zodiac Feature

```bash
File: utils/zodiac.ts
Line: 3-54 (ZODIAC_SIGNS array)
Add properties like: lucky_color, element_description, etc.
Then use in HoroscopeDisplay.tsx
```

### Modify Horoscope API

```bash
File: routes/api/horoscope.ts
Line: 9 (HOROSCOPE_API_BASE)
Change API endpoint if using different source
Line: 31-40 (getDayParamForTimezone)
Adjust timezone logic for your location
```

---

## 💥 WHEN SHIT BREAKS - TOP 3 FIXES

### 1. Port Already in Use

```bash
# Find what's using it:
lsof -i :8000

# Kill it:
kill -9 PID_NUMBER

# Or use different port:
PORT=8002 deno task dev
```

### 2. Themes Not Switching

```bash
# Clear localStorage:
# Open DevTools console:
localStorage.clear()
location.reload()

# Or check themes.ts - theme might have invalid CSS
```

### 3. PWA Not Installing

```bash
# Check manifest:
File: static/manifest.json
Look for: Valid theme_color, background_color, icons

# Check service worker:
File: static/sw.js
Look for: Cache name, proper registration

# Clear cache & reload:
DevTools → Application → Clear storage
```

---

## 🚦 DEPLOYMENT - SHIP IT

### One-Liner Deploy

```bash
deployctl deploy --prod --token=$DENO_DEPLOY_TOKEN
```

### Manual Deploy Steps

1. Test locally: `deno task dev`
2. Check everything works
3. Commit changes: `git add -A && git commit -m "fix: whatever"`
4. Push: `git push origin main`
5. Deploy: `deployctl deploy --prod`

### First-Time Deno Deploy Setup

```bash
# 1. Install deployctl
deno install -A --no-check -r -f https://deno.land/x/deploy/deployctl.ts

# 2. Get token from https://dash.deno.com/account#access-tokens

# 3. Deploy
deployctl deploy --project=cosmic-horoscope --production --token=YOUR_TOKEN

# 4. Add to .zshrc for future:
export DENO_DEPLOY_TOKEN="YOUR_TOKEN"
```

---

## 📱 PWA STUFF

### Test PWA Installation

```bash
# Chrome DevTools:
1. Open app in Chrome
2. DevTools → Application → Manifest
3. Check for errors
4. Click "Add to home screen"

# iOS Safari:
1. Open app in Safari
2. Share → Add to Home Screen
3. Check icon + name correct
```

### Update PWA Icons

```bash
File: static/icons/
Files: icon-192x192.png, icon-512x512.png, icon-maskable-512x512.png

Generate new:
magick -size 192x192 gradient:'#a78bfa-#f0abfc' -swirl 120 icon-192x192.png
magick -size 512x512 gradient:'#a78bfa-#f0abfc' -swirl 120 icon-512x512.png
```

### Update Share Image

```bash
File: static/og-image.jpg
Size: 1200x630 (OpenGraph standard)

Generate new:
magick -size 1200x630 gradient:'#a78bfa-#f0abfc' -swirl 120 \
  -pointsize 90 -font Arial-Bold -fill white -gravity center \
  -annotate +0-80 "COSMIC HOROSCOPE" \
  -pointsize 40 -annotate +0+50 "✨ Your horoscope as shareable art ✨" \
  og-image.jpg
```

---

## 📊 ANALYTICS (OPTIONAL)

### Add PostHog Tracking

```bash
File: .env (create if doesn't exist)
Add:
POSTHOG_KEY=your_key_here
POSTHOG_HOST=https://app.posthog.com

File: routes/_app.tsx
Already configured - just add env vars
```

### Events Being Tracked

```
horoscope_viewed - When user views reading (sign + period)
theme_changed - When theme switches (theme name)
gradient_applied - When gradient applied (effect name)
export_png - When PNG downloaded (format)
```

---

## 📝 NOTES FOR FUTURE PABLO

- **Timezone logic**: Melbourne is 15-16hrs ahead of US API, so we use
  "tomorrow" before 6pm local
- **Theme system is universal**: Can be copied to other apps (already in
  asciifier, button_studio, etc.)
- **No accounts needed**: Everything localStorage, privacy-first
- **Horoscope API is free**: freehoroscopeapi.com, no auth required
- **OG image must be 1200x630**: Twitter/Facebook requirement

### Pablo's Project Quirks:

- The TINKER.md already existed but was for juicy-themes (copy-paste error)
- AboutModal says "ASCIIFIER" in comments (another copy-paste)
- Theme names in asciifierThemes but used for cosmic-horoscope (name collision
  from template)
- Skip-to-content uses custom sr-only class (not Tailwind's built-in)

---

## 🎸 TLDR - COPY PASTE ZONE

```bash
# Start working
deno task dev

# Ship it
deployctl deploy --prod

# When broken
rm -rf _fresh
deno task dev

# Add new theme
# → utils/themes.ts line ~215

# Change copy
# → islands/AboutModal.tsx line ~109
```

**Quick paths:**

- Themes: `utils/themes.ts`
- Copy: `islands/AboutModal.tsx`, `islands/WelcomeModal.tsx`
- SEO: `routes/_app.tsx`
- Colors: `static/styles.css` + `utils/themes.ts`
- Main page: `routes/index.tsx`

---

_Last updated: Oct 2025 - When you added PWA + accessibility + SEO polish_
