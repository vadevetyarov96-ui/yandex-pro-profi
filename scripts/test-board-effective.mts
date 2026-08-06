import { effectiveAt, isCancelledStatus, type PageThread } from "../src/lib/rasp/client.ts";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(isCancelledStatus("cancelled"), "cancelled");
assert(isCancelledStatus("Canceled"), "Canceled");
assert(isCancelledStatus("flight_cancelled"), "flight_cancelled");
assert(isCancelledStatus("Отменён"), "Отменён");
assert(!isCancelledStatus("delayed"), "delayed not cancel");
assert(!isCancelledStatus("scheduled"), "scheduled not cancel");

const cancelled = effectiveAt({
  eventDt: { datetime: "2026-08-06T12:00:00+03:00" },
  status: { status: "cancelled" },
} satisfies PageThread);
assert(cancelled === null, "cancelled dropped");

const delayed = effectiveAt({
  eventDt: { datetime: "2026-08-06T12:00:00+03:00" },
  status: {
    status: "delayed",
    actualDt: "2026-08-06T13:40:00+03:00",
  },
} satisfies PageThread);
assert(delayed, "delayed kept");
assert(delayed!.at.toISOString() === new Date("2026-08-06T13:40:00+03:00").toISOString(), "delayed uses actual");
assert(delayed!.scheduledAt.toISOString() === new Date("2026-08-06T12:00:00+03:00").toISOString(), "keeps scheduled");

// Even if status stays "scheduled", prefer actualDt when the board provides it
const estimated = effectiveAt({
  eventDt: { datetime: "2026-08-06T12:00:00+03:00" },
  status: {
    status: "scheduled",
    actualDt: "2026-08-06T12:55:00+03:00",
  },
} satisfies PageThread);
assert(
  estimated!.at.toISOString() === new Date("2026-08-06T12:55:00+03:00").toISOString(),
  "actualDt wins over scheduled status",
);

const onTime = effectiveAt({
  eventDt: { datetime: "2026-08-06T12:00:00+03:00" },
  status: { status: "scheduled" },
} satisfies PageThread);
assert(
  onTime!.at.toISOString() === new Date("2026-08-06T12:00:00+03:00").toISOString(),
  "no actual keeps planned",
);

console.log("ok: board effectiveAt / cancel handling");
