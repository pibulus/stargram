// ===================================================================
// ORACLE · storage.ts — the shared notebook (Supabase REST, fail-soft)
// ===================================================================
// Cross-instance canon: the first reading written for a (period, date, sign)
// wins, everywhere, forever. Dormant until STARGRAM_SUPABASE_KEY (service
// role, server-side only) lands in the environment — without it every
// function quietly no-ops and the per-isolate cache carries on.

const SUPABASE_URL = "https://rckahvngsukzkmbpaejs.supabase.co";
const REST = `${SUPABASE_URL}/rest/v1`;
const TIMEOUT_MS = 8000;

function headers(): Record<string, string> | null {
  const key = Deno.env.get("STARGRAM_SUPABASE_KEY");
  if (!key) return null;
  return {
    "apikey": key,
    "Authorization": `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

async function rest(
  path: string,
  init: RequestInit = {},
): Promise<Response | null> {
  const h = headers();
  if (!h) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    return await fetch(`${REST}${path}`, {
      ...init,
      headers: { ...h, ...(init.headers ?? {}) },
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));
  } catch (error) {
    console.warn("Oracle storage unreachable:", error);
    return null;
  }
}

// deno-lint-ignore no-explicit-any
export async function fetchStoredReading<T = any>(
  period: string,
  dateKey: string,
  sign: string,
): Promise<T | null> {
  const res = await rest(
    `/stargram_readings?period=eq.${period}&date_key=eq.${dateKey}&sign=eq.${sign}&select=reading`,
  );
  if (!res?.ok) return null;
  const rows = await res.json().catch(() => null);
  const reading = rows?.[0]?.reading;
  // the law: verify content, not transaction
  return reading?.horoscope ? reading as T : null;
}

export async function storeReading(
  period: string,
  dateKey: string,
  sign: string,
  reading: unknown,
): Promise<void> {
  // first write wins: ignore-duplicates means a concurrent instance's copy
  // never overwrites the canon
  await rest(`/stargram_readings?on_conflict=period,date_key,sign`, {
    method: "POST",
    headers: { "Prefer": "resolution=ignore-duplicates" },
    body: JSON.stringify({ period, date_key: dateKey, sign, reading }),
  });
}

export async function fetchStoredJournal(): Promise<string[] | null> {
  const res = await rest(`/stargram_journal?id=eq.1&select=entries`);
  if (!res?.ok) return null;
  const rows = await res.json().catch(() => null);
  const entries = rows?.[0]?.entries;
  return Array.isArray(entries) ? entries : null;
}

export async function storeJournal(entries: string[]): Promise<void> {
  await rest(`/stargram_journal?on_conflict=id`, {
    method: "POST",
    headers: { "Prefer": "resolution=merge-duplicates" },
    body: JSON.stringify({
      id: 1,
      entries,
      updated_at: new Date().toISOString(),
    }),
  });
}
