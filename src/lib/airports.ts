import type { AirportCardData, AirportsPayload, CityId } from "./types";
import {
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

function windowForHour(hour: number) {
  const fromH = (hour + 23) % 24;
  const from = `${String(fromH).padStart(2, "0")}:30`;
  const to = `${String(hour).padStart(2, "0")}:30`;
  return `${from}–${to}`;
}

function buildAirport(
  meta: (typeof MOSCOW_AIRPORTS)[number],
  hours: number[],
  seedKey: string,
): AirportCardData {
  const rnd = mulberry32(hashSeed("airport", meta.id, seedKey));
  const hourStats = hours.map((hour, idx) => {
    const rush = hour >= 7 && hour <= 10 || hour >= 17 && hour <= 22;
    const night = hour >= 0 && hour <= 5;
    let flights = Math.round(
      meta.baseFlights * (0.35 + rnd() * 0.9) * (rush ? 1.35 : night ? 0.45 : 1),
    );
    flights = Math.max(1, Math.min(55, flights));
    const passengers = Math.round(flights * meta.paxPerFlight * (0.85 + rnd() * 0.25));
    const isPeak = flights >= meta.baseFlights * 1.15;
    const arriveMin = 40 + Math.floor(rnd() * 15);
    const exitStart = (hour + 23) % 24;
    const adviceArrive = `${String(exitStart).padStart(2, "0")}:${arriveMin}`;
    const exitEndH = hour;
    const exitEndM = 20 + Math.floor(rnd() * 25);
    const adviceExit = `${String(exitStart).padStart(2, "0")}:30–${String(exitEndH).padStart(2, "0")}:${String(exitEndM).padStart(2, "0")}`;

    return {
      hour,
      hourLabel: formatHour(hour),
      flights,
      passengers,
      windowLabel: windowForHour(hour),
      isPeak,
      adviceArrive: idx === 0 ? adviceArrive : undefined,
      adviceExit: idx === 0 ? adviceExit : undefined,
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
    tipArrive: now?.adviceArrive,
    tipExit: now?.adviceExit,
  };
}

export function getAirportsSchedule(
  cityId: CityId,
  refreshToken?: string,
): AirportsPayload {
  const now = moscowNow();
  const dateKey = moscowDateKey(now);
  // Flights refresh on user action — include refreshToken in seed
  const seedKey = `${dateKey}|${refreshToken ?? "init"}|${Math.floor(now.getTime() / 60000)}`;
  const hours = upcomingHours(12, now);

  const airports =
    cityId === "moscow"
      ? MOSCOW_AIRPORTS.map((a) => buildAirport(a, hours, seedKey))
      : [];

  // Best tip: max passengers in next 3 hours across airports
  let tip: AirportsPayload["tip"] = null;
  let best = 0;
  for (const a of airports) {
    for (const h of a.hours.slice(0, 3)) {
      if (h.passengers > best) {
        best = h.passengers;
        tip = {
          airport: a.name,
          arriveBy: h.adviceArrive ?? h.hourLabel,
          passengers: h.passengers,
        };
      }
    }
  }
  // Prefer first hour advice if available
  const top = [...airports].sort((x, y) => y.nowFlights - x.nowFlights)[0];
  if (top?.tipArrive) {
    tip = {
      airport: top.name,
      arriveBy: top.tipArrive,
      passengers: top.hours[0]?.passengers ?? tip?.passengers ?? 0,
    };
  }

  return {
    updatedAt: now.toISOString(),
    cityId,
    airports,
    tip,
  };
}
