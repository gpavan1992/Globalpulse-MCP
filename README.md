<p align="center">
  <img src="assets/readme/hero.svg" alt="GlobalPulse MCP. Live public data for your AI assistant: 11 read-only tools, no key, no account. A Mumbai 7-day maximum temperature line is drawn from Open-Meteo data while three safeguards appear: country codes mapped, approximate results marked, data year shown." width="100%">
</p>

<p align="center">
  <a href="https://registry.modelcontextprotocol.io/v0.1/servers?search=io.github.gpavan1992/globalpulse-mcp"><img src="https://img.shields.io/badge/MCP_Registry-active-38BDF8?style=flat" alt="MCP Registry" height="20"></a>
  &nbsp;
  <a href="https://www.npmjs.com/package/globalpulse-mcp-server"><img src="https://img.shields.io/npm/v/globalpulse-mcp-server?style=flat&color=38BDF8" alt="npm" height="20"></a>
  &nbsp;
  <a href="https://globalpulse-mcp-production.up.railway.app/health"><img src="https://img.shields.io/badge/Railway-deployed-38BDF8?style=flat" alt="Railway" height="20"></a>
  &nbsp;
  <img src="https://img.shields.io/badge/tools-11-38BDF8?style=flat" alt="11 tools" height="20">
  &nbsp;
  <img src="https://img.shields.io/badge/API_keys-none-38BDF8?style=flat" alt="No API keys" height="20">
  &nbsp;
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-38BDF8?style=flat" alt="MIT license" height="20"></a>
</p>

<p align="center">
  Open-source, read-only MCP server for ChatGPT, Claude and other AI clients.<br>
  Macroeconomics, weather, disasters, trade flows, aviation and country data,<br>
  from public sources, with no setup, no account and no API key.
</p>

<p align="center">
  <a href="#quick-start"><b>Quick start</b></a>
  &nbsp;&nbsp;&nbsp;
  <a href="#the-eleven-tools"><b>Tools</b></a>
  &nbsp;&nbsp;&nbsp;
  <a href="#see-it-work"><b>See it work</b></a>
  &nbsp;&nbsp;&nbsp;
  <a href="#how-a-number-gets-checked"><b>How it works</b></a>
  &nbsp;&nbsp;&nbsp;
  <a href="#data-sources"><b>Data sources</b></a>
  &nbsp;&nbsp;&nbsp;
  <a href="#privacy-and-safety"><b>Privacy</b></a>
</p>

> [!NOTE]
> GlobalPulse is an independent open-source project by an individual developer. It is not affiliated with, endorsed by or maintained by OpenAI, Anthropic, the World Bank, the United Nations, Open-Meteo, adsb.lol or any other data provider. Those names are used only to describe what the server connects to.
>
> Data is informational only. It is not a substitute for official alerts, financial advice or professional judgment.

## Does it actually work?

Public data APIs fail quietly. While building GlobalPulse against live sources, each of these came up, and each one could have produced a plausible-looking answer:

<p align="center">
  <img src="assets/readme/traps.svg" alt="Five things that looked right. Comtrade needs M49 codes, so India is mapped to 699, not ISO 356. The REST Countries API went offline, so a static cached list plus World Bank population is used. Flights by country are marked approximate with hub sampling. Upstream timeouts are retried once and then return a clear error. World Bank values show their data year." width="100%">
</p>

<details>
<summary><b>The same five, as a table</b></summary>

| What went wrong | What GlobalPulse does |
|---|---|
| UN Comtrade expects M49 country codes, not ISO. India is `699`, not `356` | Maps country names and ISO codes to M49 before calling |
| The public REST Countries API went offline | Country data now comes from a static, cached [mledoze/countries](https://github.com/mledoze/countries) list, with population from the World Bank |
| ADS-B sources have no "flights by country" query | The tool says its count is **approximate**, samples major hubs and flags partial coverage |
| Upstream APIs time out or return an error page | Retries once, caps the wait, and returns a clear error instead of a made-up number |
| World Bank indicators lag by 1–2 years | The data year is always shown next to the value |

</details>

The rule is the same everywhere: **retry, flag or refuse. Never guess.**

## What this is

A [Model Context Protocol](https://modelcontextprotocol.io) server with 11 tools in six areas. You ask in plain language, and the AI client picks the tool, fetches the data and explains the result.

The public server runs on Railway at:

```
https://globalpulse-mcp-production.up.railway.app/mcp
```

Health check: <https://globalpulse-mcp-production.up.railway.app/health>

No account, no login, no API key. The server is read-only and stateless: each request is handled on its own and no user data is stored.

## See it work

One prompt in ChatGPT asks for an "India Morning Intelligence Brief". ChatGPT calls GlobalPulse tools for World Bank figures, a Mumbai 7-day forecast, disaster alerts and a country profile, then shows which tool returned each dataset.

<p align="center">
  <a href="https://vimeo.com/1249076180"><img src="assets/demo/poster.png" alt="Play the 1-minute GlobalPulse demo in ChatGPT: a live India briefing built from GlobalPulse tool calls" width="100%"></a>
</p>

▶️ **[Watch the full ChatGPT demo (1 min)](https://vimeo.com/1249076180)**

Three moments from it:

<p align="center">
  <img src="assets/demo/ask-live-briefing.gif" alt="You ask ChatGPT for an India briefing and tell it to use the connected GlobalPulse tools instead of general knowledge. ChatGPT then calls the World Bank, weather, disaster and country tools." width="100%">
</p>

<p align="center">
  <img src="assets/demo/brief-from-live-data.gif" alt="The briefing fills in from live data: a table of Mumbai's 7-day forecast and a chart of daily maximum and minimum temperatures from Open-Meteo." width="100%">
</p>

<details>
<summary><b>One more: every dataset is traceable</b></summary>

<p align="center">
  <img src="assets/demo/every-dataset-traceable.gif" alt="A provenance table maps each section of the briefing to the GlobalPulse tool that returned it, such as worldbank_get_indicator and weather_get_forecast, and flags caveats like annual figures that are not real-time." width="100%">
</p>

</details>

*Recorded on 22 Nov 2026 with unedited tool output. Indicators, weather and alerts are live public data.*

**Claude.** The same server works in Claude as a custom connector (see [Quick start](#quick-start)).

<!-- TODO: add a fresh Claude demo here when recorded:
▶️ **[Watch the Claude demo](PASTE_LINK_HERE)**
-->

## Quick start

### What you need

Nothing to install for ChatGPT or Claude: you add the public URL. For desktop editors you need Node.js 18 or newer.

### ChatGPT

1. Open ChatGPT **Settings → Apps** (or Connectors) and add a custom MCP server in developer mode.
2. Paste `https://globalpulse-mcp-production.up.railway.app/mcp`.
3. Ask a question, for example *"Build me an India morning brief: GDP, inflation, Mumbai forecast and active disasters."*

### Claude

1. Open **Settings → Connectors → Add custom connector**.
2. Paste `https://globalpulse-mcp-production.up.railway.app/mcp`.
3. Ask the same question.

### Claude Desktop (config file)

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "GlobalPulse MCP": {
      "command": "npx",
      "args": ["mcp-remote", "https://globalpulse-mcp-production.up.railway.app/mcp"]
    }
  }
}
```

### Cursor / Windsurf

```json
{
  "globalpulse": {
    "command": "npx",
    "args": ["mcp-remote", "https://globalpulse-mcp-production.up.railway.app/mcp"]
  }
}
```

### Example prompts

- *"What was India's GDP trend from 2010 to 2023?"*
- *"Show active Red alert disasters globally right now"*
- *"What's the 7-day weather forecast for Mumbai?"*
- *"Show India–China bilateral trade in 2022"*
- *"What's the historical monsoon rainfall for Chennai June–September 2023?"*
- *"List all South Asian countries by population"*
- *"Compare Germany and Japan's unemployment rates 2015–2023"*
- *"Show typhoon history for the Philippines"*

## The eleven tools

<p align="center">
  <img src="assets/readme/tools.svg" alt="Eleven tools in six areas. Macroeconomics from the World Bank: worldbank_get_indicator and worldbank_list_indicators. Climate and weather from Open-Meteo: weather_get_forecast and weather_get_historical. Disasters from UN GDACS: disasters_get_active and disasters_get_by_country. Aviation from adsb.lol, approximate by country: aviation_get_live_flights and aviation_get_flights_by_country. Trade from UN Comtrade: trade_get_bilateral_flows. Countries from mledoze/countries and the World Bank: countries_get_profile and countries_get_by_region." width="100%">
</p>

### 🏦 Macroeconomics: World Bank Open Data

| Tool | What it does |
|---|---|
| `globalpulse_worldbank_get_indicator` | GDP, inflation, unemployment, trade, debt for any country (1960–present) |
| `globalpulse_worldbank_list_indicators` | The most useful World Bank indicator codes |

### 🌤️ Climate and weather: Open-Meteo

| Tool | What it does |
|---|---|
| `globalpulse_weather_get_forecast` | 7-day daily forecast for any latitude and longitude |
| `globalpulse_weather_get_historical` | Historical climate back to 1940 (ERA5 reanalysis) |

### 🚨 Disasters: UN GDACS

| Tool | What it does |
|---|---|
| `globalpulse_disasters_get_active` | Live global alerts: earthquakes, cyclones, floods, volcanoes |
| `globalpulse_disasters_get_by_country` | Disaster history for one country |

### ✈️ Aviation: adsb.lol

| Tool | What it does |
|---|---|
| `globalpulse_aviation_get_live_flights` | Live ADS-B flights in a bounding box (split into circles of up to 250 nm, max 25 requests) |
| `globalpulse_aviation_get_flights_by_country` | **Approximate** airborne flights registered in India, Germany or the United States, sampled around major hubs. Not a national total |

### 📦 Trade: UN Comtrade

| Tool | What it does |
|---|---|
| `globalpulse_trade_get_bilateral_flows` | Bilateral import and export flows by country pair and HS commodity code |

### 🗺️ Countries: mledoze/countries + World Bank

| Tool | What it does |
|---|---|
| `globalpulse_countries_get_profile` | Capital, population, currencies, languages and borders. Accepts a name or ISO alpha-2/alpha-3 code |
| `globalpulse_countries_get_by_region` | Countries in a region or subregion, sorted by population, area or name |

All tools accept `response_format: "markdown"` (default) or `"json"` for agent pipelines.

## How a number gets checked

<p align="center">
  <img src="assets/readme/how.svg" alt="How a number gets checked, in five steps. You ask. Names and ISO codes are resolved and the data is fetched from one named public source. A timeout is retried once with a capped wait. Approximate results and coverage gaps are labelled. The answer shows the value, its source and its data year." width="100%">
</p>

1. **Resolve the input.** Country names and ISO codes are mapped to what each source expects (for example M49 for UN Comtrade).
2. **Fetch from the primary source.** Each tool calls one named public provider. There is no scraped or paid data.
3. **Retry once, then say so.** Timeouts and upstream errors are retried with a capped wait. If it still fails, the tool returns a clear error.
4. **Label what is approximate.** Aviation by country is marked approximate, and coverage gaps are named.
5. **Show the provenance.** Responses carry the source and data year, and aviation responses carry the adsb.lol ODbL attribution.

## Data sources

| Domain | Source | License | Key required |
|---|---|---|---|
| Macroeconomics | [World Bank Open Data](https://data.worldbank.org) | CC BY 4.0 | No |
| Weather and climate | [Open-Meteo](https://open-meteo.com) + ERA5 | CC BY 4.0 | No |
| Disaster alerts | [UN GDACS](https://www.gdacs.org) | UN Open Data | No |
| Aviation | [adsb.lol](https://adsb.lol) | [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/), attribution required | No |
| Trade flows | [UN Comtrade](https://comtradeplus.un.org) | UN Open Data | No (free tier) |
| Country data | [mledoze/countries](https://github.com/mledoze/countries) (static list, cached 24 h) | ODbL 1.0 | No |

<details>
<summary><b>Notes and limits</b></summary>

- Weather coordinates use decimal degrees (for example `19.076, 72.877` for Mumbai). Aviation velocity is shown in km/h.
- UN Comtrade's free tier has a daily request limit. Use `"TOTAL"` for `commodity_code` for the best availability.
- World Bank data lags 1–2 years for some indicators. Use `end_year=2022` for the best coverage.
- Aviation data comes from adsb.lol under the ODbL 1.0. [adsb.fi](https://adsb.fi) can be enabled as a fallback in your own deployment with `ADSBFI_ENABLED=true` (default `false`, and off on the public server). Its terms allow personal, non-commercial use only and require attribution, so check them first.
- adsb.lol caps the search radius at 250 nm, reports a quota of about 500 requests per day per IP, and returns HTTP 429 when bursts exceed its limit. Each tool call can make several upstream requests, at most 2 in flight at a time. Results are cached in memory for 60 s per area. While adsb.lol is rate-limited, areas with a cached result (up to 15 minutes old) are served from the cache and flagged in the output. Otherwise the tool returns "temporarily rate-limited, retry in N s".
- `get_flights_by_country` samples circles around major hubs and matches aircraft by ICAO24 address block. Alaska and Hawaii are not covered, at most 6 hubs are sampled per call, and the United States is flagged as partial coverage.

</details>

## Privacy and safety

| Control | Status |
|---|---|
| Read-only: no orders, transfers, trades or writes to third-party systems | ✅ |
| No accounts, logins, passwords or API keys requested | ✅ |
| Stateless: the server stores no user data | ✅ |
| Open source: every line auditable | ✅ |
| Tool descriptions contain no instructions about model behavior | ✅ |
| Hosting logs | ○ The host (Railway) may keep standard request logs, see [PRIVACY.md](PRIVACY.md) |
| Data-source guarantees | ○ Public endpoints that can change, lag or go down without notice |

[PRIVACY.md](PRIVACY.md) lists what is forwarded to third-party data providers. Use of the public server is subject to [TERMS.md](TERMS.md).

## Is this for you?

**Good fit if you** want an AI assistant to answer questions with live public data (economics, weather, disasters, trade, flights, countries), want to see which tool and source produced each number, and want something free that needs no signup.

**Not a fit if you** need real-time safety alerts, investment or trading advice, an exact national flight count, or guaranteed uptime for a business-critical workflow.

## Roadmap

- ✅ **v1.0** 11 tools across six public data sources, public Railway endpoint, MCP Registry and npm listing
- ⏳ **Directories** Submission to the ChatGPT and Claude connector directories
- [ ] Rate limiting and response caching on the public server
- [ ] Priority 2 tools: IMF, Copernicus, USGS seismology, Global Forest Watch, OpenAQ, ECB FX rates
- [ ] Priority 3 tools: WHO health, NASA EONET, WTO tariffs, NOAA climate

See [ROADMAP.md](ROADMAP.md) for the full plan. *Roadmap items are intentions, not commitments.*

## File structure

<details>
<summary>Show the repository layout</summary>

```
Globalpulse-MCP/
├── src/
│   ├── index.ts               # Express server, /mcp, /health
│   ├── constants.ts
│   ├── types.ts
│   ├── services/              # API clients (adsb.lol, World Bank, Comtrade, ...)
│   └── tools/                 # one module per tool area
├── assets/                    # icon; readme/ diagrams; demo/ GIFs and video poster
├── .github/                   # issue and pull request templates
├── server.json                # MCP Registry manifest
├── package.json
├── PRIVACY.md
├── TERMS.md
├── SECURITY.md
├── CONTRIBUTING.md
├── CHANGELOG.md
├── ROADMAP.md
└── LICENSE
```

</details>

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Report vulnerabilities privately as described in [SECURITY.md](SECURITY.md). PRs are welcome, especially for Priority 2 tools. Open an issue to claim a tool before starting. The most useful report is a **data trap**: a result that looked right and was not.

```bash
npm install
npm run build
TRANSPORT=http npm start    # http://localhost:3000/mcp (default transport is stdio)
```

## Built by

**Pavan Kumar Galiveeti**, a product leader building AI products, built in public with [Claude](https://claude.com) as pair programmer. Feedback is welcome on [LinkedIn](https://www.linkedin.com/in/pavan-kumar-galiveeti-a44335192/) or in [issues](https://github.com/gpavan1992/Globalpulse-MCP/issues).

## License

[MIT](LICENSE). Free to use, modify and redistribute, including commercially. Keep the copyright notice.

<p align="center">
  <img src="assets/icon.png" alt="GlobalPulse" width="64"><br>
  <sub>Data comes from public sources that can be wrong or delayed. Verify before you act.</sub>
</p>
