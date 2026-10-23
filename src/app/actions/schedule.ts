"use server";

import { revalidatePath } from "next/cache";
import { repo } from "@/lib/repo";
import { canEdit, requireUser } from "@/lib/auth";
import { isLane, type Lane } from "@/lib/constants";
import { isValidDate, todayKST } from "@/lib/date";
import type { ActionResult, ScheduleStatus } from "@/lib/types";

function revalidate() {
  revalidatePath("/");
  revalidatePath("/calendar");
}

/**
 * 일정 등록/수정.
 * - 참여(join): 라인 '딱 1개' 필수
 * - 불참(decline): 라인 없음
 * - targetUserId 가 본인이 아니면 관리자만 가능
 */
export async function saveSchedule(input: {
  date: string;
  status: ScheduleStatus;
  lane: Lane | null;
  targetUserId?: string;
}): Promise<ActionResult> {
  const me = await requireUser();
  const userId = input.targetUserId ?? me.id;

  if (!canEdit(me, userId)) return { ok: false, error: "다른 멤버의 일정은 관리자만 수정할 수 있어요." };
  if (!isValidDate(input.date)) return { ok: false, error: "날짜가 올바르지 않아요." };
  if (input.date < todayKST() && !me.is_admin) return { ok: false, error: "지난 날짜는 수정할 수 없어요." };
  if (input.status !== "join" && input.status !== "decline") return { ok: false, error: "참여 여부를 선택해 주세요." };
  if (input.status === "join" && !isLane(input.lane)) return { ok: false, error: "플레이할 라인을 1개 선택해 주세요." };

  await repo.upsertSchedule({
    user_id: userId,
    play_date: input.date,
    status: input.status,
    lane: input.status === "join" ? input.lane : null,
  });

  revalidate();
  return { ok: true };
}

/** 응답 자체를 지움 (본인 or 관리자) */
export async function deleteSchedule(input: { date: string; targetUserId?: string }): Promise<ActionResult> {
  const me = await requireUser();
  const userId = input.targetUserId ?? me.id;

  if (!canEdit(me, userId)) return { ok: false, error: "다른 멤버의 일정은 관리자만 삭제할 수 있어요." };
  if (!isValidDate(input.date)) return { ok: false, error: "날짜가 올바르지 않아요." };

  await repo.deleteSchedule(userId, input.date);

  revalidate();
  return { ok: true };
}
