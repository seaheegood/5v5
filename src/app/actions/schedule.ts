"use server";

import { revalidatePath } from "next/cache";
import { repo, SlotTakenError } from "@/lib/repo";
import { canEdit, requireUser } from "@/lib/auth";
import { LANE_LABEL, TEAM_LABEL, isLane } from "@/lib/constants";
import { isValidDate, todayKST } from "@/lib/date";
import type { ActionResult, PublicUser, ScheduleStatus, Team } from "@/lib/types";

function revalidate() {
  revalidatePath("/");
  revalidatePath("/history");
  revalidatePath("/calendar");
}

const isTeam = (v: unknown): v is Team => v === "blue" || v === "red";

/**
 * 공통 검사: 대상 권한(본인 or 관리자), 날짜, 지난 날짜(관리자만), 종료된 매치(모두 잠금).
 * 종료된 매치는 팀 스냅샷과 어긋나지 않도록 관리자도 '종료 취소' 후에 바꾼다.
 */
async function check(me: PublicUser, userId: string, date: unknown): Promise<string | null> {
  if (!canEdit(me, userId)) return "다른 멤버는 관리자만 바꿀 수 있어요.";
  if (!isValidDate(date)) return "날짜가 올바르지 않아요.";
  if (date < todayKST() && !me.is_admin) return "지난 날짜는 바꿀 수 없어요.";
  if ((await repo.listResults([date])).length > 0) return "종료된 매치예요. (관리자가 종료 취소 후 수정)";
  return null;
}

/**
 * 달력: 참여 / 불참.
 * - 참여: 이미 티켓 자리가 있으면 유지, 없으면 '자리 미정'
 * - 불참: 자리도 비운다
 */
export async function saveSchedule(input: {
  date: string;
  status: ScheduleStatus;
  targetUserId?: string;
}): Promise<ActionResult> {
  const me = await requireUser();
  const userId = input.targetUserId ?? me.id;
  const error = await check(me, userId, input.date);
  if (error) return { ok: false, error };
  if (input.status !== "join" && input.status !== "decline") return { ok: false, error: "참여 여부를 선택해 주세요." };

  await repo.upsertSchedule({ user_id: userId, play_date: input.date, status: input.status });
  revalidate();
  return { ok: true };
}

/** 응답 자체를 지움 (본인 or 관리자) */
export async function deleteSchedule(input: { date: string; targetUserId?: string }): Promise<ActionResult> {
  const me = await requireUser();
  const userId = input.targetUserId ?? me.id;
  const error = await check(me, userId, input.date);
  if (error) return { ok: false, error };

  await repo.deleteSchedule(userId, input.date);
  revalidate();
  return { ok: true };
}

/**
 * 티켓: 빈 칸에 들어가기. 참여 처리까지 한 번에 되고, 다른 칸에 있었으면 옮겨진다.
 * targetUserId 는 관리자가 다른 멤버를 넣을 때.
 */
export async function takeSlot(input: {
  date: string;
  team: Team;
  lane: string;
  targetUserId?: string;
}): Promise<ActionResult> {
  const me = await requireUser();
  const userId = input.targetUserId ?? me.id;
  const error = await check(me, userId, input.date);
  if (error) return { ok: false, error };
  if (!isTeam(input.team) || !isLane(input.lane)) return { ok: false, error: "자리가 올바르지 않아요." };

  try {
    await repo.takeSlot({ user_id: userId, play_date: input.date, team: input.team, lane: input.lane });
  } catch (e) {
    if (e instanceof SlotTakenError) {
      return { ok: false, error: `${TEAM_LABEL[input.team]} ${LANE_LABEL[input.lane]} 자리에 이미 누가 들어갔어요.` };
    }
    throw e;
  }

  revalidate();
  return { ok: true };
}

/** 티켓: 자리 비우기 (참여는 유지 → 자리 미정) */
export async function leaveSlot(input: { date: string; targetUserId?: string }): Promise<ActionResult> {
  const me = await requireUser();
  const userId = input.targetUserId ?? me.id;
  const error = await check(me, userId, input.date);
  if (error) return { ok: false, error };

  await repo.clearSlot(userId, input.date);
  revalidate();
  return { ok: true };
}
