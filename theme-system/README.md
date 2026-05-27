# 🎨 Pablo's Universal Theme System for Deno

A modular, reusable theme engine for any Deno/Fresh app. Built with the 60/30/10
design principle and smart color harmony algorithms.

## Features

- **60/30/10 Rule**: Automatic color balance (60% base, 30% secondary, 10%
  accent)
- **Smart Random Themes**: Generates harmonically balanced color schemes
- **CSS Variable Integration**: Seamless theming with CSS custom properties
- **LocalStorage Persistence**: Remembers user's theme choice
- **TypeScript Support**: Full type safety
- **Color Harmony Algorithms**: Analogous, triadic, complementary color
  generation

## Installation

Copy the `theme-system` folder to your Deno project and import:

```typescript
import { createThemeSystem, type Theme } from "./theme-system/mod.ts";
```

## Quick Start

### 1. Define Your Themes

```typescript
const myThemes: Theme[] = [
  {
    name: "LIGHT MODE",
    vibe: "clean and bright",
    base: "#FFFFFF",
    secondary: "#F0F0F0",
    accent: "#FF6B9D",
    text: "#000000",
    border: "#000000",
  },
  {
    name: "DARK MODE",
    vibe: "midnight coding",
    base: "#0D0E14",
    secondary: "#1A1D29",
    accent: "#00FF88",
    text: "#00FF88",
    border: "#00FF88",
  },
];
```

### 2. Create Theme System

```typescript
const themeSystem = createThemeSystem({
  themes: myThemes,
  defaultTheme: "LIGHT MODE",
  storageKey: "my-app-theme",
  cssPrefix: "--color",
});
```

### 3. Initialize in Your App

```typescript
// In your component/island
useEffect(() => {
  const theme = themeSystem.init();
  // Theme is now applied to document
}, []);
```

### 4. Use CSS Variables

```css
.my-component {
  background-color: var(--color-base);
  color: var(--color-text);
  border: 2px solid var(--color-border);
}

.button {
  background-color: var(--color-accent);
  color: var(--color-base);
}
```

## Random Theme Generation

Generate harmonically balanced random themes:

```typescript
import { RandomThemeGenerator } from "./theme-system/mod.ts";

// Generate light theme
const lightTheme = RandomThemeGenerator.generateHarmonicTheme("light");

// Generate dark theme
const darkTheme = RandomThemeGenerator.generateHarmonicTheme("dark");

// Apply the random theme
themeSystem.applyTheme(lightTheme);
```

## API Reference

### ThemeSystem Class

- `getThemes()`: Get all available themes
- `getCurrentTheme()`: Get the current active theme
- `setTheme(name)`: Set theme by name
- `applyTheme(theme)`: Apply a theme object
- `loadTheme()`: Load saved theme from localStorage
- `cycleTheme()`: Cycle to next theme
- `getRandomTheme()`: Get a random theme
- `subscribe(listener)`: Subscribe to theme changes
- `init()`: Initialize and apply saved/default theme

### Theme Interface

```typescript
interface Theme {
  name: string; // Display name
  vibe: string; // Theme description
  base: string; // 60% - Main background
  secondary: string; // 30% - Cards/sections
  accent: string; // 10% - CTAs/highlights
  text: string; // Primary text color
  textSecondary?: string; // Optional secondary text
  border: string; // Border color
  shadow?: string; // Optional shadow color
  cssVars?: Record<string, string>; // Additional CSS variables
}
```

## Color Harmony Types

The random generator supports:

- **Analogous**: Colors next to each other on the color wheel
- **Triadic**: Three colors evenly spaced around the wheel
- **Complementary**: Opposite colors for high contrast
- **Split-Complementary**: Base color + two adjacent to its complement

## Example Implementation

See `cosmic-themes.ts` for a small app-specific implementation example with:

- Refined theme definitions
- Custom random theme generation
- App-specific configuration

## License

MIT - Use it, fork it, make it yours!

---

Built with 80/20 energy by Pablo 🎸
