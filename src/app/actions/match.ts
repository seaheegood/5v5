"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase";
import { requireUser } from "@/lib/auth";
import { isValidDate } from "@/lib/date";
import { removeImages } from "@/lib/storage";
import type { ActionResult } from "@/lib/types";

/** 매치 방식/판돈 수정: 로그인한 누구나 가능, 수정자 기록 */
export async function updateMatchSettings(input: {
  date: string;
  matchFormat: string;
  stake: string;
}): Promise<ActionResult> {
  const me = await requireUser();
  const matchFormat = input.matchFormat?.trim() ?? "";
  const stake = input.stake?.trim() ?? "";

  if (!isValidDate(input.date)) return { ok: false, error: "날짜가 올바르지 않아요." };
  if (matchFormat.length < 1 || matchFormat.length > 30) return { ok: false, error: "방식은 1~30자로 입력해 주세요." };
  if (stake.length > 50) return { ok: false, error: "판돈은 50자 이내로 입력해 주세요." };

  const { error } = await db()
    .from("match_settings")
    .upsert(
      { play_date: input.date, match_format: matchFormat, stake, updated_by: me.id },
      { onConflict: "play_date" },
    );
  if (error) return { ok: false, error: "저장에 실패했어요." };

  revalidatePath("/");
  return { ok: true };
}

/** 매치 카드 삭제 (관리자 전용): 해당 날짜의 응답/설정/투표/스크린샷 모두 삭제 */
export async function deleteMatch(date: string): Promise<ActionResult> {
  const me = await requireUser();
  if (!me.is_admin) return { ok: false, error: "관리자만 카드를 삭제할 수 있어요." };
  if (!isValidDate(date)) return { ok: false, error: "날짜가 올바르지 않아요." };

  const { data: shots } = await db().from("match_screenshots").select("storage_path").eq("play_date", date);

  const results = await Promise.all([
    db().from("schedules").delete().eq("play_date", date),
    db().from("match_settings").delete().eq("play_date", date),
    db().from("match_votes").delete().eq("play_date", date),
    db().from("match_screenshots").delete().eq("play_date", date),
  ]);
  if (results.some((r) => r.error)) return { ok: false, error: "삭제에 실패했어요." };
  await removeImages((shots ?? []).map((s: { storage_path: string }) => s.storage_path));

  revalidatePath("/");
  revalidatePath("/history");
  revalidatePath("/calendar");
  return { ok: true };
}
