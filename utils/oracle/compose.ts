// ===================================================================
// ORACLE · compose.ts — packet builder + the never-blank fallback
// ===================================================================
// The packet is the full divination state for one (period, sign, date):
// computed sky, measured sky, moon, planetary hour, draws, sigil. The AI
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
import { type LiveSky, liveSky } from "./live-sky.ts";
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
  /** For weekly/monthly: the moon's arc across the span, not one frozen instant. */
  moonArc?: string;
  sigil: string; // braille talisman
  retrogrades: string[]; // bodies walking backwards right now
  live: LiveSky; // the measured sky: geomagnetic field, solar flux, visitor
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

/**
 * The instant a period should be read from. A monthly reading divined at 1:33am
 * on the 3rd used to describe the 3rd's sky and moon phase, then call itself a
 * month (docs/ORACLE_AUDIT.md) — consecutive monthly prompts came out 97.8%
 * identical. Reading from the middle of the span is the cheap honest fix.
 */
export function periodMidpoint(period: Period, now = new Date()): Date {
  if (period === "daily") return now;
  const key = periodKey(period, now);
  if (period === "weekly") {
    // key is the Monday; the middle of the week is three and a half days on
    return new Date(new Date(`${key}T00:00:00Z`).getTime() + 3.5 * 86400000);
  }
  // monthly: key is "YYYY-MM"
  return new Date(`${key}-15T12:00:00Z`);
}

/** Boundaries of the period, for describing an arc rather than an instant. */
function periodSpan(period: Period, now = new Date()): [Date, Date] {
  const mid = periodMidpoint(period, now);
  const half = period === "weekly" ? 3.5 : 15;
  return [
    new Date(mid.getTime() - half * 86400000),
    new Date(mid.getTime() + half * 86400000),
  ];
}

/** How the moon actually moves across a week or a month. */
function moonArcFor(period: Period, now: Date): string | undefined {
  if (period === "daily") return undefined;
  const [start, end] = periodSpan(period, now);
  const a = moonState(start), b = moonState(end);
  const marks: string[] = [];
  const steps = period === "weekly" ? 7 : 30;
  const seen = new Set<string>();
  for (let i = 0; i <= steps; i++) {
    const t = new Date(
      start.getTime() + (end.getTime() - start.getTime()) * (i / steps),
    );
    const phase = moonState(t).phase;
    if ((phase === "New Moon" || phase === "Full Moon") && !seen.has(phase)) {
      seen.add(phase);
      marks.push(phase.toLowerCase());
    }
  }
  return `across this span the moon goes from ${a.phase.toLowerCase()} (${a.illum}% lit) to ${b.phase.toLowerCase()} (${b.illum}% lit)${
    marks.length ? `, passing ${marks.join(" and ")}` : ""
  }`;
}

export async function buildPacket(
  sky: Sky,
  sign: ZodiacSign,
  period: Period,
  now = new Date(),
): Promise<Packet> {
  const dateKey = periodKey(period, now);
  const seed = `${period}:${dateKey}:${sign.name}`;
  // daily reads the sky it was handed; longer periods re-cut it at their middle
  const at = periodMidpoint(period, now);
  const periodSky = period === "daily" ? sky : computeSky(at);
  return {
    dateKey,
    period,
    sign: sign.name,
    signSky: skyForSign(periodSky, sign.rulingPlanet, sign.name),
    moon: moonState(at),
    moonArc: moonArcFor(period, now),
    hour: planetaryHour(now),
    draw: dailyDraw(`${period}:${dateKey}`, sign.name),
    sigil: await mintSigil(seed),
    retrogrades: periodSky.placements.filter((p) => p.retrograde).map((p) =>
      p.body
    ),
    live: await liveSky(),
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
    `Something is worth saying plainly about ${span}, ${cap(sign.name)}.`,
    `${cap(sign.name)}: ${span} is not complicated, but it is specific.`,
    `Short version of ${span}, ${cap(sign.name)}.`,
    `${cap(span)} asks one thing of you, ${cap(sign.name)}.`,
  ];
  parts.push(pickBy(seed, openers));

  parts.push(
    `${ruler.body}, your ruling planet, moves through ${ruler.sign}` +
      (ruler.retrograde
        ? " in retrograde — old themes circle back for another look."
        : "."),
  );

  // the sign's own sector, when something is actually transiting it — this is
  // the line that stops taurus and libra reading identically
  if (signSky.inSign?.length) {
    const visitor = signSky.inSign[0];
    parts.push(
      `${visitor.body} is moving through your own sign right now${
        visitor.retrograde ? ", backwards" : ""
      } — which puts the spotlight on ${
        PLANET_DOMAIN[visitor.body] ?? "something of yours"
      }.`,
    );
  }

  // lead on the fast anchor (what is true today), not the slowest thing in orb
  const top = signSky.fastAnchor ?? signSky.slowAnchor ??
    signSky.rulerAspects[0];
  if (top && PLANET_DOMAIN[top.a] && ASPECT_VERB[top.type]) {
    const other = top.b === ruler.body ? top.a : top.b;
    const tails = [
      "worth noticing what surfaces there",
      "keep half an eye on it",
      "no drama, just useful to know",
      "it explains a lot if the day feels off",
      "you do not have to do anything about it",
      "it passes, but not before it is noticed",
    ];
    const motion = top.applying ? "building" : "easing off";
    // a cusp aspect's partner is the sign itself, which has no planetary domain
    const isCusp = !PLANET_DOMAIN[top.b];
    const lands = isCusp
      ? "which lands close to home"
      : `which tends to show up in ${PLANET_DOMAIN[other]}`;
    parts.push(
      `${top.a} ${ASPECT_VERB[top.type]} ${
        isCusp ? "your sign" : top.b
      } right now and ${motion}, ${lands} — ${pickBy(seed >>> 5, tails)}.`,
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
    "You already know which part of this is the real part.",
    "Nothing here needs deciding today.",
    "Take the easier of the two options; it is not a cop-out this time.",
    `${cap(sign.keywords[0])} is not a flaw here, it is the method.`,
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
