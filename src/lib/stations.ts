import type { CityId, StationCardData, StationsPayload } from "./types";
import {
  formatHour,
  hashSeed,
  moscowDateKey,
  moscowNow,
  mulberry32,
  stationExitForArrivalHour,
  upcomingHours,
} from "./schedule-utils";

const MOSCOW_STATIONS = [
  { id: "vostochny", name: "Восточный вокзал", longBase: 4, subBase: 18 },
  { id: "leningradsky", name: "Ленинградский вокзал", longBase: 8, subBase: 42 },
  { id: "kazansky", name: "Казанский вокзал", longBase: 10, subBase: 38 },
  { id: "yaroslavsky", name: "Ярославский вокзал", longBase: 7, subBase: 45 },
  { id: "kursky", name: "Курский вокзал", longBase: 6, subBase: 40 },
  { id: "kievsky", name: "Киевский вокзал", longBase: 5, subBase: 28 },
  { id: "belorussky", name: "Белорусский вокзал", longBase: 6, subBase: 32 },
  { id: "paveletsky", name: "Павелецкий вокзал", longBase: 5, subBase: 30 },
  { id: "rizhsky", name: "Рижский вокзал", longBase: 2, subBase: 12 },
  { id: "savyolovsky", name: "Савёловский вокзал", longBase: 3, subBase: 22 },
] as const;

function buildStation(
  meta: (typeof MOSCOW_STATIONS)[number],
  hours: number[],
  dateKey: string,
): StationCardData {
  const rnd = mulberry32(hashSeed("station", meta.id, dateKey));
  const hourStats = hours.map((hour) => {
    const rush = hour >= 7 && hour <= 9 || hour >= 17 && hour <= 20;
    const night = hour >= 0 && hour <= 5;
    let longDistance = Math.round(
      meta.longBase * (0.4 + rnd() * 0.9) * (rush ? 1.25 : night ? 0.35 : 1),
    );
    let suburban = Math.round(
      meta.subBase * (0.5 + rnd() * 0.8) * (rush ? 1.4 : night ? 0.25 : 1),
    );
    longDistance = Math.max(0, longDistance);
    suburban = Math.max(0, suburban);
    const { exitWindow, arriveBy } = stationExitForArrivalHour(hour);

    return {
      hour,
      hourLabel: formatHour(hour),
      longDistance,
      suburban,
      total: longDistance + suburban,
      exitWindow,
      arriveBy,
      isPeak: longDistance >= meta.longBase,
    };
  });

  const first = hourStats[0];

  return {
    id: meta.id,
    name: meta.name,
    hours: hourStats,
    longDistanceTotal: hourStats.reduce((s, h) => s + h.longDistance, 0),
    suburbanTotal: hourStats.reduce((s, h) => s + h.suburban, 0),
    tipArrive: first?.arriveBy,
    tipExit: first?.exitWindow,
  };
}

export function getStationsSchedule(cityId: CityId): StationsPayload {
  const now = moscowNow();
  const dateKey = moscowDateKey(now);
  const hours = upcomingHours(12, now);

  const stations =
    cityId === "moscow"
      ? MOSCOW_STATIONS.map((s) => buildStation(s, hours, dateKey))
      : [];

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
    updatedAt: `${dateKey}T00:00:00+03:00`,
    cityId,
    stations,
    tip,
  };
}
