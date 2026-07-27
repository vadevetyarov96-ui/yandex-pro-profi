import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSharedStations } from "@/lib/shared-cache";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await getSharedStations(session.cityId);
    return NextResponse.json({ ...data, cache: "daily" });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Ошибка загрузки расписания" },
      { status: 502 },
    );
  }
}
