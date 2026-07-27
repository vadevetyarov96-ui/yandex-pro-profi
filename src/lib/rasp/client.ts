import type { RaspTransport } from "./locations";

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

interface PageThread {
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

function effectiveAt(thread: PageThread): { at: Date; scheduledAt: Date; status?: string } | null {
  const scheduledRaw = thread.eventDt?.datetime;
  if (!scheduledRaw) return null;
  const scheduledAt = new Date(scheduledRaw);
  if (Number.isNaN(scheduledAt.getTime())) return null;

  const st = thread.status?.status?.toLowerCase();
  if (st === "cancelled" || st === "canceled") return null;

  const actualRaw = thread.status?.actualDt;
  let at = scheduledAt;
  if (actualRaw) {
    const actual = new Date(actualRaw);
    if (!Number.isNaN(actual.getTime())) {
      if (st && st !== "scheduled") at = actual;
    }
  }

  return { at, scheduledAt, status: thread.status?.status };
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

/** Official API (requires YANDEX_RASP_API_KEY). */
export async function fetchArrivalsFromApi(
  stationCode: string,
  transport: RaspTransport,
  date: string,
): Promise<RaspArrival[]> {
  const key = process.env.YANDEX_RASP_API_KEY;
  if (!key) throw new Error("YANDEX_RASP_API_KEY is not set");

  const out: RaspArrival[] = [];
  let offset = 0;
  const limit = 100;

  for (let page = 0; page < 5; page++) {
    const params = new URLSearchParams({
      apikey: key,
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
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Yandex Rasp API HTTP ${res.status}: ${text.slice(0, 200)}`);
    }
    const data = (await res.json()) as {
      schedule?: ApiScheduleItem[];
      pagination?: { total?: number };
    };
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

export async function fetchArrivals(
  location: { raspId: number; code: string },
  transport: RaspTransport,
  date: string,
): Promise<{ arrivals: RaspArrival[]; source: "api" | "page" }> {
  if (process.env.YANDEX_RASP_API_KEY) {
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
