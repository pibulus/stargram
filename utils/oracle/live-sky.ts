// ===================================================================
// ORACLE · live-sky.ts — the sky as MEASURED, not computed
// ===================================================================
// sky.ts computes where the bodies are; this reads what they are doing.
// NOAA SWPC gives the geomagnetic field and solar flux, JPL's close-approach
// ledger gives whatever rock is passing nearest. Real instruments on a real
// schedule: the analog entropy in the rite, arriving on its own clock rather
// than ours.
//
// Shared by /api/cosmic-context (the terminal readout) and the Oracle (which
// lets it tint the reading). Fail-soft throughout - a null here costs texture,
// never a reading.

const SWPC_KP_URL =
  "https://services.swpc.noaa.gov/json/planetary_k_index_1m.json";
const SWPC_FLUX_URL = "https://services.swpc.noaa.gov/json/f107_cm_flux.json";
const JPL_CAD_URL =
  "https://ssd-api.jpl.nasa.gov/cad.api?date-min=now&date-max=%2B7&dist-max=20LD&sort=dist&limit=1&fullname=true";

const UPSTREAM_TIMEOUT_MS = 2600;
export const LUNAR_DISTANCE_AU = 0.00256955529;

// One rite asks 36 times; the instruments do not move that fast. Kp updates
// each minute, flux and the CAD ledger daily.
const CACHE_TTL_MS = 20 * 60 * 1000;

export type KpRecord = {
  time_tag?: string;
  kp_index?: number;
  estimated_kp?: number;
  kp?: string;
};

export type FluxRecord = { time_tag?: string; flux?: number };

export type CadPayload = {
  count?: number;
  fields?: string[];
  data?: string[][];
};

export type Visitor = {
  name: string;
  closeApproach: string;
  lunarDistance: number;
  relativeVelocityKmS: number;
};

export type SpaceWeather = {
  kp: number;
  label: string;
  flux: number | null;
  observedAt: string | null;
};

export async function fetchJson<T>(url: string): Promise<T | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return null;
    return await response.json() as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function latest<T>(items: T[] | null | undefined): T | null {
  if (!Array.isArray(items) || items.length === 0) return null;
  return items[items.length - 1];
}

export async function getSpaceWeather(): Promise<SpaceWeather | null> {
  const [kpPayload, fluxPayload] = await Promise.all([
    fetchJson<KpRecord[]>(SWPC_KP_URL),
    fetchJson<FluxRecord[]>(SWPC_FLUX_URL),
  ]);

  const kpRecord = latest(kpPayload);
  const fluxRecord = latest(fluxPayload);
  const kp = Number(kpRecord?.estimated_kp ?? kpRecord?.kp_index ?? 0);
  const flux = Number(fluxRecord?.flux ?? 0);

  if (!kpRecord && !fluxRecord) return null;

  const label = kp >= 5
    ? "storming"
    : kp >= 4
    ? "active"
    : kp >= 3
    ? "unsettled"
    : "quiet";

  return {
    kp: Number(kp.toFixed(1)),
    label,
    flux: flux ? Math.round(flux) : null,
    observedAt: kpRecord?.time_tag ?? fluxRecord?.time_tag ?? null,
  };
}

export async function getNearestVisitor(): Promise<Visitor | null> {
  const payload = await fetchJson<CadPayload>(JPL_CAD_URL);
  const record = payload?.data?.[0];
  const fields = payload?.fields;

  if (!record || !fields) return null;

  const indexFor = (name: string) => fields.indexOf(name);
  const read = (name: string) => record[indexFor(name)] ?? "";
  const distAu = Number(read("dist"));
  const lunarDistance = distAu / LUNAR_DISTANCE_AU;
  const fullname = read("fullname").trim();
  const des = read("des").trim();

  return {
    name: fullname || des || "unnamed visitor",
    closeApproach: read("cd"),
    lunarDistance: Number(lunarDistance.toFixed(1)),
    relativeVelocityKmS: Number(Number(read("v_rel")).toFixed(1)),
  };
}

export interface LiveSky {
  weather: SpaceWeather | null;
  visitor: Visitor | null;
}

let cache: { at: number; value: LiveSky } | null = null;

/**
 * Both instruments at once, cached per isolate. Never throws and never
 * rejects: the worst case is { weather: null, visitor: null } and a reading
 * written from the computed sky alone.
 */
export async function liveSky(): Promise<LiveSky> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.value;
  try {
    const [weather, visitor] = await Promise.all([
      getSpaceWeather(),
      getNearestVisitor(),
    ]);
    cache = { at: Date.now(), value: { weather, visitor } };
  } catch {
    cache = { at: Date.now(), value: { weather: null, visitor: null } };
  }
  return cache.value;
}
