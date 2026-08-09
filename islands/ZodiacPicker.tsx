// ===================================================================
// ZODIAC PICKER ISLAND - Terminal-flavored sign selector + horoscope
// ===================================================================

import { signal } from "@preact/signals";
import { useEffect, useMemo, useRef } from "preact/hooks";
import {
  getSavedZodiacSign,
  saveZodiacSign,
  ZODIAC_SIGNS,
  type ZodiacSign,
} from "../utils/zodiac.ts";
import { sounds } from "../utils/sounds.ts";
import { analytics } from "../utils/analytics.ts";
import { renderFigletText } from "../utils/asciiArtGenerator.ts";
import { applyColorToArt } from "../utils/colorEffects.ts";
import { TypedWriter } from "../components/TypedWriter.tsx";
import { copyReading, shareReadingPNG } from "../utils/exportReading.ts";
import { openKofiModal } from "./KofiModal.tsx";
import { openAboutModal } from "./AboutModal.tsx";

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

// Horoscope mode states
type Mode = "picker" | "horoscope";
type Period = "daily" | "weekly" | "monthly";
type DossierMetaItem = {
  label: string;
  value: string;
  special?: "number" | "energy" | "color" | "vibe";
  hex?: string;
};
type CosmicContext = {
  moon: {
    phase: string;
    glyph: string;
    illumination: number;
    tone: "new" | "waxing" | "full" | "waning";
  };
  discordianDate: {
    text: string;
  };
  slackRoll: {
    die: string;
    value: number;
  };
  spaceWeather: {
    kp: number;
    label: string;
    flux: number | null;
  } | null;
  nearestVisitor: {
    name: string;
    closeApproach: string;
    lunarDistance: number;
    relativeVelocityKmS: number;
  } | null;
  glitchLevel: number;
  corruptionGlyphs: string;
  charm: {
    name: string;
    art: string;
    trigger: string;
  } | null;
  microTheme: {
    phase: "new" | "waxing" | "full" | "waning";
    element: ZodiacSign["element"];
  };
  loadingLines: string[];
};
// The sovereign oracle's divination packet — computed sky, old calendars,
// daily draw, and the braille sigil that seals the reading.
type OraclePacket = {
  moon: { phase: string; glyph: string; illum: number };
  signSky: {
    ruler: string;
    rulerPlacement: {
      body: string;
      sign: string;
      degree: number;
      retrograde: boolean;
    };
    moonSign: string;
  };
  draw: {
    tarot: { name: string; reversed: boolean };
    hexagram: { number: number; symbol: string; name: string };
    rune: { name: string; symbol: string };
  };
  sigil: string;
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
const headerTyped = signal(false);
const bodyTyped = signal(false);
const copiedReading = signal(false);
const cosmicContext = signal<CosmicContext | null>(null);
const oraclePacket = signal<OraclePacket | null>(null);
const oracleSource = signal<string>("");

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

function rollClientNumber(max: number) {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const buffer = new Uint32Array(1);
    crypto.getRandomValues(buffer);
    return buffer[0] % max + 1;
  }

  return Math.floor(Math.random() * max) + 1;
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

async function fetchCosmicContext(sign: string, period: Period) {
  try {
    const response = await fetch(
      `/api/cosmic-context?sign=${sign}&period=${period}`,
      { cache: "no-store" },
    );
    if (!response.ok) {
      throw new Error(`Context API returned ${response.status}`);
    }
    const payload = await response.json();
    return payload.success ? payload.data as CosmicContext : null;
  } catch (error) {
    console.warn("Cosmic context unavailable:", error);
    return null;
  }
}

function getFallbackLoadingLines(sign: string, period: Period) {
  return [
    "> opening chaos channel...",
    "> moon phase: local signal obscured",
    "> NOAA solar static: quiet carrier fallback",
    `> slack roll: deferred`,
    `> routing ${sign.toUpperCase()} through zodiac channel...`,
    `> downloading ${period} horoscope transmission...`,
  ];
}

function getSignalRows(context: CosmicContext) {
  const spaceWeather = context.spaceWeather
    ? `Kp ${context.spaceWeather.kp} / ${context.spaceWeather.label}${
      context.spaceWeather.flux ? ` / F10.7 ${context.spaceWeather.flux}` : ""
    }`
    : "quiet carrier fallback";
  const visitor = context.nearestVisitor
    ? `${context.nearestVisitor.name.trim()} / ${context.nearestVisitor.lunarDistance} LD / ${context.nearestVisitor.relativeVelocityKmS} km/s`
    : "no close pass under 20 LD";

  return [
    {
      label: "Moon",
      value:
        `${context.moon.glyph} ${context.moon.phase} / ${context.moon.illumination}% lit`,
    },
    { label: "Eris", value: context.discordianDate.text },
    { label: "NOAA", value: spaceWeather },
    { label: "JPL", value: visitor },
    {
      label: "Slack",
      value:
        `${context.slackRoll.die}=${context.slackRoll.value} / glitch ${context.glitchLevel}/4`,
    },
  ];
}

function getRiteRows(packet: OraclePacket, source: string) {
  const ruler = packet.signSky.rulerPlacement;
  return [
    {
      label: "Ruler",
      value: `${ruler.body} ${ruler.degree}° ${ruler.sign}${
        ruler.retrograde ? " ℞" : ""
      }`,
    },
    {
      label: "Moon",
      value:
        `${packet.moon.glyph} ${packet.moon.phase} · in ${packet.signSky.moonSign}`,
    },
    {
      label: "Draw",
      value: `${packet.draw.tarot.name}${
        packet.draw.tarot.reversed ? " rev" : ""
      } / ${packet.draw.hexagram.symbol} ${packet.draw.hexagram.name} / ${packet.draw.rune.symbol} ${packet.draw.rune.name}`,
    },
    {
      label: "Voice",
      value: source === "oracle-voice" ? "oracle" : "composed",
    },
  ];
}

export default function ZodiacPicker() {
  const contentRef = useRef<HTMLDivElement>(null);

  // Follow boot messages at the bottom while they stream; every other state
  // (reading, and the picker we came back to) starts at the top.
  useEffect(() => {
    if (!contentRef.current) return;
    contentRef.current.scrollTop = isLoadingHoroscope.value
      ? contentRef.current.scrollHeight
      : 0;
  }, [
    bootMessages.value.length,
    isLoadingHoroscope.value,
    showHoroscope.value,
    currentMode.value,
  ]);
  useEffect(() => {
    const styleEl = document.createElement("style");
    styleEl.textContent = COSMIC_ANIMATION_STYLES;
    document.head.appendChild(styleEl);
    return () => {
      document.head.removeChild(styleEl);
    };
  }, []);

  // Optional analytics (no-op without POSTHOG_KEY) + welcome back a
  // returning visitor by preselecting their saved sign.
  useEffect(() => {
    analytics.init();
    if (!selectedSign.value) {
      const saved = getSavedZodiacSign();
      if (saved && ZODIAC_SIGNS.some((z) => z.name === saved)) {
        selectedSign.value = saved;
      }
    }
  }, []);

  // Parallax mouse tracking — written straight to CSS vars, at most once per
  // frame. Routing this through signals read in the render body re-rendered
  // the entire island at pointer-event rate.
  useEffect(() => {
    let queued = false;
    let mx = 0;
    let my = 0;
    const applyParallax = () => {
      queued = false;
      stageRef.current?.style.setProperty("--mx", String(mx));
      stageRef.current?.style.setProperty("--my", String(my));
    };
    const handleMouseMove = (e: MouseEvent) => {
      mx = (e.clientX / globalThis.innerWidth - 0.5) * 2;
      my = (e.clientY / globalThis.innerHeight - 0.5) * 2;
      if (!queued) {
        queued = true;
        requestAnimationFrame(applyParallax);
      }
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

  // Generation guard: rapid sign/period taps spawn overlapping fetches;
  // only the latest one may write state, or a slow loser clobbers the winner.
  const fetchGeneration = useRef(0);

  // Root element: receives the --mx/--my parallax vars from the mousemove
  // handler so consumers animate without a single Preact re-render.
  const stageRef = useRef<HTMLDivElement>(null);

  const fetchHoroscope = async (sign: string, period: Period) => {
    const generation = ++fetchGeneration.current;
    const isCurrent = () => generation === fetchGeneration.current;

    isLoadingHoroscope.value = true;
    headerTyped.value = false;
    bodyTyped.value = false;
    oraclePacket.value = null;
    cosmicContext.value = null;
    bootMessages.value = ["> opening cosmic context socket..."];
    sounds.bootStep();

    // Head start: the reading is independent of cosmic-context, so fire its
    // fetch now and let the boot theatre below cover the wait instead of
    // preceding it. The no-op catch stops an unhandled-rejection if a rapid
    // re-tap abandons this generation before the await picks the promise up.
    const horoscopePromise = fetch(
      `/api/horoscope?sign=${sign}&period=${period}`,
    );
    horoscopePromise.catch(() => {});

    const context = await fetchCosmicContext(sign, period);
    if (!isCurrent()) return;
    cosmicContext.value = context;

    const loadingLines = context?.loadingLines ??
      getFallbackLoadingLines(sign, period);
    const bootDelay = context && context.glitchLevel >= 3 ? 190 : 250;

    for (const line of loadingLines) {
      await new Promise((resolve) => setTimeout(resolve, bootDelay));
      if (!isCurrent()) return;
      bootMessages.value = [...bootMessages.value, line];
      sounds.bootStep();
    }

    try {
      const response = await horoscopePromise;
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }
      const data = await response.json();
      if (!isCurrent()) return;

      const horoscopeText = data.data?.horoscope_data ?? data.data?.horoscope;
      if (data.success !== false && horoscopeText) {
        const date = data.data.date || "";
        oraclePacket.value = data.data?.packet ?? null;
        oracleSource.value = data.data?.source ?? "";

        // Generate ASCII art
        const ascii = generateHoroscopeAscii(
          sign,
          horoscopeText,
          period,
          date,
        );
        horoscopePlainText.value = ascii;

        // Colorize
        const colorized = applyColorToArt(ascii);

        horoscopeHtml.value = colorized.fullHtml;
        horoscopeHeaderHtml.value = colorized.headerHtml;
        horoscopeBodyHtml.value = colorized.bodyHtml;

        // A breath between the boot bleeps and the typing clatter. With the
        // reading prefetched, the theatre ends the instant the last line
        // lands — without this pause the final bootStep, the success chord,
        // and the first keystrokes all collide.
        await new Promise((resolve) => setTimeout(resolve, 550));
        if (!isCurrent()) return;

        showHoroscope.value = true;
        sounds.success();
        analytics.trackHoroscopeViewed(sign, period);
      } else {
        sounds.error();
        console.error("Horoscope fetch failed:", data.error);
        analytics.trackError("horoscope_fetch_failed", { sign, period });
      }
    } catch (error) {
      if (!isCurrent()) return;
      sounds.error();
      console.error("Failed to fetch horoscope:", error);
      analytics.trackError("horoscope_fetch_failed", { sign, period });
    } finally {
      if (isCurrent()) {
        isLoadingHoroscope.value = false;
      }
    }
  };

  const handleSignClick = (sign: string) => {
    selectedSign.value = sign;
    saveZodiacSign(sign);
    analytics.trackSignSelected(sign);
    sounds.selectSign();
    flickerTrigger.value = Date.now(); // Trigger flicker animation

    // Switch to horoscope mode and fetch data
    currentMode.value = "horoscope";
    fetchHoroscope(sign, currentPeriod.value);
  };

  const handleCopyReading = async () => {
    sounds.click();
    const ok = await copyReading(
      horoscopePlainText.value,
      horoscopeHtml.value,
    );
    if (ok) {
      copiedReading.value = true;
      setTimeout(() => {
        copiedReading.value = false;
      }, 2000);
    }
  };

  const handleShareReading = () => {
    sounds.click();
    const date = new Date().toISOString().slice(0, 10);
    shareReadingPNG(
      ".reading-capture",
      `stargram-${selectedSign.value}-${currentPeriod.value}-${date}`,
    );
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

  // Chance-operation content for the dossier.
  const cosmicExtras = useMemo(() => {
    if (!previewSign) return null;

    const dossierRoll = rollClientNumber(999);
    const signalCharge = rollClientNumber(31) + 69; // 70-100%

    const rollColors = [
      { name: "Cosmic Purple", hex: "#8B5CF6" },
      { name: "Stellar Blue", hex: "#3B82F6" },
      { name: "Nova Pink", hex: "#EC4899" },
      { name: "Nebula Teal", hex: "#14B8A6" },
      { name: "Solar Gold", hex: "#F59E0B" },
      { name: "Void Indigo", hex: "#6366F1" },
    ];
    const rollColor = rollColors[rollClientNumber(rollColors.length) - 1];

    const rollNotes = [
      "Main character energy",
      "Plot twist incoming",
      "Side quest unlocked",
      "Power-up detected",
      "Boss mode activated",
      "Hidden achievement found",
      "Multiplayer advantage",
      "Critical hit ready",
    ];
    const rollNote = rollNotes[rollClientNumber(rollNotes.length) - 1];

    return { dossierRoll, signalCharge, rollColor, rollNote };
  }, [previewSign?.name]);

  const dossierMeta: DossierMetaItem[] = previewSign && cosmicExtras
    ? [
      { label: "Element", value: previewSign.element.toUpperCase() },
      { label: "Modality", value: previewSign.modality.toUpperCase() },
      { label: "Ruling Planet", value: previewSign.rulingPlanet.toUpperCase() },
      { label: "Solar Dates", value: previewSign.dates.toUpperCase() },
      {
        label: "Dossier Roll",
        value: String(cosmicExtras.dossierRoll),
        special: "number",
      },
      {
        label: "Signal Charge",
        value: `${cosmicExtras.signalCharge}%`,
        special: "energy",
      },
      {
        label: "Roll Color",
        value: cosmicExtras.rollColor.name,
        special: "color",
        hex: cosmicExtras.rollColor.hex,
      },
      {
        label: "Roll Note",
        value: cosmicExtras.rollNote,
        special: "vibe",
      },
    ]
    : [];
  const dossierCursorColor = previewSign ? accentColor : accentGlowColor;

  const isHoroscopeMode = currentMode.value === "horoscope";
  const activeCosmicContext = cosmicContext.value;
  const cosmicGlitchClass = activeCosmicContext
    ? `cosmic-glitch-${activeCosmicContext.glitchLevel}`
    : "";
  const cosmicPhaseClass = activeCosmicContext
    ? `cosmic-phase-${activeCosmicContext.microTheme.phase}`
    : "";
  const cosmicElementClass = activeCosmicContext
    ? `cosmic-element-${activeCosmicContext.microTheme.element}`
    : "";
  const signalRows = activeCosmicContext
    ? getSignalRows(activeCosmicContext)
    : [];

  return (
    <div ref={stageRef} class="relative w-full min-w-0 overflow-hidden">
      <style>
        {`
          /* Session accent, published for the global scrollbar skin. */
          :root {
            --stargram-accent: ${accentColor};
            --stargram-accent-soft: ${accentColor}4D;
            --stargram-accent-hover: ${accentColor}99;
          }

          /* The stage is the phone screen: exactly one viewport, safe areas
             carved out, never scrolls. The terminal fills it in every mode. */
          .cosmic-stage {
            height: 100vh; /* iOS 15.0-15.3 has no dvh — don't collapse */
            height: 100dvh;
            padding:
              calc(env(safe-area-inset-top, 0px) + 0.5rem)
              calc(env(safe-area-inset-right, 0px) + 0.5rem)
              calc(env(safe-area-inset-bottom, 0px) + 0.5rem)
              calc(env(safe-area-inset-left, 0px) + 0.5rem);
          }

          .terminal-shell {
            height: 100%;
          }

          @media (min-width: 640px) {
            .cosmic-stage {
              padding: 2rem 1.5rem;
            }
            .terminal-shell {
              height: min(100%, 900px);
            }
          }

          /* Landscape phones: the ASCII crown would eat the entire screen,
             so trade it for a wider grid and keep all 12 signs reachable. */
          @media (max-height: 520px) {
            .picker-crown {
              display: none;
            }
            .picker-grid {
              grid-template-columns: repeat(4, minmax(0, 1fr));
            }
          }

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

          .terminal-shell.cosmic-phase-new {
            filter: brightness(0.94) saturate(0.92);
          }

          .terminal-shell.cosmic-phase-full {
            filter: brightness(1.06) saturate(1.12);
          }

          .terminal-shell.cosmic-phase-waxing {
            filter: saturate(1.06);
          }

          .terminal-shell.cosmic-phase-waning {
            filter: brightness(0.98) saturate(0.98);
          }

          .terminal-shell.cosmic-element-fire::after {
            opacity: 0.34;
          }

          .terminal-shell.cosmic-element-water::after {
            opacity: 0.18;
            animation-duration: 9s;
          }

          .terminal-shell.cosmic-element-air::before {
            opacity: 0.5;
          }

          .terminal-shell.cosmic-element-earth::before {
            opacity: 0.32;
          }

          .terminal-shell.cosmic-glitch-2::after,
          .terminal-shell.cosmic-glitch-3::after,
          .terminal-shell.cosmic-glitch-4::after {
            animation: scanlineScroll 5s linear infinite, cosmicCorrupt 9s steps(2, end) infinite;
          }

          .terminal-shell.cosmic-glitch-3::after {
            opacity: 0.42;
          }

          .terminal-shell.cosmic-glitch-4::after {
            opacity: 0.52;
          }

          @keyframes cosmicCorrupt {
            0%, 88%, 100% {
              transform: translate3d(0, 0, 0);
              filter: none;
            }
            89% {
              transform: translate3d(1px, 0, 0);
              filter: hue-rotate(28deg);
            }
            90% {
              transform: translate3d(-2px, 1px, 0);
              filter: hue-rotate(-22deg);
            }
            91% {
              transform: translate3d(0, 0, 0);
              filter: none;
            }
          }

          .cosmic-charm {
            animation: charmFloat 4.8s ease-in-out infinite;
            text-shadow: 0 0 12px currentColor;
          }

          @keyframes charmFloat {
            0%, 100% { transform: translateY(0) rotate(-1deg); }
            50% { transform: translateY(-6px) rotate(1deg); }
          }

          .cosmic-corruption-text {
            animation: corruptionBlink 1.7s steps(2, end) infinite;
          }

          @keyframes corruptionBlink {
            0%, 70%, 100% { opacity: 1; transform: translateX(0); }
            72% { opacity: 0.72; transform: translateX(1px); }
            74% { opacity: 0.95; transform: translateX(-1px); }
          }

          .cosmic-signal-plaque {
            position: relative;
            overflow: hidden;
          }

          .cosmic-signal-plaque::before {
            content: "";
            position: absolute;
            inset: 0;
            pointer-events: none;
            background:
              linear-gradient(90deg, rgba(255, 255, 255, 0.04), transparent 42%, rgba(255, 255, 255, 0.03)),
              repeating-linear-gradient(
                0deg,
                rgba(255, 255, 255, 0.035),
                rgba(255, 255, 255, 0.035) 1px,
                transparent 1px,
                transparent 4px
              );
            opacity: 0.45;
          }

          .cosmic-signal-plaque.cosmic-signal-glitch::before {
            animation: cosmicCorrupt 7s steps(2, end) infinite;
          }

          /* Foil sheen — holo trading card, Rite plaque only. A narrow,
             quiet gleam riding the --mx/--my parallax vars; screen blend
             (not color-dodge — that amplified the ::before dither into a
             dark blotch) keeps it classy. */
          .rite-plaque::after {
            content: "";
            position: absolute;
            inset: 0;
            pointer-events: none;
            background: linear-gradient(
              115deg,
              transparent 40%,
              rgba(160, 240, 255, 0.055) 47%,
              rgba(255, 170, 250, 0.07) 51%,
              rgba(255, 240, 180, 0.045) 55%,
              transparent 62%
            );
            background-size: 260% 260%;
            background-position:
              calc(50% + var(--mx, 0) * 45%)
              calc(50% + var(--my, 0) * 45%);
            mix-blend-mode: screen;
            border-radius: inherit;
          }

          /* High packet corruption bleeds into the reading itself: a faint
             RGB split that grows with the glitch level. */
          .cosmic-glitch-3 .reading-capture {
            text-shadow:
              -1px 0 2px rgba(255, 0, 255, 0.3),
              1px 0 2px rgba(0, 255, 255, 0.28);
          }

          .cosmic-glitch-4 .reading-capture {
            text-shadow:
              -2px 0 3px rgba(255, 0, 255, 0.42),
              2px 0 3px rgba(0, 255, 255, 0.38);
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

            .terminal-shell::after,
            .cosmic-charm,
            .cosmic-corruption-text,
            .cosmic-signal-plaque.cosmic-signal-glitch::before {
              animation: none !important;
            }
          }
        `}
      </style>
      <div class="cosmic-stage w-full min-w-0 flex items-center justify-center overflow-hidden">
        <div
          key={flickerTrigger.value}
          class={`w-full min-w-0 flex flex-col overflow-hidden ${
            isHoroscopeMode ? "sm:max-w-4xl" : "sm:max-w-6xl"
          } border-[3px] sm:border-4 rounded-[18px] sm:rounded-3xl shadow-[0_30px_80px_rgba(0,0,0,0.8)] terminal-shell ${cosmicGlitchClass} ${cosmicPhaseClass} ${cosmicElementClass} ${
            flickerTrigger.value > 0 ? "crt-flicker" : ""
          }`}
          style={`background: rgba(2, 4, 12, 0.95); border-color: ${accentGlowColor}80; box-shadow: 0 0 30px ${accentGlowColor}24, 0 18px 60px rgba(0,0,0,0.68), inset 0 0 64px rgba(0,0,0,0.6); animation: cosmicFloat 12s ease-in-out infinite;`}
        >
          {/* Terminal title bar */}
          <div
            class="shrink-0 flex items-center gap-3 px-4 sm:px-8 py-3 border-b-[3px] sm:border-b-4 terminal-content-wrapper"
            style="border-color: rgba(0, 255, 65, 0.18); background: rgba(0, 0, 0, 0.8);"
          >
            <div class="flex gap-2">
              <span class="w-3 h-3 rounded-full bg-[#ff5f56]" />
              <span class="w-3 h-3 rounded-full bg-[#ffbd2e]" />
              <span class="w-3 h-3 rounded-full bg-[#27c93f]" />
            </div>
            <div
              class="min-w-0 flex-1 truncate text-[10px] sm:text-sm font-mono tracking-[0.08em] sm:tracking-[0.18em] uppercase"
              style={`color: ${accentColor};`}
            >
              {currentMode.value === "picker"
                ? "~/cosmic/bin/zodiac.sh"
                : `~/cosmic/${selectedSign.value}/${currentPeriod.value}.txt`}
            </div>
            <button
              type="button"
              onClick={() => {
                sounds.click();
                openAboutModal();
              }}
              onMouseEnter={() => sounds.hover()}
              aria-label="About Stargram"
              class="-my-2 min-h-[44px] shrink-0 px-2 font-mono text-[10px] sm:text-xs uppercase tracking-[0.14em] transition-all hover:scale-105"
              style={`color: ${accentGlowColor}AA;`}
            >
              [about]
            </button>
          </div>

          <div
            ref={contentRef}
            class={`min-w-0 min-h-0 flex-1 overflow-y-auto terminal-content-wrapper ${
              isHoroscopeMode ? "p-4 sm:p-7 lg:p-9" : "p-4 sm:p-8 lg:p-10"
            }`}
            style="position: relative; z-index: 10;"
          >
            {currentMode.value === "picker"
              ? (
                // PICKER MODE - Zodiac grid + dossier
                <div class="flex min-h-full min-w-0 flex-col lg:h-full lg:flex-row gap-6 sm:gap-8 lg:gap-12">
                  <div
                    class="min-w-0 flex-1 flex flex-col selector-panel-motion"
                    style="animation: cosmicFloat 16s ease-in-out infinite; animation-delay: 0.7s;"
                  >
                    <div class="picker-crown shrink-0 mb-4 sm:mb-5">
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
                      class="picker-crown shrink-0 font-mono text-[10px] sm:text-sm tracking-[0.2em] sm:tracking-[0.35em] uppercase overflow-hidden"
                      style={`color: ${accentGlowColor}88;`}
                    >{ASCII_DIVIDER}</pre>

                    {
                      /* Cards stretch to fill the locked screen — the grid is
                        the page on mobile, so it should own the space. On
                        desktop they keep their natural height next to the
                        dossier. */
                    }
                    <div
                      class="picker-grid mt-3 sm:mt-6 grid flex-1 auto-rows-fr grid-cols-2 gap-2 sm:gap-3 lg:flex-none lg:auto-rows-min lg:content-start"
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
                            onMouseEnter={() => {
                              hoveredSign.value = zodiac.name;
                              sounds.hoverSign(zodiac.element);
                            }}
                            onMouseLeave={() => hoveredSign.value = null}
                            onFocus={() => hoveredSign.value = zodiac.name}
                            onBlur={() => hoveredSign.value = null}
                            role="option"
                            aria-selected={isSelected}
                            class="group flex h-full w-full min-h-[64px] flex-col justify-center text-left font-mono border-[3px] rounded-xl sm:rounded-2xl px-3 py-3 sm:px-4 sm:py-4 transition-all duration-150 hover:scale-[1.02] hover:-translate-y-0.5 lg:h-auto"
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

                  {
                    /* Preview Pane — hover-driven, so it's desktop-only. On a
                      phone it was 600px of untappable dead weight under the
                      grid; the sign's flavor lands in the reading instead. */
                  }
                  <div
                    class="hidden lg:block lg:w-[320px] xl:w-[360px] lg:max-h-full lg:overflow-y-auto border-[3px] rounded-[18px] sm:rounded-3xl p-4 sm:p-5 bg-black/35 dossier-panel-motion"
                    style={`border-color: ${accentGlowColor}40; box-shadow: inset 0 0 32px ${accentGlowColor}22; transform: perspective(1000px) rotateX(calc(var(--my, 0) * 3deg)) rotateY(calc(var(--mx, 0) * -3deg)) translate3d(calc(var(--mx, 0) * 12px), calc(var(--my, 0) * 12px), 0); transition: transform 0.3s ease-out; transform-style: preserve-3d;`}
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
                            class={`font-mono text-sm ${
                              msg.includes("packet corruption")
                                ? "cosmic-corruption-text"
                                : ""
                            }`}
                            style={`color: ${
                              msg.includes("packet corruption")
                                ? accentGlowColor
                                : accentColor
                            }; animation: fadeIn 0.3s ease-in;`}
                          >
                            {msg}
                          </p>
                        ))}
                        {activeCosmicContext && (
                          <div
                            class="grid gap-2 sm:grid-cols-2 border-t pt-4 mt-4 font-mono text-[10px] sm:text-xs uppercase tracking-[0.16em]"
                            style={`border-color: ${accentGlowColor}24; color: ${accentGlowColor}B8;`}
                          >
                            <p>
                              {activeCosmicContext.moon.glyph}{" "}
                              {activeCosmicContext.moon.phase} ·{" "}
                              {activeCosmicContext.moon.illumination}%
                            </p>
                            <p>
                              Kp {activeCosmicContext.spaceWeather?.kp ?? "?"} ·
                              {" "}
                              {activeCosmicContext.spaceWeather?.label ??
                                "quiet fallback"}
                            </p>
                            <p>
                              d23 · {activeCosmicContext.slackRoll.value}
                            </p>
                            <p>
                              glitch · {activeCosmicContext.glitchLevel}/4
                            </p>
                          </div>
                        )}
                        {activeCosmicContext?.charm && (
                          <div
                            class="pt-2"
                            style={`color: ${accentColor};`}
                          >
                            <pre class="cosmic-charm inline-block font-mono text-[11px] sm:text-xs leading-tight">{activeCosmicContext.charm.art}</pre>
                            <p
                              class="mt-2 font-mono text-[10px] uppercase tracking-[0.22em]"
                              style={`color: ${accentGlowColor}A8;`}
                            >
                              {activeCosmicContext.charm.trigger}
                            </p>
                          </div>
                        )}
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
                        {
                          /* Capture root: everything inside ships in the
                            shared PNG — keep buttons and nav OUT of it. */
                        }
                        <div class="reading-capture space-y-6">
                          {/* Fast-typing header */}
                          <div
                            class="min-w-0 w-full overflow-hidden border-b pb-4"
                            style={`border-color: ${accentGlowColor}30;`}
                          >
                            <TypedWriter
                              text={splitHoroscopeAscii(
                                horoscopePlainText.value,
                              )
                                .header}
                              htmlText={horoscopeHeaderHtml.value}
                              speed={3}
                              enabled
                              showCompletionCursor={false}
                              reserveLayout
                              onComplete={() => {
                                headerTyped.value = true;
                              }}
                              className="block w-full font-mono leading-tight min-w-0 max-w-full overflow-hidden"
                              style="color: #FFD700; font-size: 14px; letter-spacing: 0.02em;"
                            />
                          </div>
                          {activeCosmicContext && (
                            <div
                              class={`cosmic-signal-plaque border-2 rounded-xl p-3 sm:p-4 ${
                                activeCosmicContext.glitchLevel >= 2
                                  ? "cosmic-signal-glitch"
                                  : ""
                              }`}
                              style={`background: rgba(0,0,0,0.34); border-color: ${accentGlowColor}42; box-shadow: inset 0 0 24px ${accentGlowColor}14, 0 0 16px ${accentColor}16;`}
                            >
                              <div class="relative z-10 flex flex-col sm:flex-row gap-4 sm:items-start">
                                <div class="min-w-0 flex-1 space-y-3">
                                  <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
                                    <p
                                      class="font-mono text-[10px] uppercase tracking-[0.34em]"
                                      style={`color: ${accentColor}; text-shadow: 0 0 10px ${accentColor}66;`}
                                    >
                                      Signal Room
                                    </p>
                                    <p
                                      class="font-mono text-[10px] uppercase tracking-[0.18em]"
                                      style={`color: ${accentGlowColor}96;`}
                                    >
                                      live sky packet
                                    </p>
                                  </div>
                                  <div class="grid gap-2 sm:grid-cols-2">
                                    {signalRows.map((row) => (
                                      <div
                                        key={row.label}
                                        class="min-w-0 border-b pb-1"
                                        style={`border-color: ${accentGlowColor}22;`}
                                      >
                                        <p
                                          class="font-mono text-[9px] uppercase tracking-[0.26em]"
                                          style={`color: ${accentGlowColor}86;`}
                                        >
                                          {row.label}
                                        </p>
                                        <p
                                          class="font-mono text-[11px] sm:text-xs leading-snug break-words"
                                          style={`color: ${accentColor}D8;`}
                                        >
                                          {row.value}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                  {activeCosmicContext.glitchLevel > 0 && (
                                    <p
                                      class={`font-mono text-[10px] uppercase tracking-[0.2em] ${
                                        activeCosmicContext.glitchLevel >= 2
                                          ? "cosmic-corruption-text"
                                          : ""
                                      }`}
                                      style={`color: ${accentGlowColor}AA;`}
                                    >
                                      packet glyphs:{" "}
                                      {activeCosmicContext.corruptionGlyphs}
                                    </p>
                                  )}
                                </div>
                                {activeCosmicContext.charm && (
                                  <div
                                    class="shrink-0 border-t sm:border-t-0 sm:border-l pt-3 sm:pt-1 sm:pl-4 text-left sm:text-center"
                                    style={`border-color: ${accentColor}33; color: ${accentColor};`}
                                  >
                                    <pre class="cosmic-charm font-mono text-[10px] sm:text-xs leading-tight">{activeCosmicContext.charm.art}</pre>
                                    <p
                                      class="mt-2 font-mono text-[9px] uppercase tracking-[0.18em]"
                                      style={`color: ${accentGlowColor}A8;`}
                                    >
                                      {activeCosmicContext.charm.name}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          {
                            /* Slower-typing body — waits for the header so the
                            two streams never fight over the scroll position */
                          }
                          {headerTyped.value && (
                            <TypedWriter
                              text={splitHoroscopeAscii(
                                horoscopePlainText.value,
                              )
                                .body}
                              htmlText={horoscopeBodyHtml.value}
                              speed={12}
                              enabled
                              humanize
                              showCompletionCursor
                              onComplete={() => {
                                bodyTyped.value = true;
                                globalThis.dispatchEvent(
                                  new CustomEvent("stargram:reading-complete"),
                                );
                              }}
                              className="font-mono min-w-0 max-w-full overflow-hidden break-words text-[14px] sm:text-[15px] leading-[1.52] sm:leading-relaxed"
                              style={`color: ${accentColor};`}
                            />
                          )}

                          {/* The Rite — the seal stamps once the report prints */}
                          {bodyTyped.value && oraclePacket.value && (
                            <div
                              class="cosmic-signal-plaque rite-plaque border-2 rounded-xl p-3 sm:p-4"
                              style={`background: rgba(0,0,0,0.34); border-color: ${accentColor}38; box-shadow: inset 0 0 24px ${accentColor}12, 0 0 16px ${accentGlowColor}14;`}
                            >
                              <div class="relative z-10 flex flex-col sm:flex-row gap-4 sm:items-start">
                                <div class="min-w-0 flex-1 space-y-3">
                                  <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
                                    <p
                                      class="font-mono text-[10px] uppercase tracking-[0.34em]"
                                      style={`color: ${accentColor}; text-shadow: 0 0 10px ${accentColor}66;`}
                                    >
                                      The Rite
                                    </p>
                                    <p
                                      class="font-mono text-[10px] uppercase tracking-[0.18em]"
                                      style={`color: ${accentGlowColor}96;`}
                                    >
                                      ∴∵∷ sky computed · reading locked ∷∵∴
                                    </p>
                                  </div>
                                  <div class="grid gap-2 sm:grid-cols-2">
                                    {getRiteRows(
                                      oraclePacket.value,
                                      oracleSource.value,
                                    ).map((row) => (
                                      <div
                                        key={row.label}
                                        class="min-w-0 border-b pb-1"
                                        style={`border-color: ${accentGlowColor}22;`}
                                      >
                                        <p
                                          class="font-mono text-[9px] uppercase tracking-[0.26em]"
                                          style={`color: ${accentGlowColor}86;`}
                                        >
                                          {row.label}
                                        </p>
                                        <p
                                          class="font-mono text-[11px] sm:text-xs leading-snug break-words"
                                          style={`color: ${accentColor}D8;`}
                                        >
                                          {row.value}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                <div
                                  class="shrink-0 border-t sm:border-t-0 sm:border-l pt-3 sm:pt-1 sm:pl-4 text-left sm:text-center"
                                  style={`border-color: ${accentColor}33; color: ${accentColor};`}
                                >
                                  <pre class="cosmic-charm font-mono text-[7px] sm:text-[8px] leading-[1.05]">{oraclePacket.value.sigil}</pre>
                                  <p
                                    class="mt-2 font-mono text-[9px] uppercase tracking-[0.18em]"
                                    style={`color: ${accentGlowColor}A8;`}
                                  >
                                    sigil of the day
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {
                          /* Console footer — one organised control deck:
                            segmented period dial, then a uniform action row,
                            then the quiet support line. */
                        }
                        <div
                          class="space-y-3.5 pt-5 sm:pt-6 border-t"
                          style={`border-color: ${accentGlowColor}30;`}
                        >
                          {/* Period dial */}
                          <div class="flex justify-center">
                            <div
                              class="inline-flex rounded-2xl border-2 overflow-hidden"
                              style={`border-color: ${accentGlowColor}50; background: rgba(0,0,0,0.55); box-shadow: 0 0 14px ${accentGlowColor}1c;`}
                            >
                              {(["daily", "weekly", "monthly"] as Period[])
                                .map((period) => (
                                  <button
                                    key={period}
                                    type="button"
                                    onClick={() => handlePeriodChange(period)}
                                    onMouseEnter={() => sounds.hover()}
                                    class="min-h-[46px] px-4 min-[390px]:px-5 sm:px-7 font-mono text-xs sm:text-sm uppercase tracking-[0.12em] transition-all"
                                    style={currentPeriod.value === period
                                      ? `background: ${accentColor}24; color: ${accentColor}; text-shadow: 0 0 8px ${accentColor}66; box-shadow: inset 0 0 16px ${accentColor}28; font-weight: 700;`
                                      : `background: transparent; color: ${accentGlowColor}96;`}
                                  >
                                    {period}
                                  </button>
                                ))}
                            </div>
                          </div>

                          {/* Action row — one line, one voice */}
                          <div class="grid grid-cols-3 gap-2.5 sm:gap-3 max-w-md mx-auto">
                            <button
                              type="button"
                              onClick={handleBackToPicker}
                              onMouseEnter={() => sounds.hover()}
                              class="min-h-[48px] px-2 border-2 rounded-2xl font-mono text-xs sm:text-sm uppercase tracking-[0.1em] transition-all hover:scale-[1.04] active:scale-95"
                              style={`background: rgba(0,0,0,0.55); border-color: ${accentGlowColor}66; color: ${accentGlowColor}; box-shadow: 0 0 10px ${accentGlowColor}24;`}
                            >
                              ← BACK
                            </button>
                            <button
                              type="button"
                              onClick={handleCopyReading}
                              onMouseEnter={() => sounds.hover()}
                              class="min-h-[48px] px-2 border-2 rounded-2xl font-mono text-xs sm:text-sm uppercase tracking-[0.1em] transition-all hover:scale-[1.04] active:scale-95"
                              style={copiedReading.value
                                ? `background: ${accentColor}26; border-color: ${accentColor}; color: ${accentColor}; box-shadow: 0 0 16px ${accentColor}55;`
                                : `background: rgba(0,0,0,0.55); border-color: ${accentGlowColor}66; color: ${accentGlowColor}; box-shadow: 0 0 10px ${accentGlowColor}24;`}
                            >
                              {copiedReading.value ? "COPIED!" : "COPY"}
                            </button>
                            <button
                              type="button"
                              onClick={handleShareReading}
                              onMouseEnter={() => sounds.hover()}
                              class="min-h-[48px] px-2 border-2 rounded-2xl font-mono text-xs sm:text-sm uppercase tracking-[0.1em] transition-all hover:scale-[1.04] active:scale-95"
                              style={`background: rgba(0,0,0,0.55); border-color: ${accentGlowColor}66; color: ${accentGlowColor}; box-shadow: 0 0 10px ${accentGlowColor}24;`}
                            >
                              SAVE PNG
                            </button>
                          </div>

                          {/* Support — its own quiet moment */}
                          <div class="flex justify-center pt-1">
                            <button
                              type="button"
                              class="inline-flex min-h-[44px] items-center px-5 border-2 rounded-2xl font-mono text-xs uppercase tracking-[0.12em] transition-all hover:scale-[1.04] active:scale-95"
                              style={`background: rgba(255, 192, 203, 0.06); border-color: rgba(255, 192, 203, 0.32); color: rgba(255, 192, 203, 0.9); box-shadow: 0 0 8px rgba(255, 192, 203, 0.18);`}
                              onMouseEnter={() => sounds.hover()}
                              onClick={() => {
                                sounds.click();
                                openKofiModal();
                              }}
                            >
                              ☕ SUPPORT CREATOR
                            </button>
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
