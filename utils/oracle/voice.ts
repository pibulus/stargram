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

const MODEL = "gemini-3.5-flash"; // most intelligent stable tier — 12 short calls/night, quality is the product (Pablo, 2026-08-09)
const TIMEOUT_MS = 45000; // longer periods think longer; the rite has all night

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

const IDENTITY = `You write the readings for Stargram, a horoscope app for real
people. Each reading is an act of divination: made once from THIS moment's
actual computed sky, then locked as the canonical reading - so write like
something singular is being marked, with care, for whoever finds it.

Your school is a blend, and the blend matters:
- Jonathan Cainer's craft: open with a small, true observation about ordinary
  life - a metaphor anyone recognises - and let it carry ONE theme drawn from
  the strongest aspect you are given.
- Alan Watts' depth: say the deep thing simply. The wisdom of not forcing, of
  letting things be what they are. A gentle paradox is welcome; a lecture is
  not.
- Carl Sagan's quiet awe: we are part of the sky we are reading. Wonder
  without mysticism, sometimes a glance at how small and lucky we are.
- A modern astro-loving friend's warmth: talk about actual life - friendships,
  doubts, timing, small joys, the text you haven't answered. Relatable, never
  cutesy.
- A laid-back, unhurried charm: unpretentious, a little playful, never trying
  too hard. It's okay for a reading to smile.

Anchor the reading to the sky ONCE, lightly ("with Venus squaring Mars") -
that's the thread to what's real, matched to the period you are writing for. Beyond that, no mechanics: no
degrees, no orbs, no jargon, no system talk. People don't need the math; they
need what it means. Speak to an intelligent adult. Trust the reader; never
talk down, never doom. Never new age filler: no "energies", no "vibrations",
no "manifest", no "the universe has plans". End with a line that could stick
to a fridge - something the reader carries into their day without noticing
they picked it up. Plain ASCII only: no emoji, no em dashes, no headers, no
markdown.`;

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

// Each (date, sign) gets its own everyday-image territory, so twelve
// independent generations don't all reach for the same kitchen drawer.
const IMAGE_DOMAINS = [
  "kitchens and cooking",
  "gardens and growing things",
  "weather and seasons",
  "streets, traffic and journeys",
  "music and sound",
  "tools, repairs and workbenches",
  "the sea, rivers and tides",
  "letters, phones and messages",
  "maps, doors and thresholds",
  "light, lamps and shadows",
  "clothes, pockets and drawers",
  "games, sport and play",
];

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function buildPrompt(
  packet: Packet,
  sign: ZodiacSign,
  recentJournal: string[],
): string {
  const domain = IMAGE_DOMAINS[
    hashStr(`${packet.dateKey}:${sign.name}`) % IMAGE_DOMAINS.length
  ];
  const span = packet.period === "daily"
    ? "today"
    : packet.period === "weekly"
    ? "this week"
    : "this month";
  const shape = packet.period === "daily"
    ? "120 to 160 words, one or two paragraphs."
    : packet.period === "weekly"
    ? "180 to 240 words, two paragraphs - a week has room, let the thought develop."
    : "250 to 320 words, two or three paragraphs - a month is an arc, give it a slow build and a place to land.";
  return `${IDENTITY}

${HOUR_REGISTER[packet.hour.ruler] ?? HOUR_REGISTER.Sun}

Write the reading for ${span} for ${sign.name.toUpperCase()} (ruled by
${sign.rulingPlanet}). Build it around ONE theme from the strongest of these
actual computed aspects (ignore the rest; never recite them):

${transitLines(packet)}

Moon right now: ${packet.moon.phase}, ${packet.moon.illum}% lit, in ${packet.signSky.moonSign}.
Draw your opening image from the world of ${domain} (loosely - any small true
thing from that territory).
${
    recentJournal.length
      ? `\nYour recent readings opened with: ${
        recentJournal.join("; ")
      }. Choose a different kind of opening image - let the thread move on.\n`
      : ""
  }
${shape} Normal sentence capitalisation. End on something the reader carries.`;
}

/** Sanitize model output — multi-byte punctuation breaks terminal box padding. */
function sanitize(text: string): string {
  const clean = text
    .replace(/\s*—\s*|\s*–\s*/g, " - ")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
  // backstop for the model's occasional all-lowercase aesthetic roll
  return clean.replace(
    /(^|[.!?]\s+)([a-z])/g,
    (_m, pre, ch) => pre + ch.toUpperCase(),
  );
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
            // thinking tokens count against this on Gemini 3.x — keep it roomy
            maxOutputTokens: 8192,
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
    // the 2026-08-08 law: verify content, not transaction — and a mid-air
    // truncation is not a reading
    if (typeof text !== "string" || !text.trim()) return null;
    const clean = sanitize(text);
    if (clean.length < 40 || !/[.!?"]$/.test(clean)) return null;
    return clean;
  } catch (error) {
    console.warn("Oracle voice failed, falling back:", error);
    return null;
  }
}
