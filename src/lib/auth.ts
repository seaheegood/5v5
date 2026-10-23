import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./supabase";
import { readSessionUserId } from "./session";
import type { PublicUser } from "./types";

export const PUBLIC_USER_COLUMNS = "id, nickname, tier, tier_division, preferred_lanes, is_admin";

/** 요청당 1번만 조회되도록 cache */
export const getCurrentUser = cache(async (): Promise<PublicUser | null> => {
  const userId = await readSessionUserId();
  if (!userId) return null;

  const { data } = await db().from("users").select(PUBLIC_USER_COLUMNS).eq("id", userId).maybeSingle();
  return (data as PublicUser | null) ?? null;
});

/** 비로그인이면 /login?next=<현재 경로> 로 보낸다 (경로는 proxy.ts 가 넣어줌) */
export async function requireUser(): Promise<PublicUser> {
  const user = await getCurrentUser();
  if (!user) {
    const path = (await headers()).get("x-pathname");
    redirect(path && path !== "/" ? `/login?next=${encodeURIComponent(path)}` : "/login");
  }
  return user;
}

/** 대상이 본인이 아니면 관리자여야 한다 */
export function canEdit(actor: PublicUser, targetUserId: string): boolean {
  return actor.id === targetUserId || actor.is_admin;
}
