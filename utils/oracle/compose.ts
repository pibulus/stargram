// ===================================================================
// ORACLE · compose.ts — packet builder + the never-blank fallback
// ===================================================================
// The packet is the full divination state for one (period, sign, date):
// real sky, tonalpohualli, moon, planetary hour, draws, sigil. The AI
// voice interprets it; if the voice ever fails, composeFallback() writes
// a readable reading from the same packet. This chain cannot go blank —
// that law was paid for in production on 2026-08-08.

import { type ZodiacSign } from "../zodiac.ts";
import { computeSky, type SignSky, type Sky, skyForSign } from "./sky.ts";
import {
  type MoonState,
  moonState,
  planetaryHour,
  type PlanetHour,
} from "./count.ts";
import { type DailyDraw, dailyDraw } from "./draw.ts";
import { mintSigil } from "./sigil.ts";

export type Period = "daily" | "weekly" | "monthly";

export interface Packet {
  dateKey: string; // Melbourne calendar date "YYYY-MM-DD" (or week/month key)
  period: Period;
  sign: string;
  signSky: SignSky;
  moon: MoonState;
  hour: PlanetHour; // planetary hour at rite time — tunes the voice register
  draw: DailyDraw;
  sigil: string; // braille talisman
}

/** Melbourne "today" as YYYY-MM-DD — the rite lives on Melbourne time. */
export function melbourneDateKey(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Melbourne",
  }).format(now);
}

export function periodKey(period: Period, now = new Date()): string {
  const day = melbourneDateKey(now); // "YYYY-MM-DD"
  if (period === "daily") return day;
  if (period === "monthly") return day.slice(0, 7); // "YYYY-MM"
  // weekly: the Monday of the current Melbourne week
  const d = new Date(`${day}T00:00:00Z`);
  const shift = (d.getUTCDay() + 6) % 7; // Mon=0 .. Sun=6
  d.setUTCDate(d.getUTCDate() - shift);
  return d.toISOString().slice(0, 10);
}

export async function buildPacket(
  sky: Sky,
  sign: ZodiacSign,
  period: Period,
  now = new Date(),
): Promise<Packet> {
  const dateKey = periodKey(period, now);
  const seed = `${period}:${dateKey}:${sign.name}`;
  return {
    dateKey,
    period,
    sign: sign.name,
    signSky: skyForSign(sky, sign.rulingPlanet),
    moon: moonState(now),
    hour: planetaryHour(now),
    draw: dailyDraw(`${period}:${dateKey}`, sign.name),
    sigil: await mintSigil(seed),
  };
}

export function buildSky(now = new Date()): Sky {
  return computeSky(now);
}

// ------------------------------------------------------------------
// Deterministic fallback composer — same packet, no AI, never blank
// ------------------------------------------------------------------

const PLANET_DOMAIN: Record<string, string> = {
  Sun: "your sense of self",
  Moon: "the feeling underneath everything",
  Mercury: "your words and quick thoughts",
  Venus: "what you love and what you're worth",
  Mars: "your drive and your heat",
  Jupiter: "your luck and your reach",
  Saturn: "the structures holding you",
  Uranus: "the part of you that wants to break pattern",
  Neptune: "your dreams and soft edges",
  Pluto: "the deep currents you don't talk about",
};

const ASPECT_VERB: Record<string, string> = {
  conjunction: "fuses with",
  opposition: "stands across from",
  square: "grinds against",
  trine: "flows easily with",
  sextile: "works quietly with",
};

function pickBy(seedNum: number, options: string[]): string {
  return options[seedNum % options.length];
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Compose a readable reading from the packet alone. The floor, not the goal. */
export function composeFallback(packet: Packet, sign: ZodiacSign): string {
  const { signSky, moon } = packet;
  const seed = hashStr(`${packet.dateKey}:${packet.sign}`);
  const ruler = signSky.rulerPlacement;
  const parts: string[] = [];
  const span = packet.period === "daily"
    ? "today"
    : packet.period === "weekly"
    ? "this week"
    : "this month";

  const openers = [
    `Here's the shape of ${span}, ${cap(sign.name)}.`,
    `${cap(span)} has a particular lean to it, ${cap(sign.name)}.`,
    `A few things about ${span}, ${cap(sign.name)}.`,
    `${cap(span)} reads clearer than most, ${cap(sign.name)}.`,
  ];
  parts.push(pickBy(seed, openers));

  parts.push(
    `${ruler.body}, your ruling planet, moves through ${ruler.sign}` +
      (ruler.retrograde
        ? " in retrograde — old themes circle back for another look."
        : "."),
  );

  const top = signSky.rulerAspects[0];
  if (top) {
    const other = top.a === ruler.body ? top.b : top.a;
    const tails = [
      "worth noticing what surfaces there",
      "keep half an eye on it",
      "no drama, just useful to know",
      "it explains a lot if the day feels off",
    ];
    parts.push(
      `It ${
        ASPECT_VERB[top.type]
      } ${other} right now, which tends to show up in ${
        PLANET_DOMAIN[other]
      } — ${pickBy(seed >>> 5, tails)}.`,
    );
  }

  parts.push(
    `The ${moon.phase.toLowerCase()} in ${signSky.moonSign} means ${
      moon.illum >= 50
        ? `feelings sit close to the surface ${span}`
        : `feelings run quieter than usual ${span}`
    }.`,
  );

  const closers = [
    "No need to force anything — noticing it is most of the work.",
    "Small moves count double under this sky.",
    "Give it a little room; it tends to sort itself sooner than you'd think.",
    `For what it's worth: ${lowerFirst(sign.motto)}`,
  ];
  parts.push(pickBy(seed >>> 3, closers));

  return parts.join(" ");
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function lowerFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}
