// 🌙 Stargram - Theme Configuration
// Two fresh themes for e-girl Tokyo energy

import type { Theme, ThemeSystemConfig } from "./mod.ts";

// ===================================================================
// SUNSET DREAMS - Warm pink/purple gradient, e-girl energy
// ===================================================================
export const sunsetDreams: Theme = {
  name: "SUNSET DREAMS",
  vibe: "dreamy pink sunset",
  base: "linear-gradient(180deg, #2d1b4e 0%, #4a1942 100%)", // Deep purple to deep pink
  secondary: "#3a1a3e",
  accent: "#FF69B4", // Hot pink
  text: "#FFB6C1", // Soft pink text
  textSecondary: "#FFE5B4", // Peachy highlight
  border: "#FF1493", // Deep pink glow
  cssVars: {
    "--color-base-solid": "#2d1b4e",
    "--shadow-glow": "0 0 40px rgba(255, 20, 147, 0.6)",
    "--mesh-1": "#FF69B4",
    "--mesh-2": "#FF1493",
    "--mesh-3": "#9370DB",
    "--particle-count": "10",
    "--orb-count": "4",
  },
};

// ===================================================================
// CYBER LOVE - Black with cyan/magenta neon, Tokyo boyfriend vibes
// ===================================================================
export const cyberLove: Theme = {
  name: "CYBER LOVE",
  vibe: "tokyo neon nights",
  base: "#000000",
  secondary: "#0a0a0a",
  accent: "#FF00FF", // Magenta
  text: "#00FFFF", // Cyan text
  textSecondary: "#FF00FF", // Magenta highlights
  border: "#00FFFF", // Cyan glow
  cssVars: {
    "--color-base-solid": "#000000",
    "--shadow-glow": "0 0 50px rgba(0, 255, 255, 0.7)",
    "--mesh-1": "#00FFFF",
    "--mesh-2": "#FF00FF",
    "--mesh-3": "#7c3aed",
    "--particle-count": "12",
    "--orb-count": "3",
  },
};

// ===================================================================
// Theme System Configuration
// ===================================================================
export const cosmicThemeConfig: ThemeSystemConfig = {
  themes: [sunsetDreams, cyberLove],
  defaultTheme: "SUNSET DREAMS",
  storageKey: "stargram-theme",
};

// Export all themes
export const cosmicThemes = [sunsetDreams, cyberLove];
