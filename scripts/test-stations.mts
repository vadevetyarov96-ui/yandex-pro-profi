import { getStationsSchedule } from "../src/lib/rasp/schedule.ts";

const d = await getStationsSchedule("moscow");
console.log(
  JSON.stringify(
    {
      tip: d.tip,
      suburbanNote: d.suburbanNote,
      stations: d.stations.slice(0, 3).map((s) => ({
        name: s.name,
        h0: s.hours[0],
      })),
    },
    null,
    2,
  ),
);
