import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { API_ENDPOINTS, ResponseFormat, CHARACTER_LIMIT } from "../constants.js";
import { fetchJson, truncateText } from "../services/http.js";
import { formatOutput, formatNumber, markdownTable } from "../services/formatters.js";
import type { CountryInfo } from "../types.js";

interface RawCountry {
  name?: { common?: string; official?: string }; capital?: string[]; region?: string; subregion?: string;
  population?: number; area?: number; currencies?: Record<string, { name?: string; symbol?: string }>;
  languages?: Record<string, string>; timezones?: string[];
  idd?: { root?: string; suffixes?: string[] }; borders?: string[]; flag?: string; unMember?: boolean;
}

function parse(raw: RawCountry): CountryInfo {
  const root = raw.idd?.root ?? "";
  const suffixes = raw.idd?.suffixes ?? [""];
  return {
    name: raw.name?.common ?? "Unknown", official_name: raw.name?.official ?? raw.name?.common ?? "Unknown",
    capital: raw.capital ?? [], region: raw.region ?? "Unknown", subregion: raw.subregion ?? "",
    population: raw.population ?? 0, area_km2: raw.area ?? 0,
    currencies: Object.fromEntries(Object.entries(raw.currencies ?? {}).map(([code, c]) => [code, { name: c.name ?? code, symbol: c.symbol ?? "" }])),
    languages: raw.languages ?? {}, timezones: raw.timezones ?? [],
    calling_codes: suffixes.map(s => root + s), borders: raw.borders ?? [],
    flag_emoji: raw.flag ?? "", un_member: raw.unMember ?? false,
  };
}

export function registerCountriesTools(server: McpServer): void {
  server.registerTool("globalpulse_countries_get_profile", {
    title: "REST Countries — Country Profile",
    description: `Full country profile: capital, region, population, area, currencies, languages, timezones, borders. No API key, no rate limit.
Args: country (name, ISO alpha-2 e.g. "IN", or alpha-3 e.g. "IND"), response_format`,
    inputSchema: z.object({
      country: z.string().min(2),
      response_format: z.nativeEnum(ResponseFormat).default(ResponseFormat.MARKDOWN),
    }),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  }, async ({ country, response_format }) => {
    try {
      const isCode = country.length <= 3;
      const endpoint = isCode
        ? `${API_ENDPOINTS.REST_COUNTRIES}/alpha/${encodeURIComponent(country)}`
        : `${API_ENDPOINTS.REST_COUNTRIES}/name/${encodeURIComponent(country)}`;
      const rawList = await fetchJson<RawCountry[]>(endpoint);
      if (!rawList?.length) return { content: [{ type: "text", text: `Country "${country}" not found. Try full name, ISO alpha-2 (e.g. "IN"), or alpha-3 (e.g. "IND").` }] };
      const info = parse(rawList[0]!);
      const output = formatOutput(info, () => {
        const currencies = Object.entries(info.currencies).map(([code, c]) => `${c.name} (${code}, ${c.symbol})`).join(", ");
        return `## ${info.flag_emoji} ${info.name}\n**Official:** ${info.official_name}\n**Capital:** ${info.capital.join(", ")||"N/A"} | **Region:** ${info.region}${info.subregion ? ` / ${info.subregion}` : ""}\n**Population:** ${formatNumber(info.population, 1)} | **Area:** ${formatNumber(info.area_km2, 0)} km²\n**UN Member:** ${info.un_member?"Yes":"No"}\n\n| Field | Value |\n|---|---|\n| Currencies | ${currencies||"N/A"} |\n| Languages | ${Object.values(info.languages).join(", ")||"N/A"} |\n| Timezones | ${info.timezones.join(", ")} |\n| Calling codes | ${info.calling_codes.join(", ")} |\n| Borders | ${info.borders.join(", ")||"None"} |\n\n*Source: REST Countries (restcountries.com)*`;
      }, response_format);
      return { content: [{ type: "text", text: truncateText(output, CHARACTER_LIMIT) }] };
    } catch (err) {
      return { isError: true, content: [{ type: "text", text: `Country "${country}" not found. Error: ${String(err)}` }] };
    }
  });

  server.registerTool("globalpulse_countries_get_by_region", {
    title: "REST Countries — Countries by Region",
    description: `List all countries in a region with population, area, capital, currencies.
Regions: "Africa", "Americas", "Asia", "Europe", "Oceania". Subregions: "South Asia", "Southeast Asia", "Eastern Europe", etc.
Args: region, sort_by ("population","area","name"), limit, response_format`,
    inputSchema: z.object({
      region: z.string().min(3),
      sort_by: z.enum(["population","area","name"]).default("population"),
      limit: z.number().int().min(1).max(100).default(20),
      response_format: z.nativeEnum(ResponseFormat).default(ResponseFormat.MARKDOWN),
    }),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  }, async ({ region, sort_by, limit, response_format }) => {
    try {
      let rawList: RawCountry[] = [];
      try {
        rawList = await fetchJson<RawCountry[]>(`${API_ENDPOINTS.REST_COUNTRIES}/region/${encodeURIComponent(region)}`);
      } catch {
        rawList = await fetchJson<RawCountry[]>(`${API_ENDPOINTS.REST_COUNTRIES}/subregion/${encodeURIComponent(region)}`);
      }
      if (!rawList?.length) return { content: [{ type: "text", text: `Region "${region}" not found. Valid: Africa, Americas, Asia, Europe, Oceania, or subregions like "South Asia".` }] };
      let countries = rawList.map(parse);
      if (sort_by === "population") countries.sort((a,b) => b.population - a.population);
      else if (sort_by === "area") countries.sort((a,b) => b.area_km2 - a.area_km2);
      else countries.sort((a,b) => a.name.localeCompare(b.name));
      const total = countries.length;
      countries = countries.slice(0, limit);
      const output = formatOutput({ region, total, countries }, () => {
        const rows = countries.map(c => [`${c.flag_emoji} ${c.name}`, c.capital[0]??"N/A", formatNumber(c.population,1), `${formatNumber(c.area_km2,0)} km²`, Object.values(c.currencies).map(cu=>cu.name).join(", ")||"N/A"]);
        return `## Countries of ${region}\n**Total:** ${total} | **Sorted by:** ${sort_by}\n\n${markdownTable(["Country","Capital","Population","Area","Currency"], rows)}\n\n*Source: REST Countries*`;
      }, response_format);
      return { content: [{ type: "text", text: truncateText(output, CHARACTER_LIMIT) }] };
    } catch (err) {
      return { isError: true, content: [{ type: "text", text: `Region "${region}" not found. Error: ${String(err)}` }] };
    }
  });
}
