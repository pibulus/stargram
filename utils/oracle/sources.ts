// ===================================================================
// ORACLE · sources.ts — the outside world, when a working astrologer
// already said it better than the sky alone would.
// ===================================================================
// Pablo's terminal `horoscope` alias reads, in order: Ohmanda (real
// astrologers writing from the actual transits), then the freehoroscopeapi
// endpoint it reaches through a vercel redirect. Those are the readings he
// actually wants to see, so they come FIRST here and the local voice becomes
// the fallback rather than the whole show (2026-11-02).
//
// ☠️ OHMANDA IS DEAD (verified 2026-11-02): ohmanda.com now serves its
// author's personal portfolio, and the API path answers 200 with an empty
// `horoscope` string for every sign. That was the good source — real
// astrologers, real transits — so the branch stays as a tombstone with a
// length check: if it ever comes back, it reclaims first place with no code
// change. Do not delete it without deciding where the "better API" question
// goes instead.
//
// Never throws. A network problem must never be the reason a reading is blank.

import { type Period } from "./compose.ts";

export type ExternalSource = "api-ohmanda" | "api-freehoroscope";

export interface ExternalReading {
  text: string;
  source: ExternalSource;
}

const TIMEOUT_MS = 8000;

/** Em dashes out, curly quotes straightened, whitespace collapsed. House law. */
function tidy(text: string): string {
  return text
    .replace(/\s*[—–]\s*/g, " - ")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The reading day the API wants. Its data is written against US/Pacific, and
 * Melbourne is 18-19 hours ahead: before 18:00 Melbourne it is still the
 * previous date in California, so "today" there is yesterday here. The
 * terminal alias has used this cutoff for months; mirroring it keeps the app
 * and the alias telling the same story on the same day.
 */
function apiDay(now: Date): "today" | "tomorrow" {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Australia/Melbourne",
      hour: "2-digit",
      hour12: false,
    }).format(now),
  );
  return hour < 18 ? "tomorrow" : "today";
}

async function getJson(url: string): Promise<unknown | null> {
  try {
    const response = await fetch(url, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

function readField(payload: unknown, path: string[]): string {
  let cursor: unknown = payload;
  for (const step of path) {
    if (typeof cursor !== "object" || cursor === null) return "";
    cursor = (cursor as Record<string, unknown>)[step];
  }
  return typeof cursor === "string" ? cursor : "";
}

/** 1. Ohmanda — cast by astrologers off the real transits. Daily only. */
async function fromOhmanda(
  period: Period,
  sign: string,
): Promise<ExternalReading | null> {
  if (period !== "daily") return null;
  const payload = await getJson(`https://ohmanda.com/api/horoscope/${sign}/`);
  const text = tidy(readField(payload, ["horoscope"]));
  // Observed publishing empty strings: an empty body is not a reading.
  return text.length > 80 ? { text, source: "api-ohmanda" } : null;
}

/** 2. freehoroscopeapi — what the alias prints (via its vercel redirect). */
async function fromFreeHoroscope(
  period: Period,
  sign: string,
  now: Date,
): Promise<ExternalReading | null> {
  const url = `https://freehoroscopeapi.com/api/v1/get-horoscope/${period}` +
    `?sign=${sign}&day=${apiDay(now)}`;
  const payload = await getJson(url);
  const text = tidy(
    readField(payload, ["data", "horoscope_data"]) ||
      readField(payload, ["data", "horoscope"]),
  );
  return text.length > 80 ? { text, source: "api-freehoroscope" } : null;
}

/** The chain. First source with something real to say wins. */
export async function fetchExternalReading(
  period: Period,
  sign: string,
  now = new Date(),
): Promise<ExternalReading | null> {
  const chain = [
    () => fromOhmanda(period, sign),
    () => fromFreeHoroscope(period, sign, now),
  ];
  for (const attempt of chain) {
    const reading = await attempt();
    if (reading) return reading;
  }
  return null;
}
