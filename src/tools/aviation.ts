import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ResponseFormat, CHARACTER_LIMIT, DEFAULT_LIMIT } from "../constants.js";
import { truncateText } from "../services/http.js";
import { formatOutput, markdownTable } from "../services/formatters.js";
import {
  adsbFiEnabled, MAX_TILES, MAX_RADIUS_NM, MAX_COUNTRY_TILES, COUNTRIES, boxToCircles, fetchCircles, toFlightState, attribution, findCountry, inIcaoBlock,
} from "../services/adsb.js";

const fmtAlt = (m: number | null, ground: boolean): string => (ground ? "Ground" : m === null ? "N/A" : `${m.toFixed(0)}m`);
const fmtSpeed = (ms: number | null): string => (ms === null ? "N/A" : `${(ms * 3.6).toFixed(0)} km/h`);
const fmtPos = (n: number | null): string => (n === null ? "N/A" : n.toFixed(2));

export function registerAviationTools(server: McpServer): void {
  server.registerTool("globalpulse_aviation_get_live_flights", {
    title: "Get Live Flights",
    description: `Live ADS-B flight tracking for a geographic bounding box. Real-time position, altitude, speed, heading, registration and aircraft type.
Data: ${adsbFiEnabled() ? "adsb.lol (primary), adsb.fi (fallback)" : "adsb.lol (ODbL 1.0)"}. The box is converted to a centre point + radius; boxes wider than ${MAX_RADIUS_NM} nm are split into several circles (one upstream request each, at most ${MAX_TILES}). Results are cached for 60 s per area, so repeat calls cost no upstream requests. A whole-country box can use ~25 requests of a shared daily quota.
Args: min_latitude, max_latitude, min_longitude, max_longitude (min must be <= max; boxes crossing the antimeridian are not supported), limit, on_ground_only, response_format
Examples: Delhi area: min_lat=26.5, max_lat=30.5, min_lon=75, max_lon=79 | Germany: min_lat=47, max_lat=55.1, min_lon=5.8, max_lon=15.1`,
    inputSchema: z.object({
      min_latitude: z.number().min(-90).max(90),
      max_latitude: z.number().min(-90).max(90),
      min_longitude: z.number().min(-180).max(180),
      max_longitude: z.number().min(-180).max(180),
      limit: z.number().int().min(1).max(100).default(DEFAULT_LIMIT),
      on_ground_only: z.boolean().default(false),
      response_format: z.nativeEnum(ResponseFormat).default(ResponseFormat.MARKDOWN),
    }),
    annotations: { title: "Get Live Flights", readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  }, async ({ min_latitude, max_latitude, min_longitude, max_longitude, limit, on_ground_only, response_format }) => {
    try {
      if (min_latitude > max_latitude || min_longitude > max_longitude) {
        return { isError: true, content: [{ type: "text", text: "Error: min_latitude/min_longitude must not exceed max_latitude/max_longitude (boxes crossing the antimeridian are not supported)." }] };
      }
      const circles = boxToCircles(min_latitude, max_latitude, min_longitude, max_longitude);
      if (circles.length > MAX_TILES) {
        return { isError: true, content: [{ type: "text", text: `Error: this box needs ${circles.length} upstream requests (max ${MAX_TILES}). Use a smaller box.` }] };
      }
      const res = await fetchCircles(circles);
      let flights = res.aircraft
        .filter(a => a.lat !== undefined && a.lon !== undefined
          && a.lat >= min_latitude && a.lat <= max_latitude && a.lon >= min_longitude && a.lon <= max_longitude)
        .map(a => toFlightState(a, res.nowMs));
      if (on_ground_only) flights = flights.filter(f => f.on_ground);
      const total = flights.length;
      if (total === 0 && res.failedTiles === 0) return { content: [{ type: "text", text: "No aircraft found in this region." }] };
      flights = flights.slice(0, limit);
      const output = formatOutput({ total, flights, tiles: res.tiles, upstream_requests: res.requests, cached_tiles: res.cachedTiles, failed_tiles: res.failedTiles, sources: res.providers }, () => {
        const rows = flights.map(f => [f.callsign ?? f.icao24, f.registration ?? "N/A", f.aircraft_type ?? "N/A", fmtPos(f.latitude), fmtPos(f.longitude), fmtAlt(f.altitude_m, f.on_ground), fmtSpeed(f.velocity_ms)]);
        const stale = res.staleTiles ? `\n⚠️ adsb.lol is temporarily rate-limited: ${res.staleTiles} of ${res.tiles} areas show cached data up to ${res.staleAgeSec} s old.\n` : "";
        const warn = stale + (res.failedTiles ? `\n⚠️ ${res.failedTiles} of ${res.tiles} area requests failed, so results are incomplete. Cause: ${res.failures[0]}\n` : "");
        return `## Live Flights — [${min_latitude}°–${max_latitude}°N, ${min_longitude}°–${max_longitude}°E]\n**Aircraft tracked:** ${total} | **Timestamp:** ${new Date(res.nowMs).toUTCString()} | **Upstream requests:** ${res.requests} (${res.cachedTiles} of ${res.tiles} areas served from cache)\n${warn}\n${markdownTable(["Callsign", "Reg", "Type", "Lat", "Lon", "Altitude", "Speed"], rows)}\n\n${attribution(res.providers)}`;
      }, response_format);
      return { content: [{ type: "text", text: truncateText(output, CHARACTER_LIMIT) }] };
    } catch (err) {
      return { isError: true, content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }] };
    }
  });

  server.registerTool("globalpulse_aviation_get_flights_by_country", {
    title: "Get Flights by Country",
    description: `APPROXIMATE live airborne flights registered in a country. Supported: India, Germany, United States (also IN, DE, US, USA).
ADS-B sources have no per-country query, so this samples ${MAX_RADIUS_NM} nm circles around major hubs and keeps aircraft whose ICAO24 address belongs to that country's allocated block (i.e. registered there, wherever they are inside the sampled areas). Hubs — India: Delhi, Mumbai, Bengaluru, Chennai, Kolkata, Hyderabad; Germany: Frankfurt, Munich, Berlin, Hamburg; United States: New York, Atlanta, Chicago, Dallas, Denver, Los Angeles, Seattle, Miami (Alaska and Hawaii not covered).
At most ${MAX_COUNTRY_TILES} hubs are sampled per call, so the United States is flagged "partial coverage" (the last two hubs, Seattle and Miami, are skipped). Counts are partial, not a national total, and aircraft far from the sampled hubs are missed.
Each call makes at most ${MAX_COUNTRY_TILES} upstream requests against adsb.lol${adsbFiEnabled() ? " (fallback adsb.fi)" : ""}; results are cached for 60 s, so repeat calls cost none.
Args: country, limit, response_format`,
    inputSchema: z.object({
      country: z.string().min(2),
      limit: z.number().int().min(1).max(100).default(DEFAULT_LIMIT),
      response_format: z.nativeEnum(ResponseFormat).default(ResponseFormat.MARKDOWN),
    }),
    annotations: { title: "Get Flights by Country", readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  }, async ({ country, limit, response_format }) => {
    try {
      const cfg = findCountry(country);
      if (!cfg) {
        return { content: [{ type: "text", text: `Country "${country}" is not supported. Supported: ${COUNTRIES.map(c => c.name).join(", ")}.` }] };
      }
      const hubs = cfg.hubs.slice(0, MAX_COUNTRY_TILES);
      const skipped = cfg.hubs.slice(MAX_COUNTRY_TILES).map(h => h.name);
      const capped = skipped.length > 0;
      const res = await fetchCircles(hubs.map(h => ({ lat: h.lat, lon: h.lon, radius_nm: MAX_RADIUS_NM })));
      let flights = res.aircraft
        .filter(a => inIcaoBlock(a.hex, cfg.icao) && a.alt_baro !== "ground" && a.lat !== undefined && a.lon !== undefined)
        .map(a => toFlightState(a, res.nowMs));
      const total = flights.length;
      if (total === 0 && res.failedTiles === 0) {
        return { content: [{ type: "text", text: `No airborne ${cfg.name}-registered aircraft found around ${hubs.map(h => h.name).join(", ")}.${capped ? ` Partial coverage: ${skipped.join(", ")} not sampled.` : ""}` }] };
      }
      flights = flights.slice(0, limit);
      const output = formatOutput({ country: cfg.name, approximate: true, partial_coverage: capped, sampled_hubs: hubs.map(h => h.name), hubs_not_sampled: skipped, total, flights, tiles: res.tiles, upstream_requests: res.requests, cached_tiles: res.cachedTiles, failed_tiles: res.failedTiles, sources: res.providers }, () => {
        const rows = flights.map(f => [f.callsign ?? f.icao24, f.registration ?? "N/A", f.aircraft_type ?? "N/A", fmtPos(f.latitude), fmtPos(f.longitude), fmtAlt(f.altitude_m, false), fmtSpeed(f.velocity_ms)]);
        const cap = capped ? `\n⚠️ **Partial coverage:** only the first ${hubs.length} of ${cfg.hubs.length} hubs are sampled per call (not sampled: ${skipped.join(", ")}).\n` : "";
        const stale = res.staleTiles ? `\n⚠️ adsb.lol is temporarily rate-limited: ${res.staleTiles} of ${res.tiles} hubs show cached data up to ${res.staleAgeSec} s old.\n` : "";
        const warn = cap + stale + (res.failedTiles ? `\n⚠️ ${res.failedTiles} of ${res.tiles} hub requests failed, so results are even less complete. Cause: ${res.failures[0]}\n` : "");
        return `## Live ${cfg.name} Flights (approximate)\n**Airborne ${cfg.name}-registered aircraft found:** ${total} | **Time:** ${new Date(res.nowMs).toUTCString()}\n*Sampled ${res.tiles} circles (${MAX_RADIUS_NM} nm) around ${hubs.map(h => h.name).join(", ")}; not a national total. Upstream requests: ${res.requests} (${res.cachedTiles} of ${res.tiles} from cache).*\n${warn}\n${markdownTable(["Callsign", "Reg", "Type", "Lat", "Lon", "Altitude", "Speed"], rows)}\n\n${attribution(res.providers)}`;
      }, response_format);
      return { content: [{ type: "text", text: truncateText(output, CHARACTER_LIMIT) }] };
    } catch (err) {
      return { isError: true, content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }] };
    }
  });
}
