"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { DataAttribution } from "@/components/DataAttribution";
import { EventCard } from "@/components/EventCard";
import type { EventsPayload } from "@/lib/types";

export default function EventsPage() {
  const [data, setData] = useState<EventsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [dayIndex, setDayIndex] = useState(0);
  const [allDayOpen, setAllDayOpen] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const url = refresh ? `/api/events?refresh=${Date.now()}` : "/api/events";
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Не удалось загрузить события");
      }
      const json = (await res.json()) as EventsPayload;
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  const activeDay = data?.days[dayIndex] ?? data?.days[0] ?? null;

  const { timedEvents, allDayEvents } = useMemo(() => {
    const events = activeDay?.events ?? [];
    return {
      timedEvents: events.filter((e) => e.isTimed),
      // «весь день» + «до HH:MM» — без старта сбоку; под спойлером
      allDayEvents: events.filter((e) => !e.isTimed),
    };
  }, [activeDay]);

  const totalCount = useMemo(
    () => data?.days.reduce((sum, d) => sum + d.events.length, 0) ?? 0,
    [data],
  );

  const selectDay = useCallback((index: number) => {
    setDayIndex(index);
    setAllDayOpen(false);
  }, []);

  return (
    <>
      <AppHeader onRefresh={() => void load(true)} refreshing={refreshing} />
      <main className="px-4 pb-6 pt-4">
        <h1 className="text-3xl font-extrabold text-white">События</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Концерты, спорт и массовые точки спроса
        </p>

        <div className="mt-4 rounded-2xl border border-[var(--gold)]/40 bg-[var(--card)] px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-[var(--muted)]">Город событий</p>
              <p className="text-xl font-bold text-white">{data?.cityName ?? "Москва"}</p>
            </div>
            <a href="/profile" className="text-sm font-semibold text-[var(--gold)]">
              Изменить
            </a>
          </div>
        </div>

        {data?.tip && (
          <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
            <p className="text-xs text-[var(--muted)]">Точка спроса</p>
            <p className="mt-1 text-lg font-bold text-white">{data.tip.title}</p>
            <p className="mt-1 text-sm text-[var(--gold)]">
              {data.tip.dayLabel} · {data.tip.timeLabel} · {data.tip.place}
            </p>
            {data.tip.subway && (
              <p className="mt-0.5 text-sm text-[var(--green)]">м. {data.tip.subway}</p>
            )}
          </div>
        )}

        {data && (
          <div
            className="ypp-scroll mt-4 flex gap-2 overflow-x-auto pb-1"
            role="tablist"
            aria-label="Дни событий"
          >
            {data.days.map((day, index) => {
              const active = (activeDay?.dateKey ?? "") === day.dateKey;
              return (
                <button
                  key={day.dateKey}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => selectDay(index)}
                  className={`min-w-[7.5rem] shrink-0 rounded-xl border px-3 py-2.5 text-left transition ${
                    active
                      ? "border-[var(--gold)] bg-gradient-to-b from-[#3a2a0a] to-[#1a1208] ring-1 ring-[var(--gold)]/40"
                      : "border-[var(--border)] bg-[var(--card)]"
                  }`}
                >
                  <p className="text-sm font-bold text-white">{day.label}</p>
                  <p className="mt-0.5 text-[11px] capitalize text-[var(--muted)]">
                    {day.weekday}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-[var(--gold)]">
                    {day.events.length}{" "}
                    {pluralEvents(day.events.length)}
                  </p>
                </button>
              );
            })}
          </div>
        )}

        {loading && (
          <p className="mt-8 text-center text-sm text-[var(--muted)]">Загрузка событий…</p>
        )}
        {error && (
          <p className="mt-6 rounded-xl bg-[#3a1218] px-3 py-2 text-sm text-[#ff8a8a]">{error}</p>
        )}

        {!loading && !error && activeDay && (
          <>
            <div className="mt-5 flex items-end justify-between gap-3">
              <h2 className="text-base font-semibold text-white">
                {activeDay.label}
                <span className="ml-2 text-sm font-normal capitalize text-[var(--muted)]">
                  {activeDay.weekday}
                </span>
              </h2>
              <p className="text-xs text-[var(--muted)]">
                всего за 3 дня: {totalCount}
              </p>
            </div>

            <div className="mt-3 space-y-3">
              {activeDay.events.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)] px-6 py-10 text-center">
                  <p className="font-semibold text-white">Событий не найдено</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    На этот день в афише пока пусто
                  </p>
                </div>
              ) : (
                <>
                  {timedEvents.map((event) => (
                    <EventCard key={`${activeDay.dateKey}-${event.id}`} event={event} />
                  ))}

                  {allDayEvents.length > 0 && (
                    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
                      <button
                        type="button"
                        aria-expanded={allDayOpen}
                        onClick={() => setAllDayOpen((v) => !v)}
                        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-[var(--card-2)]"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white">Весь день</p>
                          <p className="mt-0.5 text-xs text-[var(--muted)]">
                            {allDayEvents.length}{" "}
                            {pluralEvents(allDayEvents.length)}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 text-[var(--gold)] transition-transform duration-200 ${
                            allDayOpen ? "rotate-180" : ""
                          }`}
                          aria-hidden
                        >
                          ▾
                        </span>
                      </button>
                      {allDayOpen && (
                        <div className="space-y-3 border-t border-[var(--border)] px-3 py-3">
                          {allDayEvents.map((event) => (
                            <EventCard
                              key={`${activeDay.dateKey}-${event.id}`}
                              event={event}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}

        {data && (
          <DataAttribution
            sourceName="KudaGo"
            sourceUrl="https://kudago.com/"
            note="афиша города на 3 дня"
          />
        )}
      </main>
    </>
  );
}

function pluralEvents(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "событие";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "события";
  return "событий";
}
