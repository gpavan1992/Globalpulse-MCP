import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { API_ENDPOINTS, ResponseFormat, CHARACTER_LIMIT, DEFAULT_LIMIT } from "../constants.js";
import { fetchJson, buildUrl, truncateText } from "../services/http.js";
import { formatOutput, markdownTable } from "../services/formatters.js";
import type { FlightState } from "../types.js";

type OSVector = [string, string|null, string, number|null, number|null, number|null, number|null, number|null, boolean, number|null, number|null, number|null, unknown, number|null, unknown, unknown, unknown];
interface OSResponse { time: number; states: OSVector[] | null; }

function parseState(sv: OSVector): FlightState {
  return {
    icao24: sv[0], callsign: sv[1]?.trim() ?? null, origin_country: sv[2],
    longitude: sv[5], latitude: sv[6], altitude_m: sv[7],
    velocity_ms: sv[9], heading: sv[10], on_ground: sv[8],
    last_contact: sv[4] ? new Date(sv[4] * 1000).toISOString() : "Unknown",
  };
}

export function registerAviationTools(server: McpServer): void {
  server.registerTool("globalpulse_aviation_get_live_flights", {
    title: "OpenSky — Live Flights in Region",
    description: `Live ADS-B flight tracking for any geographic bounding box. Real-time position, altitude, speed, heading.
Args: min_latitude, max_latitude, min_longitude, max_longitude, limit, on_ground_only, response_format
India box: min_lat=8, max_lat=37, min_lon=68, max_lon=97.5 | Europe: min_lat=36, max_lat=71, min_lon=-10, max_lon=25`,
    inputSchema: z.object({
      min_latitude: z.number().min(-90).max(90),
      max_latitude: z.number().min(-90).max(90),
      min_longitude: z.number().min(-180).max(180),
      max_longitude: z.number().min(-180).max(180),
      limit: z.number().int().min(1).max(100).default(DEFAULT_LIMIT),
      on_ground_only: z.boolean().default(false),
      response_format: z.nativeEnum(ResponseFormat).default(ResponseFormat.MARKDOWN),
    }),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  }, async ({ min_latitude, max_latitude, min_longitude, max_longitude, limit, on_ground_only, response_format }) => {
    try {
      const url = buildUrl(`${API_ENDPOINTS.OPENSKY}/states/all`, { lamin: min_latitude, lamax: max_latitude, lomin: min_longitude, lomax: max_longitude });
      const data = await fetchJson<OSResponse>(url);
      if (!data.states?.length) return { content: [{ type: "text", text: "No aircraft found in this region." }] };
      let flights = data.states.map(parseState);
      if (on_ground_only) flights = flights.filter(f => f.on_ground);
      const total = flights.length;
      flights = flights.slice(0, limit);
      const output = formatOutput({ total, flights }, () => {
        const rows = flights.map(f => [f.callsign ?? f.icao24, f.origin_country, f.latitude?.toFixed(2) ?? "N/A", f.longitude?.toFixed(2) ?? "N/A", f.altitude_m ? `${f.altitude_m.toFixed(0)}m` : "Ground", f.velocity_ms ? `${(f.velocity_ms*3.6).toFixed(0)} km/h` : "N/A"]);
        return `## Live Flights — [${min_latitude}°–${max_latitude}°N, ${min_longitude}°–${max_longitude}°E]\n**Aircraft tracked:** ${total} | **Timestamp:** ${new Date(data.time*1000).toUTCString()}\n\n${markdownTable(["Callsign","Country","Lat","Lon","Altitude","Speed"], rows)}\n\n*Source: OpenSky Network*`;
      }, response_format);
      return { content: [{ type: "text", text: truncateText(output, CHARACTER_LIMIT) }] };
    } catch (err) {
      return { isError: true, content: [{ type: "text", text: `Error: ${String(err)}` }] };
    }
  });

  server.registerTool("globalpulse_aviation_get_flights_by_country", {
    title: "OpenSky — Live Flights by Country",
    description: `All live airborne flights from a specific country. Args: country (e.g. "India", "Germany", "United States"), limit, response_format`,
    inputSchema: z.object({
      country: z.string().min(2),
      limit: z.number().int().min(1).max(100).default(DEFAULT_LIMIT),
      response_format: z.nativeEnum(ResponseFormat).default(ResponseFormat.MARKDOWN),
    }),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  }, async ({ country, limit, response_format }) => {
    try {
      const data = await fetchJson<OSResponse>(`${API_ENDPOINTS.OPENSKY}/states/all`);
      if (!data.states) return { content: [{ type: "text", text: "No data from OpenSky." }] };
      let flights = data.states.map(parseState).filter(f => f.origin_country.toLowerCase() === country.toLowerCase() && !f.on_ground);
      const total = flights.length;
      if (total === 0) return { content: [{ type: "text", text: `No airborne flights from "${country}". Check spelling matches OpenSky format (e.g. "United States" not "USA").` }] };
      flights = flights.slice(0, limit);
      const output = formatOutput({ country, total, flights }, () => {
        const rows = flights.map(f => [f.callsign ?? f.icao24, f.latitude?.toFixed(2) ?? "N/A", f.longitude?.toFixed(2) ?? "N/A", f.altitude_m ? `${f.altitude_m.toFixed(0)}m` : "N/A", f.velocity_ms ? `${(f.velocity_ms*3.6).toFixed(0)} km/h` : "N/A"]);
        return `## Live ${country} Flights\n**Airborne:** ${total} | **Time:** ${new Date(data.time*1000).toUTCString()}\n\n${markdownTable(["Callsign","Lat","Lon","Altitude","Speed"], rows)}\n\n*Source: OpenSky Network*`;
      }, response_format);
      return { content: [{ type: "text", text: truncateText(output, CHARACTER_LIMIT) }] };
    } catch (err) {
      return { isError: true, content: [{ type: "text", text: `Error: ${String(err)}` }] };
    }
  });
}
