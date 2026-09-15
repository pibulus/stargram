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

/** A planet hanging motionless before it turns direction. Rare and loud. */
export interface Station {
  body: string;
  direction: "retrograde" | "direct"; // the direction it is turning TO
  daysAway: number; // 0 = stationing today
}

/** A body crossing from one sign into the next. */
export interface Ingress {
  body: string;
  from: string;
  into: string;
  daysAway: number; // negative = already crossed, that many days ago
}

export interface Sky {
  placements: Placement[];
  aspects: Aspect[]; // ranked by power, descending
  /**
   * The Moon has made its last aspect before leaving its sign. Traditionally
   * "nothing will come of it" - do not start things. A few times a week, for
   * hours at a time, and it is the signal practitioners actually use. Without
   * it a void day reads exactly like any other.
   */
  moonVoid: boolean;
  /** Hours until the Moon leaves its current sign. */
  moonSignHoursLeft: number;
  /** The sign the Moon moves into next. */
  moonNextSign: string;
  stations: Station[]; // stationing within the week
  ingresses: Ingress[]; // crossed in the last 2 days or crossing in the next 3
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

/** Shortest signed difference — motion across 0 Aries wraps. */
function norm180(x: number): number {
  let v = x;
  if (v > 180) v -= 360;
  if (v < -180) v += 360;
  return v;
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

  const moon = placements.find((p) => p.body === "Moon")!;
  const { voidOfCourse, hoursLeft } = moonCourse(date, moon);

  return {
    placements,
    aspects,
    moonVoid: voidOfCourse,
    moonSignHoursLeft: hoursLeft,
    moonNextSign: ZODIAC[(Math.floor(moon.lon / 30) + 1) % 12],
    stations: findStations(date, placements),
    ingresses: findIngresses(placements),
  };
}

/** Aspect angles the Moon can still perfect before it changes sign. */
const MOON_ANGLES = [0, 60, 90, 120, 180];

/**
 * Is the Moon void of course, and how long until it changes sign?
 *
 * Walks the Moon forward in small steps to its next sign boundary and watches
 * for any aspect to a planet perfecting on the way - a sign change in
 * (sep - angle) between two samples is an exact hit. No aspects left means
 * void.
 */
function moonCourse(
  date: Date,
  moon: Placement,
): { voidOfCourse: boolean; hoursLeft: number } {
  const boundary = (Math.floor(moon.lon / 30) + 1) * 30;
  const toGo = norm360(boundary - moon.lon);
  const speed = moon.speed > 0.1 ? moon.speed : 13.2; // guard, the Moon never retrogrades
  const daysLeft = toGo / speed;
  const hoursLeft = Math.round(daysLeft * 24 * 10) / 10;

  const others = BODIES.filter(([n]) => n !== "Moon");
  const steps = Math.max(2, Math.ceil(daysLeft / 0.05));
  let prev: number[] | null = null;
  for (let i = 0; i <= steps; i++) {
    const t = new Date(date.getTime() + (daysLeft * (i / steps)) * 86400000);
    const moonLon = norm360(geoLongitude(Astronomy.Body.Moon, t));
    const deltas: number[] = [];
    for (const [, body] of others) {
      const lon = norm360(geoLongitude(body, t));
      // SIGNED separation, not the 0..180 folded one. Folding makes
      // (sep - 0) always >= 0 and (sep - 180) always <= 0, so conjunctions and
      // oppositions can never cross zero and were invisible here - which let
      // them fail to close a void and roughly doubled every void's length.
      const d = norm180(moonLon - lon);
      for (const angle of MOON_ANGLES) {
        deltas.push(norm180(d - angle));
        if (angle !== 0 && angle !== 180) deltas.push(norm180(d + angle));
      }
    }
    if (prev) {
      for (let k = 0; k < deltas.length; k++) {
        // a sign flip means the aspect perfected in between. norm180 wraps at
        // +/-180, so ignore jumps too big to be real motion at this step size.
        const crossed = prev[k] === 0 ||
          (prev[k] * deltas[k] < 0 && Math.abs(prev[k] - deltas[k]) < 90);
        if (crossed) return { voidOfCourse: false, hoursLeft };
      }
    }
    prev = deltas;
  }
  return { voidOfCourse: true, hoursLeft };
}

/** Planets turning direction within the week — speed crossing through zero. */
function findStations(date: Date, placements: Placement[]): Station[] {
  const out: Station[] = [];
  for (const [name, body] of BODIES) {
    if (name === "Sun" || name === "Moon") continue; // never retrograde
    const now = placements.find((p) => p.body === name)!;
    for (let d = 0; d <= 7; d++) {
      const t = new Date(date.getTime() + d * 86400000);
      const t2 = new Date(t.getTime() + 86400000);
      const speed = norm180(
        norm360(geoLongitude(body, t2)) - norm360(geoLongitude(body, t)),
      );
      if (speed === 0 || now.speed * speed < 0) {
        out.push({
          body: name,
          direction: speed < 0 ? "retrograde" : "direct",
          daysAway: d,
        });
        break;
      }
    }
  }
  return out;
}

/** Bodies that just crossed a sign boundary, or are about to. */
function findIngresses(placements: Placement[]): Ingress[] {
  const out: Ingress[] = [];
  for (const p of placements) {
    if (p.body === "Moon") continue; // the Moon does this every 2.5 days
    const speed = p.speed;
    if (Math.abs(speed) < 0.0005) continue;
    const idx = ZODIAC.indexOf(p.sign);
    if (speed > 0) {
      const daysAway = (30 - p.degree) / speed;
      const since = p.degree / speed;
      if (daysAway <= 3) {
        out.push({
          body: p.body,
          from: p.sign,
          into: ZODIAC[(idx + 1) % 12],
          daysAway: Math.round(daysAway * 10) / 10,
        });
      } else if (since <= 2) {
        out.push({
          body: p.body,
          from: ZODIAC[(idx + 11) % 12],
          into: p.sign,
          daysAway: -Math.round(since * 10) / 10,
        });
      }
    } else {
      const daysAway = p.degree / -speed;
      if (daysAway <= 3) {
        out.push({
          body: p.body,
          from: p.sign,
          into: ZODIAC[(idx + 11) % 12],
          daysAway: Math.round(daysAway * 10) / 10,
        });
      }
    }
  }
  return out;
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

/**
 * What counts as the LEAD aspect depends on the span being written.
 *
 * The lead anchor was originally period-blind: any aspect above 0.5 deg/day
 * could take it, so the Moon (13 deg/day) won the lead on 40% of MONTHLY
 * readings with aspects that had a third of a day left to run. A reading that
 * describes a month cannot be built on something that is over by lunchtime.
 *
 * The upper bound is what does the work - it prices the Moon out of the longer
 * spans without special-casing it, while leaving the Sun, Mercury, Venus and
 * Mars (roughly 0.3 to 1.5 deg/day) eligible everywhere.
 */
export type Span = "day" | "week" | "month";

const LEAD_BAND: Record<Span, { min: number; max: number }> = {
  day: { min: 0.5, max: Infinity },
  week: { min: 0.15, max: 3 },
  month: { min: 0.02, max: 1.5 },
};

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
  span: Span = "day",
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
  const band = LEAD_BAND[span];
  const inBand = (a: Aspect) =>
    a.relSpeed >= band.min && a.relSpeed <= band.max;
  const fastAnchor = pool.find((a) => inBand(a) && a.power >= POWER_FLOOR) ??
    pool.find(inBand) ?? null;
  const slowAnchor =
    pool.find((a) => a.relSpeed < band.min && a !== fastAnchor) ?? null;

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
