import { API_ENDPOINTS } from "../constants.js";
import { fetchJson, RELIABLE, describeError } from "./http.js";
import { cachedLoader } from "./cache.js";
import { norm } from "./countries.js";

/**
 * Comtrade does not use ISO numeric codes: India is 699 (356 is "India (...1974)" and has no recent data),
 * the USA is 842, Switzerland 757. The codes come from Comtrade's own reference lists, cached for 24 h.
 */
export interface ComtradeCode { code: number; desc: string }

interface RefEntry { code: number; desc: string; iso2: string | null; iso3: string | null; effective: string }
interface RawReporter { reporterCode: number; reporterDesc: string; reporterCodeIsoAlpha2: string | null; reporterCodeIsoAlpha3: string | null; entryEffectiveDate: string }
interface RawPartner { PartnerCode: number; PartnerDesc: string; PartnerCodeIsoAlpha2: string | null; PartnerCodeIsoAlpha3: string | null; entryEffectiveDate: string }

/** Historical or sub-territory entries that share an ISO code with the current one. */
const NOT_CURRENT = /\(\.\.\.\d{4}\)|excl|metropolitan|belgium-luxembourg|east and west|and aruba|and anguilla|and puerto rico/i;

const ALIASES: Record<string, string> = {
  "usa": "usa", "us": "usa", "united states": "usa", "united states of america": "usa", "america": "usa",
  "uk": "gbr", "united kingdom": "gbr", "great britain": "gbr", "britain": "gbr", "england": "gbr",
  "uae": "are", "russia": "rus", "south korea": "kor", "korea": "kor", "republic of korea": "kor", "north korea": "prk",
  "turkey": "tur", "vietnam": "vnm", "iran": "irn", "syria": "syr", "laos": "lao", "czech republic": "cze", "ivory coast": "civ",
};

function buildMap(entries: RefEntry[]): Map<string, ComtradeCode> {
  const current = entries.filter(e => !NOT_CURRENT.test(e.desc));
  const byIso3 = new Map<string, RefEntry>();
  for (const e of current) {
    if (!e.iso3) continue;
    const prev = byIso3.get(e.iso3);
    // latest effective date wins; on a tie the larger code (e.g. Switzerland 757 over 756)
    if (!prev || e.effective > prev.effective || (e.effective === prev.effective && e.code > prev.code)) byIso3.set(e.iso3, e);
  }
  const map = new Map<string, ComtradeCode>();
  for (const e of current) if (!e.iso3 || byIso3.get(e.iso3) === e) map.set(norm(e.desc), { code: e.code, desc: e.desc });
  for (const e of byIso3.values()) {
    const c = { code: e.code, desc: e.desc };
    map.set(norm(e.iso3!), c);
    if (e.iso2) map.set(norm(e.iso2), c);
  }
  return map;
}

/** Offline fallback: verified against the reference lists. Used only if they cannot be downloaded. */
const BUILT_IN: Array<[number, string, string[]]> = [
  [0, "World", ["world", "w00"]], [842, "USA", ["usa", "us", "united states", "united states of america"]],
  [156, "China", ["china", "cn", "chn"]], [699, "India", ["india", "in", "ind"]], [276, "Germany", ["germany", "de", "deu"]],
  [392, "Japan", ["japan", "jp", "jpn"]], [826, "United Kingdom", ["uk", "united kingdom", "gb", "gbr"]],
  [251, "France", ["france", "fr", "fra"]], [76, "Brazil", ["brazil", "br", "bra"]], [36, "Australia", ["australia", "au", "aus"]],
  [124, "Canada", ["canada", "ca", "can"]], [643, "Russian Federation", ["russia", "ru", "rus"]],
  [410, "Rep. of Korea", ["south korea", "kr", "kor"]], [702, "Singapore", ["singapore", "sg", "sgp"]],
  [784, "United Arab Emirates", ["uae", "ae", "are"]], [682, "Saudi Arabia", ["saudi arabia", "sa", "sau"]],
  [360, "Indonesia", ["indonesia", "id", "idn"]], [484, "Mexico", ["mexico", "mx", "mex"]],
];
const builtInMap = (): Map<string, ComtradeCode> =>
  new Map(BUILT_IN.flatMap(([code, desc, keys]) => keys.map(k => [norm(k), { code, desc }] as [string, ComtradeCode])));

type Kind = "reporter" | "partner";

const loaders: Record<Kind, ReturnType<typeof cachedLoader<Map<string, ComtradeCode>>>> = {
  reporter: cachedLoader(async () => {
    const raw = await fetchJson<{ results?: RawReporter[] }>(`${API_ENDPOINTS.COMTRADE_REFERENCE}/Reporters.json`, {}, RELIABLE);
    if (!raw.results || raw.results.length < 100) throw new Error("Unexpected Comtrade reporter list");
    return buildMap(raw.results.map(r => ({ code: r.reporterCode, desc: r.reporterDesc, iso2: r.reporterCodeIsoAlpha2, iso3: r.reporterCodeIsoAlpha3, effective: r.entryEffectiveDate })));
  }, "comtrade reporters"),
  partner: cachedLoader(async () => {
    const raw = await fetchJson<{ results?: RawPartner[] }>(`${API_ENDPOINTS.COMTRADE_REFERENCE}/partnerAreas.json`, {}, RELIABLE);
    if (!raw.results || raw.results.length < 100) throw new Error("Unexpected Comtrade partner list");
    return buildMap(raw.results.map(r => ({ code: r.PartnerCode, desc: r.PartnerDesc, iso2: r.PartnerCodeIsoAlpha2, iso3: r.PartnerCodeIsoAlpha3, effective: r.entryEffectiveDate })));
  }, "comtrade partners"),
};
const failedAt: Record<Kind, number> = { reporter: 0, partner: 0 };

async function getMap(kind: Kind): Promise<Map<string, ComtradeCode>> {
  if (failedAt[kind] && Date.now() - failedAt[kind] < 5 * 60 * 1000) return builtInMap();
  try {
    const m = await loaders[kind].get();
    failedAt[kind] = 0;
    return m;
  } catch (err) {
    failedAt[kind] = Date.now();
    console.error(`comtrade ${kind} list unavailable, using built-in table: ${describeError(err)}`);
    return builtInMap();
  }
}

export function clearComtradeCaches(): void { loaders.reporter.clear(); loaders.partner.clear(); failedAt.reporter = 0; failedAt.partner = 0; }

/** Name, ISO alpha-2/3 or a numeric Comtrade code -> Comtrade code. undefined if the name is unknown. */
export async function resolveComtradeCode(kind: Kind, input: string): Promise<ComtradeCode | undefined> {
  const s = input.trim();
  if (/^\d+$/.test(s)) return { code: Number(s), desc: `code ${s}` };
  const map = await getMap(kind);
  const key = norm(s);
  return map.get(ALIASES[key] ?? key) ?? map.get(key);
}
