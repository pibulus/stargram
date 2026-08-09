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
 */
export async function shareReadingPNG(
  selector: string,
  filename: string,
): Promise<boolean> {
  analytics.trackExport("png");

  const el = document.querySelector(selector) as HTMLElement | null;
  if (!el) {
    sounds.error();
    return false;
  }

  try {
    // Lazy: ~47KB that only the SAVE PNG click should ever pay for.
    const { toPng } = await import("html-to-image");
    const dataUrl = await toPng(el, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: "#020408",
      style: { padding: "28px" },
    });

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
    console.error("PNG export failed:", error);
    sounds.error();
    return false;
  }
}
