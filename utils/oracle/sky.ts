// ===================================================================
// ORACLE · sky.ts — the real sky, computed. No scrapers, no vendors.
// ===================================================================
// astronomy-engine (MIT, pure TS, sub-arcminute) gives geocentric ecliptic
// positions; we derive tropical zodiac placements, retrogrades, and ranked
// aspects. Bare npm: specifier on purpose — adding heavy npm deps to
// deno.json imports has broken the Deploy build twice (01ae157, 827a276).

import * as Astronomy from "npm:astronomy-engine@2";

export const ZODIAC = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
];

const BODIES: [string, Astronomy.Body][] = [
  ["Sun", Astronomy.Body.Sun],
  ["Moon", Astronomy.Body.Moon],
  ["Mercury", Astronomy.Body.Mercury],
  ["Venus", Astronomy.Body.Venus],
  ["Mars", Astronomy.Body.Mars],
  ["Jupiter", Astronomy.Body.Jupiter],
  ["Saturn", Astronomy.Body.Saturn],
  ["Uranus", Astronomy.Body.Uranus],
  ["Neptune", Astronomy.Body.Neptune],
  ["Pluto", Astronomy.Body.Pluto],
];

// Luminaries and personal planets carry more astrological weight
const BODY_WEIGHT: Record<string, number> = {
  Sun: 3,
  Moon: 3,
  Mercury: 2,
  Venus: 2,
  Mars: 2,
  Jupiter: 1.5,
  Saturn: 1.5,
  Uranus: 1,
  Neptune: 1,
  Pluto: 1,
};

const ASPECTS: [string, number, number, number][] = [
  // name, exact angle, max orb, weight
  ["conjunction", 0, 8, 3],
  ["opposition", 180, 8, 2.5],
  ["square", 90, 7, 2],
  ["trine", 120, 7, 2],
  ["sextile", 60, 5, 1.5],
];

export interface Placement {
  body: string;
  lon: number; // ecliptic longitude of date, 0..360
  sign: string;
  degree: number; // 0..30 within sign
  retrograde: boolean;
  speed: number; // signed degrees/day, measured against tomorrow
}

export interface Aspect {
  a: string;
  b: string;
  type: string;
  orb: number; // degrees off exact
  power: number; // ranking score
  /** |speedA - speedB| in deg/day — how fast the pair is coming apart */
  relSpeed: number;
  /** true = orb is closing (building), false = opening (fading) */
  applying: boolean;
  /** days until the orb leaves range, at the current rate. Infinity if static. */
  daysLeft: number;
}

export interface Sky {
  placements: Placement[];
  aspects: Aspect[]; // ranked by power, descending
}

// The audit (docs/ORACLE_AUDIT.md) found the old power formula handing the
// theme to whatever was slowest: Uranus trine Pluto anchored scorpio 109 days
// a year because it never went out of orb. Power now carries a liveliness
// term — a pair that will still be exact next season is weather, not news.
// sqrt-compressed so the Moon (13 deg/day) leads without erasing everything else.
function liveliness(relSpeed: number): number {
  return 0.35 + Math.sqrt(Math.min(relSpeed, 14)) * 0.55;
}

/** Aspects below this are listed as context at most, never as a theme. */
export const POWER_FLOOR = 2;

// Direction is sampled a tenth of a day out, not a whole day. Orb is an
// absolute value, so it is a V around the exact moment: a full-day step over
// an aspect that perfects inside the window straddles the vertex, reports a
// near-flat slope, and blows the remaining-days estimate up (Venus square
// Pluto, exact, once claimed 29 days left when the true answer was 12).
const PEEK = 0.1;

/**
 * Days until the orb leaves range, at the current relative speed. An applying
 * aspect has to reach exact first and then open up the far side, so it gets
 * the whole width plus its current orb; a separating one only has what is left.
 */
function daysOfOrbLeft(
  orb: number,
  maxOrb: number,
  relSpeed: number,
  applying: boolean,
): number {
  if (relSpeed <= 0.0001) return Infinity;
  const distance = applying ? maxOrb + orb : maxOrb - orb;
  return Math.round((distance / relSpeed) * 10) / 10;
}

function geoLongitude(body: Astronomy.Body, date: Date): number {
  if (body === Astronomy.Body.Sun) {
    return Astronomy.SunPosition(date).elon;
  }
  if (body === Astronomy.Body.Moon) {
    return Astronomy.EclipticGeoMoon(date).lon;
  }
  const vec = Astronomy.GeoVector(body, date, true);
  return Astronomy.Ecliptic(vec).elon;
}

function norm360(x: number): number {
  return ((x % 360) + 360) % 360;
}

/** Compute the full sky state for a moment: placements + ranked aspects. */
export function computeSky(date: Date): Sky {
  const tomorrow = new Date(date.getTime() + 86400000);
  const placements: Placement[] = BODIES.map(([name, body]) => {
    const lon = norm360(geoLongitude(body, date));
    const lonNext = norm360(geoLongitude(body, tomorrow));
    // motion across 0° Aries wraps; take the short signed difference
    let motion = lonNext - lon;
    if (motion > 180) motion -= 360;
    if (motion < -180) motion += 360;
    return {
      body: name,
      lon,
      sign: ZODIAC[Math.floor(lon / 30)],
      degree: Math.round((lon % 30) * 10) / 10,
      retrograde: motion < 0,
      speed: Math.round(motion * 1000) / 1000,
    };
  });

  const separation = (lonA: number, lonB: number) =>
    Math.abs(((lonA - lonB + 540) % 360) - 180); // 0..180

  const aspects: Aspect[] = [];
  for (let i = 0; i < placements.length; i++) {
    for (let j = i + 1; j < placements.length; j++) {
      const p = placements[i], q = placements[j];
      const sep = separation(p.lon, q.lon);
      // where the pair sits tomorrow tells us applying vs separating without
      // a second ephemeris pass — the speeds are already measured
      const sepSoon = separation(
        p.lon + p.speed * PEEK,
        q.lon + q.speed * PEEK,
      );
      for (const [type, angle, maxOrb, weight] of ASPECTS) {
        const orb = Math.abs(sep - angle);
        if (orb <= maxOrb) {
          const applying = Math.abs(sepSoon - angle) < orb;
          const relSpeed = Math.abs(p.speed - q.speed);
          const tightness = 1 - orb / maxOrb;
          const power = weight * tightness *
            BODY_WEIGHT[p.body] * BODY_WEIGHT[q.body] * liveliness(relSpeed);
          aspects.push({
            a: p.body,
            b: q.body,
            type,
            orb: Math.round(orb * 10) / 10,
            power: Math.round(power * 100) / 100,
            relSpeed: Math.round(relSpeed * 100) / 100,
            applying,
            daysLeft: daysOfOrbLeft(orb, maxOrb, relSpeed, applying),
          });
          break; // a pair forms at most one aspect
        }
      }
    }
  }
  aspects.sort((x, y) => y.power - x.power);
  return { placements, aspects };
}

/** Aspects to a POINT (a sign cusp) get tighter orbs than body-to-body. */
const CUSP_ASPECTS: [string, number, number, number][] = [
  ["conjunction", 0, 6, 3],
  ["opposition", 180, 6, 2.5],
  ["square", 90, 5, 2],
  ["trine", 120, 5, 2],
  ["sextile", 60, 3, 1.5],
];

export interface SignSky {
  ruler: string;
  rulerPlacement: Placement;
  rulerAspects: Aspect[]; // ranked, involving the ruler
  moonSign: string;
  sunSign: string;
  // --- added by the entropy pass: the sign as an object in its own right ---
  /** The sign this sky was cut for, e.g. "Taurus". */
  signName: string;
  /** Bodies currently transiting the sign's own 30 degrees. */
  inSign: Placement[];
  /** Aspects from every body to the sign's 0-degree cusp. */
  cuspAspects: Aspect[];
  /** Highest-power fast-moving aspect: what is true TODAY. May be null. */
  fastAnchor: Aspect | null;
  /** Highest-power slow aspect: the standing weather. May be null. */
  slowAnchor: Aspect | null;
}

/** Below this relative speed an aspect is a season, not a day. */
const FAST_THRESHOLD = 0.5; // deg/day

/** Aspects from every body to a fixed point on the ecliptic. */
function aspectsToPoint(
  sky: Sky,
  pointLon: number,
  label: string,
): Aspect[] {
  const out: Aspect[] = [];
  for (const p of sky.placements) {
    const sep = Math.abs(((p.lon - pointLon + 540) % 360) - 180);
    const sepSoon = Math.abs(
      ((p.lon + p.speed * PEEK - pointLon + 540) % 360) - 180,
    );
    for (const [type, angle, maxOrb, weight] of CUSP_ASPECTS) {
      const orb = Math.abs(sep - angle);
      if (orb <= maxOrb) {
        const applying = Math.abs(sepSoon - angle) < orb;
        const relSpeed = Math.abs(p.speed);
        const tightness = 1 - orb / maxOrb;
        out.push({
          a: p.body,
          b: label,
          type,
          orb: Math.round(orb * 10) / 10,
          // the cusp is a point, not a body, so only the body carries weight
          power: Math.round(
            weight * tightness * BODY_WEIGHT[p.body] * liveliness(relSpeed) *
              100,
          ) / 100,
          relSpeed: Math.round(relSpeed * 100) / 100,
          applying,
          daysLeft: daysOfOrbLeft(orb, maxOrb, relSpeed, applying),
        });
        break;
      }
    }
  }
  return out.sort((x, y) => y.power - x.power);
}

/**
 * The slice of the sky that speaks to one zodiac sign.
 *
 * Two channels, deliberately: the ruling planet (classical, and what the app
 * always did) AND the sign's own 30-degree sector. Before the sector existed,
 * taurus and libra both resolved to Venus and received byte-identical skies
 * forever, as did gemini and virgo. The sector is what makes a reading belong
 * to the sign rather than to its ruler.
 */
export function skyForSign(
  sky: Sky,
  rulingPlanet: string,
  signName?: string,
): SignSky {
  const find = (b: string) => sky.placements.find((p) => p.body === b)!;
  const rulerAspects = sky.aspects.filter(
    (a) => a.a === rulingPlanet || a.b === rulingPlanet,
  );

  // Signs arrive lowercase from utils/zodiac.ts; ZODIAC here is capitalised.
  const idx = signName
    ? ZODIAC.findIndex((z) => z.toLowerCase() === signName.toLowerCase())
    : -1;
  const cuspLon = idx >= 0 ? idx * 30 : 0;
  const inSign = idx >= 0
    ? sky.placements.filter((p) => Math.floor(p.lon / 30) === idx)
    : [];
  const cuspAspects = idx >= 0 ? aspectsToPoint(sky, cuspLon, `your sign`) : [];

  // Both channels compete for the two anchors. The sector is what saves the
  // outer-planet signs: Pluto only ever aspects other outer planets, so
  // scorpio had no fast news at all until its own sector could be transited.
  const pool = [...rulerAspects, ...cuspAspects]
    .sort((x, y) => y.power - x.power);
  const fastAnchor =
    pool.find((a) => a.relSpeed >= FAST_THRESHOLD && a.power >= POWER_FLOOR) ??
      pool.find((a) => a.relSpeed >= FAST_THRESHOLD) ?? null;
  const slowAnchor =
    pool.find((a) => a.relSpeed < FAST_THRESHOLD && a !== fastAnchor) ?? null;

  return {
    ruler: rulingPlanet,
    rulerPlacement: find(rulingPlanet),
    rulerAspects,
    moonSign: find("Moon").sign,
    sunSign: find("Sun").sign,
    signName: idx >= 0 ? ZODIAC[idx] : "",
    inSign,
    cuspAspects,
    fastAnchor,
    slowAnchor,
  };
}
