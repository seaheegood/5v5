import type { Division, Lane, Tier } from "../constants";
import type { PublicUser, Schedule, ScheduleStatus, VoteKind } from "../types";

/** 닉네임 중복 (대소문자 무시 유일 제약 위반) */
export class DuplicateNicknameError extends Error {
  constructor() {
    super("duplicate nickname");
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
  /** PIN 변경 + 잠금 해제 */
  setPinHash(id: string, pinHash: string): Promise<void>;
  /** 일정/투표는 cascade, 설정 수정자/스크린샷 업로더는 null */
  deleteUser(id: string): Promise<void>;

  // ── schedules ─────────────────────────
  listSchedules(range: { from?: string; to?: string }): Promise<Schedule[]>;
  upsertSchedule(input: { user_id: string; play_date: string; status: ScheduleStatus; lane: Lane | null }): Promise<void>;
  deleteSchedule(userId: string, date: string): Promise<void>;
  participantIds(date: string): Promise<string[]>;

  // ── match settings ────────────────────
  listSettings(dates: string[]): Promise<SettingsRow[]>;
  upsertSettings(input: { play_date: string; match_format: string; stake: string; updated_by: string }): Promise<void>;
  /** 그날의 응답/설정/투표/스크린샷 전부 삭제. 삭제된 스크린샷 파일 경로를 돌려준다 */
  deleteMatch(date: string): Promise<string[]>;

  // ── votes ─────────────────────────────
  listVotes(dates: string[]): Promise<VoteRow[]>;
  upsertVote(input: VoteRow): Promise<void>;
  deleteVote(date: string, voterId: string, kind: VoteKind): Promise<void>;

  // ── screenshots ───────────────────────
  listScreenshots(dates: string[]): Promise<ScreenshotRow[]>;
  countScreenshots(date: string): Promise<number>;
  insertScreenshot(input: { play_date: string; storage_path: string; uploader_id: string }): Promise<void>;
  findScreenshot(id: string): Promise<ScreenshotRow | null>;
  deleteScreenshot(id: string): Promise<void>;
}
