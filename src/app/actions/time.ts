"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { MAX_REASON_LENGTH, isStartSlot } from "@/lib/constants";
import { isValidDate, todayKST } from "@/lib/date";
import { repo } from "@/lib/repo";
import type { ActionResult } from "@/lib/types";

/** 응답 가능 여부: 날짜, 지난 날짜, 종료된 매치 */
async function checkDate(date: unknown, isAdmin: boolean): Promise<string | null> {
  if (!isValidDate(date)) return "날짜가 올바르지 않아요.";
  if (date < todayKST() && !isAdmin) return "지난 매치는 바꿀 수 없어요.";
  if ((await repo.listResults([date])).length > 0) return "종료된 매치예요.";
  return null;
}

/** 원하는 시작 시간 + 사유. 그날 티켓 자리에 들어간 본인만 */
export async function saveTimePref(input: { date: string; startMin: number; reason: string }): Promise<ActionResult> {
  const me = await requireUser();
  const error = await checkDate(input.date, false);
  if (error) return { ok: false, error };
  if (!isStartSlot(input.startMin)) return { ok: false, error: "시작 시간을 골라 주세요." };
  const reason = input.reason?.trim() ?? "";
  if (reason.length > MAX_REASON_LENGTH) return { ok: false, error: `사유는 ${MAX_REASON_LENGTH}자까지예요.` };

  const mine = (await repo.listSchedules({ from: input.date, to: input.date })).find((s) => s.user_id === me.id);
  if (!mine || mine.status !== "join" || !mine.team || !mine.lane) {
    return { ok: false, error: "티켓 자리에 들어간 사람만 시간을 낼 수 있어요." };
  }

  await repo.upsertTimePref({ play_date: input.date, user_id: me.id, start_min: input.startMin, reason });
  revalidatePath("/", "layout");
  return { ok: true };
}

/** 내 시간 응답 지우기 */
export async function deleteTimePref(date: string): Promise<ActionResult> {
  const me = await requireUser();
  const error = await checkDate(date, false);
  if (error) return { ok: false, error };

  await repo.deleteTimePref(date, me.id);
  revalidatePath("/", "layout");
  return { ok: true };
}

/** 관리자: 시작 시간 직접 정하기. null 이면 응답으로 자동 확정되게 되돌림 */
export async function setStartOverride(input: { date: string; startMin: number | null }): Promise<ActionResult> {
  const me = await requireUser();
  if (!me.is_admin) return { ok: false, error: "관리자만 시간을 바꿀 수 있어요." };
  if (!isValidDate(input.date)) return { ok: false, error: "날짜가 올바르지 않아요." };
  if (input.startMin !== null && !isStartSlot(input.startMin)) return { ok: false, error: "시작 시간을 골라 주세요." };

  await repo.setStartOverride(input.date, input.startMin, me.id);
  revalidatePath("/", "layout");
  return { ok: true };
}
