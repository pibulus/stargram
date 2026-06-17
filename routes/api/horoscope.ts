// ===================================================================
// HOROSCOPE API - Proxy to horoscope API with timezone handling
// ===================================================================
// Fetches daily/weekly/monthly horoscopes from external API
// Handles timezone conversion for Melbourne (15-16hrs ahead of US)

import { FreshContext } from "$fresh/server.ts";

const HOROSCOPE_API_BASE = "https://freehoroscopeapi.com/api/v1/get-horoscope";

// Zodiac signs (validated)
const VALID_SIGNS = [
  "aries",
  "taurus",
  "gemini",
  "cancer",
  "leo",
  "virgo",
  "libra",
  "scorpio",
  "sagittarius",
  "capricorn",
  "aquarius",
  "pisces",
];

interface HoroscopeParams {
  sign: string;
  period: "daily" | "weekly" | "monthly";
  day?: string; // For daily only: "today" | "tomorrow" | "yesterday" | "YYYY-MM-DD"
}

type ExternalHoroscopePayload = {
  data?: {
    date?: string;
    week?: string;
    month?: string;
    period?: string;
    sign?: string;
    horoscope?: string;
    horoscope_data?: string;
    source?: string;
    tip?: string;
  };
  success?: boolean;
  error?: string;
};

const VALID_DAYS = new Set(["today", "tomorrow", "yesterday"]);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const UPSTREAM_TIMEOUT_MS = 8000;
const ORACLE_SCRIPT_TIMEOUT_MS = 12000;

/**
 * Determine correct day parameter for API based on Melbourne timezone
 * Melbourne is 15-16 hours ahead of US (where API is hosted)
 *
 * Logic:
 * - Before 6pm Melbourne → Use "tomorrow" (Melbourne is ahead)
 * - After 6pm Melbourne → Use "today" (calendars sync up)
 */
function getMelbourneHour(date = new Date()): number {
  const hour = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Melbourne",
    hour: "2-digit",
    hour12: false,
  })
    .formatToParts(date)
    .find((part) => part.type === "hour")?.value ?? "0";

  return Number(hour) % 24;
}

function getDayParamForTimezone(date = new Date()): string {
  const hour = getMelbourneHour(date);

  if (hour >= 0 && hour < 18) {
    // Morning/afternoon Melbourne = ahead of US, use "tomorrow"
    return "tomorrow";
  } else {
    // Evening Melbourne = same calendar day as US, use "today"
    return "today";
  }
}

function normalizeHoroscopePayload(
  payload: ExternalHoroscopePayload,
  period: HoroscopeParams["period"],
) {
  const upstreamData = payload.data;
  const horoscopeText = upstreamData?.horoscope_data ?? upstreamData?.horoscope;

  if (!upstreamData || !horoscopeText) {
    throw new Error(payload.error || "Unexpected horoscope API response");
  }

  return {
    success: true,
    data: {
      ...upstreamData,
      period: upstreamData.period ?? period,
      horoscope: horoscopeText,
      horoscope_data: horoscopeText,
    },
  };
}

async function fetchFromOhmanda(
  sign: string,
): Promise<ReturnType<typeof normalizeHoroscopePayload> | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000); // 6s timeout
    const response = await fetch(`https://ohmanda.com/api/horoscope/${sign}/`, {
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (!response.ok) {
      throw new Error(`Ohmanda returned status ${response.status}`);
    }

    const data = await response.json();
    if (data && typeof data.horoscope === "string") {
      return {
        success: true,
        data: {
          date: data.date || new Date().toISOString().split("T")[0],
          period: "daily",
          sign: data.sign || sign,
          horoscope: data.horoscope,
          horoscope_data: data.horoscope,
          source: "ohmanda",
        },
      };
    }
    return null;
  } catch (error) {
    console.warn("Ohmanda fetch failed, falling back:", error);
    return null;
  }
}

function getOracleScriptPath(): string {
  const configuredPath = Deno.env.get("HOROSCOPE_SCRIPT_PATH");
  if (configuredPath) return configuredPath;

  return decodeURIComponent(
    new URL("../../scripts/horoscope.sh", import.meta.url).pathname,
  );
}

async function fetchFromOracleScript(
  sign: string,
  day: string,
): Promise<ReturnType<typeof normalizeHoroscopePayload> | null> {
  const scriptPath = getOracleScriptPath();

  try {
    const scriptInfo = await Deno.stat(scriptPath);
    if (!scriptInfo.isFile) return null;
  } catch {
    return null;
  }

  const command = new Deno.Command("bash", {
    args: [scriptPath, "--json", "--day", day, sign],
    stdout: "piped",
    stderr: "piped",
  });
  const child = command.spawn();
  let timedOut = false;

  const timeout = setTimeout(() => {
    timedOut = true;
    try {
      child.kill("SIGTERM");
    } catch {
      // Process may already have exited.
    }
  }, ORACLE_SCRIPT_TIMEOUT_MS);

  const output = await child.output()
    .finally(() => clearTimeout(timeout));

  const stdout = new TextDecoder().decode(output.stdout);
  const stderr = new TextDecoder().decode(output.stderr).trim();

  if (timedOut) {
    throw new Error("Oracle script timed out");
  }

  if (!output.success) {
    throw new Error(
      stderr || `Oracle script exited with code ${output.code}`,
    );
  }

  return normalizeHoroscopePayload(JSON.parse(stdout), "daily");
}

function jsonResponse(
  body: unknown,
  status = 200,
  cacheControl?: string,
): Response {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        "Content-Type": "application/json",
        ...(cacheControl ? { "Cache-Control": cacheControl } : {}),
      },
    },
  );
}

export const handler = async (
  req: Request,
  _ctx: FreshContext,
): Promise<Response> => {
  if (req.method !== "GET") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: {
          "Content-Type": "application/json",
          "Allow": "GET",
        },
      },
    );
  }

  const url = new URL(req.url);
  const sign = url.searchParams.get("sign")?.toLowerCase();
  const period =
    url.searchParams.get("period") as "daily" | "weekly" | "monthly" || "daily";
  const customDay = url.searchParams.get("day"); // Optional override

  // Validate sign
  if (!sign || !VALID_SIGNS.includes(sign)) {
    return jsonResponse(
      {
        error: "Invalid zodiac sign",
        validSigns: VALID_SIGNS,
      },
      400,
    );
  }

  // Build API URL based on period
  let apiUrl = "";
  const params = new URLSearchParams({ sign });

  if (period === "daily") {
    // 1. Try Ohmanda first for better quality daily horoscopes
    // (Only if no custom day is requested, or if custom day is today/tomorrow)
    const day = customDay || getDayParamForTimezone();
    if (!customDay || customDay === "today" || customDay === "tomorrow") {
      try {
        const ohmandaData = await fetchFromOhmanda(sign);
        if (ohmandaData) {
          return jsonResponse(ohmandaData, 200, "public, max-age=3600");
        }
      } catch (error) {
        console.warn("Failed fetching from Ohmanda daily API:", error);
      }
    }

    // 2. Validate day param and fall back to local oracle script or freehoroscopeapi
    if (!VALID_DAYS.has(day) && !DATE_RE.test(day)) {
      return jsonResponse(
        {
          error:
            "Invalid day. Must be today, tomorrow, yesterday, or YYYY-MM-DD",
        },
        400,
      );
    }
    params.append("day", day);
    apiUrl = `${HOROSCOPE_API_BASE}/daily?${params}`;

    try {
      const oracleData = await fetchFromOracleScript(sign, day);
      if (oracleData) {
        return jsonResponse(oracleData, 200, "public, max-age=3600");
      }
    } catch (error) {
      console.warn("Horoscope oracle script failed, falling back:", error);
    }
  } else if (period === "weekly") {
    apiUrl = `${HOROSCOPE_API_BASE}/weekly?${params}`;
  } else if (period === "monthly") {
    apiUrl = `${HOROSCOPE_API_BASE}/monthly?${params}`;
  } else {
    return jsonResponse(
      {
        error: "Invalid period. Must be: daily, weekly, or monthly",
      },
      400,
    );
  }

  try {
    // Fetch from horoscope API
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
    const response = await fetch(apiUrl, {
      redirect: "follow",
      signal: controller.signal,
    })
      .finally(() => clearTimeout(timeout));

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = normalizeHoroscopePayload(
      await response.json(),
      period,
    );

    // Return the horoscope data
    return jsonResponse(data, 200, "public, max-age=3600");
  } catch (error) {
    console.error("Horoscope API error:", error);

    return jsonResponse(
      {
        error: "Failed to fetch horoscope",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
};
