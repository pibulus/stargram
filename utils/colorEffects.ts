// ===================================================================
// COLOR EFFECTS - Colorizes horoscope ASCII into header/body HTML
// ===================================================================
// The live flow renders one palette: "trinity" (purple/green/orange
// body sweep with a warm gold header). Past effect variants live in
// git history if an effect picker ever returns.

const TRINITY_PALETTE = ["#b179ff", "#00ff9d", "#ff9a3c"];
const TRINITY_HEADER_COLOR = "#ffdb8a";

/**
 * Calculate the body color for a specific position in the ASCII art
 */
function getEffectColor(x: number, lineWidth: number): string {
  const progress = x / Math.max(1, lineWidth);
  const index = Math.min(
    TRINITY_PALETTE.length - 1,
    Math.floor(progress * TRINITY_PALETTE.length),
  );
  return TRINITY_PALETTE[index];
}

export interface ColorizedArtSegments {
  fullHtml: string;
  headerHtml: string;
  bodyHtml: string;
}

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

/**
 * Apply the trinity color effect to ASCII art text with special header
 * treatment. Returns HTML segments with colored spans for header/body.
 */
export function applyColorToArt(art: string): ColorizedArtSegments {
  if (!art) {
    return { fullHtml: "", headerHtml: "", bodyHtml: "" };
  }

  const lines = art.split("\n");
  const colorizedLines: string[] = [];
  const headerLines: string[] = [];
  const bodyLines: string[] = [];
  let inHeader = false;
  let headerLineIndex = 0;

  const headerColor = TRINITY_HEADER_COLOR;
  const getHeaderFontSize = (
    lineLength: number,
    preferredVw: number,
    minPx: number,
    maxPx: number,
  ) => {
    const safeLength = Math.max(12, lineLength);
    const estimatedGlyphWidth = safeLength * 0.62;
    const vwFit = (100 / estimatedGlyphWidth).toFixed(4);
    const remInset = (6 / estimatedGlyphWidth).toFixed(4);

    return `clamp(${minPx}px, min(${preferredVw}vw, calc(${vwFit}vw - ${remInset}rem)), ${maxPx}px)`;
  };

  for (let y = 0; y < lines.length; y++) {
    const line = lines[y];

    // Check for header markers
    if (line.includes("[HEADER_START]")) {
      inHeader = true;
      headerLineIndex = 0;
      continue; // Skip the marker line
    }
    if (line.includes("[HEADER_END]")) {
      inHeader = false;
      headerLineIndex = 0;
      continue; // Skip the marker line
    }

    // Apply header color or gradient color
    if (inHeader) {
      headerLineIndex++;
      const isTitleLine = headerLineIndex === 1;
      const fontSize = isTitleLine
        ? getHeaderFontSize(line.length, 2.1, 5.5, 18)
        : getHeaderFontSize(line.length, 1.9, 4.5, 16);
      const baseStyle =
        `color: ${headerColor}; display: block; max-width: 100%; overflow: hidden; white-space: pre; font-family: 'JetBrains Mono', 'SF Mono', 'Courier New', monospace;`;

      if (isTitleLine) {
        const span =
          `<span style="${baseStyle} font-weight: 900; letter-spacing: 0.04em; font-size: ${fontSize}; text-transform: uppercase; line-height: 1.05;">${
            escapeHtml(line)
          }</span>`;
        headerLines.push(span);
        colorizedLines.push(span);
      } else {
        const span =
          `<span style="${baseStyle} font-weight: 700; letter-spacing: 0; font-size: ${fontSize}; text-transform: none; line-height: 1.1;">${
            escapeHtml(line)
          }</span>`;
        headerLines.push(span);
        colorizedLines.push(span);
      }
    } else if (line.trim()) {
      // Body gets gradient effect
      const color = getEffectColor(
        Math.floor(line.length / 2),
        line.length,
      );
      const isDividerLine = /^[\s═★:·.\-]+$/.test(line);
      const bodyLayout = isDividerLine
        ? "display: block; white-space: pre; overflow: hidden;"
        : "display: block; white-space: pre-wrap; overflow-wrap: anywhere;";
      const span = `<span style="color: ${color}; ${bodyLayout}">${
        escapeHtml(line)
      }</span>`;
      colorizedLines.push(span);
      bodyLines.push(span);
    } else {
      // Empty lines stay empty
      colorizedLines.push(line);
      bodyLines.push(line);
    }
  }

  return {
    fullHtml: colorizedLines.join("\n"),
    headerHtml: headerLines.join("\n"),
    bodyHtml: bodyLines.join("\n"),
  };
}
