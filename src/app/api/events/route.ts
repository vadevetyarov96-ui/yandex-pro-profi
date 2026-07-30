import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSharedEvents, refreshSharedEvents } from "@/lib/shared-cache";

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
      ? await refreshSharedEvents(session.cityId)
      : await getSharedEvents(session.cityId);

    return NextResponse.json({
      ...data,
      cache: force ? "refreshed" : "hit-or-fill",
    });
  } catch (e) {
    console.error(e);
    if (force) {
      try {
        const fallback = await getSharedEvents(session.cityId);
        return NextResponse.json({ ...fallback, cache: "stale-fallback" });
      } catch {
        /* fall through */
      }
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Ошибка загрузки событий" },
      { status: 502 },
    );
  }
}
