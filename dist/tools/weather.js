import { z } from "zod";
import { API_ENDPOINTS, ResponseFormat, CHARACTER_LIMIT } from "../constants.js";
import { fetchJson, buildUrl, truncateText } from "../services/http.js";
import { formatOutput, markdownTable } from "../services/formatters.js";
function celsiusToF(c) {
    if (c === null || c === undefined)
        return "N/A";
    return `${c.toFixed(1)}°C / ${((c * 9) / 5 + 32).toFixed(1)}°F`;
}
function mmToIn(mm) {
    if (mm === null || mm === undefined)
        return "N/A";
    return `${mm.toFixed(1)}mm`;
}
export function registerWeatherTools(server) {
    server.registerTool("globalpulse_weather_get_forecast", {
        title: "Open-Meteo — 7-Day Weather Forecast",
        description: `7-day daily weather forecast for any location. No API key, no rate limit.
Args: latitude, longitude, timezone (IANA e.g. "Asia/Kolkata"), response_format
Examples: Mumbai → lat=19.076, lon=72.877, tz="Asia/Kolkata" | London → lat=51.507, lon=-0.127, tz="Europe/London"`,
        inputSchema: z.object({
            latitude: z.number().min(-90).max(90),
            longitude: z.number().min(-180).max(180),
            timezone: z.string().default("UTC"),
            response_format: z.nativeEnum(ResponseFormat).default(ResponseFormat.MARKDOWN),
        }),
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    }, async ({ latitude, longitude, timezone, response_format }) => {
        try {
            const url = buildUrl(`${API_ENDPOINTS.OPEN_METEO}/forecast`, {
                latitude, longitude, timezone, forecast_days: 7,
                daily: "temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,uv_index_max",
            });
            const data = await fetchJson(url);
            const daily = data.daily ?? {};
            const dates = daily["time"] ?? [];
            const output = formatOutput({ latitude, longitude, timezone, forecast: daily }, () => {
                const rows = dates.map((date, i) => [
                    date,
                    celsiusToF(daily["temperature_2m_max"]?.[i]),
                    celsiusToF(daily["temperature_2m_min"]?.[i]),
                    mmToIn(daily["precipitation_sum"]?.[i]),
                    `${daily["windspeed_10m_max"]?.[i] ?? "N/A"} km/h`,
                    String(daily["uv_index_max"]?.[i] ?? "N/A"),
                ]);
                return `## 7-Day Forecast — ${latitude.toFixed(2)}, ${longitude.toFixed(2)} (${timezone})\n\n${markdownTable(["Date", "Max Temp", "Min Temp", "Precipitation", "Wind", "UV"], rows)}\n\n*Source: Open-Meteo (open-meteo.com)*`;
            }, response_format);
            return { content: [{ type: "text", text: truncateText(output, CHARACTER_LIMIT) }] };
        }
        catch (err) {
            return { isError: true, content: [{ type: "text", text: `Error: ${String(err)}` }] };
        }
    });
    server.registerTool("globalpulse_weather_get_historical", {
        title: "Open-Meteo — Historical Climate (ERA5, back to 1940)",
        description: `Historical daily climate data for any location, back to 1940 using ERA5 reanalysis. No API key.
Args: latitude, longitude, start_date (YYYY-MM-DD), end_date (YYYY-MM-DD), timezone, response_format`,
        inputSchema: z.object({
            latitude: z.number().min(-90).max(90),
            longitude: z.number().min(-180).max(180),
            start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
            end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
            timezone: z.string().default("UTC"),
            response_format: z.nativeEnum(ResponseFormat).default(ResponseFormat.MARKDOWN),
        }),
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    }, async ({ latitude, longitude, start_date, end_date, timezone, response_format }) => {
        try {
            const url = buildUrl(`${API_ENDPOINTS.OPEN_METEO_ARCHIVE}/archive`, {
                latitude, longitude, start_date, end_date, timezone,
                daily: "temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max",
            });
            const data = await fetchJson(url);
            const daily = data.daily ?? {};
            const dates = daily["time"] ?? [];
            if (dates.length === 0)
                return { content: [{ type: "text", text: `No data found for ${start_date}→${end_date}. Earliest available: 1940-01-01.` }] };
            const display = dates.slice(0, 30);
            const maxT = daily["temperature_2m_max"] ?? [];
            const minT = daily["temperature_2m_min"] ?? [];
            const prec = daily["precipitation_sum"] ?? [];
            const output = formatOutput({ latitude, longitude, period: { start_date, end_date }, daily }, () => {
                const rows = display.map((date, i) => [date, celsiusToF(maxT[i] ?? null), celsiusToF(minT[i] ?? null), mmToIn(prec[i] ?? null), `${daily["windspeed_10m_max"]?.[i] ?? 'N/A'} km/h`]);
                const note = dates.length > 30 ? `\n\n*Showing first 30 of ${dates.length} days.*` : "";
                return `## Historical Climate — ${latitude.toFixed(2)}, ${longitude.toFixed(2)}\n**Period:** ${start_date} → ${end_date}\n\n${markdownTable(["Date", "Max Temp", "Min Temp", "Precipitation", "Wind"], rows)}${note}\n\n*Source: Open-Meteo ERA5*`;
            }, response_format);
            return { content: [{ type: "text", text: truncateText(output, CHARACTER_LIMIT) }] };
        }
        catch (err) {
            return { isError: true, content: [{ type: "text", text: `Error: ${String(err)}` }] };
        }
    });
}
