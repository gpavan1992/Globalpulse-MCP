# Terms of Use

**Global Pulse MCP Server** · Last updated: 22 November 2026

These terms apply to the public Global Pulse MCP server at `https://globalpulse-mcp-production.up.railway.app/mcp` (the "Service"). By connecting to it or using its tools, you agree to them. If you do not agree, do not use the Service. The Service is operated by Pavan Kumar Galiveeti, an individual, as an independent open-source project (the "Operator").

## 1. What the Service does

Global Pulse is a read-only MCP server. It fetches public data from third-party sources on request (weather, disasters, trade, economic indicators, country facts and live aircraft positions) and returns it to your AI assistant. It does not write to, modify or delete anything, and it does not execute transactions of any kind.

## 2. Provided "as is"

The Service is provided "as is" and "as available", without warranties of any kind, express or implied, including fitness for a particular purpose, accuracy, completeness, timeliness and non-infringement. The Service may be slow, rate-limited, changed or unavailable at any time, including when a third-party source is down.

## 3. Data accuracy and limits

- All data comes from third parties and may be delayed, incomplete, estimated or wrong. Check anything important against the original source.
- **Flight data is approximate.** It comes from volunteer ADS-B networks, covers only aircraft they can see, and "by country" results are sampled around major hubs, not national totals. **Do not use it for navigation, aviation safety, security or any safety-critical purpose.**
- **Disaster alerts are informational only.** Do not rely on the Service for emergency decisions. Follow official local authorities.
- Population and other figures may be rounded or out of date.

## 4. No professional advice

Nothing returned by the Service is financial, investment, trade, legal, medical, engineering or safety advice. You are responsible for your own decisions.

## 5. Third-party sources and their terms

Global Pulse retrieves publicly available information from independent third-party data providers, including World Bank Open Data, Open-Meteo, UN GDACS, UN Comtrade, mledoze/countries (ODbL 1.0), and adsb.lol (ODbL 1.0).

The public Global Pulse service uses adsb.lol as its aviation data provider. The optional adsb.fi fallback is disabled on the public deployment. It may be enabled only in separately configured self-hosted deployments, subject to the applicable provider's terms and permissions.

Third-party data remains subject to the original providers' applicable licenses, attribution requirements, usage restrictions, and rate limits. Global Pulse identifies relevant data sources in its tool responses.

Users who reuse, redistribute, or commercially exploit third-party data are responsible for complying with the applicable provider licenses and terms. The availability of data through Global Pulse does not grant additional rights to that data.

Global Pulse is an independent open-source project and is not affiliated with, sponsored by, or endorsed by these third-party providers.

## 6. Acceptable use

You agree not to:

- overload, scrape at scale, or try to bypass rate limits or caches of the Service;
- attack, probe or attempt unauthorised access to the Service or its hosting;
- use the Service to break the law or any provider's terms;
- send personal, confidential or sensitive information in tool parameters, because parameters are passed to third-party providers as you send them.

The Operator may block or limit access without notice to protect the Service.

## 7. Privacy

How the Service handles data is described in [PRIVACY.md](PRIVACY.md). In short: no accounts, no stored user data, short-lived caches only, and hosting logs on Railway that may contain IP addresses.

## 8. Intellectual property

The server's source code is released under the MIT License (see [LICENSE](LICENSE)). Data returned by the Service belongs to its original sources and is not relicensed by the Operator.

## 9. Limitation of liability

To the fullest extent permitted by law, the Operator is not liable for any indirect, incidental, special, consequential or punitive damages, or for any loss of profits, data or goodwill, arising from your use of, or inability to use, the Service or from reliance on its data. The Service is free, and the Operator's total liability for any claim is limited to zero. Nothing in these terms excludes liability that cannot be excluded by law.

## 10. Changes and termination

The Operator may change these terms, change the Service, or stop running the public instance at any time. The "Last updated" date above shows the latest version. Continued use after a change means you accept it. You can run your own copy of the server from the source code at any time.

## 11. Governing law

These terms are governed by the laws of India. Courts in Hyderabad, Telangana, have jurisdiction, unless your local consumer law requires otherwise.

## 12. Contact

Questions, issues and takedown or abuse reports: [GitHub Issues](https://github.com/gpavan1992/Globalpulse-MCP/issues).
