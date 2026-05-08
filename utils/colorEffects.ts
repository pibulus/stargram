// ===================================================================
// COLOR EFFECTS - Shared color calculation utilities
// ===================================================================
// Used by both TextToAscii and AsciiGallery for consistent coloring

/**
 * Calculate HSL color for a specific position in ASCII art
 * based on the selected color effect
 */
export function getEffectColor(
  effect: string,
  x: number,
  y: number,
  lineWidth: number,
  totalLines: number,
): string {
  switch (effect) {
    case "unicorn": {
      const hue = (x * 360 / lineWidth) % 360;
      return `hsl(${hue}, 95%, 65%)`;
    }
    case "fire": {
      const hue = 60 - (y * 60 / totalLines);
      const sat = 100 - (y * 20 / totalLines);
      return `hsl(${hue}, ${sat}%, 55%)`;
    }
    case "cyberpunk": {
      const progress = (x + y) / (lineWidth + totalLines);
      const hue = 320 - (progress * 140);
      return `hsl(${hue}, 100%, 60%)`;
    }
    case "sunrise": {
      const progress = y / totalLines;
      const hue = 330 + (progress * 60);
      const sat = 85 + (progress * 15);
      const bright = 60 + (progress * 20);
      return `hsl(${hue}, ${sat}%, ${bright}%)`;
    }
    case "vaporwave": {
      const progress = y / totalLines;
      const hue = 280 + (progress * 80);
      const sat = 80 + Math.sin((x + y) * 0.3) * 15;
      const bright = 65 + Math.sin(x * 0.4) * 10;
      return `hsl(${hue}, ${sat}%, ${bright}%)`;
    }
    case "chrome": {
      const hue = 200 + Math.sin(x * 0.2) * 60;
      const brightness = 70 + Math.sin(y * 0.3) * 20;
      return `hsl(${hue}, 30%, ${brightness}%)`;
    }
    case "ocean": {
      const progress = y / totalLines;
      const hue = 180 + (progress * 30); // Cyan (180) → Blue (210)
      const sat = 70 + (progress * 20);
      const bright = 50 + (progress * 20);
      return `hsl(${hue}, ${sat}%, ${bright}%)`;
    }
    case "neon": {
      const progress = (x + y) / (lineWidth + totalLines);
      const hue = 60 + Math.sin(progress * 10) * 120; // Yellow/Green/Pink oscillation
      const sat = 100;
      const bright = 60 + Math.sin(progress * 8) * 15;
      return `hsl(${hue}, ${sat}%, ${bright}%)`;
    }
    case "poison": {
      const progress = (x + y) / (lineWidth + totalLines);
      const hue = 90 + (progress * 30); // Lime green (90) → Yellow-green (120)
      const sat = 90 + Math.sin(x * 0.5) * 10;
      const bright = 45 + (progress * 20);
      return `hsl(${hue}, ${sat}%, ${bright}%)`;
    }
    case "lolcat": {
      const hue = ((x * 18) + (y * 8)) % 360;
      const sat = 90;
      const bright = 70 + Math.sin((x + y) * 0.35) * 12;
      return `hsl(${hue}, ${sat}%, ${bright}%)`;
    }
    case "trinity": {
      const palette = ["#b179ff", "#00ff9d", "#ff9a3c"];
      const progress = x / Math.max(1, lineWidth);
      const index = Math.min(
        palette.length - 1,
        Math.floor(progress * palette.length),
      );
      return palette[index];
    }
    default:
      return "#00FF41";
  }
}

export interface ColorizedArtSegments {
  fullHtml: string;
  headerHtml: string;
  bodyHtml: string;
}

/**
 * Apply a color effect to ASCII art text with special header treatment
 * Returns HTML segments with colored spans for header/body
 */
const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

export function applyColorToArt(
  art: string,
  effect: string,
): ColorizedArtSegments {
  if (effect === "none" || !art) {
    return { fullHtml: "", headerHtml: "", bodyHtml: "" };
  }

  const lines = art.split("\n");
  const colorizedLines: string[] = [];
  const headerLines: string[] = [];
  const bodyLines: string[] = [];
  let inHeader = false;
  let headerLineIndex = 0;

  // Define header colors for each effect (brighter than body)
  const headerColors: Record<string, string> = {
    unicorn: "hsl(280, 100%, 75%)", // Bright purple
    fire: "hsl(40, 100%, 65%)", // Bright orange-yellow
    cyberpunk: "hsl(320, 100%, 70%)", // Hot pink
    sunrise: "hsl(30, 100%, 70%)", // Golden
    vaporwave: "hsl(310, 95%, 75%)", // Pink-purple
    chrome: "hsl(200, 60%, 85%)", // Light cyan
    ocean: "hsl(180, 85%, 65%)", // Bright cyan
    neon: "hsl(100, 100%, 70%)", // Lime green
    poison: "hsl(100, 100%, 55%)", // Toxic green
    lolcat: "hsl(320, 95%, 75%)", // Vibrant magenta
    trinity: "#ffdb8a", // Warm gold for triad mix
  };

  const headerColor = headerColors[effect] || "#FFD700"; // Gold fallback

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
      const baseStyle =
        `color: ${headerColor}; display: block; max-width: 100%; overflow: hidden; white-space: pre; font-family: 'JetBrains Mono', 'SF Mono', 'Courier New', monospace;`;

      if (isTitleLine) {
        const span =
          `<span style="${baseStyle} font-weight: 900; letter-spacing: 0.04em; font-size: clamp(8px, 2.4vw, 20px); text-transform: uppercase; line-height: 1.05;">${
            escapeHtml(line)
          }</span>`;
        headerLines.push(span);
        colorizedLines.push(span);
      } else {
        const span =
          `<span style="${baseStyle} font-weight: 700; letter-spacing: 0; font-size: clamp(6px, 1.9vw, 22px); text-transform: none; line-height: 1.1;">${
            escapeHtml(line)
          }</span>`;
        headerLines.push(span);
        colorizedLines.push(span);
      }
    } else if (line.trim()) {
      // Body gets gradient effect
      const color = getEffectColor(
        effect,
        Math.floor(line.length / 2),
        y,
        line.length,
        lines.length,
      );
      const span = `<span style="color: ${color};">${escapeHtml(line)}</span>`;
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
