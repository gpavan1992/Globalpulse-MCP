import { DEFAULT_TIMEOUT_MS } from "../constants.js";

export class HttpError extends Error {
  constructor(public status: number, public statusText: string, message: string) {
    super(message);
    this.name = "HttpError";
  }
}

export async function fetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: { Accept: "application/json", "User-Agent": "GlobalPulse-MCP/1.0", ...options.headers },
    });
    if (!response.ok) throw new HttpError(response.status, response.statusText, `HTTP ${response.status} from ${url}`);
    return (await response.json()) as T;
  } catch (err) {
    if (err instanceof HttpError) throw err;
    if (err instanceof Error && err.name === "AbortError") throw new Error(`Request timed out: ${url}`);
    throw new Error(`Network error: ${String(err)}`);
  } finally {
    clearTimeout(timer);
  }
}

export function buildUrl(base: string, params: Record<string, string | number | boolean | undefined>): string {
  const url = new URL(base);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }
  return url.toString();
}

export function truncateText(text: string, limit: number): string {
  if (text.length <= limit) return text;
  return text.slice(0, limit) + `\n\n[Truncated at ${limit} chars. Use more specific filters.]`;
}
