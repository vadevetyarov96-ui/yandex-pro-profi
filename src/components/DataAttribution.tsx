export function DataAttribution({ note }: { note?: string }) {
  return (
    <p className="mt-4 text-center text-[11px] leading-relaxed text-[var(--muted)]">
      Данные:{" "}
      <a
        href="https://rasp.yandex.ru/"
        target="_blank"
        rel="noopener noreferrer"
        className="text-[var(--gold)] underline-offset-2 hover:underline"
      >
        Яндекс Расписания
      </a>
      {note ? ` · ${note}` : null}
    </p>
  );
}
