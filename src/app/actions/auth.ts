"use server";

import { redirect } from "next/navigation";
import { DuplicateNicknameError, repo } from "@/lib/repo";
import { hashPin, isValidPin, verifyPin } from "@/lib/pin";
import { getCurrentUser } from "@/lib/auth";
import { createSession, destroySession } from "@/lib/session";
import { INITIAL_PIN, hasDivision, isDivision, isLane, isTier, type Division, type Lane, type Tier } from "@/lib/constants";
import { safeNext } from "@/lib/redirect";
import type { ActionResult } from "@/lib/types";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 5;

export async function login(userId: string, pin: string, next?: string): Promise<ActionResult> {
  if (!isValidPin(pin)) return { ok: false, error: "PIN은 숫자 4자리예요." };

  const user = await repo.findAuth(userId);
  if (!user) return { ok: false, error: "존재하지 않는 멤버예요." };

  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    const minutes = Math.ceil((new Date(user.locked_until).getTime() - Date.now()) / 60000);
    return { ok: false, error: `PIN을 여러 번 틀렸어요. ${minutes}분 뒤에 다시 시도해 주세요.` };
  }

  if (!verifyPin(pin, user.pin_hash)) {
    const attempts = user.failed_pin_attempts + 1;
    const locked = attempts >= MAX_FAILED_ATTEMPTS;
    await repo.setLoginState(userId, {
      failed_pin_attempts: locked ? 0 : attempts,
      locked_until: locked ? new Date(Date.now() + LOCK_MINUTES * 60000).toISOString() : null,
    });
    return {
      ok: false,
      error: locked
        ? `${MAX_FAILED_ATTEMPTS}회 틀려서 ${LOCK_MINUTES}분간 잠겼어요.`
        : `PIN이 틀렸어요. (${attempts}/${MAX_FAILED_ATTEMPTS})`,
    };
  }

  await repo.setLoginState(userId, { failed_pin_attempts: 0, locked_until: null });
  await createSession(userId);

  // 관리자가 만든 계정/초기화한 PIN 이면 새 PIN 부터 정하게 한다
  const target = safeNext(next);
  if ((await repo.findUser(userId))?.must_change_pin) {
    redirect(target === "/" ? "/change-pin" : `/change-pin?next=${encodeURIComponent(target)}`);
  }
  redirect(target);
}

/** 첫 로그인 PIN 재설정 (must_change_pin 인 상태에서만 쓰므로 requireUser 대신 getCurrentUser) */
export async function setNewPin(newPin: string, next?: string): Promise<ActionResult> {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (!isValidPin(newPin)) return { ok: false, error: "PIN은 숫자 4자리예요." };
  if (newPin === INITIAL_PIN) return { ok: false, error: `${INITIAL_PIN}은 쓸 수 없어요.` };

  await repo.setPinHash(me.id, hashPin(newPin), false);
  redirect(safeNext(next));
}

/**
 * 직접 가입은 멤버가 0명일 때(첫 관리자)만 가능.
 * 이후 계정은 관리자가 '관리' 탭에서 만든다 (users.ts createMember).
 */
export async function register(input: {
  nickname: string;
  pin: string;
  tier: Tier;
  division: Division | null;
  lanes: Lane[];
  next?: string;
}): Promise<ActionResult> {
  const nickname = input.nickname?.trim() ?? "";
  if (nickname.length < 1 || nickname.length > 12) return { ok: false, error: "닉네임은 1~12자로 입력해 주세요." };
  if (!isValidPin(input.pin)) return { ok: false, error: "PIN은 숫자 4자리예요." };
  if (!isTier(input.tier)) return { ok: false, error: "티어를 선택해 주세요." };
  if (hasDivision(input.tier) && !isDivision(input.division)) return { ok: false, error: "디비전(I~IV)을 선택해 주세요." };
  if (input.pin === INITIAL_PIN) return { ok: false, error: `${INITIAL_PIN}은 쓸 수 없어요.` };
  if ((await repo.countUsers()) > 0) return { ok: false, error: "계정은 관리자에게 요청해 주세요." };

  let userId: string;
  try {
    userId = await repo.createUser({
      nickname,
      pin_hash: hashPin(input.pin),
      tier: input.tier,
      tier_division: hasDivision(input.tier) ? input.division : null,
      preferred_lanes: [...new Set(input.lanes)].filter(isLane),
      is_admin: true, // 첫 멤버 = 관리자
      must_change_pin: false,
    });
  } catch (e) {
    if (e instanceof DuplicateNicknameError) return { ok: false, error: "이미 있는 닉네임이에요." };
    throw e;
  }

  await createSession(userId);
  redirect(safeNext(input.next));
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
