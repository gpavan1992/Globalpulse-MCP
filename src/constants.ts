export const API_ENDPOINTS = {
  WORLD_BANK: "https://api.worldbank.org/v2",
  OPEN_METEO: "https://api.open-meteo.com/v1",
  OPEN_METEO_ARCHIVE: "https://archive-api.open-meteo.com/v1",
  GDACS: "https://www.gdacs.org/gdacsapi/api",
  ADSB_LOL: "https://api.adsb.lol/v2",
  ADSB_FI: "https://opendata.adsb.fi/api/v2",
  UN_COMTRADE: "https://comtradeapi.un.org/public/v1/preview/C/A",
  // REST Countries v3.1 now redirects to a deprecation notice (v5 needs an API key), so the country list comes from a static dataset.
  COUNTRIES_DATA: "https://raw.githubusercontent.com/mledoze/countries/master/dist/countries.json",
  COMTRADE_REFERENCE: "https://comtradeapi.un.org/files/v1/app/reference",
} as const;

export const DEFAULT_TIMEOUT_MS = 15_000;
/** Used with 2 attempts for the data providers (not for adsb.lol/adsb.fi, which have their own fallback). */
export const RELIABLE_TIMEOUT_MS = 25_000;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;
export const CHARACTER_LIMIT = 50_000;

export enum ResponseFormat {
  JSON = "json",
  MARKDOWN = "markdown",
}
