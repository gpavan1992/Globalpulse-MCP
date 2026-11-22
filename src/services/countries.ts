import { API_ENDPOINTS } from "../constants.js";
import { fetchJson, RELIABLE, describeError } from "./http.js";
import { cachedLoader } from "./cache.js";
import type { CountryInfo } from "../types.js";

/** If the optional population download fails, don't retry it for this long (it would stall every call). */
const OPTIONAL_RETRY_MS = 5 * 60 * 1000;

export interface RawCountry {
  name?: { common?: string; official?: string }; altSpellings?: string[];
  cca2?: string; cca3?: string; ccn3?: string; cioc?: string;
  capital?: string[]; region?: string; subregion?: string; area?: number;
  currencies?: Record<string, { name?: string; symbol?: string }>; languages?: Record<string, string>;
  idd?: { root?: string; suffixes?: string[] }; borders?: string[]; flag?: string; unMember?: boolean;
}

const countriesCache = cachedLoader<RawCountry[]>(async () => {
  const data = await fetchJson<unknown>(API_ENDPOINTS.COUNTRIES_DATA, {}, RELIABLE);
  // Guard against the deprecation-notice shape that the old REST Countries URLs now return.
  if (!Array.isArray(data) || data.length < 100 || !(data as RawCountry[]).every(c => c && typeof c === "object" && c.cca3)) {
    throw new Error(`Unexpected country dataset from ${API_ENDPOINTS.COUNTRIES_DATA}: ${JSON.stringify(data).slice(0, 150)}`);
  }
  return data as RawCountry[];
}, "country list");

export const getCountries = (): Promise<RawCountry[]> => countriesCache.get();

interface PopRow { countryiso3code?: string; date?: string; value?: number | null }
export interface Population { value: number; year: string }

const populationCache = cachedLoader<Map<string, Population>>(async () => {
  const raw = await fetchJson<[unknown, PopRow[]]>(`${API_ENDPOINTS.WORLD_BANK}/country/all/indicator/SP.POP.TOTL?format=json&date=2021:2025&per_page=2000`, {}, RELIABLE);
  const rows = Array.isArray(raw) && Array.isArray(raw[1]) ? raw[1] : [];
  const best = new Map<string, Population>();
  for (const r of rows) {
    if (!r.countryiso3code || r.value == null || !r.date) continue;
    const prev = best.get(r.countryiso3code);
    if (!prev || r.date > prev.year) best.set(r.countryiso3code, { value: r.value, year: r.date });
  }
  if (best.size < 100) throw new Error("World Bank population response had too few countries");
  return best;
}, "population");

let populationFailedAt = 0;
/** Population is an optional enrichment: on failure the tools still work, with population shown as N/A. */
export async function getPopulation(): Promise<Map<string, Population>> {
  if (populationFailedAt && Date.now() - populationFailedAt < OPTIONAL_RETRY_MS) return new Map();
  try {
    const m = await populationCache.get();
    populationFailedAt = 0;
    return m;
  } catch (err) {
    populationFailedAt = Date.now();
    console.error(`population unavailable: ${describeError(err)}`);
    return new Map();
  }
}

export function clearCountryCaches(): void { countriesCache.clear(); populationCache.clear(); populationFailedAt = 0; }

// ---- lookup ---------------------------------------------------------------

export const norm = (s: string): string =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export interface CountryMatch { match: RawCountry; others: RawCountry[] }

/** Match by alpha-2, alpha-3, numeric code, exact name / alternative spelling, then partial name. */
export function findCountry(list: RawCountry[], query: string): CountryMatch | undefined {
  const raw = query.trim();
  const q = norm(raw);
  if (!q) return undefined;
  let hit: RawCountry | undefined;
  if (/^[a-z]{2}$/i.test(raw)) hit = list.find(c => c.cca2 === raw.toUpperCase());
  else if (/^[a-z]{3}$/i.test(raw)) hit = list.find(c => c.cca3 === raw.toUpperCase() || c.cioc === raw.toUpperCase());
  else if (/^\d{3}$/.test(raw)) hit = list.find(c => c.ccn3 === raw);
  hit ??= list.find(c => norm(c.name?.common ?? "") === q || norm(c.name?.official ?? "") === q);
  hit ??= list.find(c => (c.altSpellings ?? []).some(a => norm(a) === q));
  if (hit) return { match: hit, others: [] };
  if (q.length < 3) return undefined;
  const partial = list
    .filter(c => norm(c.name?.common ?? "").includes(q) || norm(c.name?.official ?? "").includes(q))
    .sort((a, b) => {
      const sa = norm(a.name?.common ?? "").startsWith(q) ? 0 : 1, sb = norm(b.name?.common ?? "").startsWith(q) ? 0 : 1;
      return sa - sb || (a.name?.common ?? "").length - (b.name?.common ?? "").length;
    });
  return partial.length ? { match: partial[0]!, others: partial.slice(1, 6) } : undefined;
}

const SUBREGION_ALIASES: Record<string, string> = {
  "southeast asia": "south eastern asia", "south east asia": "south eastern asia", "southeastern asia": "south eastern asia",
  "middle east": "western asia", "balkans": "southeast europe", "antarctica": "antarctic",
};
const COMPASS: Record<string, string> = { north: "northern", south: "southern", east: "eastern", west: "western" };

export interface RegionMatch { label: string; kind: "region" | "subregion"; countries: RawCountry[] }

export function validRegions(list: RawCountry[]): { regions: string[]; subregions: string[] } {
  const uniq = (xs: Array<string | undefined>) => [...new Set(xs.filter((x): x is string => !!x))].sort();
  return { regions: uniq(list.map(c => c.region)), subregions: uniq(list.map(c => c.subregion)) };
}

/** Match a region ("Asia") or subregion ("South Asia" -> "Southern Asia") by name. */
export function findRegion(list: RawCountry[], query: string): RegionMatch | undefined {
  const q = norm(query);
  if (!q) return undefined;
  const aliased = SUBREGION_ALIASES[q] ?? q;
  const region = list.find(c => norm(c.region ?? "") === aliased)?.region;
  if (region) return { label: region, kind: "region", countries: list.filter(c => c.region === region) };
  const [first, ...rest] = q.split(" ");
  const adjectival = [COMPASS[first!] ?? first, ...rest].join(" ");
  const candidates = new Set([aliased, q, adjectival]);
  const sub = list.find(c => candidates.has(norm(c.subregion ?? "")))?.subregion;
  return sub ? { label: sub, kind: "subregion", countries: list.filter(c => c.subregion === sub) } : undefined;
}

// ---- mapping ----------------------------------------------------------------

export function toCountryInfo(raw: RawCountry, pop: Map<string, Population>): CountryInfo {
  const root = raw.idd?.root ?? "";
  const suffixes = raw.idd?.suffixes ?? [""];
  // Shared plans (e.g. +1 for the US/Canada) list hundreds of area-code suffixes; show just the root.
  const calling = !root ? [] : suffixes.length > 3 ? [root] : suffixes.map(s => root + s);
  const p = raw.cca3 ? pop.get(raw.cca3) : undefined;
  return {
    name: raw.name?.common ?? "Unknown", official_name: raw.name?.official ?? raw.name?.common ?? "Unknown",
    iso2: raw.cca2 ?? "", iso3: raw.cca3 ?? "",
    capital: raw.capital ?? [], region: raw.region ?? "Unknown", subregion: raw.subregion ?? "",
    population: p?.value ?? null, population_year: p?.year ?? null, area_km2: raw.area ?? 0,
    currencies: Object.fromEntries(Object.entries(raw.currencies ?? {}).map(([code, c]) => [code, { name: c.name ?? code, symbol: c.symbol ?? "" }])),
    languages: raw.languages ?? {}, calling_codes: calling, borders: raw.borders ?? [],
    flag_emoji: raw.flag ?? "", un_member: raw.unMember ?? false,
  };
}

export const COUNTRY_SOURCE_FOOTER =
  "*Source: [mledoze/countries](https://github.com/mledoze/countries) (ODbL 1.0); population: World Bank (SP.POP.TOTL, latest year available).*";
