#!/usr/bin/env -S deno run -A --unstable-kv
// ===================================================================
// ORACLE AUDIT — how much entropy actually reaches the reading?
// ===================================================================
// The oracle chain has a lot of moving parts (computed sky, moon, planetary
// hour, tarot/I Ching/rune draw, measured heliosphere, image domains). This
// script measures which of them actually vary, and by how much, in the ONE
// place it matters: the prompt string the model receives.
//
//   deno run -A --unstable-kv scripts/oracle-audit.ts
//   deno run -A --unstable-kv scripts/oracle-audit.ts --days=60 --live
//   STARGRAM_GEMINI_KEY=... deno run -A --unstable-kv scripts/oracle-audit.ts --speak
//
// Flags:
//   --days=N   window to sweep (default 30), starting today, Melbourne time
//   --period=  daily | weekly | monthly (default daily)
//   --live     also hit NOAA/JPL (off by default: keeps the run deterministic)
//   --speak    actually generate readings for one day, all 12 signs, and
//              measure how similar the PROSE is. Needs STARGRAM_GEMINI_KEY.
//   --json     dump the raw metrics as JSON instead of the report

import { ZODIAC_SIGNS, type ZodiacSign } from "../utils/zodiac.ts";
import { computeSky, skyForSign } from "../utils/oracle/sky.ts";
import { moonState, planetaryHour } from "../utils/oracle/count.ts";
import { dailyDraw } from "../utils/oracle/draw.ts";
import { type LiveSky, liveSky } from "../utils/oracle/live-sky.ts";
import {
  composeFallback,
  type Packet,
  type Period,
  periodKey,
} from "../utils/oracle/compose.ts";
import { buildPrompt, speakReading } from "../utils/oracle/voice.ts";

// ------------------------------------------------------------------ args
const args = new Map<string, string>();
for (const a of Deno.args) {
  const [k, v = "true"] = a.replace(/^--/, "").split("=");
  args.set(k, v);
}
const DAYS = Number(args.get("days") ?? 30);
const PERIOD = (args.get("period") ?? "daily") as Period;
const USE_LIVE = args.get("live") === "true";
const SPEAK = args.get("speak") === "true";
const AS_JSON = args.get("json") === "true";

// The rite fires at 15:33 UTC (main.ts). Audit the sky the rite actually sees.
const RITE_UTC_HOUR = 15, RITE_UTC_MIN = 33;
function riteMoment(dayOffset: number): Date {
  const d = new Date();
  d.setUTCHours(RITE_UTC_HOUR, RITE_UTC_MIN, 0, 0);
  d.setUTCDate(d.getUTCDate() + dayOffset);
  return d;
}

const EMPTY_LIVE: LiveSky = { weather: null, visitor: null };

// computeSky now walks the Moon forward to test void-of-course, so it is far
// too heavy to call twelve times for the same instant. One sky per moment.
const skyCache = new Map<number, ReturnType<typeof computeSky>>();
function skyAt(now: Date) {
  const k = now.getTime();
  let sky = skyCache.get(k);
  if (!sky) {
    sky = computeSky(now);
    if (skyCache.size > 400) skyCache.clear();
    skyCache.set(k, sky);
  }
  return sky;
}

function packetFor(
  sign: ZodiacSign,
  now: Date,
  live: LiveSky,
): Packet {
  const sky = skyAt(now);
  const dateKey = periodKey(PERIOD, now);
  return {
    dateKey,
    period: PERIOD,
    sign: sign.name,
    signSky: skyForSign(sky, sign.rulingPlanet, sign.name),
    moon: moonState(now),
    hour: planetaryHour(now),
    draw: dailyDraw(`${PERIOD}:${dateKey}`, sign.name),
    sigil: "", // never reaches the prompt; skipped so the sweep stays fast
    retrogrades: sky.placements.filter((p) => p.retrograde).map((p) => p.body),
    moonVoid: PERIOD === "daily" && sky.moonVoid && sky.moonSignHoursLeft >= 6,
    moonSignHoursLeft: sky.moonSignHoursLeft,
    moonNextSign: sky.moonNextSign,
    stations: sky.stations,
    ingresses: sky.ingresses,
    live,
  };
}

// ------------------------------------------------------------------ helpers
function tokens(s: string): Set<string> {
  return new Set(
    s.toLowerCase().replace(/[^a-z0-9\s']/g, " ").split(/\s+/).filter((w) =>
      w.length > 3
    ),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter || 1);
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function bar(frac: number, width = 28): string {
  const fill = Math.round(Math.max(0, Math.min(1, frac)) * width);
  return "#".repeat(fill) + ".".repeat(width - fill);
}

function h1(title: string) {
  console.log(`\n${"=".repeat(72)}\n${title}\n${"=".repeat(72)}`);
}

function h2(title: string) {
  console.log(`\n-- ${title} ${"-".repeat(Math.max(0, 68 - title.length))}`);
}

/** Longest run of consecutive identical values in a series. */
function longestRun<T>(series: T[]): number {
  let best = 0, run = 0;
  for (let i = 0; i < series.length; i++) {
    run = i > 0 && series[i] === series[i - 1] ? run + 1 : 1;
    best = Math.max(best, run);
  }
  return best;
}

// ------------------------------------------------------------------ sweep
const live = USE_LIVE ? await liveSky() : EMPTY_LIVE;

type Row = {
  day: number;
  dateKey: string;
  sign: string;
  ruler: string;
  astro: string; // the ruler placement + aspect block, as the model sees it
  topAspect: string;
  moonPhase: string;
  moonIllum: number;
  hourRuler: string;
  domain: string;
  structure: string;
  anchorIsFast: boolean;
  anchorBodies: string;
  moonVoid: boolean;
  hasStation: boolean;
  hasIngress: boolean;
  prompt: string;
  fallback: string;
};

const rows: Row[] = [];
for (let d = 0; d < DAYS; d++) {
  const now = riteMoment(d);
  for (const sign of ZODIAC_SIGNS) {
    const packet = packetFor(sign, now, live);
    const prompt = buildPrompt(packet, sign, []);
    // the theme is now the fast anchor: what the prompt tells the model to lead on
    const top = packet.signSky.fastAnchor ?? packet.signSky.slowAnchor;
    rows.push({
      day: d,
      dateKey: packet.dateKey,
      sign: sign.name,
      ruler: sign.rulingPlanet,
      // the astro block is everything between the "actual computed aspects"
      // header and the Moon line — exactly what transitLines() emitted
      astro:
        prompt.split("never recite any of it:\n\n")[1]?.split("\n\nMoon")[0] ??
          "",
      topAspect: top ? `${top.a} ${top.type} ${top.b}` : "(none)",
      moonPhase: packet.moon.phase,
      moonIllum: packet.moon.illum,
      hourRuler: packet.hour.ruler,
      domain: prompt.match(/opening image from the world of ([^(]+)\(/)?.[1]
        ?.trim() ?? "",
      structure: prompt.match(/STRUCTURE - ([a-z ]+):/)?.[1] ?? "(none)",
      anchorIsFast: packet.signSky.fastAnchor !== null,
      anchorBodies: top ? `${top.a}/${top.b}` : "(none)",
      moonVoid: packet.moonVoid,
      hasStation: packet.stations.length > 0,
      hasIngress: packet.ingresses.length > 0,
      prompt,
      fallback: composeFallback(packet, sign),
    });
  }
}

const bySign = new Map<string, Row[]>();
for (const r of rows) {
  if (!bySign.has(r.sign)) bySign.set(r.sign, []);
  bySign.get(r.sign)!.push(r);
}
const byDay = new Map<number, Row[]>();
for (const r of rows) {
  if (!byDay.has(r.day)) byDay.set(r.day, []);
  byDay.get(r.day)!.push(r);
}

const metrics: Record<string, unknown> = {};

// ------------------------------------------------------------------ report
if (!AS_JSON) {
  h1(
    `ORACLE ENTROPY AUDIT  ·  period=${PERIOD}  days=${DAYS}  live=${USE_LIVE}`,
  );
  console.log(
    `Window: ${rows[0].dateKey} .. ${rows[rows.length - 1].dateKey}  ` +
      `(${rows.length} readings modelled)`,
  );
  console.log(
    `STARGRAM_GEMINI_KEY: ${
      Deno.env.get("STARGRAM_GEMINI_KEY")
        ? "present — readings come from the Oracle voice"
        : "MISSING — every reading would ship as 'oracle-fallback' (see section 6)"
    }`,
  );
  if (!USE_LIVE) {
    console.log(
      "Measured sky OFF (--live to include NOAA/JPL). The computed sky is\n" +
        "unaffected either way.",
    );
  } else {
    console.log(
      `Measured sky: ${
        live.weather
          ? `Kp ${live.weather.kp} (${live.weather.label}), flux ${live.weather.flux}`
          : "unavailable"
      } | visitor: ${live.visitor?.name ?? "none"}`,
    );
  }
}

// --- 1. ruler collisions -------------------------------------------------
{
  const groups = new Map<string, string[]>();
  for (const s of ZODIAC_SIGNS) {
    if (!groups.has(s.rulingPlanet)) groups.set(s.rulingPlanet, []);
    groups.get(s.rulingPlanet)!.push(s.name);
  }
  const shared = [...groups.entries()].filter(([, v]) => v.length > 1);
  metrics.rulers = {
    distinct: groups.size,
    shared: Object.fromEntries(shared),
  };
  if (!AS_JSON) {
    h2("1. RULER COLLISIONS (two signs sharing a ruling planet)");
    console.log(
      `12 signs -> ${groups.size} distinct ruling planets. ` +
        `${shared.length} planet(s) shared by 2 signs. Since the sign's own\n` +
        `sector is also read, a shared ruler no longer means a shared sky:`,
    );
    for (const [planet, signs] of shared) {
      const a = rows.find((r) => r.sign === signs[0])!;
      const b = rows.find((r) => r.sign === signs[1])!;
      console.log(
        `   ${planet.padEnd(8)} ${signs.join(" + ").padEnd(24)} ` +
          `astro block identical: ${a.astro === b.astro ? "YES" : "no"}`,
      );
    }
  }
}

// --- 2. temporal churn ---------------------------------------------------
{
  const perSign = [...bySign.entries()].map(([sign, rs]) => {
    const astros = rs.map((r) => r.astro);
    const tops = rs.map((r) => r.topAspect);
    return {
      sign,
      ruler: rs[0].ruler,
      distinctAstro: new Set(astros).size,
      distinctTop: new Set(tops).size,
      longestIdenticalTopRun: longestRun(tops),
    };
  });
  metrics.churn = perSign;
  if (!AS_JSON) {
    h2(`2. TEMPORAL CHURN — does the astro input move day to day?`);
    console.log(
      "   sign         ruler     distinct top-aspects    longest identical run",
    );
    for (const p of perSign) {
      console.log(
        `   ${p.sign.padEnd(12)} ${p.ruler.padEnd(9)} ` +
          `${String(p.distinctTop).padStart(2)}/${DAYS} ` +
          `${bar(p.distinctTop / DAYS, 18)}  ${p.longestIdenticalTopRun} days`,
      );
    }
    const avg = perSign.reduce((a, p) => a + p.distinctTop, 0) /
      perSign.length / DAYS;
    console.log(`   mean top-aspect churn: ${pct(avg)} of days bring a change`);
  }

  // 2b. the theme vocabulary: the prompt says "build it around ONE theme from
  // the strongest of these aspects", so the set of top aspects a sign ever
  // sees is the hard ceiling on how many themes that sign can be given.
  const perDayDistinct = [...byDay.values()].map((rs) =>
    new Set(rs.map((r) => r.topAspect)).size
  );
  const meanPerDay = perDayDistinct.reduce((a, b) => a + b, 0) /
    perDayDistinct.length;
  let frozenDays = 0;
  const dayKeys = [...byDay.keys()].sort((a, b) => a - b);
  for (let i = 1; i < dayKeys.length; i++) {
    const prev = byDay.get(dayKeys[i - 1])!.map((r) => r.topAspect).join("|");
    const cur = byDay.get(dayKeys[i])!.map((r) => r.topAspect).join("|");
    if (prev === cur) frozenDays++;
  }
  metrics.themeVocabulary = {
    meanDistinctTopAspectsPerDay: meanPerDay,
    daysIdenticalToPrevious: frozenDays,
    ofDays: dayKeys.length - 1,
  };
  if (!AS_JSON) {
    console.log(
      `   distinct theme-anchors across all 12 signs on one day: ${
        meanPerDay.toFixed(1)
      }/12 mean`,
    );
    console.log(
      `   days where all 12 theme-anchors are unchanged from yesterday: ` +
        `${frozenDays}/${dayKeys.length - 1}`,
    );
  }
}

// --- 3. prompt variance --------------------------------------------------
{
  // Which lines are invariant across every prompt in the corpus?
  const lineCounts = new Map<string, number>();
  const seenPerPrompt = rows.map((r) => new Set(r.prompt.split("\n")));
  for (const set of seenPerPrompt) {
    for (const line of set) {
      lineCounts.set(line, (lineCounts.get(line) ?? 0) + 1);
    }
  }
  let fixedChars = 0, totalChars = 0;
  const sample = rows[0].prompt.split("\n");
  for (const line of new Set(sample)) {
    const isFixed = lineCounts.get(line) === rows.length;
    const len = line.length + 1;
    totalChars += len;
    if (isFixed) fixedChars += len;
  }
  // pairwise token similarity of same-day prompts
  const dayPairs: number[] = [];
  for (const [, rs] of byDay) {
    const toks = rs.map((r) => tokens(r.prompt));
    for (let i = 0; i < toks.length; i++) {
      for (let j = i + 1; j < toks.length; j++) {
        dayPairs.push(jaccard(toks[i], toks[j]));
      }
    }
  }
  const meanDay = dayPairs.reduce((a, b) => a + b, 0) / dayPairs.length;

  // consecutive-day similarity for the same sign
  const daySteps: number[] = [];
  for (const [, rs] of bySign) {
    for (let i = 1; i < rs.length; i++) {
      daySteps.push(jaccard(tokens(rs[i - 1].prompt), tokens(rs[i].prompt)));
    }
  }
  const meanStep = daySteps.reduce((a, b) => a + b, 0) / daySteps.length;

  metrics.prompt = {
    fixedCharShare: fixedChars / totalChars,
    meanSameDayCrossSignSimilarity: meanDay,
    meanConsecutiveDaySimilarity: meanStep,
    promptChars: rows[0].prompt.length,
  };
  if (!AS_JSON) {
    h2("3. PROMPT VARIANCE — how much of what the model reads is boilerplate?");
    console.log(
      `   prompt size:                     ~${rows[0].prompt.length} chars`,
    );
    console.log(
      `   byte-identical in every prompt:  ${pct(fixedChars / totalChars)}  ${
        bar(fixedChars / totalChars)
      }`,
    );
    console.log(
      `   same-day, cross-sign similarity: ${pct(meanDay)}  ${bar(meanDay)}`,
    );
    console.log(
      `   same-sign, next-day similarity:  ${pct(meanStep)}  ${bar(meanStep)}`,
    );
    console.log(
      "   (token Jaccard over words >3 chars; 100% = the model read the same thing)",
    );
  }
}

// --- 4. dials: register + temperature ------------------------------------
{
  const hours = [...byDay.values()].map((rs) => rs[0].hourRuler);
  const illums = [...byDay.values()].map((rs) => rs[0].moonIllum);
  const temps = illums.map((i) =>
    Math.round((0.75 + (i / 100) * 0.45) * 100) / 100
  );
  const hourCounts = new Map<string, number>();
  for (const h of hours) hourCounts.set(h, (hourCounts.get(h) ?? 0) + 1);
  metrics.dials = {
    hourRulers: Object.fromEntries(hourCounts),
    distinctHourRulers: hourCounts.size,
    sameForAllSignsOnADay: true,
    temperatureRange: [Math.min(...temps), Math.max(...temps)],
  };
  if (!AS_JSON) {
    h2("4. THE DIALS — voice register and sampling temperature");
    console.log(
      `   planetary-hour registers seen in ${DAYS} days: ${hourCounts.size}/7  ` +
        `(${[...hourCounts.keys()].join(", ")})`,
    );
    console.log(
      "   the planetary hour is computed once per rite and shared by all 12,",
    );
    console.log(
      "   but element + modality leans are per-sign, so the register differs",
    );
    console.log("   across signs as well as across nights.");
    console.log(
      `   temperature (moon-driven): ${Math.min(...temps)} .. ${
        Math.max(...temps)
      }, plus a per-sign jitter of +/-0.08`,
    );
  }
}

// --- 5. per-sign flavour: draw + image domain ----------------------------
{
  const dayDistinctDomains = [...byDay.values()].map((rs) =>
    new Set(rs.map((r) => r.domain)).size
  );
  const meanDistinct = dayDistinctDomains.reduce((a, b) => a + b, 0) /
    dayDistinctDomains.length;
  const drawKeys = rows.map((r) => r.astro); // placeholder, replaced below
  void drawKeys;
  const distinctDraws = new Set(
    rows.map((r) => `${r.sign}:${r.dateKey}`),
  ).size;
  metrics.flavour = {
    meanDistinctImageDomainsPerDay: meanDistinct,
    imageDomainCount: 12,
    distinctDrawSeeds: distinctDraws,
  };
  const dayDistinctShapes = [...byDay.values()].map((rs) =>
    new Set(rs.map((r) => r.structure)).size
  );
  const meanShapes = dayDistinctShapes.reduce((a, b) => a + b, 0) /
    dayDistinctShapes.length;
  const fastShare = rows.filter((r) => r.anchorIsFast).length / rows.length;
  const moonShare = rows.filter((r) => r.anchorBodies.includes("Moon")).length /
    rows.length;
  metrics.anchors = {
    fastShare,
    moonShare,
    meanDistinctShapesPerDay: meanShapes,
  };
  if (!AS_JSON) {
    h2("5. PER-SIGN FLAVOUR — the parts that DO differ by sign");
    console.log(
      `   structural templates: 4 available, mean ${
        meanShapes.toFixed(1)
      }/4 distinct across the 12 signs on a given day`,
    );
    console.log(
      `   readings anchored on a FAST (news) aspect: ${pct(fastShare)}`,
    );
    console.log(
      `   readings whose anchor involves the Moon: ${pct(moonShare)}`,
    );
    const dayRows = [...byDay.values()];
    const voidDays = dayRows.filter((rs) => rs[0].moonVoid).length;
    const stationDays = dayRows.filter((rs) => rs[0].hasStation).length;
    const ingressDays = dayRows.filter((rs) => rs[0].hasIngress).length;
    console.log(
      `   days the Moon is void of course: ${voidDays}/${dayRows.length} (${
        pct(voidDays / dayRows.length)
      })`,
    );
    console.log(
      `   days with a planet stationing inside a week: ${stationDays}/${dayRows.length}`,
    );
    console.log(
      `   days with a sign ingress in range: ${ingressDays}/${dayRows.length}`,
    );
    console.log(
      `   image domains: 12 available, mean ${
        meanDistinct.toFixed(1)
      }/12 distinct across the 12 signs on a given day`,
    );
    console.log(
      `   (random draw from 12 predicts ~7.6 distinct, so ~4 signs a day share a domain)`,
    );
    console.log(
      `   daily draw: ${distinctDraws} unique (sign,date) seeds — tarot 78x2 * hex 64 * runes`,
    );
    console.log(
      `   but the draw is marked PRIVATE and only ONE of the three may "quietly agree".`,
    );
  }
}

// --- 6. fallback output space -------------------------------------------
{
  const fallbacks = rows.map((r) => r.fallback);
  const openers = new Set(fallbacks.map((f) => f.split(".")[0]));
  const shapes = new Set(
    fallbacks.map((f) => f.replace(/[A-Z][a-z]+/g, "W").slice(0, 120)),
  );
  metrics.fallback = {
    distinctOpeners: openers.size,
    distinctShapes: shapes.size,
    sampled: fallbacks.length,
  };
  if (!AS_JSON) {
    h2("6. THE FALLBACK FLOOR (source: 'oracle-fallback')");
    console.log(
      `   ${fallbacks.length} fallback readings -> ${openers.size} distinct opening sentences,`,
    );
    console.log(
      `   ${shapes.size} distinct sentence skeletons (8 openers x 6 tails x 8 closers,`,
    );
    console.log("   times the sector line being present or absent).");
    console.log("   Example:");
    console.log(`     ${fallbacks[0].slice(0, 200)}...`);
    console.log(
      "   If STARGRAM_GEMINI_KEY is missing or Gemini errors, THIS is what ships.",
    );
  }
}

// --- 7. live generation comparison (optional) ----------------------------
if (SPEAK) {
  const key = Deno.env.get("STARGRAM_GEMINI_KEY");
  if (!key) {
    console.log(
      "\n--speak requested but STARGRAM_GEMINI_KEY is not set. Skipping.",
    );
  } else {
    h2("7. LIVE PROSE COMPARISON — 12 signs, one rite, actually generated");
    const now = riteMoment(0);
    const spoken: { sign: string; text: string }[] = [];
    const riteOpeners: string[] = [];
    for (const sign of ZODIAC_SIGNS) {
      const packet = packetFor(sign, now, live);
      const text = await speakReading(packet, sign, [...riteOpeners]);
      if (text) {
        riteOpeners.push(text.split(/\s+/).slice(0, 8).join(" "));
        spoken.push({ sign: sign.name, text });
        console.log(`   ${sign.name.padEnd(12)} "${text.slice(0, 70)}..."`);
      } else {
        console.log(`   ${sign.name.padEnd(12)} (voice failed -> fallback)`);
      }
    }
    if (spoken.length > 1) {
      const sims: number[] = [];
      for (let i = 0; i < spoken.length; i++) {
        for (let j = i + 1; j < spoken.length; j++) {
          sims.push(jaccard(tokens(spoken[i].text), tokens(spoken[j].text)));
        }
      }
      sims.sort((a, b) => a - b);
      const mean = sims.reduce((a, b) => a + b, 0) / sims.length;
      // opening grammatical shape: first three words
      const shapes = new Map<string, number>();
      for (const s of spoken) {
        const k = s.text.split(/\s+/).slice(0, 3).join(" ").toLowerCase();
        shapes.set(k, (shapes.get(k) ?? 0) + 1);
      }
      console.log(
        `\n   mean pairwise prose similarity: ${pct(mean)}  ` +
          `(max ${pct(sims[sims.length - 1])})`,
      );
      console.log(
        `   distinct 3-word openings: ${shapes.size}/${spoken.length}`,
      );
      metrics.prose = { mean, max: sims[sims.length - 1], n: spoken.length };
    }
  }
}

if (AS_JSON) {
  console.log(JSON.stringify(metrics, null, 2));
} else {
  h1("END OF AUDIT");
}
