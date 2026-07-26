import { NextResponse } from "next/server";
import { getSession, setSessionCookie } from "@/lib/auth";
import { DEFAULT_CITY } from "@/lib/cities";
import { verifyCredentials } from "@/lib/users";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    username?: string;
    password?: string;
  } | null;

  const username = body?.username ?? "";
  const password = body?.password ?? "";
  const user = verifyCredentials(username, password);

  if (!user) {
    return NextResponse.json(
      { error: "Неверный логин или пароль" },
      { status: 401 },
    );
  }

  const existing = await getSession();
  await setSessionCookie({
    ...user,
    cityId: existing?.cityId ?? DEFAULT_CITY,
  });

  return NextResponse.json({ ok: true });
}
