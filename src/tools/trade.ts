import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { API_ENDPOINTS, ResponseFormat, CHARACTER_LIMIT, DEFAULT_LIMIT } from "../constants.js";
import { fetchJson, buildUrl, truncateText } from "../services/http.js";
import { formatOutput, formatNumber, markdownTable } from "../services/formatters.js";
import type { TradeFlow } from "../types.js";

const COUNTRY_CODES: Record<string, string> = {
  "world":"0","usa":"842","united states":"842","us":"842","china":"156","cn":"156",
  "india":"356","in":"356","germany":"276","de":"276","japan":"392","jp":"392",
  "uk":"826","united kingdom":"826","gb":"826","france":"251","fr":"251",
  "brazil":"76","br":"76","australia":"36","au":"36","canada":"124","ca":"124",
  "russia":"643","ru":"643","south korea":"410","kr":"410","singapore":"702","sg":"702",
  "uae":"784","saudi arabia":"682","indonesia":"360","id":"360","mexico":"484","mx":"484",
};

function resolveCode(input: string): string {
  return COUNTRY_CODES[input.toLowerCase().trim()] ?? input;
}

interface CTItem {
  reporterDesc?: string; reporterCode?: string; partnerDesc?: string; partnerCode?: string;
  flowDesc?: string; cmdDesc?: string; cmdCode?: string; refYear?: number; primaryValue?: number;
}
interface CTResponse { data?: CTItem[]; }

export function registerTradeTools(server: McpServer): void {
  server.registerTool("globalpulse_trade_get_bilateral_flows", {
    title: "UN Comtrade — Bilateral Trade Flows",
    description: `Bilateral trade data from UN Comtrade. Imports, exports by country pair and HS commodity code.
Common HS codes: TOTAL (all), "27" (oil/fuel), "84" (machinery), "85" (electronics), "87" (vehicles), "30" (pharma), "10" (cereals).
Args: reporter, partner (default "world"), year (2000-2023), flow ("all","X","M"), commodity_code, limit, response_format`,
    inputSchema: z.object({
      reporter: z.string().min(2),
      partner: z.string().min(2).default("world"),
      year: z.number().int().min(2000).max(2023).default(2022),
      flow: z.enum(["all","X","M"]).default("all"),
      commodity_code: z.string().default("TOTAL"),
      limit: z.number().int().min(1).max(100).default(DEFAULT_LIMIT),
      response_format: z.nativeEnum(ResponseFormat).default(ResponseFormat.MARKDOWN),
    }),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  }, async ({ reporter, partner, year, flow, commodity_code, limit, response_format }) => {
    try {
      const params: Record<string, string | number> = {
        reporterCode: resolveCode(reporter),
        partnerCode: resolveCode(partner) === "0" ? "0" : resolveCode(partner),
        period: year, cmdCode: commodity_code, maxRecords: limit, includeDesc: "true",
      };
      if (flow !== "all") params["flowCode"] = flow;
      const url = buildUrl(`${API_ENDPOINTS.UN_COMTRADE}/HS`, params);
      const raw = await fetchJson<CTResponse>(url);
      if (!raw.data?.length) return { content: [{ type: "text", text: `No trade data for ${reporter}↔${partner} in ${year}. Try year 2021, or use "TOTAL" for commodity_code.` }] };
      const flows: TradeFlow[] = raw.data.slice(0, limit).map(d => ({
        reporter: d.reporterDesc ?? String(d.reporterCode ?? ""), partner: d.partnerDesc ?? String(d.partnerCode ?? ""),
        flow_direction: d.flowDesc ?? "", commodity_code: String(d.cmdCode ?? "TOTAL"),
        commodity_desc: d.cmdDesc ?? "All commodities", year: d.refYear ?? year, trade_value_usd: d.primaryValue ?? 0,
      }));
      const output = formatOutput(flows, () => {
        const rows = flows.map(f => [f.reporter, f.partner, f.flow_direction, f.commodity_desc.slice(0,28), `$${formatNumber(f.trade_value_usd)}`, String(f.year)]);
        return `## UN Comtrade: ${reporter} ↔ ${partner} (${year})\n**Flow:** ${flow==="all"?"Both":"flow="+flow} | **Commodity:** ${commodity_code}\n\n${markdownTable(["Reporter","Partner","Direction","Commodity","Value","Year"], rows)}\n\n*Source: UN Comtrade (comtradeplus.un.org)*`;
      }, response_format);
      return { content: [{ type: "text", text: truncateText(output, CHARACTER_LIMIT) }] };
    } catch (err) {
      return { isError: true, content: [{ type: "text", text: `Error: ${String(err)}` }] };
    }
  });
}
