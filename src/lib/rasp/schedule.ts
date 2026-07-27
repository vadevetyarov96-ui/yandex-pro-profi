import {
  adviceInstant,
  airportExitForLandingAt,
  airportExitForLandingHour,
  formatHour,
  isFutureAdvice,
  moscowDateKey,
  moscowHour,
  moscowNow,
  moscowWallTime,
  stationExitForArrivalAt,
  stationExitForArrivalHour,
  upcomingHours,
} from "@/lib/schedule-utils";
import type {
  AirportCardData,
  AirportHourStats,
  AirportsPayload,
  CityId,
  StationCardData,
  StationHourStats,
  StationsPayload,
} from "@/lib/types";
import { fetchArrivals, toScheduleItemDto, type RaspArrival } from "./client";
import { locationsForCity, type RaspLocation } from "./locations";

function bucketByHour(arrivals: RaspArrival[], hours: number[]): Map<number, RaspArrival[]> {
  const map = new Map<number, RaspArrival[]>();
  for (const h of hours) map.set(h, []);
  for (const a of arrivals) {
    const h = moscowHour(a.at);
    if (map.has(h)) map.get(h)!.push(a);
  }
  for (const list of map.values()) {
    list.sort((x, y) => x.at.getTime() - y.at.getTime());
  }
  return map;
}

function windowBounds(hours: number[], now: Date) {
  const dateKey = moscowDateKey(now);
  const first = hours[0] ?? moscowHour(now);
  const last = hours[hours.length - 1] ?? first;
  let from = moscowWallTime(dateKey, first, 0, 0);
  from = new Date(from.getTime() - 30 * 60 * 1000);

  let toDateKey = dateKey;
  if (last < first) {
    const tomorrow = new Date(moscowWallTime(dateKey, 12, 0, 0).getTime() + 24 * 60 * 60 * 1000);
    toDateKey = moscowDateKey(tomorrow);
  }
  const to = moscowWallTime(toDateKey, last, 59, 59);
  return { from, to, dateKey, toDateKey };
}

function dedupe(arrivals: RaspArrival[]) {
  const seen = new Set<string>();
  return arrivals.filter((a) => {
    const key = `${a.number}|${a.at.toISOString()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Sort arrivals by time only (train priority is only for tips). */
function sortByTime(longList: RaspArrival[], subList: RaspArrival[]) {
  return [...longList, ...subList].sort((a, b) => a.at.getTime() - b.at.getTime());
}

/** Nearest arrival in interval: soonest upcoming, else earliest in bucket. */
function pickNearestArrival(list: RaspArrival[], now: Date): RaspArrival | null {
  if (list.length === 0) return null;
  const upcoming = list.find((a) => a.at.getTime() >= now.getTime() - 2 * 60 * 1000);
  return upcoming ?? list[0] ?? null;
}

/**
 * For stations: prefer nearest long-distance train; fallback to any arrival.
 */
function pickNearestStationArrival(
  longList: RaspArrival[],
  subList: RaspArrival[],
  now: Date,
): RaspArrival | null {
  return pickNearestArrival(longList, now) ?? pickNearestArrival(subList, now);
}

function pickStationAdvice(
  hours: StationHourStats[],
  hourOrder: number[],
  now: Date,
): { tipArrive?: string; tipExit?: string } {
  for (const h of hours) {
    if (
      h.longDistance > 0 &&
      isFutureAdvice(h.arriveBy, h.hour, hourOrder, now)
    ) {
      return { tipArrive: h.arriveBy, tipExit: h.exitWindow };
    }
  }
  for (const h of hours) {
    if (isFutureAdvice(h.arriveBy, h.hour, hourOrder, now)) {
      return { tipArrive: h.arriveBy, tipExit: h.exitWindow };
    }
  }
  return {};
}

async function loadAirport(
  loc: RaspLocation,
  hours: number[],
  now: Date,
): Promise<AirportCardData> {
  const { from, to, dateKey, toDateKey } = windowBounds(hours, now);
  const first = await fetchArrivals(loc, "plane", dateKey);
  let all = first.arrivals.filter((a) => a.at >= from && a.at <= to);

  if (toDateKey !== dateKey) {
    try {
      const next = await fetchArrivals(loc, "plane", toDateKey);
      all = [...all, ...next.arrivals.filter((a) => a.at >= from && a.at <= to)];
    } catch {
      /* ignore */
    }
  }

  all = dedupe(all);
  const byHour = bucketByHour(all, hours);
  const pax = loc.paxPerFlight ?? 150;
  const hourStats: AirportHourStats[] = hours.map((hour) => {
    const list = byHour.get(hour) ?? [];
    const flights = list.length;
    const nearest = pickNearestArrival(list, now);
    const { exitWindow, arriveBy } = nearest
      ? airportExitForLandingAt(nearest.at)
      : airportExitForLandingHour(hour);
    return {
      hour,
      hourLabel: formatHour(hour),
      flights,
      passengers: flights * pax,
      exitWindow,
      arriveBy,
      isPeak: flights >= 8,
      items: list.map(toScheduleItemDto),
    };
  });

  const nowBucket = hourStats[0];
  let tipArrive = nowBucket?.arriveBy;
  let tipExit = nowBucket?.exitWindow;
  for (const h of hourStats) {
    if (h.flights > 0 && isFutureAdvice(h.arriveBy, h.hour, hours, now)) {
      tipArrive = h.arriveBy;
      tipExit = h.exitWindow;
      break;
    }
  }

  return {
    id: loc.id,
    name: loc.name,
    code: loc.iata ?? loc.code,
    hours: hourStats,
    nowFlights: nowBucket?.flights ?? 0,
    peak: Boolean(nowBucket?.isPeak),
    tipArrive,
    tipExit,
  };
}

async function loadStation(
  loc: RaspLocation,
  hours: number[],
  now: Date,
): Promise<StationCardData> {
  const { from, to, dateKey, toDateKey } = windowBounds(hours, now);
  const trains = await fetchArrivals(loc, "train", dateKey);
  let trainList = trains.arrivals.filter((a) => a.at >= from && a.at <= to);

  if (toDateKey !== dateKey) {
    try {
      const next = await fetchArrivals(loc, "train", toDateKey);
      trainList = [...trainList, ...next.arrivals.filter((a) => a.at >= from && a.at <= to)];
    } catch {
      /* ignore */
    }
  }

  let suburbanArrivals: RaspArrival[] = [];
  let suburbanEstimated = false;

  try {
    const suburban = await fetchArrivals(loc, "suburban", dateKey);
    suburbanArrivals = suburban.arrivals.filter((a) => a.at >= from && a.at <= to);
    if (toDateKey !== dateKey) {
      try {
        const next = await fetchArrivals(loc, "suburban", toDateKey);
        suburbanArrivals = [
          ...suburbanArrivals,
          ...next.arrivals.filter((a) => a.at >= from && a.at <= to),
        ];
      } catch {
        /* ignore */
      }
    }
    if (suburbanArrivals.length === 0 && suburban.source === "page") {
      suburbanEstimated = true;
    }
  } catch {
    suburbanEstimated = true;
  }

  if (suburbanEstimated && suburbanArrivals.length === 0) {
    suburbanArrivals = synthesizeSuburban(loc.id, hours, now);
  }

  trainList = dedupe(trainList);
  suburbanArrivals = dedupe(suburbanArrivals);

  const trainsByHour = bucketByHour(trainList, hours);
  const subByHour = bucketByHour(suburbanArrivals, hours);

  const hourStats: StationHourStats[] = hours.map((hour) => {
    const longList = trainsByHour.get(hour) ?? [];
    const subList = subByHour.get(hour) ?? [];
    const longDistance = longList.length;
    const suburban = subList.length;
    const nearest = pickNearestStationArrival(longList, subList, now);
    const { exitWindow, arriveBy } = nearest
      ? stationExitForArrivalAt(nearest.at)
      : stationExitForArrivalHour(hour);
    return {
      hour,
      hourLabel: formatHour(hour),
      longDistance,
      suburban,
      total: longDistance + suburban,
      exitWindow,
      arriveBy,
      isPeak: longDistance >= 3,
      items: sortByTime(longList, subList).map(toScheduleItemDto),
    };
  });

  const advice = pickStationAdvice(hourStats, hours, now);
  const nowBucket = hourStats[0];

  return {
    id: loc.id,
    name: loc.name,
    hours: hourStats,
    longDistanceTotal: hourStats.reduce((s, h) => s + h.longDistance, 0),
    suburbanTotal: hourStats.reduce((s, h) => s + h.suburban, 0),
    peak: Boolean(nowBucket?.isPeak),
    tipArrive: advice.tipArrive,
    tipExit: advice.tipExit,
  };
}

function synthesizeSuburban(stationId: string, hours: number[], now: Date): RaspArrival[] {
  const density: Record<string, number> = {
    leningradsky: 8,
    yaroslavsky: 9,
    kazansky: 7,
    kursky: 8,
    kievsky: 5,
    belorussky: 6,
    paveletsky: 6,
    savyolovsky: 5,
    rizhsky: 3,
    vostochny: 4,
  };
  const perHour = density[stationId] ?? 4;
  const dateKey = moscowDateKey(now);
  const out: RaspArrival[] = [];
  for (const hour of hours) {
    const n = hour >= 0 && hour <= 5 ? Math.max(1, Math.floor(perHour * 0.25)) : perHour;
    for (let i = 0; i < n; i++) {
      const at = moscowWallTime(dateKey, hour, Math.floor((60 / n) * i), 0);
      out.push({
        number: `Э-${hour}-${i}`,
        transportType: "suburban",
        at,
        scheduledAt: at,
        status: "estimated",
        from: "пригород",
      });
    }
  }
  return out;
}

export async function getAirportsSchedule(cityId: CityId): Promise<AirportsPayload> {
  const now = moscowNow();
  const hours = upcomingHours(12, now);
  const locs = locationsForCity(cityId, "airport");

  const airports = await Promise.all(locs.map((loc) => loadAirport(loc, hours, now)));

  // Совет: только будущие окна выхода, максимум по оценке пассажиров
  let tip: AirportsPayload["tip"] = null;
  let bestScore = -1;
  for (const a of airports) {
    for (const h of a.hours) {
      if (h.flights <= 0) continue;
      if (!isFutureAdvice(h.arriveBy, h.hour, hours, now)) continue;
      const when = adviceInstant(h.arriveBy, h.hour, hours, now).getTime();
      // Prefer higher passenger estimate; slight preference for sooner slots
      const soonBonus = Math.max(0, 1 - (when - now.getTime()) / (12 * 60 * 60 * 1000));
      const score = h.passengers + soonBonus * 200;
      if (score > bestScore) {
        bestScore = score;
        tip = {
          airport: a.name,
          arriveBy: h.arriveBy,
          exitWindow: h.exitWindow,
          passengers: h.passengers,
        };
      }
    }
  }

  return {
    updatedAt: now.toISOString(),
    cityId,
    airports,
    tip,
    source:
      process.env.YANDEX_RASP_API_KEY || process.env.YANDEX_RASP_API_KEY_BACKUP
        ? "yandex-rasp-api"
        : "yandex-rasp",
  };
}

export async function getStationsSchedule(cityId: CityId): Promise<StationsPayload> {
  const now = moscowNow();
  const hours = upcomingHours(12, now);
  const locs = locationsForCity(cityId, "station");

  const stations = await Promise.all(locs.map((loc) => loadStation(loc, hours, now)));

  // Совет: приоритет дальним поездам, только будущие окна
  let tip: StationsPayload["tip"] = null;
  let bestScore = -1;
  for (const s of stations) {
    for (const h of s.hours) {
      if (h.longDistance <= 0) continue;
      if (!isFutureAdvice(h.arriveBy, h.hour, hours, now)) continue;
      const when = adviceInstant(h.arriveBy, h.hour, hours, now).getTime();
      const soonBonus = Math.max(0, 1 - (when - now.getTime()) / (12 * 60 * 60 * 1000));
      // Long-distance dominates; suburban does not affect tip
      const score = h.longDistance * 100 + soonBonus * 10;
      if (score > bestScore) {
        bestScore = score;
        tip = {
          station: s.name,
          arriveBy: h.arriveBy,
          exitWindow: h.exitWindow,
          longDistance: h.longDistance,
        };
      }
    }
  }

  const hasApiKey = Boolean(
    process.env.YANDEX_RASP_API_KEY || process.env.YANDEX_RASP_API_KEY_BACKUP,
  );

  return {
    updatedAt: now.toISOString(),
    cityId,
    stations,
    tip,
    source: hasApiKey ? "yandex-rasp-api" : "yandex-rasp",
    suburbanNote: hasApiKey
      ? undefined
      : "Электрички — оценка; для точных данных нужен ключ API Яндекс Расписаний",
  };
}
