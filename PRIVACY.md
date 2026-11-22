# Privacy

*Last updated: 22 November 2026*

GlobalPulse MCP is a small open-source server that answers questions about
countries, weather, disasters, trade and flights by looking things up in public
data sources. This page explains what happens to the information you send it.

## The short version

- There are no accounts and no sign-in.
- We don't store any user data. The server has no database and doesn't write
  your requests to disk.
- What you ask for (for example a country name or coordinates) is passed on to
  the public data providers listed below so they can answer.
- If you use the hosted server, its hosting provider (Railway) may keep
  ordinary server logs, which can include your IP address.

## What the server does with your requests

When a tool is called, the server turns your parameters into a request to a
public data provider, reads the reply, formats it, and sends it back to you.
That's all.

- **No accounts, cookies or sessions.** The server doesn't ask who you are and
  doesn't set cookies. Each request is handled on its own.
- **No storage of your data.** The server has no database or file storage and
  doesn't keep your requests. The exceptions are in-memory caches of *public*
  data, never of your requests: the country list, World Bank population figures
  and Comtrade code lists (24 hours each), plus live flight data: for 60
  seconds the server remembers the aircraft positions it just fetched for a map
  area, so that repeat calls for the same area don't hit the flight providers
  again. The flight cache is keyed by the area (rounded coordinates and radius)
  only, holds no IP address or other identifier, and is
  lost when the server restarts.
- **No logging in our code.** The server doesn't log requests, IP addresses or
  tool parameters. The only things it prints are a start-up message, error
  details if it crashes, and short notices when an upstream data source fails
  (they contain the upstream URL and error, not your request or IP address).
- **No analytics or tracking** of any kind is built in.

## Third-party data providers

Your tool parameters are forwarded to the providers below. Their own privacy
policies and logging apply once a request reaches them; we don't control that.
The requests are made by the server, so they come from the server's address,
not yours. The server doesn't pass on your IP address or other request
headers. It identifies itself only as `GlobalPulse-MCP/1.0`.

| Provider | Used for | What is sent to it |
|---|---|---|
| [World Bank](https://api.worldbank.org) | Economic indicators and country populations | Indicator tool: country code, indicator code, start and end year. Country tools: nothing from you (the server downloads the latest population figures for all countries, cached 24 h) |
| [Open-Meteo](https://open-meteo.com) | Weather forecasts and historical climate | Latitude, longitude, timezone, and dates for historical queries |
| [GDACS](https://www.gdacs.org) (UN) | Disaster alerts | Active-disasters tool: nothing from you (the server downloads the latest events and filters them itself). By-country tool: country name, event type and a fixed 5-year date range |
| [adsb.lol](https://adsb.lol) (primary) and [adsb.fi](https://adsb.fi) (fallback, used only when adsb.lol fails) | Live flights | For the region tool: a centre point and radius worked out from the bounding box you give; a large box is split into several circles, so several requests are sent. For the by-country tool: nothing from you. The server queries fixed circles around major airports in India, Germany or the United States and filters the replies itself |
| [UN Comtrade](https://comtradeapi.un.org) | Trade flows | Reporter and partner country codes, year, commodity code, trade flow, result limit. The server also downloads Comtrade's public reporter/partner code lists (cached 24 h) to translate country names into codes |
| [mledoze/countries](https://github.com/mledoze/countries) (served from raw.githubusercontent.com) | Country profiles and regional lists | Nothing from you: the server downloads the whole country list (cached in memory for 24 h) and filters it itself. GitHub sees only the server's request |

Please don't put personal information in tool parameters. They are sent to
these providers as they are.

## Hosting and Railway logs

The public instance (`globalpulse-mcp-production.up.railway.app`) runs on
[Railway](https://railway.com). Railway, like most hosts, may record request
metadata such as IP address, time, URL path and response status in its own
infrastructure logs. This happens at the hosting level, outside the server
code, and is governed by Railway's privacy policy. We don't use these logs to
identify or track anyone.

If you want to avoid this, you can run the server yourself. In its default
stdio mode it runs on your own machine and makes requests only to the
providers above.

## Changes

If the server's behaviour changes in a way that affects this page, this file
will be updated and the date at the top changed.

## Contact

Questions or concerns? Please open an issue on
[GitHub Issues](https://github.com/gpavan1992/Globalpulse-MCP/issues).
