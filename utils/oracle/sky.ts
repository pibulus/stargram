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
}

export interface Aspect {
  a: string;
  b: string;
  type: string;
  orb: number; // degrees off exact
  power: number; // ranking score
}

export interface Sky {
  placements: Placement[];
  aspects: Aspect[]; // ranked by power, descending
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
    };
  });

  const aspects: Aspect[] = [];
  for (let i = 0; i < placements.length; i++) {
    for (let j = i + 1; j < placements.length; j++) {
      const sep = Math.abs(
        ((placements[i].lon - placements[j].lon + 540) % 360) - 180,
      ); // angular separation 0..180
      for (const [type, angle, maxOrb, weight] of ASPECTS) {
        const orb = Math.abs(sep - angle);
        if (orb <= maxOrb) {
          const tightness = 1 - orb / maxOrb;
          const power = weight * tightness *
            BODY_WEIGHT[placements[i].body] * BODY_WEIGHT[placements[j].body];
          aspects.push({
            a: placements[i].body,
            b: placements[j].body,
            type,
            orb: Math.round(orb * 10) / 10,
            power: Math.round(power * 100) / 100,
          });
          break; // a pair forms at most one aspect
        }
      }
    }
  }
  aspects.sort((x, y) => y.power - x.power);
  return { placements, aspects };
}

export interface SignSky {
  ruler: string;
  rulerPlacement: Placement;
  rulerAspects: Aspect[]; // ranked, involving the ruler
  moonSign: string;
  sunSign: string;
}

/** The slice of the sky that speaks to one zodiac sign, via its ruler. */
export function skyForSign(sky: Sky, rulingPlanet: string): SignSky {
  const find = (b: string) => sky.placements.find((p) => p.body === b)!;
  return {
    ruler: rulingPlanet,
    rulerPlacement: find(rulingPlanet),
    rulerAspects: sky.aspects.filter(
      (a) => a.a === rulingPlanet || a.b === rulingPlanet,
    ),
    moonSign: find("Moon").sign,
    sunSign: find("Sun").sign,
  };
}
