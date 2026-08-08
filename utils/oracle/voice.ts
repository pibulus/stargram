// ===================================================================
// ORACLE · voice.ts — the Oracle speaks. Once per rite, then it locks.
// ===================================================================
// Raw Gemini REST fetch — deliberately NO @google/genai SDK (it prefers
// GOOGLE_API_KEY over any explicitly-passed key and has silently shadowed
// every app in the fleet before; fleet law). Model is the rolling alias.
//
// The sky tunes the instrument that writes the reading:
//   moon illumination  → temperature  (new moon spare, full moon vivid)
//   planetary hour     → voice register at rite time
// Same inputs, same night — but no two nights are played the same way.

import { type ZodiacSign } from "../zodiac.ts";
import { type Packet } from "./compose.ts";

const MODEL = "gemini-flash-lite-latest"; // rolling alias — never pin a dated model
const TIMEOUT_MS = 20000;

// Voice register by the planetary hour ruling the rite — a slight lean in
// delivery, never a costume.
const HOUR_REGISTER: Record<string, string> = {
  Sun: "Lean steady and warm.",
  Moon: "Lean quiet and reflective.",
  Mercury: "Lean a little quicker, more curious.",
  Venus: "Lean gentle, notice what's good.",
  Mars: "Lean direct, shorter sentences.",
  Jupiter: "Lean open and encouraging.",
  Saturn: "Lean measured and honest.",
};

const IDENTITY = `You write the daily readings for Stargram, a terminal-styled
horoscope app. You work from the REAL computed sky - actual planetary positions
and aspects, calculated, not scraped - and your job is to translate it into
something a normal person finds genuinely useful. Voice: a thoughtful friend
who happens to know the sky well. Chill and plain-spoken, warm, specific. A
touch of strangeness is fine; performance is not. No mystic theatrics, no "the
universe has plans", no dramatic proclamations, no purple prose. Concrete beats
cosmic. Plain language, no astrology jargon without a hint of what it means.
Address the reader as "you". Never generic filler, never horoscope cliches,
never mention work meetings or productivity. Plain ASCII only: no emoji, no em
dashes, no headers, no markdown.`;

function transitLines(packet: Packet): string {
  const p = packet.signSky.rulerPlacement;
  const lines = [
    `${p.body} (this sign's ruler) at ${p.degree} degrees ${p.sign}${
      p.retrograde ? ", retrograde" : ""
    }`,
  ];
  for (const a of packet.signSky.rulerAspects.slice(0, 4)) {
    lines.push(`${a.a} ${a.type} ${a.b} (orb ${a.orb}, power ${a.power})`);
  }
  return lines.join("\n");
}

function buildPrompt(
  packet: Packet,
  sign: ZodiacSign,
  recentJournal: string[],
): string {
  const span = packet.period === "daily"
    ? "today"
    : packet.period === "weekly"
    ? "this week"
    : "this month";
  return `${IDENTITY}

${HOUR_REGISTER[packet.hour.ruler] ?? HOUR_REGISTER.Sun}

Write ${span}'s reading for ${sign.name.toUpperCase()} (${sign.element}, ruled
by ${sign.rulingPlanet}). Ground it ONLY in the strongest of these actual
computed aspects - two or three of them, no more:

${transitLines(packet)}

Moon: ${packet.moon.phase}, ${packet.moon.illum}% lit, in ${packet.signSky.moonSign}.
The old Mexican count of days reads ${packet.tonalli.name} (${packet.tonalli.meaning}) -
weave it in lightly, one touch, not a lecture.
The day's draw, if one of them wants to echo the sky (optional, at most one):
tarot ${packet.draw.tarot.name}${packet.draw.tarot.reversed ? " reversed" : ""},
rune ${packet.draw.rune.name} (${packet.draw.rune.meaning}),
hexagram ${packet.draw.hexagram.number} ${packet.draw.hexagram.name}.
${
    recentJournal.length
      ? `\nYour recent readings spoke of: ${
        recentJournal.join("; ")
      }. Do not repeat those images - let the thread continue somewhere new.\n`
      : ""
  }
80 to 110 words. One paragraph. End on something the reader can carry.`;
}

/** Sanitize model output — multi-byte punctuation breaks terminal box padding. */
function sanitize(text: string): string {
  return text
    .replace(/\s*—\s*|\s*–\s*/g, " - ")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Ask the Oracle to interpret the packet. Returns null on ANY failure —
 * the caller falls back to composeFallback(). Never throws.
 */
export async function speakReading(
  packet: Packet,
  sign: ZodiacSign,
  recentJournal: string[] = [],
): Promise<string | null> {
  const key = Deno.env.get("STARGRAM_GEMINI_KEY");
  if (!key) return null;

  // full moon = hot and vivid, new moon = cool and spare
  const temperature = 0.75 + (packet.moon.illum / 100) * 0.45;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": key,
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: buildPrompt(packet, sign, recentJournal) }],
          }],
          generationConfig: {
            temperature: Math.round(temperature * 100) / 100,
            maxOutputTokens: 1024,
          },
        }),
        signal: controller.signal,
      },
    ).finally(() => clearTimeout(timeout));

    if (!res.ok) {
      console.warn(`Oracle voice: Gemini returned ${res.status}`);
      return null;
    }
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    // the 2026-08-08 law: verify content, not transaction
    if (typeof text !== "string" || !text.trim()) return null;
    const clean = sanitize(text);
    return clean.length >= 40 ? clean : null;
  } catch (error) {
    console.warn("Oracle voice failed, falling back:", error);
    return null;
  }
}
