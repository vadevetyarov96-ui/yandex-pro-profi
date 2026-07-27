"use client";

import { useState } from "react";
import { IntervalSchedule } from "@/components/IntervalSchedule";
import type { StationCardData } from "@/lib/types";

export function StationCard({ station }: { station: StationCardData }) {
  const first = station.hours[0];
  const [openHour, setOpenHour] = useState<number | null>(first?.hour ?? null);
  const selected = station.hours.find((h) => h.hour === openHour) ?? null;

  return (
    <article className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
      <div className="flex items-start justify-between gap-3 px-4 pt-4">
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-white">{station.name}</h3>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            {first
              ? `${first.longDistance} дальних · +${first.suburban} электричек`
              : "нет данных"}
            {" · "}
            выход через 10–15 мин, ~30 мин
          </p>
          {first && (
            <p className="mt-1 text-sm text-[var(--gold)]">
              подъехать к {first.arriveBy} · выход {first.exitWindow}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold tabular-nums text-[var(--gold)]">
            {first?.longDistance ?? 0}
          </p>
          <p className="text-[10px] text-[var(--muted)]">дальних</p>
          <p className="text-[10px] text-[var(--muted)]">всего {first?.total ?? 0}</p>
        </div>
      </div>

      <div className="mt-4 px-4 pb-4">
        <p className="mb-2 text-xs font-medium text-[var(--muted)]">
          По часам · нажмите интервал для расписания
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {station.hours.map((h, i) => {
            const active = openHour === h.hour;
            return (
              <button
                key={`${station.id}-${h.hourLabel}`}
                type="button"
                onClick={() => setOpenHour(active ? null : h.hour)}
                className={`flex w-[88px] shrink-0 flex-col items-center rounded-xl border px-2 py-2.5 text-left transition ${
                  active
                    ? "border-[var(--gold)] bg-gradient-to-b from-[#3a2a0a] to-[#1a1208] ring-1 ring-[var(--gold)]/40"
                    : i === 0
                      ? "border-[var(--gold)]/40 bg-gradient-to-b from-[#2a2010] to-[#14100a]"
                      : "border-[var(--border)] bg-[var(--card-2)]"
                }`}
              >
                <span className="text-[10px] text-[var(--muted)]">прибытие</span>
                <span className="text-[12px] font-semibold text-white">{h.hourLabel}</span>
                <span className="mt-1 text-2xl font-bold tabular-nums text-white">
                  {h.longDistance}
                </span>
                <span className="text-[10px] text-[var(--gold)]">дальних</span>
                <span className="text-[10px] text-white/80">всего {h.total}</span>
                <span className="text-[10px] text-[var(--muted)]">Э {h.suburban}</span>
                <span className="mt-1.5 text-center text-[9px] leading-tight text-[var(--green)]">
                  выход
                  <br />
                  {h.exitWindow}
                </span>
                <span className="mt-1 text-center text-[9px] leading-tight text-[var(--muted)]">
                  к {h.arriveBy}
                </span>
              </button>
            );
          })}
        </div>

        {selected && (
          <IntervalSchedule
            hourLabel={selected.hourLabel}
            exitWindow={selected.exitWindow}
            items={selected.items}
            emptyText="В этом часе прибытий нет"
          />
        )}
      </div>
    </article>
  );
}
