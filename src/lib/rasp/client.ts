import type { RaspTransport } from "./locations";
import { moscowDateKey } from "@/lib/schedule-utils";

export interface RaspArrival {
  number: string;
  transportType: RaspTransport;
  /** Effective arrival time (with delay if known) */
  at: Date;
  scheduledAt: Date;
  status?: string;
  terminal?: string;
  /** Откуда / маршрут */
  from?: string;
  title?: string;
}

export interface ScheduleItemDto {
  id: string;
  time: string;
  number: string;
  from?: string;
  title?: string;
  terminal?: string;
  status?: string;
  kind: RaspTransport;
}

export interface PageThread {
  number?: string;
  transportType?: string;
  eventDt?: { time?: string; datetime?: string };
  status?: {
    status?: string;
    actualDt?: string;
    actualTerminalName?: string;
  };
  terminalName?: string;
  isSupplement?: boolean;
  routeStations?: Array<{ title?: string; settlement?: string; iataCode?: string }>;
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

type KeyState = { day: string; exhausted: Set<string> };

const g = globalThis as typeof globalThis & {
  __yppRaspKeyState?: KeyState;
};

function keyState(): KeyState {
  const day = moscowDateKey();
  if (!g.__yppRaspKeyState || g.__yppRaspKeyState.day !== day) {
    g.__yppRaspKeyState = { day, exhausted: new Set() };
  }
  return g.__yppRaspKeyState;
}

function availableApiKeys(): string[] {
  const keys = [
    process.env.YANDEX_RASP_API_KEY,
    process.env.YANDEX_RASP_API_KEY_BACKUP,
  ].filter((k): k is string => Boolean(k && k.trim()));
  const state = keyState();
  const usable = keys.filter((k) => !state.exhausted.has(k));
  return usable.length > 0 ? usable : keys;
}

function markKeyExhausted(key: string) {
  keyState().exhausted.add(key);
}

function isLimitError(status: number, body: string): boolean {
  if (status === 429) return true;
  const t = body.toLowerCase();
  return (
    t.includes("лимит") ||
    t.includes("limit") ||
    t.includes("quota") ||
    t.includes("exceed") ||
    t.includes("too many") ||
    t.includes("rate")
  );
}

class RaspApiLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RaspApiLimitError";
  }
}

function parseInitialState(html: string): { station?: { threads?: PageThread[]; title?: string } } {
  const marker = "window.INITIAL_STATE = ";
  const idx = html.indexOf(marker);
  if (idx < 0) throw new Error("Yandex Rasp: INITIAL_STATE not found");
  const jsonStart = idx + marker.length;
  let depth = 0;
  let end = -1;
  for (let i = jsonStart; i < html.length; i++) {
    const ch = html[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  if (end < 0) throw new Error("Yandex Rasp: failed to parse INITIAL_STATE");
  return JSON.parse(html.slice(jsonStart, end)) as {
    station?: { threads?: PageThread[]; title?: string };
  };
}

/** True when the board marks the flight/train as cancelled. */
export function isCancelledStatus(status?: string | null): boolean {
  if (!status) return false;
  const st = status.toLowerCase();
  return (
    st === "cancelled" ||
    st === "canceled" ||
    st.includes("cancel") ||
    st.includes("отмен")
  );
}

/**
 * Slot time from the public station board.
 * Cancelled → drop. Prefer live/estimated `actualDt` so delayed flights
 * move into the hour they will actually land (not the planned one).
 */
export function effectiveAt(
  thread: PageThread,
): { at: Date; scheduledAt: Date; status?: string } | null {
  const scheduledRaw = thread.eventDt?.datetime;
  if (!scheduledRaw) return null;
  const scheduledAt = new Date(scheduledRaw);
  if (Number.isNaN(scheduledAt.getTime())) return null;

  const status = thread.status?.status;
  if (isCancelledStatus(status)) return null;

  const actualRaw = thread.status?.actualDt;
  let at = scheduledAt;
  if (actualRaw) {
    const actual = new Date(actualRaw);
    if (!Number.isNaN(actual.getTime())) {
      at = actual;
    }
  }

  return { at, scheduledAt, status };
}

function mapTransport(t?: string): RaspTransport | null {
  if (t === "plane" || t === "train" || t === "suburban") return t;
  return null;
}

function cleanTerminal(value?: string | null): string | undefined {
  if (value == null) return undefined;
  const s = String(value).trim();
  if (!s) return undefined;
  const lower = s.toLowerCase();
  if (lower === "null" || lower === "undefined" || lower === "none" || lower === "-") {
    return undefined;
  }
  return s;
}

function fromLabel(thread: PageThread): string | undefined {
  const first = thread.routeStations?.[0];
  if (!first) return undefined;
  return first.settlement || first.title;
}

/** Public station page (no API key). Good for plane + long-distance train. */
export async function fetchArrivalsFromPage(
  raspId: number,
  opts?: { transport?: RaspTransport },
): Promise<RaspArrival[]> {
  const url = `https://rasp.yandex.ru/station/${raspId}/?event=arrival`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      "Accept-Language": "ru-RU,ru;q=0.9",
      Accept: "text/html,application/xhtml+xml",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Yandex Rasp page HTTP ${res.status} for station ${raspId}`);
  }
  const html = await res.text();
  const state = parseInitialState(html);
  const threads = state.station?.threads ?? [];
  const out: RaspArrival[] = [];

  for (const thread of threads) {
    if (thread.isSupplement) continue;
    const transportType = mapTransport(thread.transportType);
    if (!transportType) continue;
    if (opts?.transport && transportType !== opts.transport) continue;
    const times = effectiveAt(thread);
    if (!times) continue;
    out.push({
      number: thread.number ?? "—",
      transportType,
      at: times.at,
      scheduledAt: times.scheduledAt,
      status: times.status,
      terminal: cleanTerminal(thread.status?.actualTerminalName ?? thread.terminalName),
      from: fromLabel(thread),
    });
  }

  return out;
}

interface ApiScheduleItem {
  arrival?: string;
  departure?: string;
  thread?: {
    number?: string;
    title?: string;
    short_title?: string;
    transport_type?: string;
  };
  terminal?: string | null;
  platform?: string | null;
}

async function fetchArrivalsFromApiWithKey(
  apiKey: string,
  stationCode: string,
  transport: RaspTransport,
  date: string,
): Promise<RaspArrival[]> {
  const out: RaspArrival[] = [];
  let offset = 0;
  const limit = 100;

  for (let page = 0; page < 5; page++) {
    const params = new URLSearchParams({
      apikey: apiKey,
      station: stationCode,
      lang: "ru_RU",
      format: "json",
      date,
      event: "arrival",
      transport_types: transport,
      limit: String(limit),
      offset: String(offset),
    });

    const url = `https://api.rasp.yandex.net/v3.0/schedule/?${params}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const text = await res.text();
    if (!res.ok) {
      if (isLimitError(res.status, text)) {
        throw new RaspApiLimitError(`HTTP ${res.status}: ${text.slice(0, 200)}`);
      }
      throw new Error(`Yandex Rasp API HTTP ${res.status}: ${text.slice(0, 200)}`);
    }

    let data: {
      schedule?: ApiScheduleItem[];
      pagination?: { total?: number };
      error?: { text?: string };
    };
    try {
      data = JSON.parse(text) as typeof data;
    } catch {
      throw new Error(`Yandex Rasp API invalid JSON: ${text.slice(0, 200)}`);
    }

    if (data.error?.text && isLimitError(200, data.error.text)) {
      throw new RaspApiLimitError(data.error.text);
    }

    const batch = data.schedule ?? [];
    for (const item of batch) {
      const raw = item.arrival;
      if (!raw) continue;
      const at = new Date(raw);
      if (Number.isNaN(at.getTime())) continue;
      const transportType = mapTransport(item.thread?.transport_type) ?? transport;
      const title = item.thread?.short_title || item.thread?.title;
      const from = title?.includes(" — ")
        ? title.split(" — ")[0]
        : title?.includes(" - ")
          ? title.split(" - ")[0]
          : undefined;
      out.push({
        number: item.thread?.number ?? "—",
        transportType,
        at,
        scheduledAt: at,
        terminal: cleanTerminal(item.terminal ?? item.platform),
        title,
        from,
      });
    }

    offset += batch.length;
    const total = data.pagination?.total ?? offset;
    if (batch.length < limit || offset >= total) break;
  }

  return out;
}

/** Official API with primary → backup key failover on daily limit. */
export async function fetchArrivalsFromApi(
  stationCode: string,
  transport: RaspTransport,
  date: string,
): Promise<RaspArrival[]> {
  const keys = availableApiKeys();
  if (keys.length === 0) throw new Error("YANDEX_RASP_API_KEY is not set");

  let lastError: Error | null = null;
  for (const key of keys) {
    try {
      return await fetchArrivalsFromApiWithKey(key, stationCode, transport, date);
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      if (e instanceof RaspApiLimitError) {
        markKeyExhausted(key);
        console.warn("Yandex Rasp API key limit reached, trying next key");
        continue;
      }
      throw lastError;
    }
  }

  throw lastError ?? new Error("Yandex Rasp API: all keys failed");
}

export async function fetchArrivals(
  location: { raspId: number; code: string },
  transport: RaspTransport,
  date: string,
): Promise<{ arrivals: RaspArrival[]; source: "api" | "page" }> {
  // Official API is planned timetable only (no delays/cancels). Airport tips
  // need the live board from the public page so flights move to the real slot.
  if (transport === "plane") {
    try {
      const arrivals = await fetchArrivalsFromPage(location.raspId, {
        transport: "plane",
      });
      return { arrivals, source: "page" };
    } catch (pageErr) {
      console.error("Yandex Rasp page failed for plane, trying API", pageErr);
      if (process.env.YANDEX_RASP_API_KEY || process.env.YANDEX_RASP_API_KEY_BACKUP) {
        try {
          const arrivals = await fetchArrivalsFromApi(location.code, transport, date);
          return { arrivals, source: "api" };
        } catch (e) {
          console.error("Yandex Rasp API also failed for plane", e);
        }
      }
      throw pageErr instanceof Error ? pageErr : new Error(String(pageErr));
    }
  }

  if (process.env.YANDEX_RASP_API_KEY || process.env.YANDEX_RASP_API_KEY_BACKUP) {
    try {
      const arrivals = await fetchArrivalsFromApi(location.code, transport, date);
      return { arrivals, source: "api" };
    } catch (e) {
      console.error("Yandex Rasp API failed, falling back to page", e);
    }
  }

  const arrivals = await fetchArrivalsFromPage(location.raspId, {
    transport: transport === "suburban" ? undefined : transport,
  });
  const filtered =
    transport === "suburban"
      ? arrivals.filter((a) => a.transportType === "suburban")
      : arrivals.filter((a) => a.transportType === transport);

  return { arrivals: filtered, source: "page" };
}

export function toScheduleItemDto(a: RaspArrival): ScheduleItemDto {
  const time = a.at.toLocaleTimeString("ru-RU", {
    timeZone: "Europe/Moscow",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return {
    id: `${a.number}-${a.at.toISOString()}`,
    time,
    number: a.number,
    from: a.from,
    title: a.title,
    terminal: cleanTerminal(a.terminal),
    status: a.status,
    kind: a.transportType,
  };
}
