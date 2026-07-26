import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { cacheGet, cacheSet } from "@/lib/cache";
import { getStationsSchedule } from "@/lib/stations";
import { moscowDateKey } from "@/lib/schedule-utils";
import type { StationsPayload } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const day = moscowDateKey();
  const cacheKey = `stations:${session.cityId}:${day}`;
  const cached = cacheGet<StationsPayload>(cacheKey);
  if (cached) return NextResponse.json(cached);

  try {
    const data = await getStationsSchedule(session.cityId);
    // Trains stable — cache until end of day (~24h)
    cacheSet(cacheKey, data, 24 * 60 * 60 * 1000);
    return NextResponse.json(data);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Ошибка загрузки расписания" },
      { status: 502 },
    );
  }
}
