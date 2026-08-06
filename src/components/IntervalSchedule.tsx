"use client";

import { useMemo, useState } from "react";
import type { ScheduleItem } from "@/lib/types";

const STATUS_RU: Record<string, string> = {
  arrived: "прибыл",
  delayed: "задержка",
  estimated: "ожидается",
  landing: "посадка",
  scheduled: "по расписанию",
  cancelled: "отменён",
  canceled: "отменён",
};

function statusLabel(status?: string) {
  if (!status) return null;
  return STATUS_RU[status.toLowerCase()] ?? status;
}

function kindLabel(kind: ScheduleItem["kind"]) {
  if (kind === "plane") return "рейс";
  if (kind === "suburban") return "электр.";
  return "поезд";
}

function scopeLabel(scope?: ScheduleItem["scope"]) {
  if (scope === "international") return "МВЛ";
  if (scope === "domestic") return "ВВЛ";
  return null;
}

function displayTerminal(terminal?: string) {
  if (!terminal) return null;
  const t = terminal.trim();
  if (!t || t.toLowerCase() === "null" || t.toLowerCase() === "undefined") return null;
  return t;
}

export function IntervalSchedule({
  hourLabel,
  exitWindow,
  items,
  emptyText,
  terminalFilter = false,
}: {
  hourLabel: string;
  exitWindow: string;
  items: ScheduleItem[];
  emptyText: string;
  /** Show terminal filter chips (airports) */
  terminalFilter?: boolean;
}) {
  const [terminal, setTerminal] = useState<string>("all");

  const terminals = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      const t = displayTerminal(item.terminal);
      if (t) set.add(t);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "ru"));
  }, [items]);

  const filtered = useMemo(() => {
    if (!terminalFilter || terminal === "all") return items;
    if (terminal === "none") {
      return items.filter((i) => !displayTerminal(i.terminal));
    }
    return items.filter((i) => displayTerminal(i.terminal) === terminal);
  }, [items, terminal, terminalFilter]);

  return (
    <div className="mt-3 rounded-xl border border-[var(--gold)]/30 bg-black/40 px-3 py-3">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-white">Расписание · {hourLabel}</p>
        <p className="text-[11px] text-[var(--muted)]">выход {exitWindow}</p>
      </div>

      {terminalFilter && terminals.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          <FilterChip
            active={terminal === "all"}
            onClick={() => setTerminal("all")}
            label={`Все · ${items.length}`}
          />
          {terminals.map((t) => {
            const count = items.filter((i) => displayTerminal(i.terminal) === t).length;
            return (
              <FilterChip
                key={t}
                active={terminal === t}
                onClick={() => setTerminal(t)}
                label={`${t} · ${count}`}
              />
            );
          })}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="py-2 text-center text-sm text-[var(--muted)]">{emptyText}</p>
      ) : (
        <ul className="ypp-scroll max-h-64 space-y-1.5 overflow-y-auto overscroll-contain pr-1">
          {filtered.map((item) => {
            const st = statusLabel(item.status);
            const term = displayTerminal(item.terminal);
            const scope = scopeLabel(item.scope);
            return (
              <li
                key={item.id}
                className="flex items-start gap-2 rounded-lg border border-[var(--border)] bg-[var(--card-2)] px-2.5 py-2"
              >
                <span className="w-11 shrink-0 text-sm font-bold tabular-nums text-[var(--gold)]">
                  {item.time}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="font-semibold text-white">{item.number}</span>
                    <span className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
                      {kindLabel(item.kind)}
                    </span>
                    {scope && (
                      <span className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
                        {scope}
                      </span>
                    )}
                    {term && (
                      <span className="text-[10px] text-[var(--muted)]">терм. {term}</span>
                    )}
                  </div>
                  {(item.from || item.title) && (
                    <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
                      {item.from ? `из ${item.from}` : item.title}
                    </p>
                  )}
                </div>
                {st && (
                  <span
                    className={`shrink-0 text-[10px] ${
                      item.status?.toLowerCase() === "delayed"
                        ? "text-[#ff8a8a]"
                        : "text-[var(--green)]"
                    }`}
                  >
                    {st}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${
        active
          ? "border-[var(--gold)] bg-[var(--gold-soft)] text-[var(--gold)]"
          : "border-[var(--border)] bg-[var(--card-2)] text-[var(--muted)] hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}
