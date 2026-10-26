import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { repo } from "./repo";
import { readSessionUserId } from "./session";
import type { PublicUser } from "./types";

/** 요청당 1번만 조회되도록 cache */
export const getCurrentUser = cache(async (): Promise<PublicUser | null> => {
  const userId = await readSessionUserId();
  if (!userId) return null;

  return repo.findUser(userId);
});

/**
 * 로그인 필수. 비로그인이면 /login?next=<현재 경로>, PIN 재설정이 필요하면 /change-pin 으로 보낸다.
 * (경로는 proxy.ts 가 넣어줌. Server Action 에서도 같은 규칙으로 막힌다)
 */
export async function requireUser(): Promise<PublicUser> {
  const user = await getCurrentUser();
  const path = (await headers()).get("x-pathname");
  const next = path && path !== "/" ? `?next=${encodeURIComponent(path)}` : "";
  if (!user) redirect(`/login${next}`);
  if (user.must_change_pin) redirect(`/change-pin${next}`);
  return user;
}

/** 대상이 본인이 아니면 관리자여야 한다 */
export function canEdit(actor: PublicUser, targetUserId: string): boolean {
  return actor.id === targetUserId || actor.is_admin;
}
