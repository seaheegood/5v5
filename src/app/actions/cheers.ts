"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { MAX_COMMENT_LENGTH } from "@/lib/constants";
import { repo } from "@/lib/repo";
import type { ActionResult } from "@/lib/types";

/** 응원하기 (개인 페이지). 로그인 멤버 누구나, 본인에게도 가능 */
export async function addCheer(input: { targetId: string; body: string }): Promise<ActionResult> {
  const me = await requireUser();
  const body = input.body?.trim() ?? "";
  if (body.length < 1 || body.length > MAX_COMMENT_LENGTH) {
    return { ok: false, error: `응원은 1~${MAX_COMMENT_LENGTH}자로 입력해 주세요.` };
  }
  if (!(await repo.findUser(input.targetId))) return { ok: false, error: "없는 멤버예요." };

  await repo.insertCheer({ target_id: input.targetId, author_id: me.id, body });
  revalidatePath(`/players/${input.targetId}`);
  return { ok: true };
}

/** 응원 삭제 (작성자 or 관리자) */
export async function deleteCheer(id: string): Promise<ActionResult> {
  const me = await requireUser();
  const cheer = await repo.findCheer(id);
  if (!cheer) return { ok: false, error: "이미 삭제됐어요." };
  if (cheer.author_id !== me.id && !me.is_admin) return { ok: false, error: "작성자나 관리자만 삭제할 수 있어요." };

  await repo.deleteCheer(id);
  revalidatePath(`/players/${cheer.target_id}`);
  return { ok: true };
}
