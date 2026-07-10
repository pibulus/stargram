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
