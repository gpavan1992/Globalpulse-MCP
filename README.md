# 🌐 Globalpulse-MCP

[![MCP Registry](https://img.shields.io/badge/MCP_Registry-active-brightgreen)](https://registry.modelcontextprotocol.io/v0.1/servers?search=io.github.gpavan1992/globalpulse-mcp)
[![npm](https://img.shields.io/npm/v/globalpulse-mcp-server)](https://www.npmjs.com/package/globalpulse-mcp-server)
[![Railway](https://img.shields.io/badge/Railway-deployed-blueviolet)](https://globalpulse-mcp-production.up.railway.app/health)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue)](https://github.com/gpavan1992/Globalpulse-MCP)


A [Model Context Protocol](https://modelcontextprotocol.io) server for real-world intelligence — macroeconomics, climate, disasters, trade flows, aviation, and country data. All from globally trusted open APIs with no proprietary subscriptions required.

> Built because no MCP server exists for institutional-grade global data — World Bank, UN, adsb.lol, and ERA5 climate all in one place.

## ⚡ Public Endpoint (no setup required)

MCP endpoint: https://globalpulse-mcp-production.up.railway.app/mcp

Health check: https://globalpulse-mcp-production.up.railway.app/health

---

## Tools (11)

### 🏦 Macroeconomics — World Bank Open Data

| Tool | Description |
|---|---|
| `globalpulse_worldbank_get_indicator` | GDP, inflation, unemployment, trade, debt for any country (1960–present) |
| `globalpulse_worldbank_list_indicators` | List the most useful World Bank indicator codes |

### 🌤️ Climate & Weather — Open-Meteo (no key, no limit)

| Tool | Description |
|---|---|
| `globalpulse_weather_get_forecast` | 7-day daily forecast for any lat/lon on Earth |
| `globalpulse_weather_get_historical` | Historical climate back to 1940 using ERA5 reanalysis |

### 🚨 Disaster Intelligence — UN GDACS

| Tool | Description |
|---|---|
| `globalpulse_disasters_get_active` | Live global disaster alerts (earthquakes, cyclones, floods, volcanoes) |
| `globalpulse_disasters_get_by_country` | Disaster history for a specific country |

### ✈️ Aviation — adsb.lol (fallback: adsb.fi)

| Tool | Description |
|---|---|
| `globalpulse_aviation_get_live_flights` | Live ADS-B flights in a bounding box (converted to circles of up to 250 nm; large boxes are split, max 25 requests) |
| `globalpulse_aviation_get_flights_by_country` | **Approximate** airborne flights registered in India, Germany or the United States, sampled around major hubs (not a national total) |

### 📦 Trade — UN Comtrade

| Tool | Description |
|---|---|
| `globalpulse_trade_get_bilateral_flows` | Bilateral import/export flows by country pair and HS commodity code |

### 🗺️ Country Intelligence — mledoze/countries + World Bank

| Tool | Description |
|---|---|
| `globalpulse_countries_get_profile` | Country profile: capital, population (World Bank), currencies, languages, borders. Accepts name, ISO alpha-2/alpha-3 |
| `globalpulse_countries_get_by_region` | Countries in a region or subregion (e.g. "Asia", "South Asia") sorted by population, area, or name |

---

## Integration

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "🌐 GlobalPulse MCP": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://globalpulse-mcp-production.up.railway.app/mcp"
      ]
    }
  }
}
```

### Cursor / Windsurf
```json

{
  "globalpulse": {
    "command": "npx",
    "args": [
      "mcp-remote",
      "https://globalpulse-mcp-production.up.railway.app/mcp"
    ]
  }
}
```

---

## Example Prompts

Once connected, ask your AI agent:

- *"What was India's GDP trend from 2010 to 2023?"*
- *"Show active Red alert disasters globally right now"*
- *"How many flights are over India at this moment?"*
- *"What's the 7-day weather forecast for Mumbai?"*
- *"Show India–China bilateral trade in 2022"*
- *"What's the historical monsoon rainfall for Chennai June–September 2023?"*
- *"List all South Asian countries by population"*
- *"What currency and languages does Singapore use?"*
- *"Show typhoon history for the Philippines"*
- *"Compare Germany and Japan's unemployment rates 2015–2023"*
- *"What's the trade value of pharmaceutical exports from India to the US?"*
- *"Show me all German aircraft airborne right now"*

---

## Data Sources

| Domain | Source | License | Key Required |
|---|---|---|---|
| Macroeconomics | [World Bank Open Data](https://data.worldbank.org) | CC BY 4.0 | No |
| Weather & Climate | [Open-Meteo](https://open-meteo.com) + ERA5 | CC BY 4.0 | No |
| Disaster Alerts | [UN GDACS](https://www.gdacs.org) | UN Open Data | No |
| Aviation | [adsb.lol](https://adsb.lol) (primary), [adsb.fi](https://adsb.fi) (fallback) | adsb.lol: see its site. adsb.fi: personal, non-commercial use, attribution required | No |
| Trade Flows | [UN Comtrade](https://comtradeplus.un.org) | UN Open Data | No (free tier) |
| Country Data | [mledoze/countries](https://github.com/mledoze/countries) (static list, cached 24 h) | ODbL 1.0 | No |

---

## Notes

- All tools support `response_format: "markdown"` (default) or `"json"` (for agent pipelines)
- Weather coordinates use **decimal degrees** (e.g. `19.076, 72.877` for Mumbai)
- Aviation velocity is displayed as km/h
- UN Comtrade free tier: limited requests/day — use `"TOTAL"` for `commodity_code` for best availability
- Aviation data comes from [adsb.lol](https://adsb.lol), falling back to [adsb.fi](https://adsb.fi) if adsb.lol fails. adsb.fi's terms allow personal, non-commercial use only and require citing adsb.fi with a link — responses name the provider that served them
- Aviation limits: both APIs cap the search radius at 250 nm. adsb.lol reports a quota of about 500 requests per day per IP (`x-ratelimit-limit` header) and returns HTTP 429 when bursts exceed its limit; adsb.fi allows 1 request per second. Each tool call can make several upstream requests (a large box up to 25; by-country at most 6), at most 2 in flight at a time. Results are cached in memory for 60 s per area, so repeat calls cost none. When adsb.lol answers HTTP 429, it is skipped (adsb.fi is used directly) until its `retry-after` elapses, or 10 s if no header is sent; the request that hit the 429 waits and retries once if the `retry-after` is 5 s or less
- `get_flights_by_country` is approximate: ADS-B sources have no per-country query, so it samples circles around major hubs and matches aircraft by ICAO24 address block (registered in that country). Alaska and Hawaii are not covered, and at most 6 hubs are sampled per call, so the United States is flagged as partial coverage (Seattle and Miami are skipped)
- World Bank data lags 1–2 years for some indicators — use `end_year=2022` for best coverage

---

## Roadmap

See [ROADMAP.md](./ROADMAP.md) for the full build plan — Priority 2 (IMF, Copernicus satellite, USGS seismology, Global Forest Watch, OpenAQ, ECB FX rates) and Priority 3 (WHO health, NASA EONET, WTO tariffs, NOAA climate) are documented with tool names, API sources, and business value rationale.

**~29 tools across 16 global APIs planned total.**

---

## Contributing

PRs welcome — especially for Priority 2 tools. Open an issue to claim a tool before starting work.

---

## Privacy

No accounts, and the server stores no user data. See [PRIVACY.md](PRIVACY.md) for what is forwarded to third-party data providers and what hosting logs may contain.

---

## License

MIT — built by [Pavan Kumar Galiveeti](https://www.linkedin.com/in/pavan-kumar-galiveeti-a44335192/)
