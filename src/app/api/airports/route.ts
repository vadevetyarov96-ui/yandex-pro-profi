import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAirportsSchedule } from "@/lib/airports";
import { cacheGet, cacheSet } from "@/lib/cache";
import type { AirportsPayload } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const refresh = searchParams.get("refresh");
  const cacheKey = `airports:${session.cityId}`;

  if (!refresh || refresh === "boot") {
    const cached = cacheGet<AirportsPayload>(cacheKey);
    if (cached) return NextResponse.json(cached);
  }

  try {
    const data = await getAirportsSchedule(session.cityId);
    // Short TTL — flights change; refresh button busts cache
    cacheSet(cacheKey, data, 3 * 60 * 1000);
    return NextResponse.json(data);
  } catch (e) {
    console.error(e);
    const cached = cacheGet<AirportsPayload>(cacheKey);
    if (cached) return NextResponse.json(cached);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Ошибка загрузки прилётов" },
      { status: 502 },
    );
  }
}
