// ===================================================================
// ASCII ART GENERATOR - Figlet text conversion for cosmic horoscopes
// ===================================================================
// Converts horoscope text and sign names to ASCII art
// Uses figlet (real fonts!) for text-to-ASCII transformation

import figlet, { FigletOptions } from "npm:figlet@1.11.0";
import AnsiShadowFont from "npm:figlet@1.11.0/importable-fonts/ANSI Shadow.js";
import SmallSlantFont from "npm:figlet@1.11.0/importable-fonts/Small Slant.js";
import MiniFont from "npm:figlet@1.11.0/importable-fonts/Mini.js";
import StandardFont from "npm:figlet@1.11.0/importable-fonts/Standard.js";
import SmallFont from "npm:figlet@1.11.0/importable-fonts/Small.js";

const FIGLET_FONT_DATA = {
  "ANSI Shadow": AnsiShadowFont,
  "Small Slant": SmallSlantFont,
  Mini: MiniFont,
  Standard: StandardFont,
  Small: SmallFont,
} as const;

type FigletFontName = keyof typeof FIGLET_FONT_DATA;

interface RenderFigletOptions extends
  Pick<
    FigletOptions,
    "horizontalLayout" | "verticalLayout" | "width"
  > {
  font?: FigletFontName;
}

const loadedFonts = new Set<FigletFontName>();

function ensureFontLoaded(font: FigletFontName) {
  if (loadedFonts.has(font)) return;
  figlet.parseFont(font, FIGLET_FONT_DATA[font]);
  loadedFonts.add(font);
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function renderFigletText(
  text: string,
  options: RenderFigletOptions = {},
): string {
  const cleaned = normalizeText(text);
  if (!cleaned) return "";

  const font = options.font ?? "ANSI Shadow";
  ensureFontLoaded(font);

  try {
    const ascii = figlet.textSync(cleaned, {
      font,
      horizontalLayout: options.horizontalLayout ?? "fitted",
      verticalLayout: options.verticalLayout ?? "fitted",
      width: options.width ?? 80,
      whitespaceBreak: true,
    });
    return ascii.replace(/\s+$/, "");
  } catch (_error) {
    // Fallback to uppercase plain text if figlet fails for any reason
    return cleaned.toUpperCase();
  }
}

/**
 * Simple text-based horoscope formatter with improved spacing and color markers
 * Formats horoscope with a beautiful header and body text
 * Uses special markers for header colorization
 */
export function generateHoroscopeAscii(
  signName: string,
  horoscopeText: string,
  period: string = "daily",
  date: string = "",
  _emoji?: string,
): string {
  const signUpper = signName.toUpperCase();
  const periodUpper = period.toUpperCase();
  const metaLine = date ? `${periodUpper} • ${date}` : periodUpper;

  const figletTitleBase = renderFigletText(signUpper, {
    font: "ANSI Shadow",
    width: 84,
  });
  const sentinelLine = "····················";
  const figletTitle = figletTitleBase
    ? `${sentinelLine}\n${figletTitleBase}`
    : "";
  const figletMeta = metaLine ? metaLine : "";

  // Wrap header in special markers for colorization
  const headerParts = ["[HEADER_START]"];
  if (figletTitle) {
    headerParts.push(figletTitle);
  }
  if (figletMeta) {
    headerParts.push(figletMeta);
  } else if (metaLine) {
    headerParts.push(metaLine);
  }
  headerParts.push("[HEADER_END]");
  const header = headerParts.join("\n");

  // Format horoscope text with nice line breaks (max 68 chars per line for better fit)
  const words = horoscopeText.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if ((currentLine + word).length > 66) {
      lines.push(currentLine.trim());
      currentLine = word + " ";
    } else {
      currentLine += word + " ";
    }
  }
  if (currentLine.trim()) {
    lines.push(currentLine.trim());
  }

  // Join lines with proper spacing (no centering - left aligned looks cleaner)
  const bodyText = lines.join("\n");

  // Add spacing between header and body
  return `${header}\n\n${bodyText}\n`;
}

/**
 * Escape HTML for safe display
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
