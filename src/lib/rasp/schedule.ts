import {
  airportExitForLandingHour,
  formatHour,
  moscowDateKey,
  moscowHour,
  moscowNow,
  moscowWallTime,
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

async function loadAirport(loc: RaspLocation, hours: number[], now: Date): Promise<AirportCardData> {
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
    const { exitWindow, arriveBy } = airportExitForLandingHour(hour);
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
  return {
    id: loc.id,
    name: loc.name,
    code: loc.iata ?? loc.code,
    hours: hourStats,
    nowFlights: nowBucket?.flights ?? 0,
    peak: hourStats.some((h) => h.isPeak),
    tipArrive: nowBucket?.arriveBy,
    tipExit: nowBucket?.exitWindow,
  };
}

async function loadStation(loc: RaspLocation, hours: number[], now: Date): Promise<StationCardData> {
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
    const { exitWindow, arriveBy } = stationExitForArrivalHour(hour);
    const items = [...longList, ...subList]
      .sort((a, b) => a.at.getTime() - b.at.getTime())
      .map(toScheduleItemDto);
    return {
      hour,
      hourLabel: formatHour(hour),
      longDistance,
      suburban,
      total: longDistance + suburban,
      exitWindow,
      arriveBy,
      isPeak: longDistance >= 3,
      items,
    };
  });

  const first = hourStats[0];
  return {
    id: loc.id,
    name: loc.name,
    hours: hourStats,
    longDistanceTotal: hourStats.reduce((s, h) => s + h.longDistance, 0),
    suburbanTotal: hourStats.reduce((s, h) => s + h.suburban, 0),
    tipArrive: first?.arriveBy,
    tipExit: first?.exitWindow,
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

  const top = [...airports].sort((a, b) => b.nowFlights - a.nowFlights)[0];
  const tip = top?.hours[0]
    ? {
        airport: top.name,
        arriveBy: top.hours[0].arriveBy,
        exitWindow: top.hours[0].exitWindow,
        passengers: top.hours[0].passengers,
      }
    : null;

  return {
    updatedAt: now.toISOString(),
    cityId,
    airports,
    tip,
    source: process.env.YANDEX_RASP_API_KEY ? "yandex-rasp-api" : "yandex-rasp",
  };
}

export async function getStationsSchedule(cityId: CityId): Promise<StationsPayload> {
  const now = moscowNow();
  const hours = upcomingHours(12, now);
  const locs = locationsForCity(cityId, "station");

  const stations = await Promise.all(locs.map((loc) => loadStation(loc, hours, now)));

  let tip: StationsPayload["tip"] = null;
  let best = 0;
  for (const s of stations) {
    const h = s.hours[0];
    if (h && h.longDistance > best) {
      best = h.longDistance;
      tip = {
        station: s.name,
        arriveBy: h.arriveBy,
        exitWindow: h.exitWindow,
        longDistance: h.longDistance,
      };
    }
  }

  return {
    updatedAt: now.toISOString(),
    cityId,
    stations,
    tip,
    source: process.env.YANDEX_RASP_API_KEY ? "yandex-rasp-api" : "yandex-rasp",
    suburbanNote: process.env.YANDEX_RASP_API_KEY
      ? undefined
      : "Электрички — оценка; для точных данных нужен ключ API Яндекс Расписаний",
  };
}
