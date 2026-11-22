import { DEFAULT_TIMEOUT_MS } from "../constants.js";

export class HttpError extends Error {
  constructor(public status: number, public statusText: string, message: string, public retryAfterSec?: number) {
    super(message);
    this.name = "HttpError";
  }
}

function parseRetryAfter(header: string | null): number | undefined {
  if (!header) return undefined;
  const secs = Number(header);
  if (Number.isFinite(secs) && secs >= 0) return secs;
  const at = Date.parse(header);
  return Number.isNaN(at) ? undefined : Math.max(0, (at - Date.now()) / 1000);
}

export function describeError(err: unknown): string {
  if (!(err instanceof Error)) return String(err);
  const causes: string[] = [];
  let cause: unknown = (err as { cause?: unknown }).cause;
  for (let i = 0; cause && i < 3; i++) {
    if (cause instanceof Error) {
      const code = (cause as NodeJS.ErrnoException).code;
      causes.push(code && !cause.message.includes(code) ? `${code}: ${cause.message}` : cause.message);
      cause = (cause as { cause?: unknown }).cause;
    } else {
      causes.push(String(cause));
      break;
    }
  }
  return causes.length ? `${err.message} (cause: ${causes.join(" -> ")})` : err.message;
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
    if (!response.ok) {
      const body = (await response.text().catch(() => "")).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 200);
      const status = `${response.status}${response.statusText ? " " + response.statusText : ""}`;
      throw new HttpError(response.status, response.statusText, `HTTP ${status} from ${url}${body ? ` - ${body}` : ""}`, parseRetryAfter(response.headers.get("retry-after")));
    }
    return (await response.json()) as T;
  } catch (err) {
    if (err instanceof HttpError) throw err;
    if (err instanceof Error && err.name === "AbortError") throw new Error(`Request timed out after ${DEFAULT_TIMEOUT_MS / 1000}s: ${url}`);
    throw new Error(`Network error calling ${url}: ${describeError(err)}`);
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
