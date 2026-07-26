import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAirportsSchedule } from "@/lib/airports";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const refresh = searchParams.get("refresh") ?? undefined;
  const data = getAirportsSchedule(session.cityId, refresh ?? String(Date.now()));
  return NextResponse.json(data);
}
