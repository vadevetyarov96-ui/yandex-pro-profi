"use client";

import type { CityEvent } from "@/lib/types";

export function EventCard({ event }: { event: CityEvent }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
      <div className="flex items-start gap-3 px-4 pt-4">
        <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl border border-[var(--gold)]/35 bg-[var(--gold-soft)] text-[var(--gold)]">
          <span className="text-[10px] font-semibold uppercase leading-none tracking-wide opacity-80">
            {event.isTimed ? "старт" : "день"}
          </span>
          <span className="mt-0.5 text-center text-[11px] font-bold leading-tight tabular-nums text-white">
            {event.startTime ?? event.timeLabel}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-md border border-[var(--border)] bg-[var(--card-2)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
              {event.category}
            </span>
            {event.peak && (
              <span className="rounded-md bg-[#5c1218] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#ff6b6b]">
                Спрос
              </span>
            )}
            {event.ageRestriction && (
              <span className="text-[10px] text-[var(--muted)]">{event.ageRestriction}</span>
            )}
          </div>
          <h3 className="mt-1.5 text-base font-bold leading-snug text-white">{event.title}</h3>
          {event.placeName && (
            <p className="mt-1 text-sm font-medium text-[var(--gold)]">{event.placeName}</p>
          )}
        </div>
      </div>

      <div className="space-y-1 px-4 pb-4 pt-3 text-sm text-[var(--muted)]">
        {event.address && <p>{event.address}</p>}
        {event.subway && (
          <p className="text-[var(--green)]">м. {event.subway}</p>
        )}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs">
          <span className="text-white">{event.timeLabel}</span>
          {event.price && <span>{event.price}</span>}
          {event.favoritesCount > 0 && (
            <span title="В избранном у пользователей KudaGo">
              ★ {event.favoritesCount.toLocaleString("ru-RU")}
            </span>
          )}
        </div>
        {event.description && (
          <p className="line-clamp-2 pt-1 text-xs leading-relaxed text-[var(--muted)]">
            {event.description}
          </p>
        )}
        {event.siteUrl && (
          <a
            href={event.siteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block pt-1 text-xs font-semibold text-[var(--gold)] underline-offset-2 hover:underline"
          >
            Подробнее
          </a>
        )}
      </div>
    </article>
  );
}
