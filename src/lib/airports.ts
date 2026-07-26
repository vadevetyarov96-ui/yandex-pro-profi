import type { AirportCardData, AirportsPayload, CityId } from "./types";
import {
  airportExitForLandingHour,
  formatHour,
  hashSeed,
  moscowDateKey,
  moscowNow,
  mulberry32,
  upcomingHours,
} from "./schedule-utils";

const MOSCOW_AIRPORTS = [
  { id: "svo", name: "Шереметьево", code: "SVO", baseFlights: 28, paxPerFlight: 165 },
  { id: "dme", name: "Домодедово", code: "DME", baseFlights: 22, paxPerFlight: 155 },
  { id: "vko", name: "Внуково", code: "VKO", baseFlights: 16, paxPerFlight: 140 },
  { id: "zia", name: "Жуковский", code: "ZIA", baseFlights: 6, paxPerFlight: 120 },
] as const;

function buildAirport(
  meta: (typeof MOSCOW_AIRPORTS)[number],
  hours: number[],
  seedKey: string,
): AirportCardData {
  const rnd = mulberry32(hashSeed("airport", meta.id, seedKey));
  const hourStats = hours.map((hour) => {
    const rush = hour >= 7 && hour <= 10 || hour >= 17 && hour <= 22;
    const night = hour >= 0 && hour <= 5;
    let flights = Math.round(
      meta.baseFlights * (0.35 + rnd() * 0.9) * (rush ? 1.35 : night ? 0.45 : 1),
    );
    flights = Math.max(1, Math.min(55, flights));
    const passengers = Math.round(flights * meta.paxPerFlight * (0.85 + rnd() * 0.25));
    const isPeak = flights >= meta.baseFlights * 1.15;
    const { exitWindow, arriveBy } = airportExitForLandingHour(hour);

    return {
      hour,
      hourLabel: formatHour(hour),
      flights,
      passengers,
      exitWindow,
      arriveBy,
      isPeak,
    };
  });

  const now = hourStats[0];
  const peak = hourStats.some((h) => h.isPeak);

  return {
    id: meta.id,
    name: meta.name,
    code: meta.code,
    hours: hourStats,
    nowFlights: now?.flights ?? 0,
    peak,
    tipArrive: now?.arriveBy,
    tipExit: now?.exitWindow,
  };
}

export function getAirportsSchedule(
  cityId: CityId,
  refreshToken?: string,
): AirportsPayload {
  const now = moscowNow();
  const dateKey = moscowDateKey(now);
  const seedKey = `${dateKey}|${refreshToken ?? "init"}|${Math.floor(now.getTime() / 60000)}`;
  const hours = upcomingHours(12, now);

  const airports =
    cityId === "moscow"
      ? MOSCOW_AIRPORTS.map((a) => buildAirport(a, hours, seedKey))
      : [];

  const top = [...airports].sort((x, y) => y.nowFlights - x.nowFlights)[0];
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
  };
}
