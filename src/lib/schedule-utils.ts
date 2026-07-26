/** Deterministic PRNG for stable mock schedules */
export function mulberry32(seed: number) {
  let t = seed >>> 0;
  return function next() {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(...parts: (string | number)[]): number {
  const s = parts.join("|");
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function formatHour(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

/** Format HH:MM from total minutes since midnight (wraps 24h). */
export function formatClock(totalMinutes: number): string {
  const m = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

export function formatRange(fromMin: number, toMin: number): string {
  return `${formatClock(fromMin)}–${formatClock(toMin)}`;
}

/**
 * Airport: plane lands at hour H → passengers exit ~+30…+75 min.
 * Example: 16:00 → выход 16:30–17:15, подъехать к 16:30.
 */
export function airportExitForLandingHour(hour: number) {
  const land = hour * 60;
  const exitFrom = land + 30;
  const exitTo = land + 75;
  return {
    exitWindow: formatRange(exitFrom, exitTo),
    arriveBy: formatClock(exitFrom),
  };
}

/**
 * Station: train arrives at hour H → exit starts in 10–15 min, lasts ~30 min.
 * Example: 16:00 → выход 16:10–16:45, подъехать к 16:10.
 */
export function stationExitForArrivalHour(hour: number) {
  const arrive = hour * 60;
  const exitFrom = arrive + 10;
  const exitTo = arrive + 45;
  return {
    exitWindow: formatRange(exitFrom, exitTo),
    arriveBy: formatClock(exitFrom),
  };
}

export function formatPassengers(n: number): string {
  if (n >= 1000) {
    const k = n / 1000;
    const rounded = Math.round(k * 10) / 10;
    return `≈${rounded.toLocaleString("ru-RU", { minimumFractionDigits: rounded % 1 ? 1 : 0, maximumFractionDigits: 1 })}к`;
  }
  return `≈${n}`;
}

/** Next N hours starting from current Moscow hour */
export function upcomingHours(count: number, from = new Date()): number[] {
  const start = moscowHour(from);
  return Array.from({ length: count }, (_, i) => (start + i) % 24);
}

export function moscowDateKey(d = new Date()): string {
  return d.toLocaleDateString("en-CA", { timeZone: "Europe/Moscow" });
}

export function moscowHour(d = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Moscow",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(d);
  return Number(parts.find((p) => p.type === "hour")?.value ?? "0");
}

/** Moscow observes permanent UTC+3 */
export function moscowWallTime(
  dateKey: string,
  hour: number,
  minute = 0,
  second = 0,
): Date {
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  const ss = String(second).padStart(2, "0");
  return new Date(`${dateKey}T${hh}:${mm}:${ss}+03:00`);
}

export function moscowNow(): Date {
  return new Date();
}
