import { AppHeader } from "@/components/AppHeader";

export default function EventsPage() {
  return (
    <>
      <AppHeader showRefresh={false} />
      <main className="px-4 pb-6 pt-4">
        <h1 className="text-3xl font-extrabold text-white">События</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Концерты, спорт и массовые точки спроса
        </p>

        <div className="mt-10 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)] px-6 py-12 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--gold-soft)] text-[var(--gold)]">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
              <rect x="3.5" y="5" width="17" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
              <path d="M3.5 10h17M8 3.5v3M16 3.5v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-lg font-bold text-white">В разработке</p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Скоро здесь появятся события Москвы с окнами пикового спроса для водителей.
          </p>
        </div>
      </main>
    </>
  );
}
