import { getCityEvents } from "../src/lib/events.ts";

const data = await getCityEvents("moscow");
console.log(
  JSON.stringify(
    {
      city: data.cityName,
      updatedAt: data.updatedAt,
      tip: data.tip,
      days: data.days.map((d) => ({
        label: d.label,
        dateKey: d.dateKey,
        weekday: d.weekday,
        count: d.events.length,
        sample: d.events.slice(0, 3).map((e) => ({
          title: e.title,
          time: e.timeLabel,
          timed: e.isTimed,
          place: e.placeName,
          cat: e.category,
          fav: e.favoritesCount,
        })),
      })),
    },
    null,
    2,
  ),
);
