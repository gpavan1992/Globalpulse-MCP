import { DEFAULT_TIMEOUT_MS, RELIABLE_TIMEOUT_MS } from "../constants.js";

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

export interface FetchPolicy { timeoutMs?: number; attempts?: number }
/** 25 s timeout, 2 attempts: for World Bank, Open-Meteo, Comtrade, GDACS and the country data. */
export const RELIABLE: FetchPolicy = { timeoutMs: RELIABLE_TIMEOUT_MS, attempts: 2 };

const sleep = (ms: number): Promise<void> => new Promise(res => setTimeout(res, ms));

/** Comtrade answers 429 with "Try again in N seconds" in the body and no header. */
function retryAfterFromBody(body: string): number | undefined {
  const m = /try again in (\d+(?:\.\d+)?) second/i.exec(body);
  return m ? Number(m[1]) : undefined;
}

async function fetchOnce<T>(url: string, options: RequestInit, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: { Accept: "application/json", "User-Agent": "GlobalPulse-MCP/1.0", ...options.headers },
    });
    if (!response.ok) {
      const body = (await response.text().catch(() => "")).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 200);
      const status = `${response.status}${response.statusText ? " " + response.statusText : ""}`;
      const retryAfter = parseRetryAfter(response.headers.get("retry-after")) ?? (response.status === 429 ? retryAfterFromBody(body) : undefined);
      throw new HttpError(response.status, response.statusText, `HTTP ${status} from ${url}${body ? ` - ${body}` : ""}`, retryAfter);
    }
    return (await response.json()) as T;
  } catch (err) {
    if (err instanceof HttpError) throw err;
    if (err instanceof Error && err.name === "AbortError") throw new Error(`Request timed out after ${timeoutMs / 1000}s: ${url}`);
    throw new Error(`Network error calling ${url}: ${describeError(err)}`);
  } finally {
    clearTimeout(timer);
  }
}

/** How long to wait before the next attempt, or undefined if the error is not worth retrying. */
function retryDelayMs(err: unknown): number | undefined {
  if (err instanceof HttpError) {
    if (err.status === 429) {
      const secs = err.retryAfterSec ?? 2;
      return secs <= 5 ? secs * 1000 + 100 : undefined;
    }
    return err.status >= 500 || err.status === 408 ? 500 : undefined; // other 4xx are final
  }
  return 500; // network error or timeout
}

export async function fetchJson<T>(url: string, options: RequestInit = {}, policy: FetchPolicy = {}): Promise<T> {
  const attempts = Math.max(1, policy.attempts ?? 1);
  const timeoutMs = policy.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  let lastErr: unknown;
  let made = 0;
  for (let i = 1; i <= attempts; i++) {
    made = i;
    try {
      return await fetchOnce<T>(url, options, timeoutMs);
    } catch (err) {
      lastErr = err;
      const delay = i < attempts ? retryDelayMs(err) : undefined;
      if (delay === undefined) break;
      await sleep(delay);
    }
  }
  if (attempts > 1 && made > 1 && lastErr instanceof Error) lastErr.message += ` [gave up after ${made} attempts]`;
  throw lastErr;
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
