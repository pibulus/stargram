// ===================================================================
// ORACLE · ritual.ts — the nightly rite. Divine once, lock in, serve.
// ===================================================================
// At 1:33am Melbourne the rite fires: the sky is computed once, each sign's
// reading is spoken by the Oracle (or composed by the fallback), and the
// result locks into Deno KV — THE reading for that day, for everyone,
// immutable until the next rite. The Oracle keeps a short journal so it
// never repeats itself; nobody can talk to it, it only prints.

import { ZODIAC_SIGNS, type ZodiacSign } from "../zodiac.ts";
import {
  buildPacket,
  buildSky,
  composeFallback,
  type Packet,
  type Period,
  periodKey,
} from "./compose.ts";
import { speakReading } from "./voice.ts";

export interface Reading {
  date: string;
  period: Period;
  sign: string;
  horoscope: string;
  horoscope_data: string;
  source: "oracle-voice" | "oracle-fallback";
  packet: Packet;
  generatedAt: string;
}

const EXPIRE_MS: Record<Period, number> = {
  daily: 3 * 86400000,
  weekly: 10 * 86400000,
  monthly: 40 * 86400000,
};

const JOURNAL_KEY = ["oracle-journal"];
const JOURNAL_DEPTH = 6;

// KV needs a database ATTACHED to the app on Deploy (deno deploy database
// assign <db> --app stargram), plus --unstable-kv locally.
// 🚨 The trap that cost the fleet its Gemini credits (2026-08-23): with no
// database attached, Deno.openKv() does NOT throw - it hands back a temporary
// in-memory store, per instance, silently. This try/catch never fired, the
// oracle believed it had persistence, and every rite re-divined all 36
// readings while every page view divined its own. Absence is only visible in
// the deploy logs ("no KV database is attached to this app") and in the bill.
// If readings stop being stable across requests, check the ATTACHMENT first.
let kvPromise: Promise<Deno.Kv | null> | null = null;
function getKv(): Promise<Deno.Kv | null> {
  kvPromise ??= (async () => {
    try {
      return await Deno.openKv();
    } catch (error) {
      console.warn("Oracle: KV unavailable, divining on demand:", error);
      return null;
    }
  })();
  return kvPromise;
}

function findSign(name: string): ZodiacSign | undefined {
  return ZODIAC_SIGNS.find((s) => s.name === name.toLowerCase());
}

async function readJournal(kv: Deno.Kv | null): Promise<string[]> {
  if (!kv) return [];
  const entry = await kv.get<string[]>(JOURNAL_KEY);
  return entry.value ?? [];
}

/** Divine one (period, sign) reading right now. Voice first, fallback floor. */
export async function divineSign(
  period: Period,
  signName: string,
  now = new Date(),
): Promise<Reading | null> {
  const sign = findSign(signName);
  if (!sign) return null;

  const kv = await getKv();
  const sky = buildSky(now);
  const packet = await buildPacket(sky, sign, period, now);
  const journal = await readJournal(kv);

  const spoken = await speakReading(packet, sign, journal);
  const horoscope = spoken ?? composeFallback(packet, sign);

  return {
    date: packet.dateKey,
    period,
    sign: sign.name,
    horoscope,
    horoscope_data: horoscope,
    source: spoken ? "oracle-voice" : "oracle-fallback",
    packet,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Get the locked-in reading for (period, sign) — or divine and lock it now.
 * This is the serving path AND the self-seeding path after a fresh deploy.
 */
// In-isolate cache: keeps readings stable (and Gemini calls rare) even when
// the platform has no KV. ponytail: cleared wholesale past 100 entries —
// steady state is 12 signs x 3 periods, old period keys just age out.
const memCache = new Map<string, Reading>();

export async function getReading(
  period: Period,
  signName: string,
  now = new Date(),
): Promise<Reading | null> {
  const kv = await getKv();
  const keyStr = `${period}:${
    periodKey(period, now)
  }:${signName.toLowerCase()}`;
  const key = [
    "reading",
    period,
    periodKey(period, now),
    signName.toLowerCase(),
  ];

  const mem = memCache.get(keyStr);
  if (mem) return mem;

  // KV is the canon: attached on Deploy, it is shared across every instance
  if (kv) {
    const cached = await kv.get<Reading>(key);
    if (cached.value?.horoscope) {
      memCache.set(keyStr, cached.value);
      return cached.value;
    }
  }

  const reading = await divineSign(period, signName, now);
  if (reading) {
    if (memCache.size > 100) memCache.clear();
    memCache.set(keyStr, reading);
    if (kv) {
      // first write wins: create-if-absent (versionstamp null), so two
      // instances racing the same (period, sign) can't fork the canon. Lose
      // the race and we adopt the winner rather than overwrite it.
      const written = await kv.atomic()
        .check({ key, versionstamp: null })
        .set(key, reading, { expireIn: EXPIRE_MS[period] })
        .commit();
      if (!written.ok) {
        const winner = await kv.get<Reading>(key);
        if (winner.value?.horoscope) {
          memCache.set(keyStr, winner.value);
          return winner.value;
        }
      }
    }
    return reading;
  }
  return reading;
}

/**
 * The nightly rite: daily always; weekly/monthly only when their period key
 * has rolled over (Monday nights, 1st-of-month nights) and isn't locked yet.
 */
export async function nightlyRite(now = new Date()): Promise<void> {
  const kv = await getKv();
  console.log(`Oracle rite begins: ${now.toISOString()}`);

  const sky = buildSky(now);
  const journal = await readJournal(kv);
  // openers already used THIS rite — so twelve signs don't all get the same
  // kitchen drawer
  const riteOpeners: string[] = [];
  let firstReading: Reading | null = null;

  for (const sign of ZODIAC_SIGNS) {
    const packet = await buildPacket(sky, sign, "daily", now);
    const spoken = await speakReading(packet, sign, [
      ...journal,
      ...riteOpeners,
    ]);
    if (spoken) {
      riteOpeners.push(spoken.split(/\s+/).slice(0, 8).join(" "));
    }
    const horoscope = spoken ?? composeFallback(packet, sign);
    const reading: Reading = {
      date: packet.dateKey,
      period: "daily",
      sign: sign.name,
      horoscope,
      horoscope_data: horoscope,
      source: spoken ? "oracle-voice" : "oracle-fallback",
      packet,
      generatedAt: new Date().toISOString(),
    };
    firstReading ??= reading;
    if (kv) {
      await kv.set(
        ["reading", "daily", packet.dateKey, sign.name],
        reading,
        { expireIn: EXPIRE_MS.daily },
      );
    }
  }

  // weekly/monthly: getReading self-locks them if their key rolled over
  for (const period of ["weekly", "monthly"] as Period[]) {
    for (const sign of ZODIAC_SIGNS) {
      await getReading(period, sign.name, now);
    }
  }

  // journal: one line per rite — the dominant aspect + a breath of the prose,
  // so tomorrow's Oracle knows what it said and moves somewhere new
  if (firstReading) {
    const top = firstReading.packet.signSky.rulerAspects[0];
    const glimpse = firstReading.horoscope.split(/\s+/).slice(0, 10).join(" ");
    const line = `${firstReading.date}: ${
      top ? `${top.a} ${top.type} ${top.b}` : "a quiet sky"
    }, ${firstReading.packet.moon.phase} - "${glimpse}..."`;
    const next = [...journal, line].slice(-JOURNAL_DEPTH);
    if (kv) await kv.set(JOURNAL_KEY, next);
  }

  console.log("Oracle rite complete: 12 signs locked in");
}
