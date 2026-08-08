// ===================================================================
// ORACLE · count.ts — the calendars: JDN, tonalpohualli, moon, planetary hour
// ===================================================================
// All pure math, zero APIs. Ported from plenum-engine count.ts; formulas
// verified against the Caso anchor (13 Aug 1521 = 1 Coatl) and Astrolog 8.00.
// The +5 % 13 and +16 % 20 offsets are calibrated — do not re-derive.

export const AZTEC_SIGNS = [
  "Cipactli",
  "Ehecatl",
  "Calli",
  "Cuetzpalin",
  "Coatl",
  "Miquiztli",
  "Mazatl",
  "Tochtli",
  "Atl",
  "Itzcuintli",
  "Ozomahtli",
  "Malinalli",
  "Acatl",
  "Ocelotl",
  "Cuauhtli",
  "Cozcacuauhtli",
  "Ollin",
  "Tecpatl",
  "Quiahuitl",
  "Xochitl",
];

export const SIGN_MEANINGS: Record<string, string> = {
  Cipactli: "crocodile · the primordial",
  Ehecatl: "wind · the breath",
  Calli: "house · the shelter",
  Cuetzpalin: "lizard · the quick",
  Coatl: "serpent · the coiled",
  Miquiztli: "death · the turning",
  Mazatl: "deer · the wild step",
  Tochtli: "rabbit · the leap",
  Atl: "water · the current",
  Itzcuintli: "dog · the loyal",
  Ozomahtli: "monkey · the play",
  Malinalli: "grass · the twisting",
  Acatl: "reed · the hollow bone",
  Ocelotl: "jaguar · the night hunter",
  Cuauhtli: "eagle · the high sight",
  Cozcacuauhtli: "vulture · the elder",
  Ollin: "movement · the quake",
  Tecpatl: "obsidian knife · the cut",
  Quiahuitl: "rain · the falling",
  Xochitl: "flower · the bloom",
};

// Fliegel–Van Flandern, calendar date (Y/M/D) → Julian Day Number
export function jdnFromYmd(y: number, m: number, d: number): number {
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) -
    Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
}

export interface Tonal {
  num: number;
  sign: string;
  meaning: string;
  name: string; // "9 Tecpatl"
}

export function tonalpohualli(jdn: number): Tonal {
  const num = ((jdn + 5) % 13) + 1;
  const sign = AZTEC_SIGNS[(jdn + 16) % 20];
  return { num, sign, meaning: SIGN_MEANINGS[sign], name: `${num} ${sign}` };
}

export interface MoonState {
  age: number; // days into synodic cycle
  illum: number; // 0..100
  phase: string;
  glyph: string;
}

const PHASES: [string, string][] = [
  ["New Moon", "●"],
  ["Waxing Crescent", "☽"],
  ["First Quarter", "◐"],
  ["Waxing Gibbous", "☽"],
  ["Full Moon", "○"],
  ["Waning Gibbous", "☾"],
  ["Last Quarter", "◑"],
  ["Waning Crescent", "☾"],
];

const SYNODIC = 29.530588853;

export function moonState(d: Date): MoonState {
  // Synodic age from a known new moon epoch (JD 2451550.1, 6 Jan 2000)
  const jd = d.getTime() / 86400000 + 2440587.5;
  const age = ((jd - 2451550.1) % SYNODIC + SYNODIC) % SYNODIC;
  const illum = Math.round(
    (1 - Math.cos((age / SYNODIC) * 2 * Math.PI)) / 2 * 100,
  );
  const octant = Math.floor((age / SYNODIC) * 8 + 0.5) % 8;
  const [phase, glyph] = PHASES[octant];
  return { age: Math.round(age * 10) / 10, illum, phase, glyph };
}

// --- Planetary hour (Chaldean order, unequal hours, Melbourne — the
// terminal's home longitude; the rite fires on Melbourne time) ---

const MEL_LAT = -37.81, MEL_LON = 144.96;
const CHALDEAN = [
  "Saturn",
  "Jupiter",
  "Mars",
  "Sun",
  "Venus",
  "Mercury",
  "Moon",
];
// day ruler by weekday (Sun=0): Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn
const DAY_RULER_IDX = [3, 6, 2, 5, 1, 4, 0];

// NOAA-simplified sunrise/sunset
function sunTimes(d: Date): { rise: Date; set: Date } {
  const rad = Math.PI / 180;
  const dayOfYear = Math.floor(
    (d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86400000,
  );
  const decl = -23.44 * rad * Math.cos(2 * Math.PI / 365 * (dayOfYear + 10));
  const hourAngle = Math.acos(
    Math.max(-1, Math.min(1, -Math.tan(MEL_LAT * rad) * Math.tan(decl))),
  );
  const solarNoonUTC = 12 - MEL_LON / 15; // hours UTC
  const half = (hourAngle / rad) / 15;
  const mk = (h: number) => {
    const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    t.setUTCMinutes(Math.round(h * 60));
    return t;
  };
  return { rise: mk(solarNoonUTC - half), set: mk(solarNoonUTC + half) };
}

export interface PlanetHour {
  ruler: string;
  dayRuler: string;
  hourNum: number; // 1..24 from sunrise
  isDay: boolean;
}

export function planetaryHour(d: Date): PlanetHour {
  const { rise, set } = sunTimes(d);
  const dayRulerIdx = DAY_RULER_IDX[d.getDay()];
  let hourNum: number, isDay: boolean;
  if (d >= rise && d < set) {
    const len = (set.getTime() - rise.getTime()) / 12;
    hourNum = Math.floor((d.getTime() - rise.getTime()) / len) + 1;
    isDay = true;
  } else {
    // night: from today's set (or yesterday's if before rise) to next rise
    let nightStart = set;
    let nextRise = sunTimes(new Date(d.getTime() + 86400000)).rise;
    if (d < rise) {
      const prev = sunTimes(new Date(d.getTime() - 86400000));
      nightStart = prev.set;
      nextRise = rise;
    }
    const len = (nextRise.getTime() - nightStart.getTime()) / 12;
    hourNum = 12 + Math.floor((d.getTime() - nightStart.getTime()) / len) + 1;
    isDay = false;
  }
  // hour 1 of the day is ruled by the day ruler, then Chaldean descent
  const rulerIdx = (dayRulerIdx + (hourNum - 1)) % 7;
  return {
    ruler: CHALDEAN[rulerIdx],
    dayRuler: CHALDEAN[dayRulerIdx],
    hourNum,
    isDay,
  };
}
