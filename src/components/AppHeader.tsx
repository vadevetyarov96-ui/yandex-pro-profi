"use client";

export function AppHeader({
  onRefresh,
  refreshing,
  showRefresh = true,
}: {
  onRefresh?: () => void;
  refreshing?: boolean;
  showRefresh?: boolean;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--bg)]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--gold)] to-[#8a6a10] text-[var(--bg)] shadow-[0_0_20px_rgba(212,160,23,0.25)]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 2 4 5v6c0 5.25 3.4 10.15 8 11.4 4.6-1.25 8-6.15 8-11.4V5l-8-3Zm0 4.2 4.8 1.8v3.9c0 3.35-2.05 6.45-4.8 7.5-2.75-1.05-4.8-4.15-4.8-7.5V8L12 6.2Z" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold tracking-[0.04em] text-[var(--gold)]">
              YANDEX PRO PROFI
            </p>
            <p className="truncate text-[11px] text-[var(--muted)]">куда ехать за заказами</p>
          </div>
        </div>

        {showRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--gold)]/70 bg-[var(--gold-soft)] px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--gold)] transition hover:bg-[var(--gold)]/20 disabled:opacity-60"
          >
            <RefreshIcon spinning={!!refreshing} />
            {refreshing ? "…" : "Обновить"}
          </button>
        )}
      </div>
    </header>
  );
}

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      className={spinning ? "animate-spin" : ""}
      aria-hidden
    >
      <path
        d="M20 12a8 8 0 1 1-2.2-5.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M20 4v5h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
