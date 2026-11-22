import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { API_ENDPOINTS, ResponseFormat, CHARACTER_LIMIT, DEFAULT_LIMIT } from "../constants.js";
import { fetchJson, buildUrl, truncateText, RELIABLE, describeError } from "../services/http.js";
import { resolveComtradeCode } from "../services/comtrade.js";
import { formatOutput, formatNumber, markdownTable } from "../services/formatters.js";
import type { TradeFlow } from "../types.js";

interface CTItem {
  reporterDesc?: string; reporterCode?: string; partnerDesc?: string; partnerCode?: string;
  flowDesc?: string; cmdDesc?: string; cmdCode?: string; refYear?: number; primaryValue?: number;
}
interface CTResponse { data?: CTItem[]; }

export function registerTradeTools(server: McpServer): void {
  server.registerTool("globalpulse_trade_get_bilateral_flows", {
    title: "Get Bilateral Trade Flows",
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
    annotations: { title: "Get Bilateral Trade Flows", readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  }, async ({ reporter, partner, year, flow, commodity_code, limit, response_format }) => {
    try {
      const rep = await resolveComtradeCode("reporter", reporter);
      if (!rep) return { content: [{ type: "text", text: `Unknown reporter "${reporter}". Use a country name, ISO alpha-2/alpha-3 code (e.g. "India", "IN", "IND") or a UN Comtrade numeric code.` }] };
      const par = await resolveComtradeCode("partner", partner);
      if (!par) return { content: [{ type: "text", text: `Unknown partner "${partner}". Use a country name, ISO code, "world", or a UN Comtrade numeric code.` }] };
      const params: Record<string, string | number> = {
        reporterCode: rep.code, partnerCode: par.code,
        period: year, cmdCode: commodity_code, maxRecords: limit, includeDesc: "true",
      };
      if (flow !== "all") params["flowCode"] = flow;
      const url = buildUrl(`${API_ENDPOINTS.UN_COMTRADE}/HS`, params);
      const raw = await fetchJson<CTResponse>(url, {}, RELIABLE);
      if (!raw.data?.length) {
        return { content: [{ type: "text", text: `UN Comtrade has no data for ${rep.desc} (code ${rep.code}) \u2194 ${par.desc} (code ${par.code}) in ${year}, commodity ${commodity_code}${flow !== "all" ? `, flow ${flow}` : ""}. The request itself succeeded, so the codes are valid. Possible reasons: the reporter has not filed ${year} data yet (try ${year - 1}), the reporter does not report this partner or commodity separately (try partner "world" or commodity "TOTAL"), or the keyless preview API does not cover it. Reporter and partner codes are UN M49 codes, which differ from ISO numeric ones (India is 699, not 356).` }] };
      }
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
      return { isError: true, content: [{ type: "text", text: `Error: ${err instanceof Error ? describeError(err) : String(err)}` }] };
    }
  });
}
