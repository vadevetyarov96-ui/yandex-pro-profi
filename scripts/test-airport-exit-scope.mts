import { resolveFlightScope } from "../src/lib/rasp/flight-scope.ts";
import {
  airportExitForLandingAt,
  isFutureExit,
} from "../src/lib/schedule-utils.ts";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(resolveFlightScope({ from: "Сочи" }) === "domestic", "Сочи domestic");
assert(resolveFlightScope({ from: "Казань" }) === "domestic", "Казань domestic");
assert(resolveFlightScope({ originIata: "AER" }) === "domestic", "AER domestic");
assert(resolveFlightScope({ originIata: "AYT" }) === "international", "AYT intl");
assert(resolveFlightScope({ from: "Анталья" }) === "international", "Antalya intl");
assert(
  resolveFlightScope({ title: "Стамбул — Москва" }) === "international",
  "Istanbul title intl",
);

const land = new Date("2026-08-06T10:00:00+03:00");
const dom = airportExitForLandingAt(land, "domestic");
assert(dom.arriveBy === "10:30", `domestic arriveBy got ${dom.arriveBy}`);
assert(dom.exitWindow === "10:30", `domestic window got ${dom.exitWindow}`);
assert(dom.arriveByAt.toISOString() === new Date("2026-08-06T10:30:00+03:00").toISOString(), "dom abs");

const intl = airportExitForLandingAt(land, "international");
assert(intl.arriveBy === "11:00", `intl arriveBy got ${intl.arriveBy}`);
assert(intl.exitWindow === "11:00–11:30", `intl window got ${intl.exitWindow}`);

const late = airportExitForLandingAt(new Date("2026-08-06T23:40:00+03:00"), "international");
assert(late.arriveBy === "00:40", `intl midnight wrap arriveBy got ${late.arriveBy}`);
assert(isFutureExit(late.arriveByAt, new Date("2026-08-06T23:50:00+03:00")), "future after midnight");
assert(!isFutureExit(dom.arriveByAt, new Date("2026-08-06T10:31:00+03:00")), "past exit");

console.log("ok: flight scope + airport exit timing");
