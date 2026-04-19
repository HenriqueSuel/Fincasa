import "server-only";
import { cookies } from "next/headers";
import { adminAuth } from "./admin";

export const SESSION_COOKIE_NAME = "fincasa_session";
export const SESSION_EXPIRES_MS = 60 * 60 * 24 * 5 * 1000;

export async function createSessionCookie(idToken: string) {
  const cookie = await adminAuth().createSessionCookie(idToken, {
    expiresIn: SESSION_EXPIRES_MS,
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE_NAME, cookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_EXPIRES_MS / 1000,
  });
}

export async function destroySessionCookie() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE_NAME);
}

export async function getSession() {
  const jar = await cookies();
  const cookie = jar.get(SESSION_COOKIE_NAME)?.value;
  if (!cookie) return null;
  try {
    const decoded = await adminAuth().verifySessionCookie(cookie, true);
    return decoded;
  } catch {
    return null;
  }
}
