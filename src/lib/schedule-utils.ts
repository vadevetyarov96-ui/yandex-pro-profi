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

export function formatPassengers(n: number): string {
  if (n >= 1000) {
    const k = n / 1000;
    const rounded = Math.round(k * 10) / 10;
    return `≈${rounded.toLocaleString("ru-RU", { minimumFractionDigits: rounded % 1 ? 1 : 0, maximumFractionDigits: 1 })}к`;
  }
  return `≈${n}`;
}

/** Next N hours starting from current hour */
export function upcomingHours(count: number, from = new Date()): number[] {
  const start = from.getHours();
  return Array.from({ length: count }, (_, i) => (start + i) % 24);
}

export function moscowDateKey(d = new Date()): string {
  return d.toLocaleDateString("en-CA", { timeZone: "Europe/Moscow" });
}

export function moscowNow(): Date {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Europe/Moscow" }),
  );
}
