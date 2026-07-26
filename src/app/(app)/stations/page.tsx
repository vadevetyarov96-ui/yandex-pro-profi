"use client";

import { useCallback, useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { StationCard } from "@/components/StationCard";
import type { StationsPayload } from "@/lib/types";

export default function StationsPage() {
  const [data, setData] = useState<StationsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/stations", { cache: "no-store" });
      if (!res.ok) throw new Error("Не удалось загрузить расписание");
      const json = (await res.json()) as StationsPayload;
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

  return (
    <>
      <AppHeader onRefresh={() => void load(true)} refreshing={refreshing} />
      <main className="px-4 pb-6 pt-4">
        <h1 className="text-3xl font-extrabold text-white">Вокзалы</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Прибытие → выход через 10–15 мин, около получаса
        </p>

        <div className="mt-4 rounded-2xl border border-[var(--gold)]/40 bg-[var(--card)] px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-[var(--muted)]">Город вокзалов</p>
              <p className="text-xl font-bold text-white">Москва</p>
            </div>
            <a href="/profile" className="text-sm font-semibold text-[var(--gold)]">
              Изменить
            </a>
          </div>
        </div>

        {data?.tip && (
          <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-[var(--gold)]" aria-hidden>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2a3 3 0 0 1 3 3v1h4a1 1 0 0 1 1 1v3H4V7a1 1 0 0 1 1-1h4V5a3 3 0 0 1 3-3Zm-8 9h16v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7Z" />
                </svg>
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-bold text-white">
                  Лучше к {data.tip.arriveBy}
                </p>
                <p className="mt-1 text-sm text-[var(--green)]">
                  {data.tip.station} · выход {data.tip.exitWindow} · {data.tip.longDistance} дальних
                </p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--card-2)] px-3 py-2 text-center">
                <p className="text-lg font-bold text-white">{data.stations.length}</p>
                <p className="text-[11px] text-[var(--muted)]">Вокзалы</p>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--card-2)] px-3 py-2 text-center">
                <p className="text-lg font-bold text-white">
                  {data.stations.reduce((s, x) => s + (x.hours[0]?.longDistance ?? 0), 0)}
                </p>
                <p className="text-[11px] text-[var(--muted)]">Дальние сейчас</p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-5">
          <h2 className="text-base font-semibold text-white">Вокзалы по часам</h2>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            {data ? `${data.stations.length} из ${data.stations.length}` : "—"} · расписание на сутки
          </p>
        </div>

        {loading && (
          <p className="mt-8 text-center text-sm text-[var(--muted)]">Загрузка расписания…</p>
        )}
        {error && (
          <p className="mt-6 rounded-xl bg-[#3a1218] px-3 py-2 text-sm text-[#ff8a8a]">{error}</p>
        )}

        <div className="mt-3 space-y-3">
          {data?.stations.map((s) => (
            <StationCard key={s.id} station={s} />
          ))}
        </div>

        {data && (
          <p className="mt-4 text-center text-[11px] text-[var(--muted)]">
            Поезда и электрички обновляются раз в сутки
          </p>
        )}
      </main>
    </>
  );
}
