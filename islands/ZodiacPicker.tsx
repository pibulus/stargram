// ===================================================================
// ZODIAC PICKER ISLAND - Terminal-flavored sign selector + horoscope
// ===================================================================

import { signal } from "@preact/signals";
import { useEffect, useMemo } from "preact/hooks";
import {
  saveZodiacSign,
  ZODIAC_SIGNS,
  type ZodiacSign,
} from "../utils/zodiac.ts";
import { sounds } from "../utils/sounds.ts";
import { renderFigletText } from "../utils/asciiArtGenerator.ts";
import { applyColorToArt } from "../utils/colorEffects.ts";
import { TypedWriter } from "../components/TypedWriter.tsx";

const PRIMARY_TERMINAL_COLOR = "#00FF41";
const ACCENT_COLORS = [
  "#74FBA4",
  "#00F5FF",
  "#FF71F6",
  "#F5F349",
  "#8CF1FF",
  "#FF8DF1",
  "#7DF4FF",
];

const selectedSign = signal<string | null>(null);
const hoveredSign = signal<string | null>(null);
const flickerTrigger = signal<number>(0);
const mouseX = signal<number>(0);
const mouseY = signal<number>(0);

// Horoscope mode states
type Mode = "picker" | "horoscope";
type Period = "daily" | "weekly" | "monthly";
type DossierMetaItem = {
  label: string;
  value: string;
  special?: "number" | "energy" | "color" | "vibe";
  hex?: string;
};

const currentMode = signal<Mode>("picker");
const currentPeriod = signal<Period>("daily");
const isLoadingHoroscope = signal(false);
const horoscopeHtml = signal("");
const horoscopePlainText = signal("");
const horoscopeHeaderHtml = signal("");
const horoscopeBodyHtml = signal("");
const bootMessages = signal<string[]>([]);
const showHoroscope = signal(false);

const PICKER_TITLE_ASCII = renderFigletText("STARGRAM", {
  font: "ANSI Shadow",
  width: 72,
});
const PICKER_HINT_TEXT = "COSMIC ACCESS PANEL";
const IDLE_PREVIEW_ASCII = [
  " /\\  /\\ ",
  "/  \\/  \\",
  "\\      /",
  " \\_/\\_/ ",
].join("\n");
const ASCII_DIVIDER = "::::::::::::::::::::::::::::::::::::::::";
const COSMIC_ANIMATION_STYLES = `
@keyframes cosmicFloat {
  0% { transform: translate3d(0, 0, 0); }
  50% { transform: translate3d(0, -12px, 8px); }
  100% { transform: translate3d(0, 0, 0); }
}
@keyframes cursorBlink {
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0; }
}
@keyframes crtFlicker {
  0% { filter: brightness(1); }
  50% { filter: brightness(1.25); }
  100% { filter: brightness(1); }
}
@keyframes scanlineScroll {
  0% { background-position: 0 0; }
  100% { background-position: 0 8px; }
}
.cosmic-scrollless {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.cosmic-scrollless::-webkit-scrollbar {
  display: none;
}
.cursor-blink {
  animation: cursorBlink 1s steps(2, start) infinite;
}
.crt-flicker {
  animation: crtFlicker 0.1s ease-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
`;

const SIGN_ASCII_CACHE = new Map<string, string>();

function getSignAsciiArt(sign: string, width = 32): string {
  const key = `${sign.toUpperCase()}-${width}`;
  if (!SIGN_ASCII_CACHE.has(key)) {
    SIGN_ASCII_CACHE.set(
      key,
      renderFigletText(sign.toUpperCase(), {
        font: "Mini",
        width,
      }),
    );
  }
  return SIGN_ASCII_CACHE.get(key)!;
}

function getSignTitle(sign: string): string {
  return sign.toUpperCase();
}

function getSignData(name: string): ZodiacSign | undefined {
  return ZODIAC_SIGNS.find((sign) => sign.name === name);
}

function generateHoroscopeAscii(
  signName: string,
  horoscopeText: string,
  period: string,
  date: string,
): string {
  const signUpper = signName.toUpperCase();
  const periodUpper = period.toUpperCase();
  const metaLine = date ? `${periodUpper} • ${date}` : periodUpper;

  const figletTitle = renderFigletText(signUpper, {
    font: "ANSI Shadow",
    width: 84,
  });

  const sentinel = "═══════════════════════════════════════";
  const starBreaker = "★ ═══════════════════════════════════════ ★";

  const header = `[HEADER_START]
${starBreaker}
${figletTitle}
${metaLine}
[HEADER_END]`;

  return `${header}

${sentinel}

${horoscopeText}`;
}

function splitHoroscopeAscii(ascii: string) {
  const startMarker = "[HEADER_START]";
  const endMarker = "[HEADER_END]";
  const startIndex = ascii.indexOf(startMarker);
  const endIndex = ascii.indexOf(endMarker);

  if (startIndex === -1 || endIndex === -1) {
    return { header: "", body: ascii.trim() };
  }

  const header = ascii.slice(startIndex + startMarker.length, endIndex).trim();
  const body = ascii.slice(endIndex + endMarker.length).trim();
  return { header, body };
}

export default function ZodiacPicker() {
  useEffect(() => {
    const styleEl = document.createElement("style");
    styleEl.textContent = COSMIC_ANIMATION_STYLES;
    document.head.appendChild(styleEl);
    return () => {
      document.head.removeChild(styleEl);
    };
  }, []);

  // Parallax mouse tracking
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / globalThis.innerWidth - 0.5) * 2;
      const y = (e.clientY / globalThis.innerHeight - 0.5) * 2;
      mouseX.value = x;
      mouseY.value = y;
    };

    globalThis.addEventListener("mousemove", handleMouseMove);
    return () => {
      globalThis.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  const { accentColor, accentGlowColor } = useMemo(() => {
    const primaryIndex = Math.floor(Math.random() * ACCENT_COLORS.length);
    const remaining = ACCENT_COLORS.filter((_, idx) => idx !== primaryIndex);
    const secondaryIndex = Math.floor(Math.random() * remaining.length);
    return {
      accentColor: ACCENT_COLORS[primaryIndex],
      accentGlowColor: remaining[secondaryIndex] ??
        ACCENT_COLORS[(primaryIndex + 3) % ACCENT_COLORS.length],
    };
  }, []);

  const fetchHoroscope = async (sign: string, period: Period) => {
    isLoadingHoroscope.value = true;
    bootMessages.value = [
      "> Initializing cosmic link...",
      `> Loading ${sign.toUpperCase()} ${period} horoscope...`,
    ];

    // Boot sequence with delays
    for (let i = 0; i < bootMessages.value.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      sounds.bootStep();
    }

    try {
      const response = await fetch(
        `/api/horoscope?sign=${sign}&period=${period}`,
      );
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }
      const data = await response.json();

      const horoscopeText = data.data?.horoscope_data ?? data.data?.horoscope;
      if (data.success !== false && horoscopeText) {
        const date = data.data.date || "";

        // Generate ASCII art
        const ascii = generateHoroscopeAscii(sign, horoscopeText, period, date);
        horoscopePlainText.value = ascii;

        // Colorize
        const colorized = applyColorToArt(ascii, "trinity");

        horoscopeHtml.value = colorized.fullHtml;
        horoscopeHeaderHtml.value = colorized.headerHtml;
        horoscopeBodyHtml.value = colorized.bodyHtml;

        showHoroscope.value = true;
        sounds.success();
      } else {
        sounds.error();
        console.error("Horoscope fetch failed:", data.error);
      }
    } catch (error) {
      sounds.error();
      console.error("Failed to fetch horoscope:", error);
    } finally {
      isLoadingHoroscope.value = false;
    }
  };

  const handleSignClick = (sign: string) => {
    selectedSign.value = sign;
    saveZodiacSign(sign);
    sounds.selectSign();
    flickerTrigger.value = Date.now(); // Trigger flicker animation

    // Switch to horoscope mode and fetch data
    currentMode.value = "horoscope";
    fetchHoroscope(sign, currentPeriod.value);
  };

  const handleBackToPicker = () => {
    sounds.click();
    currentMode.value = "picker";
    horoscopeHtml.value = "";
    showHoroscope.value = false;
  };

  const handlePeriodChange = (period: Period) => {
    if (!selectedSign.value) return;
    sounds.periodChange();
    currentPeriod.value = period;
    flickerTrigger.value = Date.now();
    showHoroscope.value = false;
    fetchHoroscope(selectedSign.value, period);
  };

  const previewTarget = hoveredSign.value || selectedSign.value;
  const previewSign = previewTarget ? getSignData(previewTarget) : undefined;
  const previewAscii = previewSign
    ? getSignAsciiArt(previewSign.name, 32)
    : IDLE_PREVIEW_ASCII;

  // Random serendipitous content for dossier
  const cosmicExtras = useMemo(() => {
    if (!previewSign) return null;

    const luckyNumber = Math.floor(Math.random() * 999) + 1;
    const cosmicEnergy = Math.floor(Math.random() * 30) + 70; // 70-100%

    const luckyColors = [
      { name: "Cosmic Purple", hex: "#8B5CF6" },
      { name: "Stellar Blue", hex: "#3B82F6" },
      { name: "Nova Pink", hex: "#EC4899" },
      { name: "Nebula Teal", hex: "#14B8A6" },
      { name: "Solar Gold", hex: "#F59E0B" },
      { name: "Void Indigo", hex: "#6366F1" },
    ];
    const luckyColor =
      luckyColors[Math.floor(Math.random() * luckyColors.length)];

    const vibes = [
      "Main character energy",
      "Plot twist incoming",
      "Side quest unlocked",
      "Power-up detected",
      "Boss mode activated",
      "Hidden achievement found",
      "Multiplayer advantage",
      "Critical hit ready",
    ];
    const cosmicVibe = vibes[Math.floor(Math.random() * vibes.length)];

    return { luckyNumber, cosmicEnergy, luckyColor, cosmicVibe };
  }, [previewSign?.name]);

  const dossierMeta: DossierMetaItem[] = previewSign && cosmicExtras
    ? [
      { label: "Element", value: previewSign.element.toUpperCase() },
      { label: "Modality", value: previewSign.modality.toUpperCase() },
      { label: "Ruling Planet", value: previewSign.rulingPlanet.toUpperCase() },
      { label: "Solar Dates", value: previewSign.dates.toUpperCase() },
      {
        label: "Lucky №",
        value: String(cosmicExtras.luckyNumber),
        special: "number",
      },
      {
        label: "Cosmic Energy",
        value: `${cosmicExtras.cosmicEnergy}%`,
        special: "energy",
      },
      {
        label: "Lucky Color",
        value: cosmicExtras.luckyColor.name,
        special: "color",
        hex: cosmicExtras.luckyColor.hex,
      },
      {
        label: "Today's Vibe",
        value: cosmicExtras.cosmicVibe,
        special: "vibe",
      },
    ]
    : [];
  const dossierCursorColor = previewSign ? accentColor : accentGlowColor;

  // Parallax transforms
  const parallaxX = mouseX.value * 8; // Subtle movement
  const parallaxY = mouseY.value * 8;
  const parallaxRotateX = mouseY.value * 2;
  const parallaxRotateY = mouseX.value * -2;

  // Dossier panel parallax (different layer depth)
  const dossierParallaxX = mouseX.value * 12;
  const dossierParallaxY = mouseY.value * 12;
  const dossierRotateX = mouseY.value * 3;
  const dossierRotateY = mouseX.value * -3;

  // Selector panel parallax (middle layer)
  const selectorParallaxX = mouseX.value * 6;
  const selectorParallaxY = mouseY.value * 6;
  const isHoroscopeMode = currentMode.value === "horoscope";

  return (
    <div class="relative w-full min-w-0 overflow-x-hidden">
      <style>
        {`
          .terminal-shell {
            position: relative;
            isolation: isolate;
          }

          .terminal-shell::before {
            content: "";
            position: absolute;
            inset: 0;
            pointer-events: none;
            background: repeating-linear-gradient(
              0deg,
              rgba(255, 255, 255, 0.03),
              rgba(255, 255, 255, 0.03) 1px,
              transparent 1px,
              transparent 2px
            );
            animation: scanlineScroll 8s linear infinite;
            opacity: 0.4;
            z-index: 100;
            border-radius: inherit;
          }

          .terminal-shell::after {
            content: "";
            position: absolute;
            inset: 0;
            pointer-events: none;
            background:
              repeating-linear-gradient(
                120deg,
                rgba(255, 255, 255, 0.015),
                rgba(255, 255, 255, 0.015) 1px,
                transparent 1px,
                transparent 3px
              ),
              repeating-linear-gradient(
                45deg,
                rgba(0, 0, 0, 0.02),
                rgba(0, 0, 0, 0.02) 1px,
                transparent 1px,
                transparent 2px
              );
            opacity: 0.25;
            z-index: 100;
            border-radius: inherit;
          }

          .terminal-content-wrapper {
            position: relative;
            z-index: 10;
          }

          @media (hover: none), (max-width: 767px) {
            .terminal-shell,
            .selector-panel-motion,
            .dossier-panel-motion {
              animation: none !important;
              transform: none !important;
              transition: none !important;
            }

            .terminal-shell::before {
              animation: none !important;
              opacity: 0.28;
            }
          }
        `}
      </style>
      <div class="w-full min-w-0 min-h-[100dvh] flex items-start sm:items-center justify-center px-2 sm:px-6 py-4 sm:py-8 md:py-12 overflow-x-hidden">
        <div
          key={flickerTrigger.value}
          class={`w-full min-w-0 max-w-[calc(100vw-1rem)] ${
            isHoroscopeMode ? "sm:max-w-4xl" : "sm:max-w-6xl"
          } border-[3px] sm:border-4 rounded-[18px] sm:rounded-3xl shadow-[0_30px_80px_rgba(0,0,0,0.8)] overflow-visible terminal-shell ${
            flickerTrigger.value > 0 ? "crt-flicker" : ""
          }`}
          style={`background: rgba(2, 4, 12, 0.95); border-color: ${accentGlowColor}80; box-shadow: 0 0 30px ${accentGlowColor}24, 0 18px 60px rgba(0,0,0,0.68), inset 0 0 64px rgba(0,0,0,0.6); animation: cosmicFloat 12s ease-in-out infinite; transform: perspective(1000px) rotateX(${parallaxRotateX}deg) rotateY(${parallaxRotateY}deg) translate3d(${parallaxX}px, ${parallaxY}px, 0); transition: transform 0.3s ease-out; min-height: ${
            isHoroscopeMode
              ? "min(660px, calc(100dvh - 2rem))"
              : "min(700px, calc(100dvh - 2rem))"
          }; width: 100%; overflow: visible;`}
        >
          {/* Terminal title bar */}
          <div
            class="flex items-center gap-3 px-4 sm:px-8 py-3 border-b-[3px] sm:border-b-4 terminal-content-wrapper"
            style="border-color: rgba(0, 255, 65, 0.18); background: rgba(0, 0, 0, 0.8);"
          >
            <div class="flex gap-2">
              <span class="w-3 h-3 rounded-full bg-[#ff5f56]" />
              <span class="w-3 h-3 rounded-full bg-[#ffbd2e]" />
              <span class="w-3 h-3 rounded-full bg-[#27c93f]" />
            </div>
            <div
              class="min-w-0 truncate text-[10px] sm:text-sm font-mono tracking-[0.08em] sm:tracking-[0.18em] uppercase"
              style={`color: ${accentColor};`}
            >
              {currentMode.value === "picker"
                ? "~/cosmic/bin/zodiac.sh"
                : `~/cosmic/${selectedSign.value}/${currentPeriod.value}.txt`}
            </div>
          </div>

          <div
            class={`min-w-0 terminal-content-wrapper ${
              isHoroscopeMode ? "p-4 sm:p-7 lg:p-9" : "p-4 sm:p-8 lg:p-12"
            }`}
            style={`min-height: ${
              isHoroscopeMode
                ? "min(560px, calc(100dvh - 7rem))"
                : "min(600px, calc(100dvh - 7rem))"
            }; overflow: visible;`}
          >
            {currentMode.value === "picker"
              ? (
                // PICKER MODE - Zodiac grid + dossier
                <div class="flex min-w-0 flex-col lg:flex-row gap-6 sm:gap-8 lg:gap-12">
                  <div
                    class="min-w-0 flex-1 selector-panel-motion"
                    style={`animation: cosmicFloat 16s ease-in-out infinite; animation-delay: 0.7s; transform: translate3d(${selectorParallaxX}px, ${selectorParallaxY}px, 0); transition: transform 0.3s ease-out;`}
                  >
                    <div class="mb-5">
                      <pre
                        class="font-mono text-[5.5px] min-[390px]:text-[6px] sm:text-[10px] md:text-xs leading-[1.05] sm:leading-[1.1] whitespace-pre mb-2 overflow-hidden"
                        style={`color: ${accentColor}; text-shadow: 0 0 14px ${accentColor}88;`}
                      >{PICKER_TITLE_ASCII}</pre>
                      <div class="w-full text-center">
                        <p
                          class="font-mono uppercase text-[9px] sm:text-xs"
                          style={`color: ${accentGlowColor}; letter-spacing: clamp(0.16em, 2vw, 0.5em);`}
                        >
                          {PICKER_HINT_TEXT}
                        </p>
                      </div>
                    </div>

                    <pre
                      class="font-mono text-[10px] sm:text-sm tracking-[0.2em] sm:tracking-[0.35em] uppercase overflow-hidden"
                      style={`color: ${accentGlowColor}88;`}
                    >{ASCII_DIVIDER}</pre>

                    <div
                      class="mt-4 sm:mt-8 grid grid-cols-2 gap-2 sm:gap-3"
                      role="listbox"
                      aria-label="Select your zodiac sign"
                    >
                      {ZODIAC_SIGNS.map((zodiac) => {
                        const isSelected = selectedSign.value === zodiac.name;
                        const isHovered = hoveredSign.value === zodiac.name;
                        const cardTitle = getSignTitle(zodiac.name);
                        const elementLabel = zodiac.element.toUpperCase();
                        const titleColor = isSelected || isHovered
                          ? accentColor
                          : `${accentColor}AA`;
                        const borderColor = isSelected || isHovered
                          ? accentColor
                          : `${accentGlowColor}44`;
                        const backgroundColor = isSelected
                          ? "rgba(0, 30, 8, 0.92)"
                          : isHovered
                          ? "rgba(0, 0, 0, 0.6)"
                          : "rgba(0, 0, 0, 0.45)";
                        const glow = isSelected
                          ? `inset 0 0 8px ${accentColor}40, 0 0 32px ${accentColor}80, 0 12px 35px rgba(0,0,0,0.55), 0 0 2px ${accentColor}ff`
                          : isHovered
                          ? `inset 0 0 6px ${accentColor}30, 0 0 16px ${accentColor}40, 0 8px 22px rgba(0,0,0,0.5)`
                          : "0 6px 18px rgba(0,0,0,0.55)";

                        return (
                          <button
                            key={zodiac.name}
                            type="button"
                            onClick={() => handleSignClick(zodiac.name)}
                            onMouseEnter={() => hoveredSign.value = zodiac.name}
                            onMouseLeave={() => hoveredSign.value = null}
                            onFocus={() => hoveredSign.value = zodiac.name}
                            onBlur={() => hoveredSign.value = null}
                            role="option"
                            aria-selected={isSelected}
                            class="group w-full min-h-[64px] text-left font-mono border-[3px] rounded-xl sm:rounded-2xl px-3 py-3 sm:px-4 sm:py-4 transition-all duration-150 hover:scale-[1.02] hover:-translate-y-0.5"
                            style={`
                        border-color: ${borderColor};
                        background: ${backgroundColor};
                        color: ${PRIMARY_TERMINAL_COLOR};
                        box-shadow: ${glow};
                        transform-style: preserve-3d;
                      `}
                          >
                            <div class="flex items-center">
                              <p
                                class="text-[10px] min-[390px]:text-[11px] sm:text-sm uppercase tracking-[0.14em] sm:tracking-[0.3em] whitespace-nowrap overflow-hidden text-ellipsis transition-all duration-150"
                                style={`color: ${titleColor}; text-shadow: ${
                                  isHovered
                                    ? `-2px 0 ${accentColor}, 2px 0 ${accentGlowColor}, 0 0 12px ${titleColor}40`
                                    : `0 0 12px ${titleColor}40`
                                };`}
                              >
                                {cardTitle}
                              </p>
                            </div>
                            <div
                              class="mt-2 text-[8px] min-[390px]:text-[9px] sm:text-xs uppercase tracking-[0.06em] sm:tracking-[0.24em] leading-snug"
                              style={`color: ${accentGlowColor}CC;`}
                            >
                              {zodiac.dates.toUpperCase()} • {elementLabel}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Preview Pane */}
                  <div
                    class="w-full lg:w-[320px] xl:w-[360px] border-[3px] rounded-[18px] sm:rounded-3xl p-4 sm:p-5 bg-black/35 dossier-panel-motion"
                    style={`border-color: ${accentGlowColor}40; box-shadow: inset 0 0 32px ${accentGlowColor}22; transform: perspective(1000px) rotateX(${dossierRotateX}deg) rotateY(${dossierRotateY}deg) translate3d(${dossierParallaxX}px, ${dossierParallaxY}px, 0); transition: transform 0.3s ease-out; transform-style: preserve-3d;`}
                  >
                    <div
                      class="text-xs uppercase tracking-[0.4em] mb-4 font-bold"
                      style={`color: ${accentGlowColor}; text-shadow: 0 0 8px ${accentGlowColor}60;`}
                    >
                      {previewSign ? "COSMIC DOSSIER" : "SIGNAL STANDBY"}
                    </div>

                    {previewSign
                      ? (
                        <div class="space-y-4">
                          <pre
                            class="font-mono text-[8px] sm:text-[9px] leading-[1.05] whitespace-pre overflow-hidden"
                            style={`color: ${accentColor}; text-shadow: 0 0 10px ${accentColor}33;`}
                          >{previewAscii}</pre>

                          <p
                            class="font-mono text-sm leading-relaxed"
                            style={`color: ${accentGlowColor}B8; opacity: 0.9;`}
                          >
                            {previewSign.bio}
                          </p>

                          <div class="grid grid-cols-1 gap-3 text-[10px] uppercase tracking-[0.18em] sm:tracking-[0.35em]">
                            {dossierMeta.map((item) => (
                              <div
                                key={item.label}
                                class="flex justify-between items-center gap-3 pb-1"
                                style={`border-bottom: 1px solid ${accentGlowColor}44;`}
                              >
                                <span style={`color: ${accentGlowColor}B0;`}>
                                  {item.label}
                                </span>
                                <span
                                  class="flex items-center justify-end gap-2 max-w-[56%] text-right break-words"
                                  style={`color: ${accentColor};`}
                                >
                                  {item.special === "color" && item.hex && (
                                    <span
                                      class="inline-block w-3 h-3 rounded-full border border-white/30"
                                      style={`background: ${item.hex}; box-shadow: 0 0 6px ${item.hex}80;`}
                                    />
                                  )}
                                  {item.value}
                                </span>
                              </div>
                            ))}
                          </div>

                          <div>
                            <p
                              class="text-[10px] uppercase tracking-[0.4em] mb-1 font-semibold"
                              style={`color: ${accentGlowColor}; text-shadow: 0 0 6px ${accentGlowColor}50;`}
                            >
                              Signature Move
                            </p>
                            <p
                              class="font-mono text-sm leading-relaxed"
                              style={`color: ${accentColor}C0; opacity: 0.92;`}
                            >
                              {previewSign.signatureMove}
                            </p>
                          </div>

                          <div>
                            <p
                              class="text-[10px] uppercase tracking-[0.4em] mb-1 font-semibold"
                              style={`color: ${accentGlowColor}; text-shadow: 0 0 6px ${accentGlowColor}50;`}
                            >
                              Recharge Protocol
                            </p>
                            <p
                              class="font-mono text-sm leading-relaxed"
                              style={`color: ${accentGlowColor}C0; opacity: 0.92;`}
                            >
                              {previewSign.recharge}
                            </p>
                          </div>

                          <div>
                            <p
                              class="text-[10px] uppercase tracking-[0.4em] mb-1 font-semibold"
                              style={`color: ${accentGlowColor}; text-shadow: 0 0 6px ${accentGlowColor}50;`}
                            >
                              Keywords
                            </p>
                            <ul class="space-y-1 text-[11px] uppercase tracking-[0.35em]">
                              {previewSign.keywords.map((keyword) => (
                                <li
                                  key={keyword}
                                  class="font-mono"
                                  style={`color: ${accentGlowColor};`}
                                >
                                  • {keyword.toUpperCase()}
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <p
                              class="text-[10px] uppercase tracking-[0.4em] mb-1 font-semibold"
                              style={`color: ${accentGlowColor}; text-shadow: 0 0 6px ${accentGlowColor}50;`}
                            >
                              Motto
                            </p>
                            <p
                              class="font-mono text-sm italic"
                              style={`color: ${accentColor}B8; opacity: 0.95;`}
                            >
                              "{previewSign.motto}"
                            </p>
                          </div>

                          {selectedSign.value && (
                            <p
                              class="pt-2 font-mono text-[11px] tracking-[0.25em] uppercase border-t"
                              style={`color: ${accentGlowColor}AA; border-color: ${accentGlowColor}28;`}
                            >
                              {`> LOCKED :: ${selectedSign.value.toUpperCase()}`}
                            </p>
                          )}

                          <span
                            class="inline-block h-4 w-2 cursor-blink"
                            style={`background: ${dossierCursorColor};`}
                          />
                        </div>
                      )
                      : (
                        <div class="space-y-3">
                          <pre
                            class="font-mono text-[8px] sm:text-[9px] leading-[1.05] whitespace-pre overflow-hidden"
                            style={`color: ${accentColor};`}
                          >{previewAscii}</pre>
                          <p
                            class="font-mono text-sm leading-relaxed"
                            style={`color: ${accentGlowColor}B8; opacity: 0.9;`}
                          >
                            Tap a sign to lock your signal and fetch the
                            horoscope stream.
                          </p>
                          <p
                            class="font-mono text-[11px] uppercase tracking-[0.35em]"
                            style={`color: ${accentGlowColor}A0; opacity: 0.85;`}
                          >
                            No sign selected
                          </p>
                          <span
                            class="inline-block h-4 w-2 cursor-blink"
                            style={`background: ${dossierCursorColor};`}
                          />
                        </div>
                      )}
                  </div>
                </div>
              )
              : (
                // HOROSCOPE MODE - Full-width horoscope display
                <div class="w-full min-w-0 max-w-4xl mx-auto overflow-x-hidden">
                  {isLoadingHoroscope.value
                    ? (
                      // Boot sequence
                      <div class="space-y-4">
                        {bootMessages.value.map((msg, i) => (
                          <p
                            key={i}
                            class="font-mono text-sm"
                            style={`color: ${accentColor}; animation: fadeIn 0.3s ease-in;`}
                          >
                            {msg}
                          </p>
                        ))}
                        <span
                          class="inline-block h-4 w-2 cursor-blink"
                          style={`background: ${accentColor};`}
                        />
                      </div>
                    )
                    : horoscopeHtml.value && showHoroscope.value
                    ? (
                      // Horoscope content with typewriter
                      <div class="space-y-6">
                        {/* Fast-typing header */}
                        <div
                          class="border-b pb-4"
                          style={`border-color: ${accentGlowColor}30;`}
                        >
                          <TypedWriter
                            text={splitHoroscopeAscii(horoscopePlainText.value)
                              .header}
                            htmlText={horoscopeHeaderHtml.value}
                            speed={3}
                            enabled
                            showCompletionCursor={false}
                            className="font-mono leading-tight min-w-0 max-w-full overflow-hidden"
                            style="color: #FFD700; font-size: 14px; letter-spacing: 0.02em;"
                          />
                        </div>
                        {/* Slower-typing body */}
                        <TypedWriter
                          text={splitHoroscopeAscii(horoscopePlainText.value)
                            .body}
                          htmlText={horoscopeBodyHtml.value}
                          speed={8}
                          enabled
                          showCompletionCursor
                          className="font-mono min-w-0 max-w-full overflow-hidden break-words text-[14px] sm:text-[15px] leading-[1.52] sm:leading-relaxed"
                          style={`color: ${accentColor};`}
                        />

                        {/* Navigation */}
                        <div class="space-y-4">
                          <div
                            class="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 pt-5 sm:pt-6 border-t"
                            style={`border-color: ${accentGlowColor}30;`}
                          >
                            <button
                              type="button"
                              onClick={handleBackToPicker}
                              class="min-h-[44px] px-4 py-2.5 border-2 rounded-xl font-mono text-sm uppercase tracking-wider transition-all hover:scale-105"
                              style={`background: rgba(0,0,0,0.6); border-color: ${accentGlowColor}; color: ${accentGlowColor}; box-shadow: 0 0 12px ${accentGlowColor}40;`}
                            >
                              ← BACK
                            </button>
                            {(["daily", "weekly", "monthly"] as Period[]).map((
                              period,
                            ) => (
                              <button
                                key={period}
                                type="button"
                                onClick={() => handlePeriodChange(period)}
                                class={`min-h-[44px] px-4 py-2.5 border-2 rounded-xl font-mono text-sm uppercase tracking-wider transition-all hover:scale-105 ${
                                  currentPeriod.value === period
                                    ? "font-bold"
                                    : ""
                                }`}
                                style={currentPeriod.value === period
                                  ? `background: ${accentColor}30; border-color: ${accentColor}; color: ${accentColor}; box-shadow: 0 0 16px ${accentColor}60;`
                                  : `background: rgba(0,0,0,0.4); border-color: ${accentGlowColor}60; color: ${accentGlowColor}; box-shadow: 0 0 8px ${accentGlowColor}20;`}
                              >
                                {period}
                              </button>
                            ))}
                          </div>
                          {/* Ko-fi terminal button */}
                          <div
                            class="flex justify-center pt-2 border-t"
                            style={`border-color: ${accentGlowColor}15;`}
                          >
                            <a
                              href="https://ko-fi.com/madebypablo"
                              target="_blank"
                              rel="noopener noreferrer"
                              class="inline-flex min-h-[44px] items-center px-4 py-2.5 border-2 rounded-xl font-mono text-xs uppercase tracking-wider transition-all hover:scale-105"
                              style={`background: rgba(255, 192, 203, 0.05); border-color: rgba(255, 192, 203, 0.3); color: rgba(255, 192, 203, 0.9); box-shadow: 0 0 8px rgba(255, 192, 203, 0.2);`}
                              onClick={() => sounds.click()}
                            >
                              <span style="opacity: 0.7;">{">"}</span>☕ SUPPORT
                              CREATOR
                            </a>
                          </div>
                        </div>
                      </div>
                    )
                    : (
                      // Error state
                      <div class="text-center py-12">
                        <p
                          class="font-mono text-lg"
                          style={`color: ${accentColor};`}
                        >
                          Failed to load horoscope
                        </p>
                        <button
                          type="button"
                          onClick={handleBackToPicker}
                          class="mt-4 min-h-[44px] px-6 py-3 border-2 rounded-xl font-mono uppercase"
                          style={`border-color: ${accentGlowColor}; color: ${accentGlowColor};`}
                        >
                          ← Back
                        </button>
                      </div>
                    )}
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}
