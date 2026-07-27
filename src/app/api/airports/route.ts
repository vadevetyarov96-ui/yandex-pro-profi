import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSharedAirports, refreshSharedAirports } from "@/lib/shared-cache";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const refresh = searchParams.get("refresh");
  const force = Boolean(refresh && refresh !== "0" && refresh !== "false");

  try {
    const data = force
      ? await refreshSharedAirports(session.cityId)
      : await getSharedAirports(session.cityId);

    return NextResponse.json({
      ...data,
      cache: force ? "refreshed" : "hit-or-fill",
    });
  } catch (e) {
    console.error(e);
    // On refresh failure, try serving last shared cache
    if (force) {
      try {
        const fallback = await getSharedAirports(session.cityId);
        return NextResponse.json({ ...fallback, cache: "stale-fallback" });
      } catch {
        /* fall through */
      }
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Ошибка загрузки прилётов" },
      { status: 502 },
    );
  }
}
