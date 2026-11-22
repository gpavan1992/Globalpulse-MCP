import { API_ENDPOINTS } from "../constants.js";
import { fetchJson, describeError, HttpError } from "./http.js";
import type { FlightState } from "../types.js";

/** adsb.lol rejects radii above 250 nm (HTTP 403). */
export const MAX_RADIUS_NM = 250;
/** Upper bound on upstream requests for one tool call (adsb.lol reports ~500 requests/day/IP). */
export const MAX_TILES = 25;
/** Never burst: at most this many tile requests in flight at once. */
const TILE_CONCURRENCY = 2;
/** Per-country tools sample at most this many hubs per call. */
export const MAX_COUNTRY_TILES = 6;
const CACHE_TTL_MS = 60_000;
const CACHE_MAX_ENTRIES = 500;
/** On HTTP 429, wait this long at most (once) for adsb.lol before giving up (or falling back to adsb.fi when enabled). */
const MAX_RETRY_AFTER_S = 5;
/** Cooldown used when adsb.lol answers 429 without a usable retry-after header. */
const DEFAULT_COOLDOWN_S = 10;
/** adsb.fi public endpoints are limited to 1 request/second. */
const FI_MIN_INTERVAL_MS = 1100;
const NM_PER_DEG = 60;
/** Expired cache entries may still be served this long when adsb.lol is rate-limiting us. */
const MAX_STALE_MS = 15 * 60_000;

/** adsb.fi is off unless ADSBFI_ENABLED is "true" or "1". Read at call time so tests and restarts see changes. */
export function adsbFiEnabled(): boolean {
  const v = (process.env["ADSBFI_ENABLED"] ?? "").trim().toLowerCase();
  return v === "true" || v === "1";
}

/** adsb.lol answered 429 (or is cooling down after one). `retryAfterSec` is how long until it should accept requests again. */
export class RateLimitError extends Error {
  constructor(public retryAfterSec: number, public requests = 0) {
    super(`adsb.lol is temporarily rate-limited, retry in ${Math.max(1, Math.ceil(retryAfterSec))} s.`);
    this.name = "RateLimitError";
  }
}

export type Provider = "adsb.lol" | "adsb.fi";

export interface Circle { lat: number; lon: number; radius_nm: number }

export interface RawAircraft {
  hex?: string; flight?: string; r?: string; t?: string;
  alt_baro?: number | string; gs?: number; track?: number;
  lat?: number; lon?: number; seen?: number;
}
interface LolResponse { ac?: RawAircraft[]; now?: number }
interface FiResponse { aircraft?: RawAircraft[]; now?: number }

export interface CircleResult { aircraft: RawAircraft[]; nowMs: number; provider: Provider; cached: boolean; requests: number; stale?: boolean; staleAgeMs?: number }

class UpstreamError extends Error {
  constructor(message: string, public requests: number) { super(message); this.name = "UpstreamError"; }
}

export interface MultiResult {
  aircraft: RawAircraft[];
  nowMs: number;
  providers: Provider[];
  tiles: number;
  /** Upstream HTTP requests actually made (cache hits cost 0). */
  requests: number;
  cachedTiles: number;
  /** Tiles served from expired cache entries because adsb.lol was rate-limiting. */
  staleTiles: number;
  /** Age in seconds of the oldest stale tile served (0 if none). */
  staleAgeSec: number;
  failedTiles: number;
  failures: string[];
}

// ---- geometry ----------------------------------------------------------

function distNm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad, dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * 3440.065 * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Cover a bounding box with circles of at most MAX_RADIUS_NM (one circle if it fits). */
export function boxToCircles(minLat: number, maxLat: number, minLon: number, maxLon: number): Circle[] {
  const cLat = (minLat + maxLat) / 2, cLon = (minLon + maxLon) / 2;
  const single = Math.max(
    distNm(cLat, cLon, minLat, minLon), distNm(cLat, cLon, minLat, maxLon),
    distNm(cLat, cLon, maxLat, minLon), distNm(cLat, cLon, maxLat, maxLon),
  );
  if (single <= MAX_RADIUS_NM) return [{ lat: cLat, lon: cLon, radius_nm: Math.max(1, Math.ceil(single)) }];

  const latSpan = maxLat - minLat, lonSpan = maxLon - minLon;
  const rows = Math.ceil((latSpan * NM_PER_DEG) / (MAX_RADIUS_NM * Math.SQRT2));
  const rowSpan = latSpan / rows;
  const halfH = (rowSpan * NM_PER_DEG) / 2;
  const halfWMax = Math.sqrt(MAX_RADIUS_NM ** 2 - halfH ** 2);
  const circles: Circle[] = [];
  for (let r = 0; r < rows; r++) {
    const rowMin = minLat + r * rowSpan, rowMax = rowMin + rowSpan;
    // Longitude degrees are widest (in nm) at the edge closest to the equator, so size columns for that edge.
    const nearestEquator = rowMin <= 0 && rowMax >= 0 ? 0 : Math.min(Math.abs(rowMin), Math.abs(rowMax));
    const cos = Math.max(Math.cos((nearestEquator * Math.PI) / 180), 0.05);
    const cols = Math.max(1, Math.ceil((lonSpan * NM_PER_DEG * cos) / (2 * halfWMax)));
    const colSpan = lonSpan / cols;
    const halfW = (colSpan * NM_PER_DEG * cos) / 2;
    const radius = Math.min(MAX_RADIUS_NM, Math.max(1, Math.ceil(Math.sqrt(halfH ** 2 + halfW ** 2))));
    for (let c = 0; c < cols; c++) {
      circles.push({ lat: rowMin + rowSpan / 2, lon: minLon + (c + 0.5) * colSpan, radius_nm: radius });
    }
  }
  return circles;
}

// ---- fetching ----------------------------------------------------------

let nextFiAt = 0;
async function fiSlot(): Promise<void> {
  const now = Date.now();
  const at = Math.max(now, nextFiAt);
  nextFiAt = at + FI_MIN_INTERVAL_MS;
  if (at > now) await new Promise(res => setTimeout(res, at - now));
}

const toMs = (now: number | undefined): number => (now === undefined ? Date.now() : now > 1e12 ? now : now * 1000);
const sleep = (ms: number): Promise<void> => new Promise(res => setTimeout(res, ms));

/** Round so that near-identical areas share a cache entry (lat/lon to 2 decimals ~ 1 km, radius up to whole nm). */
function normalize(c: Circle): Circle {
  return {
    lat: Math.round(c.lat * 100) / 100,
    lon: Math.round(c.lon * 100) / 100,
    radius_nm: Math.min(MAX_RADIUS_NM, Math.max(1, Math.ceil(c.radius_nm))),
  };
}

/** adsb.lol is skipped until this time (epoch ms) after it answered HTTP 429. Shared by all calls. */
let lolCooldownUntil = 0;
/** Test helper: forget the adsb.lol cooldown, the adsb.fi pacing gate and the cache. */
export function resetAdsbState(): void { lolCooldownUntil = 0; nextFiAt = 0; cache.clear(); }

function noteLolRateLimit(err: HttpError): void {
  const secs = err.retryAfterSec ?? DEFAULT_COOLDOWN_S;
  lolCooldownUntil = Math.max(lolCooldownUntil, Date.now() + secs * 1000);
}

async function fetchUncached(c: Circle): Promise<Omit<CircleResult, "cached">> {
  let requests = 0;
  const lolUrl = `${API_ENDPOINTS.ADSB_LOL}/point/${c.lat}/${c.lon}/${c.radius_nm}`;
  const lolAttempt = async (): Promise<Omit<CircleResult, "cached">> => {
    requests++;
    const d = await fetchJson<LolResponse>(lolUrl);
    return { aircraft: d.ac ?? [], nowMs: toMs(d.now), provider: "adsb.lol", requests };
  };
  const useFi = adsbFiEnabled();
  try {
    const cooling = lolCooldownUntil - Date.now();
    if (cooling > 0) throw new RateLimitError(cooling / 1000, 0);
    try {
      return await lolAttempt();
    } catch (err) {
      if (!(err instanceof HttpError) || err.status !== 429) throw err;
      // Everyone else skips adsb.lol until retry-after elapses. This request may wait it out once if it is short.
      noteLolRateLimit(err);
      if (err.retryAfterSec !== undefined && err.retryAfterSec <= MAX_RETRY_AFTER_S) {
        await sleep(err.retryAfterSec * 1000 + 100);
        try {
          return await lolAttempt();
        } catch (retryErr) {
          if (retryErr instanceof HttpError && retryErr.status === 429) {
            noteLolRateLimit(retryErr);
            throw new RateLimitError(retryErr.retryAfterSec ?? DEFAULT_COOLDOWN_S, requests);
          }
          throw retryErr;
        }
      }
      throw new RateLimitError(err.retryAfterSec ?? DEFAULT_COOLDOWN_S, requests);
    }
  } catch (lolErr) {
    if (!useFi) {
      if (lolErr instanceof RateLimitError) { lolErr.requests = requests; throw lolErr; }
      throw new UpstreamError(`adsb.lol failed: ${describeError(lolErr)}`, requests);
    }
    try {
      await fiSlot();
      requests++;
      const d = await fetchJson<FiResponse>(`${API_ENDPOINTS.ADSB_FI}/lat/${c.lat}/lon/${c.lon}/dist/${c.radius_nm}`);
      return { aircraft: d.aircraft ?? [], nowMs: toMs(d.now), provider: "adsb.fi", requests };
    } catch (fiErr) {
      throw new UpstreamError(`adsb.lol failed: ${describeError(lolErr)} | adsb.fi failed: ${describeError(fiErr)}`, requests);
    }
  }
}

const cache = new Map<string, { at: number; value: Promise<Omit<CircleResult, "cached">> }>();

function pruneCache(now: number): void {
  if (cache.size <= CACHE_MAX_ENTRIES) return;
  for (const [k, e] of cache) if (now - e.at >= MAX_STALE_MS) cache.delete(k);
  while (cache.size > CACHE_MAX_ENTRIES) cache.delete(cache.keys().next().value as string);
}

export function clearAdsbCache(): void { cache.clear(); }

/** adsb.lol first (adsb.fi only if ADSBFI_ENABLED). After a 429, adsb.lol is skipped until its retry-after elapses (one short retry-after is honoured by the request that hit it). 60 s in-memory cache; failures are never cached, but an expired entry (up to 15 min old) is served if adsb.lol is rate-limiting. */
export async function fetchCircle(input: Circle): Promise<CircleResult> {
  const c = normalize(input);
  const key = `${c.lat}/${c.lon}/${c.radius_nm}`;
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.at < CACHE_TTL_MS) return { ...(await hit.value), cached: true, requests: 0 };

  const entry = { at: now, value: fetchUncached(c) };
  cache.set(key, entry);
  pruneCache(now);
  try {
    return { ...(await entry.value), cached: false };
  } catch (err) {
    if (cache.get(key) === entry) cache.delete(key);
    if (err instanceof RateLimitError && hit && now - hit.at < MAX_STALE_MS) {
      const value = await hit.value.catch(() => undefined);
      if (value) {
        cache.set(key, hit); // keep it for later rate-limited calls; it is still expired, so never served as fresh
        return { ...value, cached: true, stale: true, requests: err.requests, staleAgeMs: now - hit.at } as CircleResult;
      }
    }
    throw err;
  }
}

/** Fetch many circles (max 2 in flight), de-duplicate aircraft by hex, tolerate partial failure. */
export async function fetchCircles(circles: Circle[]): Promise<MultiResult> {
  const results: CircleResult[] = [];
  const failures: string[] = [];
  let failedRequests = 0;
  let rateLimit: RateLimitError | undefined;
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(TILE_CONCURRENCY, circles.length) }, async () => {
    while (next < circles.length) {
      const c = circles[next++];
      try { results.push(await fetchCircle(c)); }
      catch (err) {
        failures.push(err instanceof Error ? err.message : String(err));
        if (err instanceof RateLimitError) { rateLimit = rateLimit ? new RateLimitError(Math.min(rateLimit.retryAfterSec, err.retryAfterSec)) : err; failedRequests += err.requests; }
        else if (err instanceof UpstreamError) failedRequests += err.requests;
      }
    }
  }));
  if (results.length === 0 && rateLimit) throw new RateLimitError(Math.max(0, lolCooldownUntil - Date.now()) / 1000 || rateLimit.retryAfterSec);
  if (results.length === 0) throw new Error(`All ${circles.length} upstream request(s) failed. ${failures[0] ?? ""}`.trim());

  const byHex = new Map<string, RawAircraft>();
  for (const r of results) for (const a of r.aircraft) {
    if (!a.hex) continue;
    const prev = byHex.get(a.hex);
    if (!prev || (a.seen ?? Infinity) < (prev.seen ?? Infinity)) byHex.set(a.hex, a);
  }
  return {
    aircraft: [...byHex.values()],
    nowMs: Math.max(...results.map(r => r.nowMs)),
    providers: [...new Set(results.map(r => r.provider))],
    tiles: circles.length,
    requests: results.reduce((n, r) => n + r.requests, 0) + failedRequests,
    cachedTiles: results.filter(r => r.cached).length,
    staleTiles: results.filter(r => r.stale).length,
    staleAgeSec: Math.round(Math.max(0, ...results.map(r => r.staleAgeMs ?? 0)) / 1000),
    failedTiles: failures.length,
    failures: [...new Set(failures)],
  };
}

// ---- mapping -----------------------------------------------------------

export function toFlightState(a: RawAircraft, nowMs: number): FlightState {
  const onGround = a.alt_baro === "ground";
  const altFt = typeof a.alt_baro === "number" ? a.alt_baro : null;
  return {
    icao24: a.hex ?? "",
    callsign: a.flight?.trim() || null,
    registration: a.r ?? null,
    aircraft_type: a.t ?? null,
    longitude: a.lon ?? null,
    latitude: a.lat ?? null,
    altitude_m: altFt === null ? (onGround ? 0 : null) : altFt * 0.3048,
    velocity_ms: a.gs === undefined ? null : a.gs * 0.514444,
    heading: a.track ?? null,
    on_ground: onGround,
    last_contact: new Date(nowMs - (a.seen ?? 0) * 1000).toISOString(),
  };
}

/** Footer credit. adsb.fi is named only when it is enabled (its terms require citing it); otherwise adsb.lol alone, with its ODbL licence. */
export function attribution(providers: Provider[]): string {
  const lol = "[adsb.lol](https://adsb.lol), licensed under [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/)";
  if (!adsbFiEnabled() && !providers.includes("adsb.fi")) return `*Data: ${lol}.*`;
  const served = providers.join(" + ");
  return `*Data: ${lol} (primary), [adsb.fi](https://adsb.fi) (fallback). Served by: ${served}.*`;
}

// ---- per-country approximation ------------------------------------------

export interface CountryConfig {
  name: string;
  aliases: string[];
  /** ICAO 24-bit address block allocated to the country (aircraft registered there). */
  icao: [number, number];
  /** Centres of 250 nm circles that approximate where to look. */
  hubs: Array<{ name: string; lat: number; lon: number }>;
}

export const COUNTRIES: CountryConfig[] = [
  {
    name: "India", aliases: ["india", "in", "ind"], icao: [0x800000, 0x83ffff],
    hubs: [
      { name: "Delhi", lat: 28.6, lon: 77.1 }, { name: "Mumbai", lat: 19.1, lon: 72.9 },
      { name: "Bengaluru", lat: 13.2, lon: 77.7 }, { name: "Chennai", lat: 13.0, lon: 80.2 },
      { name: "Kolkata", lat: 22.6, lon: 88.4 }, { name: "Hyderabad", lat: 17.2, lon: 78.4 },
    ],
  },
  {
    name: "Germany", aliases: ["germany", "de", "deu", "deutschland"], icao: [0x3c0000, 0x3fffff],
    hubs: [
      { name: "Frankfurt", lat: 50.0, lon: 8.6 }, { name: "Munich", lat: 48.4, lon: 11.8 },
      { name: "Berlin", lat: 52.4, lon: 13.5 }, { name: "Hamburg", lat: 53.6, lon: 10.0 },
    ],
  },
  {
    name: "United States", aliases: ["united states", "united states of america", "us", "usa"], icao: [0xa00000, 0xafffff],
    hubs: [
      { name: "New York", lat: 40.6, lon: -73.8 }, { name: "Atlanta", lat: 33.6, lon: -84.4 },
      { name: "Chicago", lat: 41.9, lon: -87.9 }, { name: "Dallas", lat: 32.9, lon: -97.0 },
      { name: "Denver", lat: 39.9, lon: -104.7 }, { name: "Los Angeles", lat: 33.9, lon: -118.4 },
      { name: "Seattle", lat: 47.4, lon: -122.3 }, { name: "Miami", lat: 25.8, lon: -80.3 },
    ],
  },
];

export function findCountry(input: string): CountryConfig | undefined {
  const q = input.trim().toLowerCase();
  return COUNTRIES.find(c => c.aliases.includes(q));
}

export function inIcaoBlock(hex: string | undefined, [lo, hi]: [number, number]): boolean {
  if (!hex || !/^[0-9a-f]{6}$/i.test(hex)) return false; // skips "~"-prefixed non-ICAO (TIS-B) addresses
  const n = parseInt(hex, 16);
  return n >= lo && n <= hi;
}
