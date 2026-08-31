// ===================================================================
// EXPORT READING - copy + PNG share for the finished reading
// ===================================================================
// Ported from asciifier-web's exportUtils (the twins trade: asciifier
// knows how to hand you the art). Rich clipboard writes text/html +
// text/plain; PNG capture goes to the native share sheet on mobile,
// download elsewhere.

import { sounds } from "./sounds.ts";
import { analytics } from "./analytics.ts";

/**
 * Copy the reading to the clipboard as rich HTML (pastes styled into
 * mail/docs) with a plain-text fallback for terminals and note apps.
 */
export async function copyReading(
  plainText: string,
  htmlContent: string,
): Promise<boolean> {
  analytics.trackExport("copy");
  const signedText = `${plainText.trimEnd()}\n\n✦ stargram.app`;

  try {
    const htmlToCopy = htmlContent.includes("<span")
      ? `<pre style="font-family: 'JetBrains Mono', 'Courier New', monospace; white-space: pre-wrap; line-height: 1.5; font-size: 13px; margin: 0; background: #020408; color: #e0e7ff; padding: 16px; border-radius: 8px;">${htmlContent}</pre>`
      : "";

    if (navigator.clipboard?.write && htmlToCopy) {
      try {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/plain": new Blob([signedText], { type: "text/plain" }),
            "text/html": new Blob([htmlToCopy], { type: "text/html" }),
          }),
        ]);
      } catch {
        await navigator.clipboard.writeText(signedText);
      }
    } else if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(signedText);
    } else {
      throw new Error("No clipboard API support");
    }

    sounds.success();
    return true;
  } catch (err) {
    console.error("Clipboard copy failed:", err);
    sounds.error();
    return false;
  }
}

/**
 * Capture the reading card as a PNG. Mobile gets the native share sheet
 * (the whole point of a shareable horoscope); desktop gets a download.
 *
 * The reading is cloned into an off-screen composed card — fixed width,
 * terminal frame with title bar, footer sign-off — so the PNG is the same
 * intentional artifact no matter what viewport it was read on. (Capturing
 * the live node with an injected padding used to shift content right and
 * clip it, because html-to-image sizes the canvas before the style lands.)
 */
export async function shareReadingPNG(
  selector: string,
  filename: string,
  terminalPath = "~/cosmic/reading.txt",
): Promise<boolean> {
  analytics.trackExport("png");

  const el = document.querySelector(selector) as HTMLElement | null;
  if (!el) {
    sounds.error();
    return false;
  }

  const accent = getComputedStyle(document.documentElement)
    .getPropertyValue("--stargram-accent").trim() || "#74FBA4";

  // Off-screen stage: stays in the document so Tailwind classes keep
  // applying to the clone, but never flashes on screen.
  // Sized at 600px width with balanced padding for a mobile/story-friendly card.
  const card = document.createElement("div");
  card.className = "share-card-stage";
  card.style.cssText = [
    "position: fixed",
    "left: -12000px",
    "top: 0",
    "width: 600px",
    "box-sizing: border-box",
    "padding: 24px 28px 20px",
    `border: 3px solid ${accent}66`,
    "border-radius: 20px",
    "background: radial-gradient(120% 90% at 50% 0%, #0b0716 0%, #030509 68%)",
    "box-shadow: inset 0 0 64px rgba(0, 0, 0, 0.6)",
    "font-family: 'JetBrains Mono', 'Fira Code', monospace",
  ].join(";");

  // Freeze the theatre: no mid-float charms or half-blinked glyphs,
  // and format fortune cards into a balanced 2x2 grid on the 600px stage.
  const still = document.createElement("style");
  still.textContent = [
    ".share-card-stage * { animation: none !important; transform: none !important; }",
    ".share-card-stage .reading-capture { gap: 14px !important; }",
    ".share-card-stage .reading-capture > div { margin-top: 0 !important; }",
    ".share-card-stage .rite-plaque .grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: 10px !important; }",
  ].join("\n");
  card.appendChild(still);

  // Terminal title bar, same lights as the live shell.
  const bar = document.createElement("div");
  bar.style.cssText =
    `display: flex; align-items: center; gap: 10px; padding-bottom: 14px; margin-bottom: 18px; border-bottom: 2px solid ${accent}30;`;
  for (const light of ["#ff5f56", "#ffbd2e", "#27c93f"]) {
    const dot = document.createElement("span");
    dot.style.cssText =
      `width: 10px; height: 10px; border-radius: 9999px; background: ${light};`;
    bar.appendChild(dot);
  }
  const path = document.createElement("span");
  path.style.cssText =
    `font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: ${accent};`;
  path.textContent = terminalPath;
  bar.appendChild(path);
  card.appendChild(bar);

  const clone = el.cloneNode(true) as HTMLElement;
  clone.querySelectorAll(".cursor-blink").forEach((c) => c.remove());
  card.appendChild(clone);

  // Footer sign-off.
  const footer = document.createElement("div");
  footer.style.cssText =
    `margin-top: 18px; padding-top: 14px; border-top: 2px solid ${accent}30; text-align: center; font-size: 11px; letter-spacing: 0.28em; text-transform: uppercase; color: ${accent};`;
  footer.textContent = "✦ stargram.app";
  card.appendChild(footer);

  document.body.appendChild(card);

  try {
    // Lazy: ~47KB that only the SAVE PNG click should ever pay for.
    const { toPng } = await import("html-to-image");
    const dataUrl = await toPng(card, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: "#030509",
      // The live card parks off-screen at left:-12000px; the clone must not
      // inherit that or the render is a blank frame of background.
      style: { position: "static", left: "0", top: "0" },
    });
    card.remove();

    const blob = await fetch(dataUrl).then((res) => res.blob());

    if (
      navigator.share && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    ) {
      try {
        const file = new File([blob], `${filename}.png`, {
          type: "image/png",
        });
        await navigator.share({ files: [file], title: "Stargram reading" });
        sounds.success();
        return true;
      } catch {
        // Share sheet dismissed or unsupported payload; fall through.
      }
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    sounds.success();
    return true;
  } catch (error) {
    card.remove();
    console.error("PNG export failed:", error);
    sounds.error();
    return false;
  }
}
