// ===================================================================
// COSMIC CONTEXT API - Real signals + declared dice for Stargram
// ===================================================================

import { FreshContext } from "$fresh/server.ts";
import { getZodiacSign } from "../../utils/zodiac.ts";
import {
  getNearestVisitor,
  getSpaceWeather,
  type Visitor,
} from "../../utils/oracle/live-sky.ts";

const TIME_ZONE = "Australia/Melbourne";
const SYNODIC_MONTH_DAYS = 29.530588853;
const KNOWN_NEW_MOON_UTC = Date.UTC(2000, 0, 6, 18, 14);
const DAY_MS = 86_400_000;

type Period = "daily" | "weekly" | "monthly";
type MoonPhaseTone = "new" | "waxing" | "full" | "waning";

type Charm = {
  name: string;
  art: string;
  trigger: string;
};

const VALID_PERIODS = new Set(["daily", "weekly", "monthly"]);

const DISCORDIAN_SEASONS = [
  "Chaos",
  "Discord",
  "Confusion",
  "Bureaucracy",
  "The Aftermath",
];
const DISCORDIAN_WEEKDAYS = [
  "Sweetmorn",
  "Boomtime",
  "Pungenday",
  "Prickle-Prickle",
  "Setting Orange",
];

const CHARMS: Omit<Charm, "trigger">[] = [
  {
    name: "orbit cat",
    art: [" /\\_/\\", "( o.o )", " > ^ <"].join("\n"),
  },
  {
    name: "tiny comet",
    art: ["  .-.", " (   )~~~", "  '-'"].join("\n"),
  },
  {
    name: "pocket satellite",
    art: [" .-o-.", "--( )--", "  '-'"].join("\n"),
  },
  {
    name: "slack pipe",
    art: ["  _", " ( )", " /|\\"].join("\n"),
  },
  {
    name: "moon kiosk",
    art: ["  _._", " (___)", " /___\\"].join("\n"),
  },
];

function jsonResponse(
  body: unknown,
  status = 200,
  cacheControl = "no-store",
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": cacheControl,
    },
  });
}

function getDateParts(date: Date, timeZone = TIME_ZONE) {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const part = (type: string) =>
    Number(parts.find((item) => item.type === type)?.value ?? 0);

  return {
    year: part("year"),
    month: part("month"),
    day: part("day"),
  };
}

function isLeapYear(year: number) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function getDayOfYear(year: number, month: number, day: number) {
  const start = Date.UTC(year, 0, 1);
  const current = Date.UTC(year, month - 1, day);
  return Math.floor((current - start) / DAY_MS) + 1;
}

function getMoonPhase(date = new Date()) {
  const age = ((date.getTime() - KNOWN_NEW_MOON_UTC) / DAY_MS) %
    SYNODIC_MONTH_DAYS;
  const normalizedAge = age < 0 ? age + SYNODIC_MONTH_DAYS : age;
  const phaseValue = normalizedAge / SYNODIC_MONTH_DAYS;
  const phaseIndex = Math.floor(phaseValue * 8 + 0.5) % 8;
  const names = [
    "New Moon",
    "Waxing Crescent",
    "First Quarter",
    "Waxing Gibbous",
    "Full Moon",
    "Waning Gibbous",
    "Last Quarter",
    "Waning Crescent",
  ];
  const glyphs = ["●", "◔", "◐", "◕", "○", "◕", "◑", "◔"];
  const illumination =
    (1 - Math.cos(2 * Math.PI * normalizedAge / SYNODIC_MONTH_DAYS)) / 2 * 100;
  const tone: MoonPhaseTone = phaseIndex === 0
    ? "new"
    : phaseIndex === 4
    ? "full"
    : phaseIndex < 4
    ? "waxing"
    : "waning";

  return {
    phase: names[phaseIndex],
    glyph: glyphs[phaseIndex],
    illumination: Math.round(illumination),
    age: Number(normalizedAge.toFixed(1)),
    tone,
  };
}

function getDiscordianDate(date = new Date()) {
  const { year, month, day } = getDateParts(date);
  const yold = year + 1166;

  if (isLeapYear(year) && month === 2 && day === 29) {
    return {
      text: `St. Tib's Day, YOLD ${yold}`,
      yold,
      holyday: "St. Tib's Day",
    };
  }

  const dayOfYear = getDayOfYear(year, month, day);
  const adjustedDayIndex = isLeapYear(year) && dayOfYear > 60
    ? dayOfYear - 2
    : dayOfYear - 1;
  const season = DISCORDIAN_SEASONS[Math.floor(adjustedDayIndex / 73)];
  const dayOfSeason = adjustedDayIndex % 73 + 1;
  const weekday = DISCORDIAN_WEEKDAYS[adjustedDayIndex % 5];

  return {
    text: `${weekday}, ${season} ${dayOfSeason}, YOLD ${yold}`,
    yold,
    season,
    weekday,
    dayOfSeason,
  };
}

function rollDie(sides: number) {
  const max = Math.floor(0xffffffff / sides) * sides;
  const buffer = new Uint32Array(1);

  do {
    crypto.getRandomValues(buffer);
  } while (buffer[0] >= max);

  return buffer[0] % sides + 1;
}

function getGlitchLevel(
  kp: number,
  slackRoll: number,
  visitor: Visitor | null,
) {
  const kpLevel = kp >= 6 ? 4 : kp >= 5 ? 3 : kp >= 4 ? 2 : kp >= 2 ? 1 : 0;
  const slackLevel = slackRoll >= 22
    ? 3
    : slackRoll >= 18
    ? 2
    : slackRoll >= 14
    ? 1
    : 0;
  const visitorLevel = visitor && visitor.lunarDistance <= 5 ? 1 : 0;

  return Math.min(4, Math.max(kpLevel, slackLevel) + visitorLevel);
}

function makeGlyphs(slackRoll: number, glitchLevel: number) {
  const glyphs = ["#", "%", "!", "?", "::", "//", "0x", "..", "~"];
  const count = Math.max(1, Math.min(5, glitchLevel + (slackRoll % 3)));
  return Array.from(
    { length: count },
    (_, index) => glyphs[(slackRoll + index * 3) % glyphs.length],
  ).join("");
}

function chooseCharm(
  slackRoll: number,
  visitor: Visitor | null,
  moonTone: MoonPhaseTone,
): Charm | null {
  const closeVisitor = visitor && visitor.lunarDistance <= 10;
  const shouldManifest = slackRoll >= 12 || closeVisitor;

  if (!shouldManifest) return null;

  const moonOffset = moonTone === "full" ? 2 : moonTone === "new" ? 4 : 0;
  const charm = CHARMS[(slackRoll + moonOffset) % CHARMS.length];
  const trigger = closeVisitor
    ? `JPL visitor within ${visitor.lunarDistance} LD`
    : `slack roll d23=${slackRoll}`;

  return { ...charm, trigger };
}

function buildLoadingLines({
  sign,
  period,
  element,
  moon,
  discordianDate,
  slackRoll,
}: {
  sign: string;
  period: Period;
  element: string;
  moon: ReturnType<typeof getMoonPhase>;
  discordianDate: ReturnType<typeof getDiscordianDate>;
  slackRoll: number;
}) {
  const lines = [
    "> aligning celestial telemetry...",
    `> moon transit: ${moon.phase.toUpperCase()} (${moon.illumination}% illuminated)`,
    `> discordian calendar: ${discordianDate.text.toUpperCase()}`,
    `> casting ${element.toUpperCase()} harmonics for ${sign.toUpperCase()}...`,
    `> subgenius slack check: d23 roll = ${slackRoll}`,
    "> divining tarot, hexagram & rune omens...",
    `> tuning ${period.toUpperCase()} oracle transmission...`,
    "> cosmic signal locked.",
  ];

  return lines;
}

export const handler = async (
  req: Request,
  _ctx: FreshContext,
): Promise<Response> => {
  if (req.method !== "GET") {
    return jsonResponse(
      { error: "Method not allowed" },
      405,
      "no-store",
    );
  }

  const url = new URL(req.url);
  const sign = url.searchParams.get("sign")?.toLowerCase() ?? "";
  const period = (url.searchParams.get("period") ?? "daily") as Period;
  const zodiac = getZodiacSign(sign);

  if (!zodiac) {
    return jsonResponse({ error: "Invalid zodiac sign" }, 400);
  }

  if (!VALID_PERIODS.has(period)) {
    return jsonResponse({ error: "Invalid period" }, 400);
  }

  const now = new Date();
  const moon = getMoonPhase(now);
  const discordianDate = getDiscordianDate(now);
  const slackRoll = rollDie(23);
  const [spaceWeather, visitor] = await Promise.all([
    getSpaceWeather(),
    getNearestVisitor(),
  ]);
  const glitchLevel = getGlitchLevel(spaceWeather?.kp ?? 0, slackRoll, visitor);
  const corruptionGlyphs = makeGlyphs(slackRoll, glitchLevel);
  const charm = chooseCharm(slackRoll, visitor, moon.tone);
  const loadingLines = buildLoadingLines({
    sign,
    period,
    element: zodiac.element,
    moon,
    discordianDate,
    slackRoll,
  });

  return jsonResponse({
    success: true,
    data: {
      generatedAt: now.toISOString(),
      timezone: TIME_ZONE,
      sign,
      element: zodiac.element,
      period,
      moon,
      discordianDate,
      slackRoll: {
        die: "d23",
        value: slackRoll,
      },
      spaceWeather,
      nearestVisitor: visitor,
      glitchLevel,
      corruptionGlyphs,
      charm,
      microTheme: {
        phase: moon.tone,
        element: zodiac.element,
      },
      loadingLines,
      sources: {
        moon: "local lunar phase calculation",
        discordianDate: "local Discordian calendar calculation",
        slackRoll: "crypto random d23 roll",
        spaceWeather: "NOAA SWPC",
        nearestVisitor: "NASA/JPL SBDB CAD",
      },
    },
  });
};
