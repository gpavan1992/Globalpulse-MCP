export interface PaginatedResult<T> {
  total: number;
  count: number;
  offset: number;
  items: T[];
  has_more: boolean;
  next_offset?: number;
}

export interface ToolResult {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

export interface WorldBankDataPoint {
  country: string;
  country_code: string;
  indicator: string;
  year: number;
  value: number | null;
}

export interface DisasterEvent {
  event_id: string;
  event_type: string;
  title: string;
  country: string;
  severity: string;
  alert_level: string;
  date: string;
  latitude?: number;
  longitude?: number;
  url?: string;
}

export interface FlightState {
  icao24: string;
  callsign: string | null;
  origin_country: string;
  longitude: number | null;
  latitude: number | null;
  altitude_m: number | null;
  velocity_ms: number | null;
  heading: number | null;
  on_ground: boolean;
  last_contact: string;
}

export interface TradeFlow {
  reporter: string;
  partner: string;
  flow_direction: string;
  commodity_code: string;
  commodity_desc: string;
  year: number;
  trade_value_usd: number;
}

export interface CountryInfo {
  name: string;
  official_name: string;
  capital: string[];
  region: string;
  subregion: string;
  population: number;
  area_km2: number;
  currencies: Record<string, { name: string; symbol: string }>;
  languages: Record<string, string>;
  timezones: string[];
  calling_codes: string[];
  borders: string[];
  flag_emoji: string;
  un_member: boolean;
}
