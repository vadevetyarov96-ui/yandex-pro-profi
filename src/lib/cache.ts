import type { AirportsPayload, StationsPayload } from "@/lib/types";

type CacheEntry<T> = { value: T; expiresAt: number };

const g = globalThis as typeof globalThis & {
  __yppCache?: Map<string, CacheEntry<unknown>>;
};

function store() {
  if (!g.__yppCache) g.__yppCache = new Map();
  return g.__yppCache;
}

export function cacheGet<T>(key: string): T | null {
  const hit = store().get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    store().delete(key);
    return null;
  }
  return hit.value as T;
}

export function cacheSet<T>(key: string, value: T, ttlMs: number) {
  store().set(key, { value, expiresAt: Date.now() + ttlMs });
}

export type { AirportsPayload, StationsPayload };
