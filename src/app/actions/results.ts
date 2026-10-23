"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { repo } from "@/lib/repo";
import { requireUser } from "@/lib/auth";
import { MAX_SCREENSHOTS } from "@/lib/constants";
import { isValidDate, todayKST } from "@/lib/date";
import { removeImages, uploadImage } from "@/lib/storage";
import type { ActionResult, VoteKind } from "@/lib/types";

const MAX_BYTES = 4 * 1024 * 1024; // Vercel 요청 본문 한도(4.5MB) 아래
const IMAGE_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

function revalidate() {
  revalidatePath("/");
  revalidatePath("/history");
}

/**
 * MVP / 범인 투표. 그날 참여자만, 참여자에게만, 본인 제외, 종류별 1표.
 * targetId 가 null 이면 내 표 취소.
 */
export async function castVote(input: { date: string; kind: VoteKind; targetId: string | null }): Promise<ActionResult> {
  const me = await requireUser();
  if (!isValidDate(input.date) || input.date > todayKST()) return { ok: false, error: "경기 당일부터 투표할 수 있어요." };
  if (input.kind !== "mvp" && input.kind !== "blame") return { ok: false, error: "잘못된 투표예요." };

  const members = new Set(await repo.participantIds(input.date));
  if (!members.has(me.id)) return { ok: false, error: "참여자만 투표할 수 있어요." };

  if (input.targetId === null) {
    await repo.deleteVote(input.date, me.id, input.kind);
  } else {
    if (input.targetId === me.id) return { ok: false, error: "본인에게는 투표할 수 없어요." };
    if (!members.has(input.targetId)) return { ok: false, error: "참여자에게만 투표할 수 있어요." };
    await repo.upsertVote({ play_date: input.date, voter_id: me.id, kind: input.kind, target_id: input.targetId });
  }

  revalidate();
  return { ok: true };
}

/** 경기 결과 스크린샷 업로드 (로그인 멤버 누구나, 경기 당일부터) */
export async function uploadScreenshot(formData: FormData): Promise<ActionResult> {
  const me = await requireUser();
  const date = formData.get("date");
  const file = formData.get("file");

  if (!isValidDate(date) || date > todayKST()) return { ok: false, error: "경기 당일부터 올릴 수 있어요." };
  if (!(file instanceof File) || !IMAGE_TYPES[file.type]) return { ok: false, error: "jpg, png, webp 이미지만 올릴 수 있어요." };
  if (file.size > MAX_BYTES) return { ok: false, error: "4MB 이하 이미지만 올릴 수 있어요." };

  if ((await repo.countScreenshots(date)) >= MAX_SCREENSHOTS) {
    return { ok: false, error: `매치당 ${MAX_SCREENSHOTS}장까지예요.` };
  }

  const path = `screenshots/${date}/${randomUUID()}.${IMAGE_TYPES[file.type]}`;
  try {
    await uploadImage(path, file);
  } catch {
    return { ok: false, error: "업로드에 실패했어요." };
  }
  try {
    await repo.insertScreenshot({ play_date: date, storage_path: path, uploader_id: me.id });
  } catch (e) {
    await removeImages([path]); // DB 기록 실패 시 고아 파일 정리
    throw e;
  }

  revalidate();
  return { ok: true };
}

/** 스크린샷 삭제 (올린 사람 or 관리자) */
export async function deleteScreenshot(id: string): Promise<ActionResult> {
  const me = await requireUser();
  const shot = await repo.findScreenshot(id);
  if (!shot) return { ok: false, error: "이미 삭제됐어요." };
  if (shot.uploader_id !== me.id && !me.is_admin) return { ok: false, error: "올린 사람이나 관리자만 삭제할 수 있어요." };

  await repo.deleteScreenshot(id);
  await removeImages([shot.storage_path]);

  revalidate();
  return { ok: true };
}
