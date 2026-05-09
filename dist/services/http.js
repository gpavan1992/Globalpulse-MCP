import { DEFAULT_TIMEOUT_MS } from "../constants.js";
export class HttpError extends Error {
    status;
    statusText;
    constructor(status, statusText, message) {
        super(message);
        this.status = status;
        this.statusText = statusText;
        this.name = "HttpError";
    }
}
export async function fetchJson(url, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
            headers: { Accept: "application/json", "User-Agent": "GlobalPulse-MCP/1.0", ...options.headers },
        });
        if (!response.ok)
            throw new HttpError(response.status, response.statusText, `HTTP ${response.status} from ${url}`);
        return (await response.json());
    }
    catch (err) {
        if (err instanceof HttpError)
            throw err;
        if (err instanceof Error && err.name === "AbortError")
            throw new Error(`Request timed out: ${url}`);
        throw new Error(`Network error: ${String(err)}`);
    }
    finally {
        clearTimeout(timer);
    }
}
export function buildUrl(base, params) {
    const url = new URL(base);
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== "")
            url.searchParams.set(key, String(value));
    }
    return url.toString();
}
export function truncateText(text, limit) {
    if (text.length <= limit)
        return text;
    return text.slice(0, limit) + `\n\n[Truncated at ${limit} chars. Use more specific filters.]`;
}
