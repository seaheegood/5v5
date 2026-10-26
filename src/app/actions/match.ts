"use server";

import { revalidatePath } from "next/cache";
import { repo } from "@/lib/repo";
import { requireUser } from "@/lib/auth";
import { isValidDate, todayKST } from "@/lib/date";
import { removeImages } from "@/lib/storage";
import { MAX_STAKE } from "@/lib/constants";
import type { ActionResult } from "@/lib/types";

/**
 * 매치 방식/판돈 수정: 로그인한 누구나 가능, 수정자 기록.
 * 판돈은 1인당 금액(원, 정수). 지난/종료된 매치는 관리자만 수정 (판돈을 바꾸면 수익도 다시 계산).
 */
export async function updateMatchSettings(input: {
  date: string;
  matchFormat: string;
  stake: number;
}): Promise<ActionResult> {
  const me = await requireUser();
  const matchFormat = input.matchFormat?.trim() ?? "";
  const stake = input.stake;

  if (!isValidDate(input.date)) return { ok: false, error: "날짜가 올바르지 않아요." };
  if (matchFormat.length < 1 || matchFormat.length > 30) return { ok: false, error: "방식은 1~30자로 입력해 주세요." };
  if (!Number.isInteger(stake) || stake < 0 || stake > MAX_STAKE) {
    return { ok: false, error: `판돈은 0~${MAX_STAKE.toLocaleString("ko-KR")}원 사이 숫자로 입력해 주세요.` };
  }
  if (!me.is_admin) {
    if (input.date < todayKST()) return { ok: false, error: "지난 매치는 관리자만 수정할 수 있어요." };
    if ((await repo.listResults([input.date])).length > 0) {
      return { ok: false, error: "종료된 매치는 관리자만 수정할 수 있어요." };
    }
  }

  await repo.upsertSettings({ play_date: input.date, match_format: matchFormat, stake_amount: stake, updated_by: me.id });

  revalidatePath("/", "layout");
  return { ok: true };
}

/** 티켓 삭제 (관리자 전용): 해당 날짜의 응답/설정/결과/투표/댓글/스크린샷 모두 삭제 */
export async function deleteMatch(date: string): Promise<ActionResult> {
  const me = await requireUser();
  if (!me.is_admin) return { ok: false, error: "관리자만 카드를 삭제할 수 있어요." };
  if (!isValidDate(date)) return { ok: false, error: "날짜가 올바르지 않아요." };

  await removeImages(await repo.deleteMatch(date));

  revalidatePath("/", "layout"); // 메인/이전 매치/티켓 상세/달력 모두
  return { ok: true };
}
