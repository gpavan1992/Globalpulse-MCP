import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { API_ENDPOINTS, ResponseFormat, CHARACTER_LIMIT, DEFAULT_LIMIT } from "../constants.js";
import { fetchJson, buildUrl, truncateText } from "../services/http.js";
import { formatOutput, markdownTable, formatDate } from "../services/formatters.js";
import type { DisasterEvent } from "../types.js";

const EVENT_TYPE_LABELS: Record<string, string> = {
  EQ: "Earthquake", TC: "Tropical Cyclone", FL: "Flood",
  VO: "Volcano", DR: "Drought", WF: "Wildfire",
};

interface GDACSEvent {
  eventid?: string | number; eventtype?: string; name?: string; country?: string;
  severity?: { severitytext?: string }; alertlevel?: string; todate?: string;
  fromdate?: string; point?: { coordinates?: [number, number] }; url?: { report?: string };
}
interface GDACSResponse { features?: Array<{ properties?: GDACSEvent }>; result?: GDACSEvent[]; }

function parseEvents(raw: GDACSResponse): DisasterEvent[] {
  const items = raw.features ? raw.features.map(f => f.properties).filter(Boolean) : (raw.result ?? []);
  return items.filter((e): e is GDACSEvent => !!e).map(e => ({
    event_id: String(e.eventid ?? "unknown"),
    event_type: EVENT_TYPE_LABELS[e.eventtype ?? ""] ?? (e.eventtype ?? "Unknown"),
    title: e.name ?? "Unnamed event", country: e.country ?? "Unknown",
    severity: e.severity?.severitytext ?? "N/A", alert_level: e.alertlevel ?? "Unknown",
    date: e.todate ?? e.fromdate ?? "",
    latitude: e.point?.coordinates?.[1], longitude: e.point?.coordinates?.[0],
    url: e.url?.report,
  }));
}

export function registerDisasterTools(server: McpServer): void {
  server.registerTool("globalpulse_disasters_get_active", {
    title: "GDACS — Active Global Disasters",
    description: `Live disaster alerts from the UN GDACS system. Earthquakes, cyclones, floods, volcanoes, droughts, wildfires.
Alert levels: Green (watch), Orange (warning), Red (severe).
Args: event_type ("all","EQ","TC","FL","VO","DR","WF"), alert_level ("all","Green","Orange","Red"), limit, response_format`,
    inputSchema: z.object({
      event_type: z.enum(["all","EQ","TC","FL","VO","DR","WF"]).default("all"),
      alert_level: z.enum(["all","Green","Orange","Red"]).default("all"),
      limit: z.number().int().min(1).max(100).default(DEFAULT_LIMIT),
      response_format: z.nativeEnum(ResponseFormat).default(ResponseFormat.MARKDOWN),
    }),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  }, async ({ event_type, alert_level, limit, response_format }) => {
    try {
      const params: Record<string, string | number> = { limit };
      if (event_type !== "all") params["eventtype"] = event_type;
      if (alert_level !== "all") params["alertlevel"] = alert_level;
      const url = buildUrl(`${API_ENDPOINTS.GDACS}/events/latest`, params);
      const raw = await fetchJson<GDACSResponse>(url);
      let events = parseEvents(raw).slice(0, limit);
      if (events.length === 0) return { content: [{ type: "text", text: `No active disasters matching type="${event_type}", alert="${alert_level}".` }] };
      const output = formatOutput(events, () => {
        const rows = events.map(e => [e.event_type, e.country, e.alert_level, e.severity, e.date ? formatDate(e.date).split(" ").slice(0,4).join(" ") : "N/A"]);
        return `## GDACS Active Disasters\n**As of:** ${new Date().toUTCString()}\n\n${markdownTable(["Type","Country","Alert","Severity","Date"], rows)}\n\n*Source: UN GDACS (gdacs.org)*`;
      }, response_format);
      return { content: [{ type: "text", text: truncateText(output, CHARACTER_LIMIT) }] };
    } catch (err) {
      return { isError: true, content: [{ type: "text", text: `Error: ${String(err)}` }] };
    }
  });

  server.registerTool("globalpulse_disasters_get_by_country", {
    title: "GDACS — Disaster History by Country",
    description: `Disaster history for a specific country from UN GDACS.
Args: country (e.g. "India", "Philippines"), event_type, limit, response_format`,
    inputSchema: z.object({
      country: z.string().min(2),
      event_type: z.enum(["all","EQ","TC","FL","VO","DR","WF"]).default("all"),
      limit: z.number().int().min(1).max(100).default(DEFAULT_LIMIT),
      response_format: z.nativeEnum(ResponseFormat).default(ResponseFormat.MARKDOWN),
    }),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  }, async ({ country, event_type, limit, response_format }) => {
    try {
      const params: Record<string, string | number> = { country, limit };
      if (event_type !== "all") params["eventtype"] = event_type;
      const url = buildUrl(`${API_ENDPOINTS.GDACS}/events/latest`, params);
      const raw = await fetchJson<GDACSResponse>(url);
      const events = parseEvents(raw).slice(0, limit);
      if (events.length === 0) return { content: [{ type: "text", text: `No disaster records for "${country}".` }] };
      const output = formatOutput(events, () => {
        const rows = events.map(e => [e.event_type, e.alert_level, e.severity, e.date ? formatDate(e.date).split(" ").slice(0,4).join(" ") : "N/A", e.title]);
        return `## GDACS Disasters: ${country}\n\n${markdownTable(["Type","Alert","Severity","Date","Title"], rows)}\n\n*Source: UN GDACS*`;
      }, response_format);
      return { content: [{ type: "text", text: truncateText(output, CHARACTER_LIMIT) }] };
    } catch (err) {
      return { isError: true, content: [{ type: "text", text: `Error: ${String(err)}` }] };
    }
  });
}
