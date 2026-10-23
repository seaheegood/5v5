"use server";

import { revalidatePath } from "next/cache";
import { canEdit, requireUser } from "@/lib/auth";
import { hashPin, isValidPin, verifyPin } from "@/lib/pin";
import { DuplicateNicknameError, repo } from "@/lib/repo";
import type { UserPatch } from "@/lib/repo/types";
import { hasDivision, isDivision, isLane, isTier, type Division, type Lane, type Tier } from "@/lib/constants";
import type { ActionResult } from "@/lib/types";

function revalidateAll() {
  revalidatePath("/", "layout");
}

/**
 * 프로필 수정. 본인은 티어/라인만, 관리자는 닉네임/관리자 여부까지.
 */
export async function updateProfile(input: {
  userId: string;
  tier: Tier;
  division: Division | null;
  lanes: Lane[];
  nickname?: string;
  isAdmin?: boolean;
}): Promise<ActionResult> {
  const me = await requireUser();
  if (!canEdit(me, input.userId)) return { ok: false, error: "권한이 없어요." };
  if (!isTier(input.tier)) return { ok: false, error: "티어가 올바르지 않아요." };
  if (hasDivision(input.tier) && !isDivision(input.division)) return { ok: false, error: "디비전(I~IV)을 선택해 주세요." };

  const patch: UserPatch = {
    tier: input.tier,
    tier_division: hasDivision(input.tier) ? input.division : null,
    preferred_lanes: [...new Set(input.lanes)].filter(isLane),
  };

  if (me.is_admin && input.nickname !== undefined) {
    const nickname = input.nickname.trim();
    if (nickname.length < 1 || nickname.length > 12) return { ok: false, error: "닉네임은 1~12자로 입력해 주세요." };
    patch.nickname = nickname;
  }
  if (me.is_admin && input.isAdmin !== undefined) {
    if (input.userId === me.id && !input.isAdmin) return { ok: false, error: "본인의 관리자 권한은 해제할 수 없어요." };
    patch.is_admin = input.isAdmin;
  }

  try {
    await repo.updateUser(input.userId, patch);
  } catch (e) {
    if (e instanceof DuplicateNicknameError) return { ok: false, error: "이미 있는 닉네임이에요." };
    throw e;
  }

  revalidateAll();
  return { ok: true };
}

/** 본인 PIN 변경 (현재 PIN 확인) */
export async function changeMyPin(currentPin: string, newPin: string): Promise<ActionResult> {
  const me = await requireUser();
  if (!isValidPin(newPin)) return { ok: false, error: "새 PIN은 숫자 4자리예요." };

  const auth = await repo.findAuth(me.id);
  if (!auth || !verifyPin(currentPin, auth.pin_hash)) return { ok: false, error: "현재 PIN이 틀렸어요." };

  await repo.setPinHash(me.id, hashPin(newPin));
  return { ok: true };
}

/** 관리자: 멤버 PIN 초기화 + 잠금 해제 */
export async function resetPin(userId: string, newPin: string): Promise<ActionResult> {
  const me = await requireUser();
  if (!me.is_admin) return { ok: false, error: "관리자만 가능해요." };
  if (!isValidPin(newPin)) return { ok: false, error: "PIN은 숫자 4자리예요." };

  await repo.setPinHash(userId, hashPin(newPin));
  return { ok: true };
}

/** 관리자: 멤버 삭제 (일정/투표는 cascade, 설정 수정자/스크린샷 업로더는 null 처리) */
export async function deleteUser(userId: string): Promise<ActionResult> {
  const me = await requireUser();
  if (!me.is_admin) return { ok: false, error: "관리자만 가능해요." };
  if (userId === me.id) return { ok: false, error: "본인 계정은 삭제할 수 없어요." };

  await repo.deleteUser(userId);
  revalidateAll();
  return { ok: true };
}
