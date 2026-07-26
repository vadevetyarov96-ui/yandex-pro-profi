import { getAirportsSchedule } from "../src/lib/rasp/schedule.ts";

const d = await getAirportsSchedule("moscow");
console.log(
  JSON.stringify(
    {
      updatedAt: d.updatedAt,
      tip: d.tip,
      airports: d.airports.map((a) => ({
        name: a.name,
        now: a.nowFlights,
        h0: a.hours[0],
        h1: a.hours[1],
      })),
    },
    null,
    2,
  ),
);
