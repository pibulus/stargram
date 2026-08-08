// ===================================================================
// HOROSCOPE API - The Sovereign Oracle. No vendors, no scrapers.
// ===================================================================
// The sky is computed, not fetched. Readings are divined once per period
// by the nightly rite (Deno.cron, 1:33am Melbourne), locked into KV, and
// served all day. A KV miss self-heals by divining on demand. The floor
// is the deterministic composer — this endpoint cannot return blank.
// (Ohmanda served empty 200s on 2026-08-08. Never again. v1 chain is in
// git history if archaeology is ever needed.)

import { FreshContext } from "$fresh/server.ts";
import { getReading } from "../../utils/oracle/ritual.ts";
import { type Period } from "../../utils/oracle/compose.ts";

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

const VALID_PERIODS = new Set<Period>(["daily", "weekly", "monthly"]);

function jsonResponse(
  body: unknown,
  status = 200,
  cacheControl?: string,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...(cacheControl ? { "Cache-Control": cacheControl } : {}),
    },
  });
}

export const handler = async (
  req: Request,
  _ctx: FreshContext,
): Promise<Response> => {
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", "Allow": "GET" },
    });
  }

  const url = new URL(req.url);
  const sign = url.searchParams.get("sign")?.toLowerCase();
  const period = (url.searchParams.get("period") || "daily") as Period;

  if (!sign || !VALID_SIGNS.includes(sign)) {
    return jsonResponse(
      { error: "Invalid zodiac sign", validSigns: VALID_SIGNS },
      400,
    );
  }
  if (!VALID_PERIODS.has(period)) {
    return jsonResponse(
      { error: "Invalid period. Must be: daily, weekly, or monthly" },
      400,
    );
  }

  try {
    const reading = await getReading(period, sign);
    if (!reading) throw new Error("Oracle returned nothing");
    // short max-age on purpose: the reading is locked in KV server-side, and
    // long browser caching of a bad payload burned us once (2026-08-08)
    return jsonResponse(
      { success: true, data: reading },
      200,
      "public, max-age=600",
    );
  } catch (error) {
    console.error("Oracle error:", error);
    return jsonResponse(
      {
        error: "The oracle is silent",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
};
