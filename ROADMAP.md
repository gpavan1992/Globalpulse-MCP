# GlobalPulse MCP — Roadmap

This document tracks all planned tools across the three build tiers. Priority 1 is live. Priority 2 and 3 are in development.

---

## ✅ Priority 1 — Core Tier (Live, 11 tools)

Foundation layer: the highest-signal, no-key-required APIs with global institutional trust.

| # | Tool | API Source | Domain | Status |
|---|---|---|---|---|
| 1 | `globalpulse_worldbank_get_indicator` | World Bank Open Data | Macroeconomics | ✅ Live |
| 2 | `globalpulse_worldbank_list_indicators` | World Bank Open Data | Macroeconomics | ✅ Live |
| 3 | `globalpulse_weather_get_forecast` | Open-Meteo | Climate | ✅ Live |
| 4 | `globalpulse_weather_get_historical` | Open-Meteo ERA5 | Climate | ✅ Live |
| 5 | `globalpulse_disasters_get_active` | UN GDACS | Disaster Intelligence | ✅ Live |
| 6 | `globalpulse_disasters_get_by_country` | UN GDACS | Disaster Intelligence | ✅ Live |
| 7 | `globalpulse_aviation_get_live_flights` | OpenSky Network | Aviation | ✅ Live |
| 8 | `globalpulse_aviation_get_flights_by_country` | OpenSky Network | Aviation | ✅ Live |
| 9 | `globalpulse_trade_get_bilateral_flows` | UN Comtrade | Trade | ✅ Live |
| 10 | `globalpulse_countries_get_profile` | REST Countries | Country Intelligence | ✅ Live |
| 11 | `globalpulse_countries_get_by_region` | REST Countries | Country Intelligence | ✅ Live |

---

## 🔵 Priority 2 — Differentiation Tier (Planned, ~10 tools)

What makes GlobalPulse remarkable. Satellite data, sovereign risk, air quality, ESG compliance — personas no existing MCP server serves.

### IMF Data API
*Sovereign risk, balance of payments, fiscal stance for 190 IMF member countries.*

| Tool | Description |
|---|---|
| `globalpulse_imf_get_indicator` | Fetch IMF indicator: balance of payments, FX reserves, current account, debt-to-GDP |
| `globalpulse_imf_list_indicators` | List available IMF datasets and indicator codes |

**Why:** World Bank covers development metrics; IMF covers fiscal and monetary health. Together they give a complete sovereign risk picture — essential for legal, insurance, and investment teams.

---

### Copernicus Emergency Management Service (EU Satellite)
*EU satellite-derived disaster maps: flood extent, wildfire perimeters, earthquake damage assessment.*

| Tool | Description |
|---|---|
| `globalpulse_copernicus_get_activations` | List active Copernicus EMS disaster activations with satellite map links |
| `globalpulse_copernicus_get_activation_detail` | Full detail for a specific activation: affected area, damage grade, product links |

**Why:** No other MCP server touches satellite emergency data. Copernicus EMS is used by EU civil protection, humanitarian agencies, and insurance underwriters. Critical for ESG due diligence and supply chain risk.

---

### USGS Earthquake Catalog
*Real-time and historical seismic data — M2.5+ events globally, updated every minute.*

| Tool | Description |
|---|---|
| `globalpulse_seismic_get_recent` | Recent earthquakes by magnitude threshold, region, and time window |
| `globalpulse_seismic_get_by_region` | Historical seismic activity for a bounding box and date range |

**Why:** Pairs with GDACS for comprehensive geohazard intelligence. Construction, insurance, and infrastructure sectors need this routinely. USGS data is the global gold standard.

---

### Global Forest Watch (WRI)
*Near-real-time deforestation alerts at 30m resolution — critical for EUDR and CSRD compliance.*

| Tool | Description |
|---|---|
| `globalpulse_forests_get_alerts` | GLAD deforestation alerts by country or subnational unit |
| `globalpulse_forests_get_country_summary` | Forest cover change summary for a country over a date range |

**Why:** The EU Deforestation Regulation (EUDR) came into force in 2024 — companies importing soy, palm oil, cattle, cocoa, coffee, wood, rubber must prove deforestation-free supply chains. This is a direct compliance tool.

---

### OpenAQ — Air Quality
*PM2.5, PM10, NO₂, O₃, CO from 30,000+ government monitoring stations across 100+ countries.*

| Tool | Description |
|---|---|
| `globalpulse_airquality_get_current` | Current AQI readings for a city or lat/lon |
| `globalpulse_airquality_get_historical` | Historical air quality time series for any station |

**Why:** Real estate, health, ESG, and supply chain use cases all touch air quality. No existing MCP wraps a global, government-sourced air quality feed.

---

### Frankfurter — ECB Exchange Rates
*European Central Bank FX rates for 30+ currencies. No key, no rate limit.*

| Tool | Description |
|---|---|
| `globalpulse_fx_get_latest` | Latest ECB exchange rates for any currency pair |
| `globalpulse_fx_get_historical` | Historical FX rates from 1999 for any currency pair |

**Why:** Needed to convert trade values, GDP figures, and investment flows into comparable currencies. Pairs naturally with UN Comtrade and World Bank tools. ECB-sourced = institutional credibility.

---

## 🟡 Priority 3 — Depth Tier (Planned, ~8 tools)

Enterprise stickiness. Power users, actuarial analysts, trade lawyers, and global health researchers.

### WHO Global Health Observatory
*2,000+ health indicators for 194 WHO member states — disease burden, vaccination, mortality, health system capacity.*

| Tool | Description |
|---|---|
| `globalpulse_who_get_indicator` | Fetch WHO health indicator for a country or globally |
| `globalpulse_who_list_indicators` | Browse available WHO GHO indicator codes |

**Business value:** Insurance underwriting, pharma market entry, health-adjusted investment analysis.

---

### NASA EONET — Natural Events
*NASA Earth Observatory natural event tracker: wildfires, severe storms, sea ice, volcanic activity. Satellite-confirmed, updated daily.*

| Tool | Description |
|---|---|
| `globalpulse_nasa_get_events` | Current natural events from NASA EONET by category and status |

**Business value:** Satellite confirmation layer on top of GDACS — cross-referencing both gives higher confidence on active events. Used by reinsurance and emergency logistics.

---

### WTO Stats — Trade Policy
*Tariff schedules, non-tariff barriers, anti-dumping cases, trade policy reviews for WTO members.*

| Tool | Description |
|---|---|
| `globalpulse_wto_get_tariffs` | MFN and applied tariff rates by HS code and country |
| `globalpulse_wto_get_ntbs` | Non-tariff barriers and trade remedy measures for a country pair |

**Business value:** Trade lawyers and supply chain strategists need tariff data alongside trade flows. Combining UN Comtrade (what is traded) + WTO (at what tariff) is a powerful one-two for legal and commercial due diligence.

---

### NOAA Historical Climate
*100+ years of weather station data globally — temperature, precipitation, extreme events.*

| Tool | Description |
|---|---|
| `globalpulse_noaa_get_station_data` | Long-term climate records for a specific NOAA weather station |

**Business value:** Deeper historical baseline than ERA5 for actuarial and infrastructure risk modeling. Insurers and construction firms need 50–100 year baselines.

---

## Summary

| Tier | Status | Tools | APIs |
|---|---|---|---|
| Priority 1 — Core | ✅ Live | 11 | World Bank, Open-Meteo, GDACS, OpenSky, UN Comtrade, REST Countries |
| Priority 2 — Differentiation | 🔵 Planned | ~10 | IMF, Copernicus, USGS, Global Forest Watch, OpenAQ, Frankfurter ECB |
| Priority 3 — Depth | 🟡 Planned | ~8 | WHO GHO, NASA EONET, WTO Stats, NOAA |
| **Total** | | **~29** | **16 global APIs** |

---

## Contributing

PRs welcome — especially for Priority 2 tools. Open an issue to claim a tool before starting work.

Each new tool should follow the existing pattern: Zod input validation, dual `markdown`/`json` output format, proper MCP annotations, and actionable error messages.
