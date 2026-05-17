// ===================================================================
// TERMINAL DISPLAY - Shared terminal window component
// ===================================================================
// Used by both TextToAscii and AsciiGallery for consistent UI

// deno-lint-ignore-file react-no-danger no-unused-vars

import { useEffect, useRef, useState } from "preact/hooks";
import { sounds } from "../utils/sounds.ts";
import {
  copyToClipboard,
  downloadPNG,
  downloadText,
} from "../utils/exportUtils.ts";
import { TypedWriter } from "./TypedWriter.tsx";

/**
 * Get CSS filter string for visual effects
 * NOTE: text-shadow is handled via --terminal-text-shadow CSS variable
 * Only override shadow for extreme effects like glitch/thermal/hologram
 */
function getVisualEffectStyle(effect?: string): string {
  let css = "";
  switch (effect) {
    case "none":
      css = "filter: none; text-shadow: none;";
      break;
    case "neon":
      // Use CSS variable shadow
      css = "filter: saturate(1.1) brightness(1.0);";
      break;
    case "glitch":
      // Custom multi-color shadow for glitch effect
      css =
        "filter: saturate(2.5) contrast(1.5); text-shadow: -3px 0 4px #ff00ff, 3px 0 4px #00ffff, -2px 0 2px #ff0000, 2px 0 2px #00ff00;";
      break;
    case "thermal":
      // Custom warm shadow for thermal effect
      css =
        "filter: saturate(2) contrast(1.8) brightness(1.3) hue-rotate(20deg); text-shadow: 0 0 10px #ff6600, 0 0 20px #ff3300;";
      break;
    case "hologram":
      // Custom cyan/magenta shadow for hologram
      css =
        "filter: saturate(1.8) brightness(1.5); text-shadow: 0 0 10px currentColor, 0 0 20px #00ffff, 0 0 30px #ff00ff; opacity: 0.9;";
      break;
    case "retro":
      // Use CSS variable shadow
      css = "filter: saturate(1.4) contrast(1.2) blur(0.3px);";
      break;
    case "cyberpunk":
      // Custom dual-color shadow for cyberpunk
      css =
        "filter: saturate(2) contrast(1.3); text-shadow: -1px 0 2px #ff00ff, 1px 0 2px #00ffff, 0 0 8px currentColor;";
      break;
    default:
      // Default to subtle filter, let CSS variable handle shadow
      css = "filter: saturate(1.1) brightness(1.0);";
  }
  return css;
}

interface TerminalDisplayProps {
  /** Plain text content to display */
  content: string;
  /** HTML content with color spans (optional) */
  htmlContent?: string;
  /** HTML content for header segment */
  headerHtmlContent?: string;
  /** HTML content for body segment */
  bodyHtmlContent?: string;
  /** Plain text for header segment */
  headerPlainText?: string;
  /** Plain text for body segment */
  bodyPlainText?: string;
  /** Whether content is currently loading */
  isLoading?: boolean;
  /** Filename for downloads (without extension) */
  filename?: string;
  /** Optional shuffle handler for gallery mode */
  onShuffle?: () => void;
  /** Terminal title bar path */
  terminalPath?: string;
  /** Whether to show shuffle button in menu bar */
  showShuffleButton?: boolean;
  /** Visual effect to apply (glow, saturation, etc.) */
  visualEffect?: string;
  /** Hide export buttons (for cosmic-horoscope which renders them externally) */
  hideExportButtons?: boolean;
  /** Enable typewriter effect (default: false) */
  enableTypewriter?: boolean;
  /** Typewriter speed in ms per character (default: 60) */
  typewriterSpeed?: number;
  /** Header typing speed override (ms per character) */
  headerTypeSpeed?: number;
  /** Current period (for horoscope mode) */
  currentPeriod?: string;
  /** Period change handler (for horoscope mode) */
  onPeriodChange?: (period: string) => void;
}

export function TerminalDisplay({
  content,
  htmlContent,
  headerHtmlContent,
  bodyHtmlContent,
  headerPlainText,
  bodyPlainText,
  isLoading = false,
  filename = "ascii-art",
  onShuffle,
  terminalPath = "~/output/text-art.txt",
  showShuffleButton = false,
  visualEffect = "subtle",
  hideExportButtons = false,
  enableTypewriter = false,
  typewriterSpeed = 60,
  headerTypeSpeed,
  currentPeriod,
  onPeriodChange,
}: TerminalDisplayProps) {
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const [typingComplete, setTypingComplete] = useState(false);
  const [headerTypingComplete, setHeaderTypingComplete] = useState(
    !headerHtmlContent,
  );
  const copyTimeoutRef = useRef<number | null>(null);
  const periodOptions = [
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly" },
    { value: "monthly", label: "Monthly" },
  ];

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current !== null) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setTypingComplete(false);
    setHeaderTypingComplete(!headerHtmlContent);
  }, [
    content,
    htmlContent,
    headerHtmlContent,
    bodyHtmlContent,
    headerPlainText,
    bodyPlainText,
    enableTypewriter,
  ]);

  const handleCopy = async () => {
    const success = await copyToClipboard(
      content,
      htmlContent || content,
      "email",
    );
    if (success) {
      setCopiedToClipboard(true);
      // Clear any existing timeout
      if (copyTimeoutRef.current !== null) {
        clearTimeout(copyTimeoutRef.current);
      }
      // Set new timeout and store reference
      copyTimeoutRef.current = setTimeout(() => {
        setCopiedToClipboard(false);
        copyTimeoutRef.current = null;
      }, 2000) as unknown as number;
    }
  };

  const handleDownloadText = () => {
    downloadText(content, htmlContent || "", filename);
  };

  const handleDownloadPNG = async () => {
    await downloadPNG(".ascii-display", filename);
  };

  const hasContent = Boolean(content);
  const splitTypewriter = Boolean(
    enableTypewriter &&
      headerHtmlContent &&
      bodyHtmlContent &&
      headerPlainText &&
      bodyPlainText,
  );
  const fastHeaderSpeed = headerTypeSpeed ??
    Math.max(4, Math.floor(typewriterSpeed / 2));
  const baseTextStyle = [
    "font-family: 'JetBrains Mono', 'SF Mono', 'Courier New', monospace",
    "color: rgba(0, 255, 65, 0.9)",
    "font-size: 17px",
    "line-height: 1.45",
    "letter-spacing: 0.012em",
    "white-space: pre",
    "word-break: normal",
    "overflow-wrap: normal",
    "margin: 0",
    "padding: 0",
    "display: block",
    "position: relative",
    "max-width: 100%",
    "width: 100%",
    "box-sizing: border-box",
    "text-align: left",
    "text-indent: 0",
    "font-weight: 400",
    "filter: none",
    "text-shadow: 0 0 6px rgba(0, 255, 65, 0.25)",
  ].join("; ");

  return (
    <div class="rounded-xl sm:rounded-2xl lg:rounded-3xl relative flex flex-col mx-auto terminal-window">
      <style>
        {`
          .terminal-window {
            /* Palette tokens */
            --terminal-color-mauveine-rgb: 128 0 150;
            --terminal-color-veronica-rgb: 178 0 209;
            --terminal-color-rose-rgb: 255 0 132;
            --terminal-color-pumpkin-rgb: 255 106 0;
            --terminal-color-orange-peel-rgb: 255 162 0;
            --terminal-color-neon-rgb: 28 255 107;

            /* Derived tokens */
            --terminal-border-color: var(--color-border, rgb(var(--terminal-color-veronica-rgb)));
            --terminal-bg-base: rgb(2 4 12 / 0.98);
            --terminal-bg-layer-sunset: linear-gradient(
              135deg,
              rgb(var(--terminal-color-pumpkin-rgb) / 0.12) 0%,
              rgb(var(--terminal-color-rose-rgb) / 0.1) 38%,
              rgb(var(--terminal-color-veronica-rgb) / 0.11) 68%,
              rgb(var(--terminal-color-mauveine-rgb) / 0.14) 100%
            );
            --terminal-bg-layer-north: radial-gradient(
              circle at 20% 16%,
              rgb(var(--terminal-color-rose-rgb) / 0.09),
              transparent 56%
            );
            --terminal-bg-layer-south: radial-gradient(
              circle at 78% 86%,
              rgb(var(--terminal-color-orange-peel-rgb) / 0.09),
              transparent 62%
            );
            --terminal-shadow-midnight: rgb(0 0 0 / 0.7);
            --terminal-shadow-soft: rgb(0 0 0 / 0.5);
            --terminal-shadow-offset: rgb(0 0 0 / 0.38);
            --terminal-shadow-hover-midnight: rgb(0 0 0 / 0.8);
            --terminal-shadow-hover-soft: rgb(0 0 0 / 0.58);
            --terminal-shadow-hover-offset: rgb(0 0 0 / 0.4);
            --terminal-shadow-breathe-a: rgb(0 0 0 / 0.64);
            --terminal-shadow-breathe-b: rgb(65 32 128 / 0.45);
            --terminal-shadow-breathe-offset: rgb(0 0 0 / 0.34);
            --terminal-shadow-breathe-a-strong: rgb(0 0 0 / 0.76);
            --terminal-shadow-breathe-accent: rgb(109 40 217 / 0.4);
            --terminal-shadow-breathe-offset-strong: rgb(12 10 32 / 0.5);
            --terminal-shadow-breathe-max: rgb(0 0 0 / 0.88);
            --terminal-shadow-breathe-highlight: rgb(168 85 247 / 0.42);
            --terminal-shadow-breathe-offset-max: rgb(18 16 48 / 0.55);
            --terminal-shadow-breathe-a-hover: rgb(0 0 0 / 0.8);
            --terminal-shadow-breathe-deep: rgb(88 28 135 / 0.42);
            --terminal-shadow-breathe-offset-soft: rgb(10 8 28 / 0.48);
            --terminal-text-color: rgb(var(--terminal-color-neon-rgb));
            --terminal-text-filter: saturate(1.65) brightness(1.08);
            --terminal-text-shadow: 0 0 2px rgba(0, 0, 0, 0.3), 0 0 4px currentColor;
            --terminal-glow-magenta: rgb(var(--terminal-color-rose-rgb) / 0.28);
            --terminal-glow-violet: rgb(var(--terminal-color-veronica-rgb) / 0.24);
            --terminal-glow-amber: rgb(var(--terminal-color-orange-peel-rgb) / 0.18);
            --terminal-border-hover: rgb(var(--terminal-color-veronica-rgb) / 0.95);
            --terminal-overlay-light: rgb(255 255 255 / 0.02);
            --terminal-overlay-dark: rgb(0 0 0 / 0.025);

            opacity: 1 !important;
            width: 76vw !important;
            max-width: 76vw !important;
            min-height: 60vh !important;
            margin: 0 auto !important;
            overflow: visible;
            background:
              var(--terminal-bg-layer-sunset),
              var(--terminal-bg-layer-north),
              var(--terminal-bg-layer-south),
              var(--terminal-bg-base);
            border: none;
            animation: float-breathe 9s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
            box-shadow:
              0 30px 60px var(--terminal-shadow-midnight),
              0 15px 30px var(--terminal-shadow-soft),
              14px 14px 0 var(--terminal-shadow-offset);
            backdrop-filter: blur(6px) saturate(110%);
            -webkit-backdrop-filter: blur(6px) saturate(110%);
            transform-origin: center;
            transition: transform 0.45s ease, box-shadow 0.45s ease, filter 0.3s ease;
            will-change: transform, box-shadow;
          }


          .terminal-window:hover {
            transform: translateY(-8px) scale(1.008);
            box-shadow:
              0 44px 76px var(--terminal-shadow-hover-midnight),
              0 22px 36px var(--terminal-shadow-hover-soft),
              18px 18px 0 var(--terminal-shadow-hover-offset);
            filter: brightness(1.05);
            animation-play-state: paused;
          }

          /* Aura is rendered via ::before; keep gradients edge-weighted so the frosted interior stays clear */
          .terminal-window::before {
            content: "";
            position: absolute;
            inset: -28px;
            border-radius: inherit;
            background:
              radial-gradient(140% 140% at 50% 12%,
                rgb(var(--terminal-color-pumpkin-rgb) / 0.32),
                rgb(var(--terminal-color-orange-peel-rgb) / 0.28) 28%,
                transparent 58%),
              radial-gradient(130% 130% at 50% 88%,
                rgb(var(--terminal-color-veronica-rgb) / 0.36),
                rgb(var(--terminal-color-mauveine-rgb) / 0.32) 32%,
                transparent 62%),
              radial-gradient(ellipse 110% 150% at 18% 50%,
                rgb(var(--terminal-color-rose-rgb) / 0.24),
                transparent 54%),
              radial-gradient(ellipse 110% 150% at 82% 50%,
                rgb(var(--terminal-color-orange-peel-rgb) / 0.22),
                transparent 52%);
            opacity: 0.48;
            transform-origin: center;
            animation: aura-pulse 14s ease-in-out infinite;
            pointer-events: none;
            mix-blend-mode: screen;
            z-index: 0;
          }

          /* Film grain overlay - sits behind content, only affects window chrome */
          .terminal-window::after {
            content: "";
            position: absolute;
            inset: 0;
            border-radius: inherit;
            pointer-events: none;
            background:
              repeating-linear-gradient(
                120deg,
                var(--terminal-overlay-light),
                var(--terminal-overlay-light) 1px,
                transparent 1px,
                transparent 3px
              ),
              repeating-linear-gradient(
                45deg,
                var(--terminal-overlay-dark),
                var(--terminal-overlay-dark) 1px,
                transparent 1px,
                transparent 2px
              ),
              repeating-linear-gradient(
                90deg,
                transparent,
                transparent 1px,
                rgb(255 255 255 / 0.015) 2px,
                transparent 3px
              );
            opacity: 0.18;
            mix-blend-mode: overlay;
            animation: grain-shift 1.8s steps(8) infinite;
            z-index: 1;
          }

          .terminal-header {
            position: relative;
            overflow: visible;
            border-bottom-width: 3px !important;
            border-color: var(--terminal-border-color) !important;
            background: rgba(0, 0, 0, 1) !important;
            border-radius: 0 !important;
          }

          @media (max-width: 639px) {
            .terminal-window {
              width: 92vw !important;
              max-width: 92vw !important;
              min-height: 72vh !important;
            }
            .terminal-header {
              border-bottom-width: 3px !important;
            }
          }

          @media (min-width: 640px) {
            .terminal-window {
              border-width: 6px !important;
              width: 85vw !important;
              max-width: 85vw !important;
              min-height: 66vh !important;
            }
            .terminal-header {
              border-bottom-width: 4px !important;
            }
          }

          @media (min-width: 1024px) {
            .terminal-window {
              border-width: 8px !important;
              width: 76vw !important;
              max-width: 76vw !important;
              min-height: 60vh !important;
            }
            .terminal-header {
              border-bottom-width: 5px !important;
            }
          }

          @keyframes gradient-shift {
            0% {
              background-position: 0% 0%, 0% 0%, 0% 0%, 0% 0%, 0% 0%, 0% 0%;
            }
            50% {
              background-position: 0% 0%, 0% 0%, 0% 0%, 0% 0%, 0% 0%, 400% 400%;
            }
            100% {
              background-position: 0% 0%, 0% 0%, 0% 0%, 0% 0%, 0% 0%, 0% 0%;
            }
          }

          @keyframes float-breathe {
            0% {
              transform: translateY(0) scale(1) rotate(0deg);
              box-shadow:
                0 28px 50px var(--terminal-shadow-breathe-a),
                0 14px 28px var(--terminal-shadow-breathe-b),
                14px 14px 0 var(--terminal-shadow-breathe-offset);
            }
            25% {
              transform: translateY(-12px) scale(1.006) rotate(0.3deg);
              box-shadow:
                0 36px 64px var(--terminal-shadow-breathe-a-strong),
                0 22px 40px var(--terminal-shadow-breathe-accent),
                16px 16px 0 var(--terminal-shadow-breathe-offset-strong);
            }
            50% {
              transform: translateY(-20px) scale(1.012) rotate(-0.2deg);
              box-shadow:
                0 48px 84px var(--terminal-shadow-breathe-max),
                0 30px 52px var(--terminal-shadow-breathe-highlight),
                20px 20px 0 var(--terminal-shadow-breathe-offset-max);
            }
            75% {
              transform: translateY(-10px) scale(1.006) rotate(0.15deg);
              box-shadow:
                0 38px 68px var(--terminal-shadow-breathe-a-hover),
                0 20px 36px var(--terminal-shadow-breathe-deep),
                16px 16px 0 var(--terminal-shadow-breathe-offset-soft);
            }
            100% {
              transform: translateY(0) scale(1) rotate(0deg);
              box-shadow:
                0 28px 50px var(--terminal-shadow-breathe-a),
                0 14px 28px var(--terminal-shadow-breathe-b),
                14px 14px 0 var(--terminal-shadow-breathe-offset);
            }
          }

          @keyframes vhs-wobble {
            0%, 100% {
              transform: rotate(-0.4deg) translate3d(0, 0, 0) scale(1);
              filter: hue-rotate(0deg) brightness(1);
            }
            22% {
              transform: rotate(0.4deg) translate3d(1.2px, 0, 0) scale(1.001);
              filter: hue-rotate(-3deg) brightness(0.998);
            }
            46% {
              transform: rotate(-0.25deg) translate3d(-0.8px, 0.5px, 0) scale(0.9995);
              filter: hue-rotate(4deg) brightness(1.002);
            }
            68% {
              transform: rotate(0.2deg) translate3d(0.5px, -0.3px, 0) scale(1.0005);
              filter: hue-rotate(-2deg) brightness(0.999);
            }
            84% {
              transform: rotate(-0.15deg) translate3d(-0.4px, 0, 0) scale(1);
              filter: hue-rotate(1deg) brightness(1.001);
            }
          }

          @keyframes scanline-flicker {
            0%, 100% { opacity: 0.18; }
            40% { opacity: 0.22; }
            50% { opacity: 0.28; }
            60% { opacity: 0.18; }
          }

          @keyframes chroma-shift {
            0%, 100% {
              transform: translate3d(0, 0, 0);
            }
            30% {
              transform: translate3d(-1px, 0, 0);
            }
            55% {
              transform: translate3d(1px, 0, 0);
            }
            70% {
              transform: translate3d(-0.5px, 0, 0);
            }
          }


          @keyframes aura-pulse {
            0%, 100% {
              opacity: 0.42;
              transform: scale(1) translate3d(0, 0, 0) rotate(0deg);
              filter: blur(32px) saturate(140%) hue-rotate(0deg);
            }
            28% {
              opacity: 0.48;
              transform: scale(1.04) translate3d(0, -4px, 0) rotate(0.5deg);
              filter: blur(36px) saturate(155%) hue-rotate(3deg);
            }
            52% {
              opacity: 0.56;
              transform: scale(1.08) translate3d(0, -8px, 0) rotate(-0.3deg);
              filter: blur(38px) saturate(165%) hue-rotate(-2deg);
            }
            74% {
              opacity: 0.44;
              transform: scale(0.98) translate3d(0, 2px, 0) rotate(0.2deg);
              filter: blur(30px) saturate(135%) hue-rotate(1deg);
            }
          }

          @keyframes grain-shift {
            0% {
              background-position: 0 0, 0 0, 0 0;
            }
            50% {
              background-position: 11px 7px, -7px -12px, 4px -3px;
            }
            100% {
              background-position: -5px 10px, 9px -8px, -6px 5px;
            }
          }

          @keyframes scanline-scroll {
            0% {
              background-position: 0 0;
            }
            100% {
              background-position: 0 4px;
            }
          }

          @media (prefers-reduced-motion: reduce) {
            .terminal-window,
            .terminal-window::before,
            .terminal-window::after,
            .terminal-content::before,
            .terminal-content::after {
              animation: none !important;
              transition: none !important;
            }
          }
        `}
      </style>
      {/* Terminal Menu Bar - Fully opaque to match content */}
      <div
        class="px-4 sm:px-6 py-3 sm:py-4 border-b flex items-center justify-between terminal-header"
        style="background-color: rgba(0, 0, 0, 1); border-color: rgba(168, 85, 247, 0.45); position: relative; z-index: 20;"
      >
        <div class="traffic-lights">
          <style>
            {`
              .traffic-lights {
                display: flex;
                gap: 6px;
              }

              .traffic-light {
                width: 8px;
                height: 8px;
                border-radius: 999px;
                background: #ff5f57;
                box-shadow: 0 0 6px rgba(255,95,87,0.7);
              }

              .traffic-light:nth-child(2) {
                background: #ffbd2e;
                box-shadow: 0 0 6px rgba(255,189,46,0.7);
              }

              .traffic-light:nth-child(3) {
                background: #28c840;
                box-shadow: 0 0 6px rgba(40,200,64,0.7);
                animation: breathe 2.6s ease-in-out infinite;
              }

              @keyframes breathe {
                0%, 100% { box-shadow: 0 0 4px rgba(40,200,64,0.3); }
                50% { box-shadow: 0 0 14px rgba(40,200,64,0.9); }
              }
            `}
          </style>
          <div class="traffic-light" title="Close"></div>
          <div class="traffic-light" title="Minimize"></div>
          <div class="traffic-light" title="Maximize"></div>
        </div>
        <div class="flex items-center gap-2 sm:gap-4">
          {/* Only show terminal path when NOT in horoscope mode */}
          {!onPeriodChange && (
            <span
              class="text-xs sm:text-sm font-mono opacity-70 hidden sm:inline tracking-[0.2em]"
              style="color: #00FF41"
            >
              {terminalPath}
            </span>
          )}

          {/* Period toggle (horoscope mode) */}
          {onPeriodChange && currentPeriod && (
            <div class="horoscope-nav">
              <style>
                {`
                  .horoscope-nav {
                    display: flex;
                    gap: 1.5rem;
                    font-family: var(--sans);
                    font-size: 11px;
                    letter-spacing: 0.16em;
                    text-transform: uppercase;
                  }

                  .horoscope-nav button {
                    position: relative;
                    background: none;
                    border: none;
                    color: #3cff8f;
                    padding: 0;
                    cursor: pointer;
                    opacity: 0.6;
                    transition: opacity 160ms ease-out, transform 120ms ease-out;
                  }

                  .horoscope-nav button::after {
                    content: "";
                    position: absolute;
                    left: 0;
                    right: 0;
                    bottom: -4px;
                    height: 2px;
                    background: linear-gradient(90deg, #3cff8f, #a3ffcf);
                    transform-origin: center;
                    transform: scaleX(0);
                    transition: transform 160ms ease-out;
                  }

                  .horoscope-nav button:hover {
                    opacity: 1;
                    transform: translateY(-1px);
                    text-shadow: 0 0 12px rgba(60, 255, 143, 0.8);
                  }

                  .horoscope-nav button:hover::after,
                  .horoscope-nav button.is-active::after {
                    transform: scaleX(1);
                    box-shadow: 0 0 10px rgba(60, 255, 143, 0.6);
                  }

                  .horoscope-nav button.is-active {
                    opacity: 1;
                    text-shadow: 0 0 8px rgba(60, 255, 143, 0.5);
                  }
                `}
              </style>
              {periodOptions.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  class={value === currentPeriod ? "is-active" : ""}
                  onMouseEnter={() => sounds.hover()}
                  onClick={() => {
                    if (value !== currentPeriod) {
                      sounds.click();
                      onPeriodChange(value);
                    }
                  }}
                >
                  {label.toUpperCase()}
                </button>
              ))}
            </div>
          )}

          {/* Shuffle button in menu bar (gallery mode) */}
          {showShuffleButton && onShuffle && hasContent && (
            <button
              type="button"
              onClick={onShuffle}
              class="px-3 py-2 text-sm font-mono font-bold transition-all hover:scale-110 active:scale-95 opacity-80 hover:opacity-100 tracking-[0.1em]"
              style="color: #00FF41"
              title="Get a random ASCII art"
            >
              🎲
            </button>
          )}
        </div>
      </div>

      {/* Terminal Content Area */}
      <div
        class="transition-all duration-700 terminal-content relative z-10"
        style="padding: 20px; background-color: #000000 !important; background: #000000 !important; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); overflow-x: hidden; overflow-y: auto; border: 1px solid rgba(255, 255, 255, 0.08); box-shadow: inset 0 0 28px rgba(0, 0, 0, 0.58); backdrop-filter: blur(18px) saturate(140%); -webkit-backdrop-filter: blur(18px) saturate(140%); min-height: 55vh;"
      >
        <style>
          {`
            .terminal-content {
              background-color: #000000 !important;
              background: #000000 !important;
              overflow-x: hidden;
              overflow-y: auto;
              padding: 20px !important;
              border: none;
              box-shadow: inset 0 0 28px rgba(0, 0, 0, 0.55);
              backdrop-filter: blur(18px) saturate(140%);
              -webkit-backdrop-filter: blur(18px) saturate(140%);
              position: relative;
              min-height: 55vh;
              isolation: isolate;
              border-radius: 0 0 0.75rem 0.75rem;
            }

            @media (min-width: 640px) {
              .terminal-content {
                border-radius: 0 0 1rem 1rem;
              }
            }

            @media (min-width: 1024px) {
              .terminal-content {
                border-radius: 0 0 1.5rem 1.5rem;
              }
            }

            .terminal-content::before {
              content: "";
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              pointer-events: none;
              background:
                radial-gradient(circle at 28% 18%, rgba(247, 118, 43, 0.22), transparent 58%),
                radial-gradient(circle at 72% 78%, rgba(120, 74, 255, 0.18), transparent 62%);
              opacity: 0.5;
              mix-blend-mode: screen;
              transition: opacity 0.45s ease;
              z-index: 10;
            }

            .terminal-content::after {
              content: "";
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              pointer-events: none;
              background:
                linear-gradient(90deg, rgba(0, 255, 242, 0.12), rgba(255, 71, 178, 0.12)),
                repeating-linear-gradient(
                  0deg,
                  rgba(255, 255, 255, 0.09),
                  rgba(255, 255, 255, 0.09) 1px,
                  transparent 1px,
                  transparent 3px
                );
              mix-blend-mode: screen;
              opacity: 0.2;
              animation: scanline-flicker 4s linear infinite, chroma-shift 7.2s ease-in-out infinite;
              z-index: 10;
            }

            @media (max-width: 639px) {
              .terminal-content {
                min-height: 68vh !important;
              }
            }
            @media (min-width: 640px) {
              .terminal-content {
                padding: 32px !important;
                min-height: 62vh !important;
              }
            }
            @media (min-width: 1024px) {
              .terminal-content {
                padding: 44px !important;
                min-height: 55vh !important;
              }
            }
          `}
        </style>
        <div class="terminal-text relative z-20" style="min-height: 100%;">
          {isLoading && !content
            ? (
              <div class="flex items-start justify-start w-full pt-2 pl-2">
                <pre
                  class="font-mono text-lg animate-loading-cursor"
                  style="color: #00FF41;"
                >
                <span class="blinking-cursor">█</span>
                </pre>
              </div>
            )
            : splitTypewriter
            ? (
              <div class="flex flex-col gap-6">
                <div class="border-b border-[rgba(0,255,65,0.25)] pb-4">
                  <TypedWriter
                    key={`header-${filename}`}
                    text={headerPlainText!}
                    htmlText={headerHtmlContent!}
                    speed={fastHeaderSpeed}
                    enabled
                    onComplete={() => setHeaderTypingComplete(true)}
                    showCompletionCursor={false}
                    className="ascii-display font-mono opacity-90"
                    style={`${baseTextStyle}; ${
                      getVisualEffectStyle(visualEffect)
                    }`}
                  />
                </div>
                {headerTypingComplete && (
                  <div class="pt-2">
                    <TypedWriter
                      key={`body-${filename}`}
                      text={bodyPlainText!}
                      htmlText={bodyHtmlContent!}
                      speed={typewriterSpeed}
                      enabled
                      onComplete={() => setTypingComplete(true)}
                      showCompletionCursor
                      className="ascii-display font-mono opacity-90"
                      style={`${baseTextStyle}; ${
                        getVisualEffectStyle(visualEffect)
                      }`}
                    />
                  </div>
                )}
              </div>
            )
            : (htmlContent || content) && enableTypewriter
            ? (
              // Typewriter mode
              <TypedWriter
                text={content}
                htmlText={htmlContent}
                speed={typewriterSpeed}
                enabled
                onComplete={() => setTypingComplete(true)}
                className="ascii-display font-mono opacity-90"
                style={`${baseTextStyle}; ${
                  getVisualEffectStyle(visualEffect)
                }`}
              />
            )
            : htmlContent
            ? (
              // Static HTML mode
              <pre
                class="ascii-display font-mono opacity-90"
                style={`${baseTextStyle}; ${
                  getVisualEffectStyle(visualEffect)
                }`}
                dangerouslySetInnerHTML={{ __html: htmlContent }}
              />
            )
            : content
            ? (
              // Static text mode
              <pre
                class="ascii-display font-mono opacity-90"
                style={`${baseTextStyle}; ${
                  getVisualEffectStyle(visualEffect)
                }`}
              >
              {content}
              </pre>
            )
            : null}
        </div>
      </div>

      {
        /* Share Button - Commented out for now
      {!hideExportButtons && hasContent && (
        <div class="absolute bottom-6 right-6 z-10 animate-pop-in">
          <button
            onClick={async () => {
              sounds.click();
              // Use Web Share API if available
              if (navigator.share) {
                try {
                  await navigator.share({
                    title: 'Cosmic Horoscope',
                    text: content,
                  });
                } catch (err) {
                  // User cancelled or error - fall back to copy
                  handleCopy();
                }
              } else {
                // Desktop - just copy
                handleCopy();
              }
            }}
            class={`px-6 py-3 border-4 rounded-2xl font-mono font-black shadow-brutal-lg transition-all hover:shadow-brutal-xl hover:-translate-y-1 active:translate-y-0 ${
              copiedToClipboard ? "animate-bounce-once" : ""
            }`}
            style={copiedToClipboard
              ? "background-color: #4ADE80; color: #0a0a0a; border-color: #4ADE80;"
              : "background-color: #1a1a1a; color: #00FF41; border-color: #00FF41; box-shadow: 0 0 12px rgba(0,255,65,0.4);"}
            title={navigator.share ? "Share horoscope" : "Copy to clipboard"}
          >
            {copiedToClipboard ? "✅ COPIED!" : "🔗 SHARE"}
          </button>
        </div>
      )}
      */
      }

      <style>
        {`
        /* Blinking cursor animation */
        @keyframes blink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }

        .blinking-cursor {
          animation: blink 1s infinite;
        }

        /* Pop-in animation for export button */
        @keyframes popIn {
          0% {
            opacity: 0;
            transform: scale(0.8) translateY(10px);
          }
          60% {
            transform: scale(1.05) translateY(0);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .animate-pop-in {
          animation: popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        /* Dropdown open animation - light bounce */
        @keyframes dropdownOpen {
          0% {
            opacity: 0;
            transform: translateY(-8px) scale(0.95);
          }
          60% {
            opacity: 1;
            transform: translateY(2px) scale(1.01);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .animate-dropdown-open {
          animation: dropdownOpen 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        /* Brutal Shadows - Chunky and bold */
        .shadow-brutal {
          box-shadow: 4px 4px 0 var(--color-border, #0A0A0A);
        }

        .shadow-brutal-lg {
          box-shadow: 6px 6px 0 var(--color-border, #0A0A0A);
        }

        .shadow-brutal-xl {
          box-shadow: 8px 8px 0 var(--color-border, #0A0A0A);
        }

        .hover\\:shadow-brutal-xl:hover {
          box-shadow: 8px 8px 0 var(--color-border, #0A0A0A);
        }

        /* Bounce once animation for copy success */
        @keyframes bounceOnce {
          0%, 100% { transform: translateY(0); }
          25% { transform: translateY(-10px); }
          50% { transform: translateY(0); }
          75% { transform: translateY(-5px); }
        }

        .animate-bounce-once {
          animation: bounceOnce 0.5s ease-out;
        }

        /* Loading cursor animation */
        @keyframes loadingCursor {
          0% { transform: translateX(0); }
          50% { transform: translateX(40px); }
          100% { transform: translateX(40px); }
        }

        .animate-loading-cursor {
          animation: loadingCursor 1.5s ease-out;
        }

        /* Transform utilities */
        .hover\\:-translate-y-1:hover {
          transform: translateY(-4px);
        }

        .active\\:translate-y-0:active {
          transform: translateY(0);
        }

        /* Responsive letter-spacing for ASCII display - matches asciifier-web */
        .ascii-display {
          letter-spacing: 0.2px;
          white-space: pre-wrap;
          word-break: break-word;
          overflow-wrap: anywhere;
          max-width: 100%;
          box-sizing: border-box;
        }
        @media (min-width: 640px) {
          .ascii-display {
            letter-spacing: 0.4px;
          }
        }
        @media (min-width: 768px) {
          .ascii-display {
            letter-spacing: 0.6px;
          }
        }
        @media (min-width: 1024px) {
          .ascii-display {
            letter-spacing: 0.8px;
          }
        }
      `}
      </style>
    </div>
  );
}
