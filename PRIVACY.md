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
- **No storage.** The server code has no database, cache or file storage for
  request data. Nothing is saved after the response is sent.
- **No logging in our code.** The server doesn't log requests, IP addresses or
  tool parameters. The only things it prints are a start-up message and error
  details if it crashes.
- **No analytics or tracking** of any kind is built in.

## Third-party data providers

Your tool parameters are forwarded to the providers below. Their own privacy
policies and logging apply once a request reaches them; we don't control that.
The requests are made by the server, so they come from the server's address,
not yours. The server doesn't pass on your IP address or other request
headers. It identifies itself only as `GlobalPulse-MCP/1.0`.

| Provider | Used for | What is sent to it |
|---|---|---|
| [World Bank](https://api.worldbank.org) | Economic indicators | Country code, indicator code, start and end year |
| [Open-Meteo](https://open-meteo.com) | Weather forecasts and historical climate | Latitude, longitude, timezone, and dates for historical queries |
| [GDACS](https://www.gdacs.org) (UN) | Disaster alerts | Event type, alert level, country name (for the by-country tool), result limit |
| [OpenSky Network](https://opensky-network.org) | Live flights | For the region tool: the bounding-box coordinates you give. For the by-country tool: nothing from you, because the server downloads the global list and filters it itself |
| [UN Comtrade](https://comtradeapi.un.org) | Trade flows | Reporter and partner country codes, year, commodity code, trade flow, result limit |
| [REST Countries](https://restcountries.com) | Country profiles and regional lists | Country name or code, or region name |

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
