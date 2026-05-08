// ===================================================================
// HOROSCOPE API - Proxy to horoscope API with timezone handling
// ===================================================================
// Fetches daily/weekly/monthly horoscopes from external API
// Handles timezone conversion for Melbourne (15-16hrs ahead of US)

import { FreshContext } from "$fresh/server.ts";

const HOROSCOPE_API_BASE =
  "https://horoscope-app-api.vercel.app/api/v1/get-horoscope";

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
  };
  success?: boolean;
  error?: string;
};

const VALID_DAYS = new Set(["today", "tomorrow", "yesterday"]);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const UPSTREAM_TIMEOUT_MS = 8000;

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
    return new Response(
      JSON.stringify({
        error: "Invalid zodiac sign",
        validSigns: VALID_SIGNS,
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  // Build API URL based on period
  let apiUrl = "";
  const params = new URLSearchParams({ sign });

  if (period === "daily") {
    // Use custom day or auto-detect timezone
    const day = customDay || getDayParamForTimezone();
    if (!VALID_DAYS.has(day) && !DATE_RE.test(day)) {
      return new Response(
        JSON.stringify({
          error:
            "Invalid day. Must be today, tomorrow, yesterday, or YYYY-MM-DD",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
    params.append("day", day);
    apiUrl = `${HOROSCOPE_API_BASE}/daily?${params}`;
  } else if (period === "weekly") {
    apiUrl = `${HOROSCOPE_API_BASE}/weekly?${params}`;
  } else if (period === "monthly") {
    apiUrl = `${HOROSCOPE_API_BASE}/monthly?${params}`;
  } else {
    return new Response(
      JSON.stringify({
        error: "Invalid period. Must be: daily, weekly, or monthly",
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  try {
    // Fetch from horoscope API
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
    const response = await fetch(apiUrl, { signal: controller.signal })
      .finally(() => clearTimeout(timeout));

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = normalizeHoroscopePayload(
      await response.json(),
      period,
    );

    // Return the horoscope data
    return new Response(
      JSON.stringify(data),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=3600", // Cache for 1 hour
        },
      },
    );
  } catch (error) {
    console.error("Horoscope API error:", error);

    return new Response(
      JSON.stringify({
        error: "Failed to fetch horoscope",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
