export function DataAttribution({
  note,
  sourceName = "Яндекс Расписания",
  sourceUrl = "https://rasp.yandex.ru/",
}: {
  note?: string;
  sourceName?: string;
  sourceUrl?: string;
}) {
  return (
    <p className="mt-4 text-center text-[11px] leading-relaxed text-[var(--muted)]">
      Данные:{" "}
      <a
        href={sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[var(--gold)] underline-offset-2 hover:underline"
      >
        {sourceName}
      </a>
      {note ? ` · ${note}` : null}
    </p>
  );
}
