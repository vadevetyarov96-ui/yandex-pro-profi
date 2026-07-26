import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { DEFAULT_CITY } from "./cities";
import type { CityId, SessionUser } from "./types";

const COOKIE_NAME = "ypp_session";
const SESSION_DAYS = 30;

function getSecret() {
  const secret = process.env.AUTH_SECRET ?? "yandex-pro-profi-dev-secret-change-me";
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    cityId: user.cityId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(getSecret());
}

export async function readSessionToken(
  token: string | undefined,
): Promise<SessionUser | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const cityId = (payload.cityId as CityId) || DEFAULT_CITY;
    return {
      id: String(payload.id),
      username: String(payload.username),
      displayName: String(payload.displayName),
      cityId,
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  return readSessionToken(jar.get(COOKIE_NAME)?.value);
}

export async function setSessionCookie(user: SessionUser) {
  const jar = await cookies();
  const token = await createSessionToken(user);
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export { COOKIE_NAME };
