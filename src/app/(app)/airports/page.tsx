"use client";

import { useCallback, useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { AirportCard } from "@/components/AirportCard";
import { formatPassengers } from "@/lib/schedule-utils";
import type { AirportsPayload } from "@/lib/types";

export default function AirportsPage() {
  const [data, setData] = useState<AirportsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const url = refresh
        ? `/api/airports?refresh=${Date.now()}`
        : "/api/airports?refresh=boot";
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("Не удалось загрузить прилёты");
      const json = (await res.json()) as AirportsPayload;
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
        <h1 className="text-3xl font-extrabold text-white">Аэропорты</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Окна прилётов и поток пассажиров
        </p>

        <div className="mt-4 rounded-2xl border border-[var(--gold)]/40 bg-[var(--card)] px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-[var(--muted)]">Город расчёта</p>
              <p className="text-xl font-bold text-white">Москва</p>
            </div>
            <a href="/profile" className="text-sm font-semibold text-[var(--gold)]">
              Изменить
            </a>
          </div>
          <p className="mt-2 text-[11px] text-[var(--muted)]">
            этот же город используется для подсказок по потоку
          </p>
        </div>

        {data?.tip && (
          <div className="mt-3 flex items-stretch gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-[var(--muted)]">Совет по потоку</p>
              <p className="mt-1 font-semibold text-white">
                {data.tip.airport} · подъехать к {data.tip.arriveBy}
              </p>
              <p className="mt-0.5 text-sm text-[var(--green)]">
                {formatPassengers(data.tip.passengers)} пассажиров
              </p>
            </div>
            <button
              type="button"
              onClick={() => void load(true)}
              disabled={refreshing}
              className="shrink-0 self-center rounded-xl border border-[var(--gold)] px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-[var(--gold)]"
            >
              Обновить
            </button>
          </div>
        )}

        {loading && (
          <p className="mt-8 text-center text-sm text-[var(--muted)]">Загрузка расписания…</p>
        )}
        {error && (
          <p className="mt-6 rounded-xl bg-[#3a1218] px-3 py-2 text-sm text-[#ff8a8a]">{error}</p>
        )}

        <div className="mt-4 space-y-3">
          {data?.airports.map((a) => (
            <AirportCard key={a.id} airport={a} />
          ))}
        </div>

        {data && (
          <p className="mt-4 text-center text-[11px] text-[var(--muted)]">
            Прилёты обновляются по кнопке «Обновить»
          </p>
        )}
      </main>
    </>
  );
}
