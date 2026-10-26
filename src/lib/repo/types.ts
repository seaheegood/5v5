import type { Division, Lane, Tier } from "../constants";
import type { PublicUser, Schedule, ScheduleStatus, Team, VoteKind } from "../types";

/** 닉네임 중복 (대소문자 무시 유일 제약 위반) */
export class DuplicateNicknameError extends Error {
  constructor() {
    super("duplicate nickname");
  }
}

/** 그 칸에 이미 다른 사람이 있음 (schedules_slot_key 위반) */
export class SlotTakenError extends Error {
  constructor() {
    super("slot taken");
  }
}

export type AuthRow = {
  id: string;
  pin_hash: string;
  failed_pin_attempts: number;
  locked_until: string | null;
};

export type NewUser = {
  nickname: string;
  pin_hash: string;
  tier: Tier;
  tier_division: Division | null;
  preferred_lanes: Lane[];
  is_admin: boolean;
  must_change_pin: boolean;
};

export type UserPatch = {
  tier: Tier;
  tier_division: Division | null;
  preferred_lanes: Lane[];
  /** 관리자만 */
  nickname?: string;
  /** 관리자만 */
  is_admin?: boolean;
};

export type SettingsRow = {
  play_date: string;
  match_format: string;
  stake: string;
  updated_at: string;
  updater_nickname: string | null;
};

export type VoteRow = { play_date: string; voter_id: string; kind: VoteKind; target_id: string };

export type ResultRow = { play_date: string; winner: Team };
export type PlayerRow = { play_date: string; user_id: string; team: Team };

export type CommentRow = {
  id: string;
  play_date: string;
  user_id: string | null;
  nickname: string | null;
  body: string;
  created_at: string;
};

export type ScreenshotRow = {
  id: string;
  play_date: string;
  storage_path: string;
  uploader_id: string | null;
  uploader_nickname: string | null;
};

/**
 * 앱이 쓰는 DB 작업 전체. 실제 구현은 Neon(Postgres), 목업 모드는 메모리.
 * 권한 검사는 여기서 하지 않는다 (Server Action 책임).
 */
export interface Repo {
  // ── users ─────────────────────────────
  listUsers(): Promise<PublicUser[]>;
  findUser(id: string): Promise<PublicUser | null>;
  findAuth(id: string): Promise<AuthRow | null>;
  setLoginState(id: string, state: { failed_pin_attempts: number; locked_until: string | null }): Promise<void>;
  countUsers(): Promise<number>;
  /** @throws DuplicateNicknameError */
  createUser(input: NewUser): Promise<string>;
  /** @throws DuplicateNicknameError */
  updateUser(id: string, patch: UserPatch): Promise<void>;
  /** PIN 변경 + 잠금 해제. mustChange 면 다음 로그인 때 재설정 강제 */
  setPinHash(id: string, pinHash: string, mustChange: boolean): Promise<void>;
  /** 일정/투표는 cascade, 설정 수정자/스크린샷 업로더는 null */
  deleteUser(id: string): Promise<void>;

  // ── schedules ─────────────────────────
  listSchedules(range: { from?: string; to?: string }): Promise<Schedule[]>;
  /** 참여/불참. 불참이면 자리도 비우고, 참여면 기존 자리는 유지 */
  upsertSchedule(input: { user_id: string; play_date: string; status: ScheduleStatus }): Promise<void>;
  /** 티켓 칸에 들어가기 (참여 처리 포함, 다른 칸에 있었으면 이동). @throws SlotTakenError */
  takeSlot(input: { user_id: string; play_date: string; team: Team; lane: Lane }): Promise<void>;
  /** 자리 비우기 (참여는 유지 → 자리 미정) */
  clearSlot(userId: string, date: string): Promise<void>;
  deleteSchedule(userId: string, date: string): Promise<void>;
  participantIds(date: string): Promise<string[]>;

  // ── match settings ────────────────────
  listSettings(dates: string[]): Promise<SettingsRow[]>;
  upsertSettings(input: { play_date: string; match_format: string; stake: string; updated_by: string }): Promise<void>;
  /** 그날의 응답/설정/결과/투표/댓글/스크린샷 전부 삭제. 삭제된 스크린샷 파일 경로를 돌려준다 */
  deleteMatch(date: string): Promise<string[]>;

  // ── results (종료) ────────────────────
  listResults(dates: string[]): Promise<ResultRow[]>;
  listPlayers(dates: string[]): Promise<PlayerRow[]>;
  /** 종료 처리: 결과 + 팀 배정을 한 번에 기록 */
  finishMatch(input: { play_date: string; winner: Team; finished_by: string; players: { user_id: string; team: Team }[] }): Promise<void>;
  /** 종료 취소: 결과/팀/투표 삭제 (댓글/스크린샷은 유지) */
  reopenMatch(date: string): Promise<void>;

  // ── votes ─────────────────────────────
  listVotes(dates: string[]): Promise<VoteRow[]>;
  upsertVote(input: VoteRow): Promise<void>;
  deleteVote(date: string, voterId: string, kind: VoteKind): Promise<void>;

  // ── comments ──────────────────────────
  listComments(dates: string[]): Promise<CommentRow[]>;
  insertComment(input: { play_date: string; user_id: string; body: string }): Promise<void>;
  findComment(id: string): Promise<CommentRow | null>;
  deleteComment(id: string): Promise<void>;

  // ── screenshots ───────────────────────
  listScreenshots(dates: string[]): Promise<ScreenshotRow[]>;
  countScreenshots(date: string): Promise<number>;
  insertScreenshot(input: { play_date: string; storage_path: string; uploader_id: string }): Promise<void>;
  findScreenshot(id: string): Promise<ScreenshotRow | null>;
  deleteScreenshot(id: string): Promise<void>;
}
