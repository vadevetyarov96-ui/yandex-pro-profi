import { NextResponse } from "next/server";
import { getSession, setSessionCookie } from "@/lib/auth";
import { CITIES, DEFAULT_CITY } from "@/lib/cities";
import type { CityId } from "@/lib/types";

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    cityId?: string;
  } | null;

  const cityId = (body?.cityId as CityId) ?? DEFAULT_CITY;
  if (!CITIES.some((c) => c.id === cityId)) {
    return NextResponse.json({ error: "Город недоступен" }, { status: 400 });
  }

  await setSessionCookie({ ...session, cityId });
  return NextResponse.json({ ok: true, cityId });
}
