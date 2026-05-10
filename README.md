# 🌐 Globalpulse-MCP

A [Model Context Protocol](https://modelcontextprotocol.io) server for real-world intelligence — macroeconomics, climate, disasters, trade flows, aviation, and country data. All from globally trusted open APIs with no proprietary subscriptions required.

> Built because no MCP server exists for institutional-grade global data — World Bank, UN, OpenSky, and ERA5 climate all in one place.

## ⚡ Public Endpoint (no setup required)

Health check: `https://globalpulse-mcp-production.up.railway.app/health`

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

### ✈️ Aviation — OpenSky Network

| Tool | Description |
|---|---|
| `globalpulse_aviation_get_live_flights` | Live ADS-B flights in any geographic bounding box |
| `globalpulse_aviation_get_flights_by_country` | All airborne flights from a specific country right now |

### 📦 Trade — UN Comtrade

| Tool | Description |
|---|---|
| `globalpulse_trade_get_bilateral_flows` | Bilateral import/export flows by country pair and HS commodity code |

### 🗺️ Country Intelligence — REST Countries

| Tool | Description |
|---|---|
| `globalpulse_countries_get_profile` | Full country profile: capital, population, currencies, languages, borders |
| `globalpulse_countries_get_by_region` | All countries in a region sorted by population, area, or name |

---

## Integration

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

\`\`\`json
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
\`\`\`

### Cursor / Windsurf

\`\`\`json
{
  "globalpulse": {
    "command": "npx",
    "args": [
      "mcp-remote",
      "https://globalpulse-mcp-production.up.railway.app/mcp"
    ]
  }
}
\`\`\`

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
| Aviation | [OpenSky Network](https://opensky-network.org) | ODbL | No (free tier) |
| Trade Flows | [UN Comtrade](https://comtradeplus.un.org) | UN Open Data | No (free tier) |
| Country Data | [REST Countries](https://restcountries.com) | MPL 2.0 | No |

---

## Notes

- All tools support `response_format: "markdown"` (default) or `"json"` (for agent pipelines)
- Weather coordinates use **decimal degrees** (e.g. `19.076, 72.877` for Mumbai)
- Aviation velocity is displayed as km/h
- UN Comtrade free tier: limited requests/day — use `"TOTAL"` for `commodity_code` for best availability
- OpenSky free tier: ~400 requests/day for anonymous access
- World Bank data lags 1–2 years for some indicators — use `end_year=2022` for best coverage

---

## Roadmap

See [ROADMAP.md](./ROADMAP.md) for the full build plan — Priority 2 (IMF, Copernicus satellite, USGS seismology, Global Forest Watch, OpenAQ, ECB FX rates) and Priority 3 (WHO health, NASA EONET, WTO tariffs, NOAA climate) are documented with tool names, API sources, and business value rationale.

**~29 tools across 16 global APIs planned total.**

---

## Contributing

PRs welcome — especially for Priority 2 tools. Open an issue to claim a tool before starting work.

---

## License

MIT — built by [Pavan Kumar Galiveeti](https://www.linkedin.com/in/pavan-kumar-galiveeti-a44335192/)
