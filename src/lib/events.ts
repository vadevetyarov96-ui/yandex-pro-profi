import { getCity } from "@/lib/cities";
import { fetchKudaGoEvents, type KudaGoDateSlot, type KudaGoEvent } from "@/lib/kudago/client";
import { moscowDateKey, moscowWallTime } from "@/lib/schedule-utils";
import type { CityEvent, CityId, EventsDayBucket, EventsPayload } from "@/lib/types";

const LOCATION_BY_CITY: Record<CityId, string> = {
  moscow: "msk",
};

const CATEGORY_LABELS: Record<string, string> = {
  concert: "Концерт",
  theater: "Спектакль",
  festival: "Фестиваль",
  party: "Вечеринка",
  exhibition: "Выставка",
  entertainment: "Развлечения",
  kids: "Детям",
  education: "Обучение",
  recreation: "Активный отдых",
  tour: "Экскурсия",
  cinema: "Кино",
  holiday: "Праздник",
  quest: "Квест",
  stock: "Акция",
  shopping: "Шопинг",
  fashion: "Мода",
  photo: "Фото",
  other: "Разное",
  "business-events": "Бизнес",
  "social-activity": "Благотворительность",
  "wellness-and-health": "Здоровье",
  "yarmarki-razvlecheniya-yarmarki": "Ярмарка",
};

const DAY_LABELS = ["Сегодня", "Завтра", "Послезавтра"] as const;

function addDays(dateKey: string, days: number): string {
  const base = moscowWallTime(dateKey, 12, 0, 0);
  const next = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
  return moscowDateKey(next);
}

function dayUnixBounds(dateKey: string): { start: number; end: number } {
  const startMs = moscowWallTime(dateKey, 0, 0, 0).getTime();
  const endMs = moscowWallTime(addDays(dateKey, 1), 0, 0, 0).getTime();
  return {
    start: Math.floor(startMs / 1000),
    end: Math.floor(endMs / 1000),
  };
}

function formatMoscowClock(unixSec: number): string {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(unixSec * 1000));
}

function formatWeekday(dateKey: string): string {
  const d = moscowWallTime(dateKey, 12, 0, 0);
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    weekday: "short",
    day: "numeric",
    month: "long",
  }).format(d);
}

function capitalizeTitle(title: string): string {
  const t = title.trim();
  if (!t) return t;
  return t.charAt(0).toLocaleUpperCase("ru-RU") + t.slice(1);
}

function stripHtml(text: string | undefined): string | null {
  if (!text) return null;
  const cleaned = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return cleaned || null;
}

function categoryLabel(categories: string[] | undefined): string {
  const first = categories?.[0];
  if (!first) return "Событие";
  return CATEGORY_LABELS[first] ?? first;
}

function normalizeSlot(slot: KudaGoDateSlot): { start: number; end: number } | null {
  if (!Number.isFinite(slot.start) || slot.start < 0) return null;
  let end = Number.isFinite(slot.end) ? slot.end : slot.start;
  if (end < slot.start) end = slot.start;
  return { start: slot.start, end };
}

function slotIntersectsDay(
  slot: { start: number; end: number },
  dayStart: number,
  dayEnd: number,
): boolean {
  if (slot.end === slot.start) {
    return slot.start >= dayStart && slot.start < dayEnd;
  }
  return slot.start < dayEnd && slot.end > dayStart;
}

function timeForDay(
  slot: { start: number; end: number },
  dayStart: number,
  dayEnd: number,
): Pick<CityEvent, "startTime" | "endTime" | "timeLabel" | "isTimed"> {
  const duration = slot.end - slot.start;
  const pointLike = duration === 0 || duration < 60 * 60;

  if (pointLike && slot.start >= dayStart && slot.start < dayEnd) {
    const t = formatMoscowClock(slot.start);
    return { startTime: t, endTime: null, timeLabel: t, isTimed: true };
  }

  const startsToday = slot.start >= dayStart && slot.start < dayEnd;
  const endsToday = slot.end > dayStart && slot.end <= dayEnd;
  const spansFull = slot.start < dayStart && slot.end >= dayEnd;

  if (startsToday && endsToday) {
    const from = formatMoscowClock(slot.start);
    const to = formatMoscowClock(slot.end);
    return {
      startTime: from,
      endTime: to,
      timeLabel: from === to ? from : `${from}–${to}`,
      isTimed: true,
    };
  }
  if (startsToday) {
    const from = formatMoscowClock(slot.start);
    // Openers at midnight that run through the day read better as all-day
    if (from === "00:00" && slot.end >= dayEnd) {
      return { startTime: null, endTime: null, timeLabel: "весь день", isTimed: false };
    }
    return { startTime: from, endTime: null, timeLabel: `с ${from}`, isTimed: true };
  }
  if (endsToday) {
    const to = formatMoscowClock(slot.end);
    return { startTime: null, endTime: to, timeLabel: `до ${to}`, isTimed: false };
  }
  if (spansFull) {
    return { startTime: null, endTime: null, timeLabel: "весь день", isTimed: false };
  }

  // Fallback: intersection on edges
  const from = formatMoscowClock(Math.max(slot.start, dayStart));
  return { startTime: from, endTime: null, timeLabel: from, isTimed: true };
}

function pickSlotForDay(
  event: KudaGoEvent,
  dayStart: number,
  dayEnd: number,
): { start: number; end: number } | null {
  const slots = (event.dates ?? [])
    .map(normalizeSlot)
    .filter((s): s is { start: number; end: number } => !!s)
    .filter((s) => slotIntersectsDay(s, dayStart, dayEnd));

  if (!slots.length) return null;

  // Prefer a slot that starts on this day, then earliest start
  slots.sort((a, b) => {
    const aStarts = a.start >= dayStart && a.start < dayEnd ? 0 : 1;
    const bStarts = b.start >= dayStart && b.start < dayEnd ? 0 : 1;
    if (aStarts !== bStarts) return aStarts - bStarts;
    return a.start - b.start;
  });
  return slots[0]!;
}

function mapEventForDay(
  event: KudaGoEvent,
  dayStart: number,
  dayEnd: number,
): CityEvent | null {
  const slot = pickSlotForDay(event, dayStart, dayEnd);
  if (!slot) return null;

  const time = timeForDay(slot, dayStart, dayEnd);
  const place = event.place;
  const favorites = event.favorites_count ?? 0;

  return {
    id: String(event.id),
    title: capitalizeTitle(event.title),
    category: categoryLabel(event.categories),
    categories: event.categories ?? [],
    ...time,
    placeName: place?.title ? capitalizeTitle(place.title) : null,
    address: place?.address?.trim() || null,
    subway: place?.subway?.trim() || null,
    price: event.is_free ? "бесплатно" : event.price?.trim() || null,
    isFree: Boolean(event.is_free),
    favoritesCount: favorites,
    ageRestriction: event.age_restriction ?? null,
    siteUrl: event.site_url ?? null,
    description: stripHtml(event.description),
    peak: favorites >= 200,
  };
}

function sortDayEvents(events: CityEvent[]): CityEvent[] {
  return [...events].sort((a, b) => {
    if (a.isTimed !== b.isTimed) return a.isTimed ? -1 : 1;
    if (a.isTimed && b.isTimed) {
      const ta = a.startTime ?? a.timeLabel;
      const tb = b.startTime ?? b.timeLabel;
      if (ta !== tb) return ta.localeCompare(tb, "ru");
    }
    if (b.favoritesCount !== a.favoritesCount) {
      return b.favoritesCount - a.favoritesCount;
    }
    return a.title.localeCompare(b.title, "ru");
  });
}

const DEMAND_CATEGORIES = new Set([
  "Концерт",
  "Спектакль",
  "Фестиваль",
  "Вечеринка",
  "Праздник",
  "Ярмарка",
]);

function buildTip(days: EventsDayBucket[]): EventsPayload["tip"] {
  const candidates: Array<{
    dayLabel: string;
    dayIndex: number;
    event: CityEvent;
  }> = [];

  days.forEach((day, dayIndex) => {
    for (const event of day.events) {
      if (!event.placeName) continue;
      // Prefer concrete sessions that create a pickup wave
      if (!event.isTimed) continue;
      candidates.push({ dayLabel: day.label, dayIndex, event });
    }
  });

  candidates.sort((a, b) => {
    const score = (c: (typeof candidates)[number]) => {
      const dayWeight = [4000, 2000, 1000][c.dayIndex] ?? 0;
      const catBonus = DEMAND_CATEGORIES.has(c.event.category) ? 250 : 0;
      return dayWeight + c.event.favoritesCount + catBonus;
    };
    return score(b) - score(a);
  });

  const best = candidates[0];
  if (!best) return null;

  return {
    title: best.event.title,
    place: best.event.placeName ?? "площадка",
    timeLabel: best.event.timeLabel,
    dayLabel: best.dayLabel,
    subway: best.event.subway,
  };
}

export async function getCityEvents(cityId: CityId): Promise<EventsPayload> {
  const city = getCity(cityId);
  const location = LOCATION_BY_CITY[cityId];
  if (!location) {
    throw new Error(`События для города ${cityId} пока не поддерживаются`);
  }

  const todayKey = moscowDateKey();
  const dayKeys = [0, 1, 2].map((offset) => addDays(todayKey, offset));
  const rangeStart = dayUnixBounds(dayKeys[0]!).start;
  const rangeEnd = dayUnixBounds(dayKeys[2]!).end;

  const raw = await fetchKudaGoEvents({
    location,
    actualSince: rangeStart,
    actualUntil: rangeEnd,
  });

  const days: EventsDayBucket[] = dayKeys.map((dateKey, index) => {
    const { start, end } = dayUnixBounds(dateKey);
    const events = sortDayEvents(
      raw
        .map((ev) => mapEventForDay(ev, start, end))
        .filter((ev): ev is CityEvent => !!ev),
    );

    return {
      dateKey,
      label: DAY_LABELS[index]!,
      weekday: formatWeekday(dateKey),
      events,
    };
  });

  return {
    updatedAt: new Date().toISOString(),
    cityId,
    cityName: city.name,
    days,
    tip: buildTip(days),
    source: "kudago",
  };
}
