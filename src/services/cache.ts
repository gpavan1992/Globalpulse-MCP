import { describeError } from "./http.js";

export const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** 24 h in-memory cache with de-duplicated loads; if a refresh fails, the stale copy is served. */
export function cachedLoader<T>(load: () => Promise<T>, label: string): { get: () => Promise<T>; clear: () => void } {
  let value: T | undefined;
  let at = 0;
  let inflight: Promise<T> | undefined;
  return {
    clear: () => { value = undefined; at = 0; inflight = undefined; },
    get: async () => {
      if (value !== undefined && Date.now() - at < CACHE_TTL_MS) return value;
      inflight ??= load().then(v => { value = v; at = Date.now(); return v; }).finally(() => { inflight = undefined; });
      try {
        return await inflight;
      } catch (err) {
        if (value !== undefined) { console.error(`${label}: refresh failed, serving stale copy: ${describeError(err)}`); return value; }
        throw err;
      }
    },
  };
}
