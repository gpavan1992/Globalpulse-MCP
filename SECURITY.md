# Security and support

## Reporting a vulnerability

Please report security problems **privately**, not in a public issue:

1. Open https://github.com/gpavan1992/Globalpulse-MCP/security/advisories/new (the *Security* tab, then *Report a vulnerability*)
2. Describe what you found and how to reproduce it

GlobalPulse is a one-person open-source project. Reports are handled on a best-effort basis, and fixes ship as a new release noted in `CHANGELOG.md`.

**In scope:** the server code, the `/mcp`, `/health` and `/.well-known` routes, request handling and rate or abuse weaknesses, and anything that could leak data or run unexpected code.
**Out of scope:** wrong or delayed data from a third-party source (World Bank, Open-Meteo, GDACS, Comtrade, adsb.lol). Use the *Data trap* issue template for those.

## Support

- Bugs, questions and wrong numbers: https://github.com/gpavan1992/Globalpulse-MCP/issues
- Setup and intended use: [README](README.md)
- What data the service handles: [PRIVACY.md](PRIVACY.md)
- Conditions of use: [TERMS.md](TERMS.md)

## Supported versions

Only the latest release and the public endpoint are supported.
