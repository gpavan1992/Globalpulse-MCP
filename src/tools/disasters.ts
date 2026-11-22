import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { API_ENDPOINTS, ResponseFormat, CHARACTER_LIMIT, DEFAULT_LIMIT } from "../constants.js";
import { fetchJson, buildUrl, truncateText, RELIABLE } from "../services/http.js";
import { formatOutput, markdownTable, formatDate } from "../services/formatters.js";
import type { DisasterEvent } from "../types.js";

const EVENT_TYPE_LABELS: Record<string, string> = {
  EQ: "Earthquake", TC: "Tropical Cyclone", FL: "Flood",
  VO: "Volcano", DR: "Drought", WF: "Wildfire",
};

interface GDACSEvent {
  eventid?: string | number; eventtype?: string; name?: string; country?: string;
  severitydata?: { severitytext?: string }; alertlevel?: string; todate?: string;
  fromdate?: string; url?: { report?: string };
  affectedcountries?: Array<{ iso2?: string; iso3?: string; countryname?: string }>;
}
interface GDACSFeature { properties?: GDACSEvent; geometry?: { type?: string; coordinates?: unknown } }
interface GDACSResponse { features?: GDACSFeature[] }

const GDACS_ALERT_LEVELS = "Green;Orange;Red";
const HISTORY_YEARS = 5;

function parseFeatures(raw: GDACSResponse): Array<{ event: DisasterEvent; props: GDACSEvent }> {
  return (raw.features ?? []).filter((f): f is GDACSFeature & { properties: GDACSEvent } => !!f.properties).map(f => {
    const e = f.properties;
    const coords = f.geometry?.type === "Point" && Array.isArray(f.geometry.coordinates) ? (f.geometry.coordinates as number[]) : undefined;
    return {
      props: e,
      event: {
        event_id: String(e.eventid ?? "unknown"),
        event_type: EVENT_TYPE_LABELS[e.eventtype ?? ""] ?? (e.eventtype ?? "Unknown"),
        title: e.name ?? "Unnamed event", country: e.country ?? "Unknown",
        severity: e.severitydata?.severitytext ?? "N/A", alert_level: e.alertlevel ?? "Unknown",
        date: e.fromdate ?? e.todate ?? "",
        latitude: coords?.[1], longitude: coords?.[0],
        url: e.url?.report,
      },
    };
  });
}

function matchesCountry(e: GDACSEvent, country: string): boolean {
  const c = country.trim().toLowerCase();
  const fields = [e.country, ...(e.affectedcountries ?? []).flatMap(a => [a.countryname, a.iso2, a.iso3])];
  return fields.some(v => (v ?? "").toLowerCase() === c) || (e.country ?? "").toLowerCase().includes(c);
}

export function registerDisasterTools(server: McpServer): void {
  server.registerTool("globalpulse_disasters_get_active", {
    title: "Get Active Disasters",
    description: `Live disaster alerts from the UN GDACS system. Earthquakes, cyclones, floods, volcanoes, droughts, wildfires.
Alert levels: Green (watch), Orange (warning), Red (severe).
Args: event_type ("all","EQ","TC","FL","VO","DR","WF"), alert_level ("all","Green","Orange","Red"), limit, response_format`,
    inputSchema: z.object({
      event_type: z.enum(["all","EQ","TC","FL","VO","DR","WF"]).default("all"),
      alert_level: z.enum(["all","Green","Orange","Red"]).default("all"),
      limit: z.number().int().min(1).max(100).default(DEFAULT_LIMIT),
      response_format: z.nativeEnum(ResponseFormat).default(ResponseFormat.MARKDOWN),
    }),
    annotations: { title: "Get Active Disasters", readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  }, async ({ event_type, alert_level, limit, response_format }) => {
    try {
      // EVENTS4APP ignores query parameters, so filtering happens here.
      const raw = await fetchJson<GDACSResponse>(`${API_ENDPOINTS.GDACS}/events/geteventlist/EVENTS4APP`, {}, RELIABLE);
      let events = parseFeatures(raw)
        .filter(({ props }) => event_type === "all" || props.eventtype === event_type)
        .filter(({ props }) => alert_level === "all" || props.alertlevel === alert_level)
        .map(x => x.event).slice(0, limit);
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
    title: "Get Disasters by Country",
    description: `Disaster history for a specific country from UN GDACS (last 5 years, newest first; the source returns at most 100 events per query).
Args: country (e.g. "India", "Philippines"), event_type, limit, response_format`,
    inputSchema: z.object({
      country: z.string().min(2),
      event_type: z.enum(["all","EQ","TC","FL","VO","DR","WF"]).default("all"),
      limit: z.number().int().min(1).max(100).default(DEFAULT_LIMIT),
      response_format: z.nativeEnum(ResponseFormat).default(ResponseFormat.MARKDOWN),
    }),
    annotations: { title: "Get Disasters by Country", readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  }, async ({ country, event_type, limit, response_format }) => {
    try {
      const now = new Date();
      const from = new Date(now); from.setFullYear(now.getFullYear() - HISTORY_YEARS);
      const params: Record<string, string> = {
        country, alertlevel: GDACS_ALERT_LEVELS,
        fromdate: from.toISOString().slice(0, 10), todate: now.toISOString().slice(0, 10),
      };
      if (event_type !== "all") params["eventlist"] = event_type;
      const raw = await fetchJson<GDACSResponse>(buildUrl(`${API_ENDPOINTS.GDACS}/events/geteventlist/SEARCH`, params), {}, RELIABLE);
      const events = parseFeatures(raw)
        .filter(({ props }) => matchesCountry(props, country))
        .map(x => x.event)
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, limit);
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
