import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { MOCK_DB } from "./repo";

const COOKIE_NAME = "5v5_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30일 (지인용 앱이라 길게)

function secret(): string {
  const value = process.env.SESSION_SECRET ?? (MOCK_DB ? "mock-db-dev-only-session-secret-0000" : undefined);
  if (!value || value.length < 32) {
    throw new Error("SESSION_SECRET 환경변수(32자 이상)가 필요합니다.");
  }
  return value;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

/** 쿠키 값: `${userId}.${만료ms}.${서명}` */
export async function createSession(userId: string) {
  const expiresAt = Date.now() + MAX_AGE_SECONDS * 1000;
  const payload = `${userId}.${expiresAt}`;
  (await cookies()).set(COOKIE_NAME, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function readSessionUserId(): Promise<string | null> {
  const raw = (await cookies()).get(COOKIE_NAME)?.value;
  if (!raw) return null;

  const [userId, expiresAt, signature] = raw.split(".");
  if (!userId || !expiresAt || !signature) return null;
  if (Number(expiresAt) < Date.now()) return null;

  const expected = Buffer.from(sign(`${userId}.${expiresAt}`));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  return userId;
}

export async function destroySession() {
  (await cookies()).delete(COOKIE_NAME);
}
