import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ResponseFormat, CHARACTER_LIMIT } from "../constants.js";
import { truncateText, describeError } from "../services/http.js";
import { formatOutput, formatNumber, markdownTable } from "../services/formatters.js";
import {
  getCountries, getPopulation, findCountry, findRegion, validRegions, toCountryInfo, COUNTRY_SOURCE_FOOTER,
} from "../services/countries.js";

const fmtPop = (n: number | null): string => (n === null ? "N/A" : formatNumber(n, 1));

export function registerCountriesTools(server: McpServer): void {
  server.registerTool("globalpulse_countries_get_profile", {
    title: "Get Country Profile",
    description: `Country profile: capital, region, population, area, currencies, languages, calling codes, borders. No API key.
Args: country (name, ISO alpha-2 e.g. "IN", alpha-3 e.g. "IND", or numeric code), response_format
Data: a static country list (cached 24 h) filtered locally; population from the World Bank (latest year, N/A for some small territories). Timezones are not available.`,
    inputSchema: z.object({
      country: z.string().min(2),
      response_format: z.nativeEnum(ResponseFormat).default(ResponseFormat.MARKDOWN),
    }),
    annotations: { title: "Get Country Profile", readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  }, async ({ country, response_format }) => {
    try {
      const list = await getCountries();
      const found = findCountry(list, country);
      if (!found) return { content: [{ type: "text", text: `Country "${country}" not found. Try full name, ISO alpha-2 (e.g. "IN"), or alpha-3 (e.g. "IND").` }] };
      const info = toCountryInfo(found.match, await getPopulation());
      const others = found.others.map(c => c.name?.common).filter(Boolean) as string[];
      const output = formatOutput(others.length ? { ...info, other_matches: others } : info, () => {
        const currencies = Object.entries(info.currencies).map(([code, c]) => `${c.name} (${code}, ${c.symbol})`).join(", ");
        const pop = info.population === null ? "N/A" : `${formatNumber(info.population, 1)} (${info.population_year})`;
        return `## ${info.flag_emoji} ${info.name}\n**Official:** ${info.official_name} | **ISO:** ${info.iso2} / ${info.iso3}\n**Capital:** ${info.capital.join(", ") || "N/A"} | **Region:** ${info.region}${info.subregion ? ` / ${info.subregion}` : ""}\n**Population:** ${pop} | **Area:** ${formatNumber(info.area_km2, 0)} km²\n**UN Member:** ${info.un_member ? "Yes" : "No"}\n\n| Field | Value |\n|---|---|\n| Currencies | ${currencies || "N/A"} |\n| Languages | ${Object.values(info.languages).join(", ") || "N/A"} |\n| Calling codes | ${info.calling_codes.join(", ") || "N/A"} |\n| Borders | ${info.borders.join(", ") || "None"} |${others.length ? `\n\n*Other matches for "${country}": ${others.join(", ")}. Use a more specific name or an ISO code.*` : ""}\n\n${COUNTRY_SOURCE_FOOTER}`;
      }, response_format);
      return { content: [{ type: "text", text: truncateText(output, CHARACTER_LIMIT) }] };
    } catch (err) {
      return { isError: true, content: [{ type: "text", text: `Error: could not look up "${country}": ${err instanceof Error ? describeError(err) : String(err)}` }] };
    }
  });

  server.registerTool("globalpulse_countries_get_by_region", {
    title: "Get Countries by Region",
    description: `List all countries in a region or subregion with population, area, capital, currencies.
Regions: "Africa", "Americas", "Asia", "Europe", "Oceania". Subregions: "South Asia", "Southeast Asia", "Eastern Europe", "Western Asia", "Caribbean", etc. (UN geoscheme: "South Asia" is "Southern Asia").
Args: region, sort_by ("population","area","name"), limit, response_format
Data: a static country list (cached 24 h) filtered locally; population from the World Bank (N/A sorts last).`,
    inputSchema: z.object({
      region: z.string().min(3),
      sort_by: z.enum(["population", "area", "name"]).default("population"),
      limit: z.number().int().min(1).max(100).default(20),
      response_format: z.nativeEnum(ResponseFormat).default(ResponseFormat.MARKDOWN),
    }),
    annotations: { title: "Get Countries by Region", readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  }, async ({ region, sort_by, limit, response_format }) => {
    try {
      const list = await getCountries();
      const found = findRegion(list, region);
      if (!found) {
        const v = validRegions(list);
        return { content: [{ type: "text", text: `Region "${region}" not found. Regions: ${v.regions.join(", ")}. Subregions: ${v.subregions.join(", ")}.` }] };
      }
      const pop = await getPopulation();
      let countries = found.countries.map(c => toCountryInfo(c, pop));
      if (sort_by === "population") countries.sort((a, b) => (b.population ?? -1) - (a.population ?? -1));
      else if (sort_by === "area") countries.sort((a, b) => b.area_km2 - a.area_km2);
      else countries.sort((a, b) => a.name.localeCompare(b.name));
      const total = countries.length;
      countries = countries.slice(0, limit);
      const output = formatOutput({ region: found.label, kind: found.kind, total, countries }, () => {
        const rows = countries.map(c => [`${c.flag_emoji} ${c.name}`, c.capital[0] ?? "N/A", fmtPop(c.population), `${formatNumber(c.area_km2, 0)} km²`, Object.values(c.currencies).map(cu => cu.name).join(", ") || "N/A"]);
        return `## Countries of ${found.label}${found.label !== region ? ` (matched "${region}")` : ""}\n**Total:** ${total} | **Sorted by:** ${sort_by}\n\n${markdownTable(["Country", "Capital", "Population", "Area", "Currency"], rows)}\n\n${COUNTRY_SOURCE_FOOTER}`;
      }, response_format);
      return { content: [{ type: "text", text: truncateText(output, CHARACTER_LIMIT) }] };
    } catch (err) {
      return { isError: true, content: [{ type: "text", text: `Error: could not list "${region}": ${err instanceof Error ? describeError(err) : String(err)}` }] };
    }
  });
}
