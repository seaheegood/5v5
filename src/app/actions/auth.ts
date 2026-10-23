"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/supabase";
import { hashPin, isValidPin, verifyPin } from "@/lib/pin";
import { createSession, destroySession } from "@/lib/session";
import { hasDivision, isDivision, isLane, isTier, type Division, type Lane, type Tier } from "@/lib/constants";
import { safeNext } from "@/lib/redirect";
import type { ActionResult } from "@/lib/types";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 5;

export async function login(userId: string, pin: string, next?: string): Promise<ActionResult> {
  if (!isValidPin(pin)) return { ok: false, error: "PIN은 숫자 4자리예요." };

  const { data: user } = await db()
    .from("users")
    .select("id, pin_hash, failed_pin_attempts, locked_until")
    .eq("id", userId)
    .maybeSingle();
  if (!user) return { ok: false, error: "존재하지 않는 멤버예요." };

  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    const minutes = Math.ceil((new Date(user.locked_until).getTime() - Date.now()) / 60000);
    return { ok: false, error: `PIN을 여러 번 틀렸어요. ${minutes}분 뒤에 다시 시도해 주세요.` };
  }

  if (!verifyPin(pin, user.pin_hash)) {
    const attempts = user.failed_pin_attempts + 1;
    const locked = attempts >= MAX_FAILED_ATTEMPTS;
    await db()
      .from("users")
      .update({
        failed_pin_attempts: locked ? 0 : attempts,
        locked_until: locked ? new Date(Date.now() + LOCK_MINUTES * 60000).toISOString() : null,
      })
      .eq("id", userId);
    return {
      ok: false,
      error: locked
        ? `${MAX_FAILED_ATTEMPTS}회 틀려서 ${LOCK_MINUTES}분간 잠겼어요.`
        : `PIN이 틀렸어요. (${attempts}/${MAX_FAILED_ATTEMPTS})`,
    };
  }

  await db().from("users").update({ failed_pin_attempts: 0, locked_until: null }).eq("id", userId);
  await createSession(userId);
  redirect(safeNext(next));
}

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
  const lanes = [...new Set(input.lanes)].filter(isLane);

  // 첫 가입자는 자동으로 관리자
  const { count } = await db().from("users").select("id", { count: "exact", head: true });

  const { data, error } = await db()
    .from("users")
    .insert({
      nickname,
      pin_hash: hashPin(input.pin),
      tier: input.tier,
      tier_division: hasDivision(input.tier) ? input.division : null,
      preferred_lanes: lanes,
      is_admin: (count ?? 0) === 0,
    })
    .select("id")
    .single();

  if (error) {
    // 23505 = unique_violation (닉네임 중복)
    return { ok: false, error: error.code === "23505" ? "이미 있는 닉네임이에요." : "가입에 실패했어요." };
  }

  await createSession(data.id);
  redirect(safeNext(input.next));
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
