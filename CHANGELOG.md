# Changelog

All notable changes are listed here. Format: [Keep a Changelog](https://keepachangelog.com), versions follow [SemVer](https://semver.org).

## [Unreleased]

### Added
- `GET /.well-known/openai-apps-challenge` returns the token from the `OPENAI_APPS_CHALLENGE` variable, for OpenAI domain verification (404 when unset)
- `TERMS.md`, `SECURITY.md`, `CONTRIBUTING.md`, issue templates and a pull request template
- README: "Does it actually work?" table of data traps, ChatGPT demo video with GIF previews, animated diagrams (hero, traps, tools, how it works), Quick start for ChatGPT, Claude, Claude Desktop and Cursor/Windsurf

### Changed
- README restructured; no change to tools, tool descriptions or the `/mcp` URL

## [1.0.0]

### Added
- Eleven read-only tools: World Bank indicators, Open-Meteo forecast and history, UN GDACS disasters, adsb.lol flights, UN Comtrade trade flows and country profiles
- Public Streamable HTTP endpoint at `/mcp` with a `/health` check; stdio transport by default for local use
