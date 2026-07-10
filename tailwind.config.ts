import { type Config } from "tailwindcss";

export default {
  content: [
    "{routes,islands,components}/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      borderWidth: {
        "3": "3px",
      },
      colors: {
        // Pablo's Soft Stack Palette
        "paper": "#FAF9F6",
        "peach": "#FFE5B4",
        "hot-pink": "#FF69B4",
        "terminal-green": "#00FF41",
        "amber": "#FFB000",
        "soft-black": "#0A0A0A",
        // Pastel Punk additions
        "soft-purple": "#9370DB",
        "soft-blue": "#87CEEB",
        "soft-yellow": "#F9E79F",
        "soft-mint": "#98FB98",
      },
      fontFamily: {
        "mono": ["JetBrains Mono", "Courier New", "monospace"],
        "sans": ["-apple-system", "system-ui", "sans-serif"],
      },
      boxShadow: {
        "brutal": "4px 4px 0px 0px #000",
        "brutal-sm": "2px 2px 0px 0px #000",
        "brutal-lg": "6px 6px 0px 0px #000",
      },
      keyframes: {
        "glow": {
          "0%, 100%": { boxShadow: "0 0 5px #00FF41, 0 0 10px #00FF41" },
          "50%": { boxShadow: "0 0 20px #00FF41, 0 0 30px #00FF41" },
        },
        "bounce-subtle": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-2px)" },
        },
        "spring": {
          "0%": { transform: "scale(1) rotate(0deg)" },
          "20%": { transform: "scale(1.1) rotate(2deg)" },
          "40%": { transform: "scale(0.95) rotate(-1deg)" },
          "60%": { transform: "scale(1.05) rotate(0.5deg)" },
          "80%": { transform: "scale(0.98) rotate(-0.5deg)" },
          "100%": { transform: "scale(1) rotate(0deg)" },
        },
        "wiggle": {
          "0%, 100%": { transform: "rotate(-3deg)" },
          "50%": { transform: "rotate(3deg)" },
        },
        "pop": {
          "0%": { transform: "scale(0.95)", opacity: "0.7" },
          "40%": { transform: "scale(1.02)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "slide-up": {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.8" },
        },
        "jello": {
          "0%, 100%": { transform: "skewX(0deg) skewY(0deg)" },
          "30%": { transform: "skewX(-12.5deg) skewY(-12.5deg)" },
          "40%": { transform: "skewX(6.25deg) skewY(6.25deg)" },
          "50%": { transform: "skewX(-3.125deg) skewY(-3.125deg)" },
          "65%": { transform: "skewX(1.5625deg) skewY(1.5625deg)" },
          "75%": { transform: "skewX(-0.78125deg) skewY(-0.78125deg)" },
          "85%": { transform: "skewX(0.390625deg) skewY(0.390625deg)" },
          "95%": { transform: "skewX(-0.1953125deg) skewY(-0.1953125deg)" },
        },
      },
      animation: {
        "glow": "glow 2s ease-in-out infinite",
        "bounce-subtle": "bounce-subtle 0.3s ease-in-out",
        "spring": "spring 0.5s ease-out",
        "wiggle": "wiggle 0.15s ease-in-out",
        "pop": "pop 0.3s ease-out",
        "slide-up": "slide-up 0.4s ease-out",
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
        "jello": "jello 0.8s ease-in-out",
      },
    },
  },
  plugins: [],
} satisfies Config;
