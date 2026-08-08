// ===================================================================
// ORACLE · draw.ts — the daily draw: tarot, hexagram, rune. Date-seeded.
// ===================================================================
// Same (date, sign) always draws the same spread — the day's draw is the
// day's draw, for everyone. Prime-offset seeding per system (oracle.sh's
// trick) keeps the three draws independent of each other.

import tarot from "../../data/oracle/tarot.json" with { type: "json" };
import hexagrams from "../../data/oracle/hexagrams.json" with { type: "json" };
import runes from "../../data/oracle/runes.json" with { type: "json" };

// mulberry32 — tiny seeded PRNG (Math.random isn't seedable)
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStr(s: string): number {
  let h = 2166136261; // FNV-1a
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export interface DailyDraw {
  tarot: {
    name: string;
    arcana: string;
    meaning: string;
    reversed: boolean;
  };
  hexagram: { number: number; symbol: string; name: string; judgment: string };
  rune: { name: string; symbol: string; meaning: string };
}

/** Draw the spread for a (dateKey, sign) pair. Deterministic. */
export function dailyDraw(dateKey: string, sign: string): DailyDraw {
  const base = hashStr(`${dateKey}:${sign}`);
  const pick = (systemIndex: number) =>
    mulberry32(base + (systemIndex + 1) * 7919);

  const tRng = pick(0);
  const card = tarot[Math.floor(tRng() * tarot.length)];
  const isReversed = tRng() < 0.3;

  const hRng = pick(1);
  const hex = hexagrams[Math.floor(hRng() * hexagrams.length)];

  const rRng = pick(2);
  const rune = runes[Math.floor(rRng() * runes.length)];

  return {
    tarot: {
      name: card.name,
      arcana: card.arcana,
      meaning: isReversed ? card.reversed : card.meaning,
      reversed: isReversed,
    },
    hexagram: {
      number: hex.number,
      symbol: hex.symbol,
      name: hex.name,
      judgment: hex.judgment,
    },
    rune: { name: rune.name, symbol: rune.symbol, meaning: rune.meaning },
  };
}
