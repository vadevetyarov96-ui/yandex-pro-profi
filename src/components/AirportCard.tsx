"use client";

import { useState } from "react";
import { IntervalSchedule } from "@/components/IntervalSchedule";
import { formatPassengers } from "@/lib/schedule-utils";
import type { AirportCardData } from "@/lib/types";

export function AirportCard({ airport }: { airport: AirportCardData }) {
  const [openHour, setOpenHour] = useState<number | null>(airport.hours[0]?.hour ?? null);
  const selected = airport.hours.find((h) => h.hour === openHour) ?? null;

  return (
    <article className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
      <div className="flex items-start justify-between gap-3 px-4 pt-4">
        <div>
          <h3 className="text-lg font-bold text-white">{airport.name}</h3>
          <p className="mt-0.5 text-xs text-[var(--muted)]">{airport.code}</p>
        </div>
        {airport.peak && (
          <span className="rounded-md bg-[#5c1218] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#ff6b6b]">
            Пик
          </span>
        )}
      </div>

      <div className="mt-3 flex items-end justify-between gap-3 px-4">
        <div>
          <p className="text-3xl font-bold tabular-nums text-white">
            {airport.nowFlights}{" "}
            <span className="text-base font-medium text-[var(--muted)]">рейсов</span>
          </p>
          {airport.tipArrive && airport.tipExit && (
            <p className="mt-1 text-sm text-[var(--gold)]">
              подъехать к {airport.tipArrive} · выход {airport.tipExit}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 px-4 pb-4">
        <div className="ypp-scroll flex gap-2 overflow-x-auto pb-2">
          {airport.hours.map((h, i) => {
            const active = openHour === h.hour;
            return (
              <button
                key={`${airport.id}-${h.hourLabel}`}
                type="button"
                onClick={() => setOpenHour(active ? null : h.hour)}
                className={`flex w-[88px] shrink-0 flex-col items-center rounded-xl border px-2 py-2.5 text-left transition ${
                  active
                    ? "border-[var(--gold)] bg-gradient-to-b from-[#3a2a0a] to-[#1a1208] ring-1 ring-[var(--gold)]/40"
                    : i === 0
                      ? "border-[var(--gold)]/40 bg-gradient-to-b from-[#2a2010] to-[#14100a]"
                      : h.isPeak
                        ? "border-[#5c1218] bg-gradient-to-b from-[#3a1218] to-[#1a0a0c]"
                        : "border-[var(--border)] bg-[var(--card-2)]"
                }`}
              >
                <span className="text-[10px] text-[var(--muted)]">посадка</span>
                <span className="text-[12px] font-semibold text-white">{h.hourLabel}</span>
                <span className="mt-1 text-2xl font-bold tabular-nums text-white">{h.flights}</span>
                <span className="text-[10px] text-[var(--gold)]">
                  {formatPassengers(h.passengers)}
                </span>
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
            emptyText="В этом часе прилётов нет"
            terminalFilter
          />
        )}
      </div>
    </article>
  );
}
