// ===================================================================
// HOROSCOPE DISPLAY ISLAND - Cosmic horoscope with dark magic vibes
// ===================================================================

// deno-lint-ignore-file no-explicit-any no-unsafe-finally

import { useSignal } from "@preact/signals";
import { useEffect, useRef } from "preact/hooks";
import { sounds } from "../utils/sounds.ts";
import { analytics } from "../utils/analytics.ts";
import { getZodiacEmoji } from "../utils/zodiac.ts";
import { COLOR_EFFECTS } from "../utils/constants.ts";
import { TerminalDisplay } from "../components/TerminalDisplay.tsx";
import { applyColorToArt } from "../utils/colorEffects.ts";
import { generateHoroscopeAscii } from "../utils/asciiArtGenerator.ts";

const FEATURED_EFFECTS = ["trinity", "lolcat"];
const RANDOM_COLOR_EFFECTS = COLOR_EFFECTS.filter((effect) =>
  FEATURED_EFFECTS.includes(effect.value)
);
const FALLBACK_COLOR_EFFECTS = COLOR_EFFECTS.filter((effect) =>
  effect.value !== "none"
);

function pickRandomColorEffect(): string {
  const pool = RANDOM_COLOR_EFFECTS.length
    ? RANDOM_COLOR_EFFECTS
    : FALLBACK_COLOR_EFFECTS;
  if (!pool.length) return "sunrise";
  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex].value;
}

interface HoroscopeDisplayProps {
  sign: string;
  onChangeSign?: () => void;
}

type Period = "daily" | "weekly" | "monthly";

function getDisplayMeta(data: any, period: Period): string {
  if (!data) return "";
  if (period === "weekly") {
    return data.week || data.date || "";
  }
  if (period === "monthly") {
    return data.month || data.date || "";
  }
  return data.date || "";
}

export default function HoroscopeDisplay(
  { sign, onChangeSign: _onChangeSign }: HoroscopeDisplayProps,
) {
  const currentPeriod = useSignal<Period>("daily");
  const horoscopeData = useSignal<any>(null);
  const isLoading = useSignal(false);
  const isBootingUp = useSignal(false);
  const bootComplete = useSignal(false);
  const bootMessages = useSignal<string[]>([]);
  const colorEffect = useSignal(pickRandomColorEffect());
  const visualEffect = useSignal("neon"); // Hard-coded to neon
  const asciiOutput = useSignal("");
  const colorizedHtml = useSignal("");
  const headerHtml = useSignal("");
  const bodyHtml = useSignal("");
  const headerText = useSignal("");
  const bodyText = useSignal("");
  const requestIdRef = useRef(0);
  const activeController = useRef<AbortController | null>(null);
  const errorMessage = useSignal<string | null>(null);

  // Initialize analytics
  useEffect(() => {
    analytics.init();
  }, []);

  // Fetch horoscope when sign or period changes
  useEffect(() => {
    if (sign) {
      fetchHoroscope(sign, currentPeriod.value);
    }
  }, [sign, currentPeriod.value]);

  // Generate ASCII art when horoscope data or font changes
  useEffect(() => {
    const text = horoscopeData.value?.horoscope_data ??
      horoscopeData.value?.horoscope;
    if (text) {
      const metaLabel = getDisplayMeta(
        horoscopeData.value,
        currentPeriod.value,
      );
      // Generate ASCII art with sign name, period, and date
      const emoji = getZodiacEmoji(sign);
      const ascii = generateHoroscopeAscii(
        sign,
        text,
        currentPeriod.value,
        metaLabel,
        emoji,
      );
      asciiOutput.value = ascii;
      const sections = splitAsciiSections(ascii);
      headerText.value = sections.header;
      bodyText.value = sections.body;

      // Always apply special header formatting
      // Even with no color effect, header gets golden color
      if (colorEffect.value !== "none") {
        const colorized = applyColorToArt(ascii, colorEffect.value);
        colorizedHtml.value = colorized.fullHtml;
        headerHtml.value = colorized.headerHtml;
        bodyHtml.value = colorized.bodyHtml;
      } else {
        // No color effect: still highlight header in gold
        const colorized = applyHeaderHighlight(ascii);
        colorizedHtml.value = colorized.fullHtml;
        headerHtml.value = colorized.headerHtml;
        bodyHtml.value = colorized.bodyHtml;
      }
    }
  }, [horoscopeData.value, colorEffect.value]);

  // Helper function to highlight header even without color effects
  const escapeHtml = (value: string): string =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const applyHeaderHighlight = (art: string) => {
    const lines = art.split("\n");
    const colorizedLines: string[] = [];
    const headerLines: string[] = [];
    const bodyLines: string[] = [];
    let inHeader = false;
    let headerLineIndex = 0;

    for (const line of lines) {
      if (line.includes("[HEADER_START]")) {
        inHeader = true;
        headerLineIndex = 0;
        continue;
      }
      if (line.includes("[HEADER_END]")) {
        inHeader = false;
        headerLineIndex = 0;
        continue;
      }

      if (inHeader) {
        headerLineIndex++;
        const isTitleLine = headerLineIndex === 1;
        const baseStyle =
          "color: #FFD700; display: block; max-width: 100%; overflow: hidden; white-space: pre; font-family: 'JetBrains Mono', 'SF Mono', 'Courier New', monospace;";

        const span = isTitleLine
          ? `<span style="${baseStyle} font-weight: 900; letter-spacing: 0.04em; font-size: clamp(8px, 2.4vw, 20px); text-transform: uppercase; line-height: 1.05;">${
            escapeHtml(line)
          }</span>`
          : `<span style="${baseStyle} font-weight: 700; letter-spacing: 0; font-size: clamp(6px, 1.9vw, 22px); text-transform: none; line-height: 1.1;">${
            escapeHtml(line)
          }</span>`;
        colorizedLines.push(span);
        headerLines.push(span);
      } else if (line.trim()) {
        // Body in terminal green
        const span = `<span style="color: #00FF41;">${escapeHtml(line)}</span>`;
        colorizedLines.push(span);
        bodyLines.push(span);
      } else {
        colorizedLines.push(line);
        bodyLines.push(line);
      }
    }

    return {
      fullHtml: colorizedLines.join("\n"),
      headerHtml: headerLines.join("\n"),
      bodyHtml: bodyLines.join("\n"),
    };
  };

  const splitAsciiSections = (art: string) => {
    const startMarker = "[HEADER_START]";
    const endMarker = "[HEADER_END]";
    const startIndex = art.indexOf(startMarker);
    const endIndex = art.indexOf(endMarker);
    if (startIndex === -1 || endIndex === -1) {
      return { header: "", body: art.trim() };
    }
    const header = art.slice(startIndex + startMarker.length, endIndex).trim();
    const body = art.slice(endIndex + endMarker.length).trimStart();
    return { header, body };
  };

  const fetchHoroscope = async (zodiacSign: string, period: Period) => {
    // Abort any in-flight request before starting a new one
    if (activeController.current) {
      activeController.current.abort();
    }
    const controller = new AbortController();
    activeController.current = controller;
    const requestToken = ++requestIdRef.current;

    // Start boot sequence
    isBootingUp.value = true;
    bootComplete.value = false;
    errorMessage.value = null;
    // Start with an initial boot message so there's always content to show
    bootMessages.value = ["> Initializing..."];

    // Array of different boot sequences for variety
    const bootSequences = [
      // 1. Technical (original)
      [
        "> Establishing link to Celestial Mainframe...",
        "> Signal lock: ACQUIRED",
        `> Decrypting transmission for [${zodiacSign.toUpperCase()}]...`,
        "> LOADING...",
      ],
      // 2. Mystical
      [
        "> Consulting the astral records...",
        "> Planetary alignment: VERIFIED",
        `> Channeling cosmic wisdom for [${zodiacSign.toUpperCase()}]...`,
        "> RECEIVING...",
      ],
      // 3. Cyberpunk
      [
        "> Jacking into the zodiac matrix...",
        "> Neural link: ESTABLISHED",
        `> Decrypting star data for [${zodiacSign.toUpperCase()}]...`,
        "> DOWNLOADING...",
      ],
      // 4. Retro Sci-Fi
      [
        "> Contacting mothership...",
        "> Transmission received",
        `> Decoding celestial message for [${zodiacSign.toUpperCase()}]...`,
        "> PROCESSING...",
      ],
      // 5. Casual/Cheeky
      [
        "> Waking up the fortune teller...",
        "> Cosmic vibes: STRONG",
        `> Reading the stars for [${zodiacSign.toUpperCase()}]...`,
        "> BREWING...",
      ],
      // 6. Hacker
      [
        "> Breaching cosmic firewall...",
        "> Root access: GRANTED",
        `> Extracting horoscope data for [${zodiacSign.toUpperCase()}]...`,
        "> COMPILING...",
      ],
    ];

    // Randomly pick a boot sequence
    const selectedBootMessages =
      bootSequences[Math.floor(Math.random() * bootSequences.length)];
    bootMessages.value = selectedBootMessages;

    // Type out boot messages with delays
    for (let i = 0; i < selectedBootMessages.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 400));
      if (controller.signal.aborted || requestToken !== requestIdRef.current) {
        return;
      }
      sounds.click();
      bootMessages.value = selectedBootMessages.slice(0, i + 1);
    }

    // Wait a moment before starting fetch
    await new Promise((resolve) => setTimeout(resolve, 300));
    if (controller.signal.aborted || requestToken !== requestIdRef.current) {
      return;
    }

    // Boot complete, start actual fetch
    isBootingUp.value = false;
    bootComplete.value = true;
    isLoading.value = true;

    try {
      const response = await fetch(
        `/api/horoscope?sign=${zodiacSign}&period=${period}`,
        { signal: controller.signal },
      );
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }
      const data = await response.json();

      if (controller.signal.aborted || requestToken !== requestIdRef.current) {
        return;
      }

      const horoscopeText = data.data?.horoscope_data ?? data.data?.horoscope;
      if (data.success && horoscopeText) {
        colorEffect.value = pickRandomColorEffect();
        horoscopeData.value = {
          ...data.data,
          horoscope: horoscopeText,
          horoscope_data: horoscopeText,
        };
        analytics.trackHoroscopeViewed(zodiacSign, period, colorEffect.value);
        sounds.success();
      } else {
        console.error("Horoscope fetch failed:", data.error);
        sounds.error();
        horoscopeData.value = null;
        asciiOutput.value = "";
        colorizedHtml.value = "";
        // Random error messages with personality
        const errorMessages = [
          "⚠️ TRANSMISSION CORRUPTED — The stars sent back static. Retry?",
          "❌ LINK SEVERED — Cosmic firewall blocked the vibes. Try again?",
          "⚡ SIGNAL LOST — Mothership went dark. Reconnect?",
          "🔮 DIVINATION FAILED — The universe hung up on us. One more time?",
        ];
        errorMessage.value =
          errorMessages[Math.floor(Math.random() * errorMessages.length)];
      }
    } catch (error) {
      if (controller.signal.aborted || requestToken !== requestIdRef.current) {
        return;
      }
      console.error("Failed to fetch horoscope:", error);
      sounds.error();
      horoscopeData.value = null;
      asciiOutput.value = "";
      colorizedHtml.value = "";
      // Random network error messages
      const networkErrors = [
        "🛰️ CONNECTION TIMEOUT — Can't reach the astral plane. Check your link?",
        "⚠️ MAINFRAME OFFLINE — The celestial servers are napping. Retry?",
        "❌ DECRYPT FAILED — Star data scrambled beyond recognition. Try again?",
        "🌌 VOID DETECTED — Nothing but cosmic silence out there. Reconnect?",
      ];
      errorMessage.value =
        networkErrors[Math.floor(Math.random() * networkErrors.length)];
    } finally {
      if (controller.signal.aborted || requestToken !== requestIdRef.current) {
        return;
      }
      isLoading.value = false;
      if (activeController.current === controller) {
        activeController.current = null;
      }
    }
  };

  const handlePeriodChange = (period: string) => {
    currentPeriod.value = period as Period;
  };

  const handleRetry = () => {
    sounds.click();
    fetchHoroscope(sign, currentPeriod.value);
  };

  return (
    <div class="w-full min-h-[90dvh] flex items-center justify-center px-4 py-10 md:px-8 md:py-12">
      {/* Always show terminal */}
      {errorMessage.value
        ? (
          <div class="w-full flex justify-center" style="padding: 64px 0;">
            <div
              class="border-4 rounded-2xl px-6 py-8 max-w-md text-center shadow-brutal-lg"
              style="background-color: rgba(10, 10, 10, 0.85); border-color: var(--color-border, #a855f7);"
            >
              <p
                class="font-mono text-sm sm:text-base mb-6"
                style="color: var(--color-text, #faf9f6); line-height: 1.7;"
              >
                {errorMessage.value}
              </p>
              <button
                type="button"
                onClick={handleRetry}
                class="inline-flex items-center gap-2 font-mono font-black uppercase tracking-wide px-6 py-3 border-3 rounded-xl transition-all hover:scale-105 active:scale-95 shadow-brutal"
                style="background-color: var(--color-accent, #a855f7); color: var(--color-text, #faf9f6); border-color: var(--color-border, #a855f7);"
              >
                🔁 Retry
              </button>
            </div>
          </div>
        )
        : (
          <TerminalDisplay
            content={(isLoading.value || isBootingUp.value)
              ? bootMessages.value.join("\n")
              : (horoscopeData.value
                ? asciiOutput.value
                : "No horoscope data available")}
            htmlContent={(isLoading.value || isBootingUp.value)
              ? bootMessages.value.map((msg) =>
                `<span style="color: #00FF41;">${msg}</span>`
              ).join("\n")
              : (horoscopeData.value ? colorizedHtml.value : "")}
            headerHtmlContent={(isLoading.value || isBootingUp.value)
              ? undefined
              : (headerHtml.value || undefined)}
            bodyHtmlContent={(isLoading.value || isBootingUp.value)
              ? undefined
              : (bodyHtml.value || undefined)}
            headerPlainText={(isLoading.value || isBootingUp.value)
              ? undefined
              : (headerText.value || undefined)}
            bodyPlainText={(isLoading.value || isBootingUp.value)
              ? undefined
              : (bodyText.value || undefined)}
            headerTypeSpeed={12}
            isLoading={isLoading.value || isBootingUp.value}
            filename={horoscopeData.value
              ? `${sign}-${currentPeriod.value}-${
                horoscopeData.value.date
                  ? horoscopeData.value.date.toLowerCase().replace(
                    /[\s,]+/g,
                    "-",
                  )
                  : "horoscope"
              }`
              : `${sign}-horoscope`}
            terminalPath={`~/cosmic/${sign}.txt`}
            visualEffect={visualEffect.value}
            hideExportButtons={!horoscopeData.value}
            enableTypewriter={bootComplete.value && horoscopeData.value}
            typewriterSpeed={24}
            currentPeriod={currentPeriod.value}
            onPeriodChange={handlePeriodChange}
          />
        )}
    </div>
  );
}
