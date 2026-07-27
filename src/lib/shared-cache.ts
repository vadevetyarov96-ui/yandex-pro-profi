import { unstable_cache, revalidateTag } from "next/cache";
import { getAirportsSchedule, getStationsSchedule } from "@/lib/rasp/schedule";
import { moscowDateKey } from "@/lib/schedule-utils";
import type { AirportsPayload, CityId, StationsPayload } from "@/lib/types";

type MemEntry<T> = { value: T; expiresAt: number };

const g = globalThis as typeof globalThis & {
  __yppSharedCache?: Map<string, MemEntry<unknown>>;
};

function mem() {
  if (!g.__yppSharedCache) g.__yppSharedCache = new Map();
  return g.__yppSharedCache;
}

function memGet<T>(key: string): T | null {
  const hit = mem().get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    mem().delete(key);
    return null;
  }
  return hit.value as T;
}

function memSet<T>(key: string, value: T, ttlMs: number) {
  mem().set(key, { value, expiresAt: Date.now() + ttlMs });
}

const DAY_MS = 24 * 60 * 60 * 1000;
/** Airports stay until manual refresh; safety ceiling 12h */
const AIRPORTS_TTL_MS = 12 * 60 * 60 * 1000;

function stationsKey(cityId: CityId, day: string) {
  return `stations:${cityId}:${day}`;
}

function airportsKey(cityId: CityId) {
  return `airports:${cityId}`;
}

function airportsTag(cityId: CityId) {
  return `airports-${cityId}`;
}

/** Shared across users via Next Data Cache + in-memory L1. Once per Moscow day. */
export async function getSharedStations(cityId: CityId): Promise<StationsPayload> {
  const day = moscowDateKey();
  const key = stationsKey(cityId, day);

  const local = memGet<StationsPayload>(key);
  if (local) return { ...local, source: `${local.source ?? "yandex-rasp"}+cache` };

  const cachedFn = unstable_cache(
    async () => getStationsSchedule(cityId),
    ["stations-v1", cityId, day],
    { revalidate: 60 * 60 * 24, tags: [`stations-${cityId}-${day}`] },
  );

  const data = await cachedFn();
  memSet(key, data, DAY_MS);
  return data;
}

/** Shared across users. Served from cache until refreshAirports(). */
export async function getSharedAirports(cityId: CityId): Promise<AirportsPayload> {
  const key = airportsKey(cityId);

  const local = memGet<AirportsPayload>(key);
  if (local) return { ...local, source: `${local.source ?? "yandex-rasp"}+cache` };

  const cachedFn = unstable_cache(
    async () => getAirportsSchedule(cityId),
    ["airports-v1", cityId],
    { revalidate: 60 * 60 * 12, tags: [airportsTag(cityId)] },
  );

  const data = await cachedFn();
  memSet(key, data, AIRPORTS_TTL_MS);
  return data;
}

/** Bust shared airports cache and fetch fresh (one Yandex round-trip for all users). */
export async function refreshSharedAirports(cityId: CityId): Promise<AirportsPayload> {
  const key = airportsKey(cityId);
  mem().delete(key);

  try {
    revalidateTag(airportsTag(cityId), "max");
  } catch {
    /* ignore in non-next contexts */
  }

  const data = await getAirportsSchedule(cityId);
  memSet(key, data, AIRPORTS_TTL_MS);

  // Warm Next data cache with a versioned key so subsequent getSharedAirports
  // hits memory first; also rewrite tag by calling unstable_cache after clear.
  // Next will refill on next getSharedAirports after tag invalidation.
  return data;
}
