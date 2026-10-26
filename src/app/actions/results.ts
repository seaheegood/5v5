"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { repo } from "@/lib/repo";
import { requireUser } from "@/lib/auth";
import { MATCH_FULL, MAX_COMMENT_LENGTH, MAX_SCREENSHOTS } from "@/lib/constants";
import { isValidDate, todayKST } from "@/lib/date";
import { removeImages, uploadImage } from "@/lib/storage";
import type { ActionResult, Team, VoteKind } from "@/lib/types";

const MAX_BYTES = 4 * 1024 * 1024; // Vercel 요청 본문 한도(4.5MB) 아래
const IMAGE_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const TEAM_SIZE = MATCH_FULL / 2;

const isTeam = (v: unknown): v is Team => v === "blue" || v === "red";

function revalidate() {
  revalidatePath("/");
  revalidatePath("/history");
  revalidatePath("/calendar");
}

/** 종료된 매치의 팀 배정 (userId → team). 종료 전이면 null */
async function finishedTeams(date: string): Promise<{ winner: Team; teams: Map<string, Team> } | null> {
  const [result] = await repo.listResults([date]);
  if (!result) return null;
  const players = await repo.listPlayers([date]);
  return { winner: result.winner, teams: new Map(players.map((p) => [p.user_id, p.team])) };
}

/**
 * 매치 종료 (관리자). 경기 당일부터, 참여자 중 5대5 팀 배정 + 승리팀 입력.
 * 종료되면 투표/댓글/스크린샷이 열린다.
 */
export async function finishMatch(input: {
  date: string;
  winner: Team;
  teams: Record<string, Team>;
}): Promise<ActionResult> {
  const me = await requireUser();
  if (!me.is_admin) return { ok: false, error: "관리자만 종료할 수 있어요." };
  if (!isValidDate(input.date) || input.date > todayKST()) return { ok: false, error: "경기 당일부터 종료할 수 있어요." };
  if (!isTeam(input.winner)) return { ok: false, error: "이긴 팀을 선택해 주세요." };
  if ((await repo.listResults([input.date])).length > 0) return { ok: false, error: "이미 종료된 매치예요." };

  const participants = new Set(await repo.participantIds(input.date));
  const players = Object.entries(input.teams ?? {})
    .filter(([, team]) => isTeam(team))
    .map(([user_id, team]) => ({ user_id, team }));

  if (players.some((p) => !participants.has(p.user_id))) return { ok: false, error: "참여자만 팀에 넣을 수 있어요." };
  const blue = players.filter((p) => p.team === "blue").length;
  const red = players.filter((p) => p.team === "red").length;
  if (blue !== TEAM_SIZE || red !== TEAM_SIZE) {
    return { ok: false, error: `블루 ${TEAM_SIZE}명, 레드 ${TEAM_SIZE}명을 정해 주세요. (지금 ${blue}:${red})` };
  }

  await repo.finishMatch({ play_date: input.date, winner: input.winner, finished_by: me.id, players });
  revalidate();
  return { ok: true };
}

/** 종료 취소 (관리자): 팀/승패/투표 삭제. 댓글과 스크린샷은 남긴다 */
export async function reopenMatch(date: string): Promise<ActionResult> {
  const me = await requireUser();
  if (!me.is_admin) return { ok: false, error: "관리자만 종료를 취소할 수 있어요." };
  if (!isValidDate(date)) return { ok: false, error: "날짜가 올바르지 않아요." };

  await repo.reopenMatch(date);
  revalidate();
  return { ok: true };
}

/**
 * MVP / 범인 투표. 종료된 매치에서만.
 * - 투표자: 그 경기 10명 / 후보: MVP 는 이긴 팀, 범인은 진 팀 / 본인 제외 / 종류별 1표
 * - targetId 가 null 이면 내 표 취소
 */
export async function castVote(input: { date: string; kind: VoteKind; targetId: string | null }): Promise<ActionResult> {
  const me = await requireUser();
  if (!isValidDate(input.date)) return { ok: false, error: "날짜가 올바르지 않아요." };
  if (input.kind !== "mvp" && input.kind !== "blame") return { ok: false, error: "잘못된 투표예요." };

  const match = await finishedTeams(input.date);
  if (!match) return { ok: false, error: "종료된 매치에서만 투표할 수 있어요." };
  if (!match.teams.has(me.id)) return { ok: false, error: "경기에 뛴 10명만 투표할 수 있어요." };

  if (input.targetId === null) {
    await repo.deleteVote(input.date, me.id, input.kind);
  } else {
    if (input.targetId === me.id) return { ok: false, error: "본인에게는 투표할 수 없어요." };
    const candidateTeam = input.kind === "mvp" ? match.winner : match.winner === "blue" ? "red" : "blue";
    if (match.teams.get(input.targetId) !== candidateTeam) {
      return { ok: false, error: input.kind === "mvp" ? "MVP는 이긴 팀에서 골라요." : "범인은 진 팀에서 골라요." };
    }
    await repo.upsertVote({ play_date: input.date, voter_id: me.id, kind: input.kind, target_id: input.targetId });
  }

  revalidate();
  return { ok: true };
}

/** 댓글 (로그인 멤버 누구나, 종료된 매치에서만) */
export async function addComment(input: { date: string; body: string }): Promise<ActionResult> {
  const me = await requireUser();
  const body = input.body?.trim() ?? "";
  if (!isValidDate(input.date)) return { ok: false, error: "날짜가 올바르지 않아요." };
  if (body.length < 1 || body.length > MAX_COMMENT_LENGTH) {
    return { ok: false, error: `댓글은 1~${MAX_COMMENT_LENGTH}자로 입력해 주세요.` };
  }
  if ((await repo.listResults([input.date])).length === 0) return { ok: false, error: "종료된 매치에만 댓글을 달 수 있어요." };

  await repo.insertComment({ play_date: input.date, user_id: me.id, body });
  revalidate();
  return { ok: true };
}

/** 댓글 삭제 (작성자 or 관리자) */
export async function deleteComment(id: string): Promise<ActionResult> {
  const me = await requireUser();
  const comment = await repo.findComment(id);
  if (!comment) return { ok: false, error: "이미 삭제됐어요." };
  if (comment.user_id !== me.id && !me.is_admin) return { ok: false, error: "작성자나 관리자만 삭제할 수 있어요." };

  await repo.deleteComment(id);
  revalidate();
  return { ok: true };
}

/** 경기 결과 스크린샷 업로드 (로그인 멤버 누구나, 종료된 매치에서만) */
export async function uploadScreenshot(formData: FormData): Promise<ActionResult> {
  const me = await requireUser();
  const date = formData.get("date");
  const file = formData.get("file");

  if (!isValidDate(date)) return { ok: false, error: "날짜가 올바르지 않아요." };
  if (!(file instanceof File) || !IMAGE_TYPES[file.type]) return { ok: false, error: "jpg, png, webp 이미지만 올릴 수 있어요." };
  if (file.size > MAX_BYTES) return { ok: false, error: "4MB 이하 이미지만 올릴 수 있어요." };
  if ((await repo.listResults([date])).length === 0) return { ok: false, error: "종료된 매치에만 올릴 수 있어요." };

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
