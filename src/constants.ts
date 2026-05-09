export const API_ENDPOINTS = {
  WORLD_BANK: "https://api.worldbank.org/v2",
  OPEN_METEO: "https://api.open-meteo.com/v1",
  OPEN_METEO_ARCHIVE: "https://archive-api.open-meteo.com/v1",
  GDACS: "https://www.gdacs.org/gdacsapi/api",
  OPENSKY: "https://opensky-network.org/api",
  UN_COMTRADE: "https://comtradeapi.un.org/public/v1/preview",
  REST_COUNTRIES: "https://restcountries.com/v3.1",
} as const;

export const DEFAULT_TIMEOUT_MS = 15_000;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;
export const CHARACTER_LIMIT = 50_000;

export enum ResponseFormat {
  JSON = "json",
  MARKDOWN = "markdown",
}
