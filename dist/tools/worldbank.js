import { z } from "zod";
import { API_ENDPOINTS, ResponseFormat, CHARACTER_LIMIT } from "../constants.js";
import { fetchJson, buildUrl, truncateText } from "../services/http.js";
import { formatOutput, formatNumber, markdownTable } from "../services/formatters.js";
const COMMON_INDICATORS = {
    "NY.GDP.MKTP.CD": "GDP (current US$)",
    "NY.GDP.PCAP.CD": "GDP per capita (current US$)",
    "FP.CPI.TOTL.ZG": "Inflation rate (CPI, annual %)",
    "SL.UEM.TOTL.ZS": "Unemployment rate (% of labor force)",
    "NE.TRD.GNFS.ZS": "Trade (% of GDP)",
    "DT.DOD.DECT.GN.ZS": "External debt (% of GNI)",
    "SP.POP.TOTL": "Total population",
    "SI.POV.NAHC": "Poverty headcount ratio",
    "EG.ELC.ACCS.ZS": "Access to electricity (%)",
    "SH.DYN.MORT": "Under-5 mortality rate",
};
async function fetchWorldBankData(countryCode, indicator, startYear, endYear) {
    const url = buildUrl(`${API_ENDPOINTS.WORLD_BANK}/country/${countryCode}/indicator/${indicator}`, {
        format: "json", date: `${startYear}:${endYear}`, per_page: 50,
    });
    const raw = await fetchJson(url);
    if (!Array.isArray(raw) || raw.length < 2)
        return [];
    const items = raw[1] ?? [];
    return items
        .filter((d) => d.value !== null && d.value !== undefined)
        .map((d) => ({
        country: d.country?.value ?? countryCode,
        country_code: d.country?.id ?? countryCode,
        indicator: d.indicator?.value ?? indicator,
        year: parseInt(d.date ?? "0", 10),
        value: d.value ?? null,
    }))
        .sort((a, b) => b.year - a.year);
}
export function registerWorldBankTools(server) {
    server.registerTool("globalpulse_worldbank_get_indicator", {
        title: "World Bank — Get Country Indicator",
        description: `Fetch World Bank macroeconomic indicator data for any country. Covers GDP, inflation, unemployment, trade, debt, population, poverty. 10,000+ indicators from 1960–present.

Common codes: NY.GDP.MKTP.CD (GDP), FP.CPI.TOTL.ZG (inflation), SL.UEM.TOTL.ZS (unemployment), SP.POP.TOTL (population), NE.TRD.GNFS.ZS (trade % GDP).

Args:
  - country_code: ISO alpha-2 or alpha-3 (e.g. "IN", "US", "BRA")
  - indicator: World Bank indicator code
  - start_year: Start year (default 2000)
  - end_year: End year (default current year)
  - response_format: "markdown" or "json"`,
        inputSchema: z.object({
            country_code: z.string().min(2).max(3).describe('ISO code e.g. "IN", "US"'),
            indicator: z.string().min(3).describe('World Bank indicator code e.g. "NY.GDP.MKTP.CD"'),
            start_year: z.number().int().min(1960).max(2030).default(2000),
            end_year: z.number().int().min(1960).max(2030).default(new Date().getFullYear()),
            response_format: z.nativeEnum(ResponseFormat).default(ResponseFormat.MARKDOWN),
        }),
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    }, async ({ country_code, indicator, start_year, end_year, response_format }) => {
        try {
            const data = await fetchWorldBankData(country_code.toUpperCase(), indicator, start_year, end_year);
            if (data.length === 0)
                return { content: [{ type: "text", text: `No data found for "${indicator}" in "${country_code}" (${start_year}–${end_year}). Check the indicator code at data.worldbank.org/indicator.` }] };
            const output = formatOutput(data, () => {
                const rows = data.slice(0, 30).map((d) => [String(d.year), d.country, formatNumber(d.value)]);
                return `## World Bank: ${data[0]?.indicator ?? indicator}\n**Country:** ${data[0]?.country ?? country_code} | **Period:** ${start_year}–${end_year}\n\n${markdownTable(["Year", "Country", "Value"], rows)}\n\n*Source: World Bank Open Data*`;
            }, response_format);
            return { content: [{ type: "text", text: truncateText(output, CHARACTER_LIMIT) }] };
        }
        catch (err) {
            return { isError: true, content: [{ type: "text", text: `Error: ${String(err)}` }] };
        }
    });
    server.registerTool("globalpulse_worldbank_list_indicators", {
        title: "World Bank — List Common Indicators",
        description: "List the most commonly used World Bank indicator codes. Use this to discover codes before calling globalpulse_worldbank_get_indicator.",
        inputSchema: z.object({ response_format: z.nativeEnum(ResponseFormat).default(ResponseFormat.MARKDOWN) }),
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    }, async ({ response_format }) => {
        const output = formatOutput(COMMON_INDICATORS, () => {
            const rows = Object.entries(COMMON_INDICATORS).map(([code, name]) => [`\`${code}\``, name]);
            return `## World Bank — Common Indicator Codes\n\n${markdownTable(["Code", "Description"], rows)}\n\n*Full catalog: data.worldbank.org/indicator*`;
        }, response_format);
        return { content: [{ type: "text", text: output }] };
    });
}
