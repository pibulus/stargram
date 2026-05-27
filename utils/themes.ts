// 🎨 Pablo's Universal Theme System (from Juicy Themes)
// Modular, reusable theme engine for Deno/Fresh apps
// 60/30/10 rule: 60% base, 30% secondary, 10% accent

export interface Theme {
  name: string;
  vibe: string;
  base: string; // 60% - main background
  secondary: string; // 30% - cards/sections
  accent: string; // 10% - CTAs/highlights
  text: string; // Primary text
  textSecondary?: string; // Secondary text (optional)
  border: string; // Border color
  shadow?: string; // Shadow color (optional)
  // CSS variable mappings
  cssVars?: Record<string, string>;
}

export interface ThemeSystemConfig {
  themes: Theme[];
  defaultTheme?: string;
  storageKey?: string;
  randomEnabled?: boolean;
  cssPrefix?: string;
}

export class ThemeSystem {
  private config: ThemeSystemConfig;
  private currentTheme: Theme;
  private listeners: Array<(theme: Theme) => void> = [];

  constructor(config: ThemeSystemConfig) {
    this.config = {
      storageKey: "app-theme",
      cssPrefix: "--color",
      randomEnabled: true,
      ...config,
    };

    // Initialize with default or first theme
    const defaultTheme = config.defaultTheme
      ? config.themes.find((t) => t.name === config.defaultTheme)
      : config.themes[0];

    this.currentTheme = defaultTheme || config.themes[0];
  }

  // Get all available themes
  getThemes(): Theme[] {
    return this.config.themes;
  }

  // Get current active theme
  getCurrentTheme(): Theme {
    return this.currentTheme;
  }

  // Set a specific theme
  setTheme(themeName: string): Theme {
    const theme = this.config.themes.find((t) => t.name === themeName);
    if (!theme) {
      throw new Error(`Theme '${themeName}' not found`);
    }

    this.currentTheme = theme;
    this.applyTheme(theme);
    this.notifyListeners(theme);
    return theme;
  }

  // Apply theme to document
  applyTheme(theme: Theme): void {
    if (typeof document === "undefined") return;

    const root = document.documentElement;
    const prefix = this.config.cssPrefix;

    // Apply base theme colors
    this.setCSSVar(root, `${prefix}-base`, theme.base);
    this.setCSSVar(root, `${prefix}-secondary`, theme.secondary);
    this.setCSSVar(root, `${prefix}-accent`, theme.accent);
    this.setCSSVar(root, `${prefix}-text`, theme.text);
    this.setCSSVar(root, `${prefix}-border`, theme.border);

    // Apply optional properties
    if (theme.textSecondary) {
      this.setCSSVar(root, `${prefix}-text-secondary`, theme.textSecondary);
    }
    if (theme.shadow) {
      this.setCSSVar(root, `${prefix}-shadow`, theme.shadow);
    }

    // Apply any custom CSS variables
    if (theme.cssVars) {
      Object.entries(theme.cssVars).forEach(([key, value]) => {
        root.style.setProperty(key, value);
      });
    }

    // Handle gradients and always set both solid and gradient versions
    if (theme.base.includes("gradient")) {
      this.setCSSVar(root, `${prefix}-base-gradient`, theme.base);
      // Extract a solid fallback color from gradient if possible
      const fallback = this.extractColorFromGradient(theme.base) || "#FAF9F6";
      this.setCSSVar(root, `${prefix}-base`, fallback);
      this.setCSSVar(root, `${prefix}-base-solid`, fallback);
    } else {
      this.setCSSVar(root, `${prefix}-base`, theme.base);
      this.setCSSVar(root, `${prefix}-base-gradient`, theme.base);
      this.setCSSVar(root, `${prefix}-base-solid`, theme.base);
    }

    // Save to storage
    this.saveTheme(theme);
  }

  // Helper to set CSS variable
  private setCSSVar(root: HTMLElement, property: string, value: string): void {
    root.style.setProperty(property, value);
  }

  // Extract solid color from gradient string
  private extractColorFromGradient(gradient: string): string | null {
    const match = gradient.match(/#[0-9A-Fa-f]{6}/);
    return match ? match[0] : null;
  }

  // Load saved theme
  loadTheme(): Theme {
    if (typeof window === "undefined") return this.currentTheme;

    const storageKey = this.config.storageKey || "app-theme";
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const savedTheme = JSON.parse(saved);
        // Find matching theme by name
        const theme = this.config.themes.find((t) =>
          t.name === savedTheme.name
        );
        if (theme) {
          this.currentTheme = theme;
          return theme;
        }
      } catch {
        // Fall through to default
      }
    }

    return this.currentTheme;
  }

  // Save theme preference
  private saveTheme(theme: Theme): void {
    if (typeof window !== "undefined") {
      const storageKey = this.config.storageKey || "app-theme";
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          name: theme.name,
          timestamp: Date.now(),
        }),
      );
    }
  }

  // Get random theme
  getRandomTheme(): Theme {
    const randomIndex = Math.floor(Math.random() * this.config.themes.length);
    return this.config.themes[randomIndex];
  }

  // Cycle to next theme
  cycleTheme(): Theme {
    const currentIndex = this.config.themes.findIndex((t) =>
      t.name === this.currentTheme.name
    );
    const nextIndex = (currentIndex + 1) % this.config.themes.length;
    const nextTheme = this.config.themes[nextIndex];

    this.currentTheme = nextTheme;
    this.applyTheme(nextTheme);
    this.notifyListeners(nextTheme);
    return nextTheme;
  }

  // Subscribe to theme changes
  subscribe(listener: (theme: Theme) => void): () => void {
    this.listeners.push(listener);
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  // Notify all listeners
  private notifyListeners(theme: Theme): void {
    this.listeners.forEach((listener) => listener(theme));
  }

  // Initialize on mount (for client-side)
  init(): Theme {
    const theme = this.loadTheme();
    this.applyTheme(theme);
    return theme;
  }
}

// =================================================================
// 🔮 STARGRAM THEME COLLECTION
// E-girl grind fiction meets Tokyo boyfriend energy
// Curated for mystery angel diva pop aesthetic
// =================================================================

export const stargramThemes: Theme[] = [
  // Turquoise Pop (cyan text/borders on white)
  {
    name: "TURQUOISE",
    vibe: "cyan pop",
    base: "#F8FFFF",
    secondary: "#B2EBF2",
    accent: "#00BCD4",
    text: "#006978",
    border: "#00838F",
  },
  // Coral Punch (orange text/borders on peach background)
  {
    name: "CORAL",
    vibe: "coral punch",
    base: "#FFF5F0",
    secondary: "#FFCCBC",
    accent: "#FF5722",
    text: "#BF360C",
    border: "#E64A19",
  },
  // Electric Purple (purple text/borders on lavender)
  {
    name: "PURPLE",
    vibe: "electric purple",
    base: "#FAF7FF",
    secondary: "#E1BEE7",
    accent: "#9C27B0",
    text: "#4A148C",
    border: "#6A1B9A",
  },
  // Cyber Blue (indigo text/borders on light blue)
  {
    name: "CYBER",
    vibe: "cyber blue",
    base: "#F8FAFF",
    secondary: "#C5CAE9",
    accent: "#3F51B5",
    text: "#1A237E",
    border: "#283593",
  },
  // Magenta Burst (pink text/borders on blush)
  {
    name: "MAGENTA",
    vibe: "magenta burst",
    base: "#FFF9FA",
    secondary: "#F8BBD0",
    accent: "#E91E63",
    text: "#880E4F",
    border: "#AD1457",
  },
  // Teal Wave (teal text/borders on aqua)
  {
    name: "TEAL",
    vibe: "teal wave",
    base: "#F0FFFF",
    secondary: "#B2DFDB",
    accent: "#009688",
    text: "#004D40",
    border: "#00695C",
  },
  // Risograph Pink+Yellow (pink text/borders on yellow)
  {
    name: "RISO",
    vibe: "risograph clash",
    base: "#FFFEF7",
    secondary: "#FFF59D",
    accent: "#FF1493",
    text: "#C2185B",
    border: "#D81B60",
  },
  // Midnight Oracle (deep purple/black gradient - mystery energy)
  {
    name: "MIDNIGHT",
    vibe: "midnight oracle",
    base: "#0a0a1f",
    secondary: "#1a1a3a",
    accent: "#9C27B0",
    text: "#e0e7ff",
    border: "#6A1B9A",
  },
  // Neon Oracle (hot pink + electric blue - Tokyo boyfriend energy)
  {
    name: "NEON_ORACLE",
    vibe: "neon oracle",
    base: "#0d0d1a",
    secondary: "#1a1a2e",
    accent: "#FF1493",
    text: "#00D9FF",
    border: "#FF1493",
  },
  // Stardust (silver/lavender/pink - angel diva pop)
  {
    name: "STARDUST",
    vibe: "stardust shimmer",
    base: "#F8F7FF",
    secondary: "#E8E3FF",
    accent: "#D4B5F7",
    text: "#6A4C93",
    border: "#9D84B7",
  },
  // Cherry Red (red text/borders on blush)
  {
    name: "CHERRY",
    vibe: "cherry red",
    base: "#FFF5F7",
    secondary: "#FFCDD2",
    accent: "#F44336",
    text: "#B71C1C",
    border: "#C62828",
  },
  // TERMINAL (keep the dark terminal theme)
  {
    name: "TERMINAL",
    vibe: "hacker mode",
    base: "#1a1a1a",
    secondary: "#2a2a2a",
    accent: "#00ff41",
    text: "#00ff41",
    border: "#00ff41",
  },
];

// Export convenience functions
export function createThemeSystem(config: ThemeSystemConfig): ThemeSystem {
  return new ThemeSystem(config);
}

// Get a random theme
export function getRandomTheme(): Theme {
  return stargramThemes[Math.floor(Math.random() * stargramThemes.length)];
}

// Rotate through themes
let currentThemeIndex = Math.floor(Math.random() * stargramThemes.length);
export function getNextTheme(): Theme {
  currentThemeIndex = (currentThemeIndex + 1) % stargramThemes.length;
  return stargramThemes[currentThemeIndex];
}

// Apply theme to document (backward compatibility)
export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  // Handle gradients for base
  if (theme.base.includes("gradient")) {
    root.style.setProperty("--color-base-gradient", theme.base);
    root.style.setProperty("--color-base", "#FAF9F6");
  } else {
    root.style.setProperty("--color-base", theme.base);
    root.style.setProperty("--color-base-gradient", theme.base);
  }
  root.style.setProperty("--color-secondary", theme.secondary);
  root.style.setProperty("--color-accent", theme.accent);
  root.style.setProperty("--color-text", theme.text);
  root.style.setProperty("--color-border", theme.border);

  // Store in localStorage
  if (typeof window !== "undefined") {
    localStorage.setItem("stargram-theme", JSON.stringify(theme));
  }
}

// Load saved theme or random
export function loadTheme(): Theme {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("stargram-theme");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Fall through to random
      }
    }
  }
  return getRandomTheme();
}
