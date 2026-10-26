import type { Division, Lane, Tier } from "./constants";

/** 클라이언트로 내려가도 안전한 유저 정보 (pin_hash 제외) */
export type PublicUser = {
  id: string;
  nickname: string;
  tier: Tier;
  /** 1~4 (I~IV). 언랭/마스터 이상은 null */
  tier_division: Division | null;
  preferred_lanes: Lane[];
  is_admin: boolean;
  /** true 면 PIN 재설정 전까지 다른 화면 사용 불가 */
  must_change_pin: boolean;
};

export type ScheduleStatus = "join" | "decline";

export type Schedule = {
  id: string;
  user_id: string;
  play_date: string; // YYYY-MM-DD
  status: ScheduleStatus;
  lane: Lane | null;
  user: Pick<PublicUser, "id" | "nickname" | "tier" | "tier_division">;
};

export type Participant = {
  userId: string;
  nickname: string;
  tier: Tier;
  division: Division | null;
  lane: Lane;
};

export type MatchSettings = {
  matchFormat: string;
  stake: string;
  updatedByNickname: string | null;
  updatedAt: string;
};

export type VoteKind = "mvp" | "blame";

export type Screenshot = {
  id: string;
  /** 로그인 확인 후 파일을 내려주는 /api/screenshots/[id] 경로 */
  url: string;
  uploaderId: string | null;
  uploaderNickname: string | null;
};

export type Team = "blue" | "red";

export type Comment = {
  id: string;
  userId: string | null;
  nickname: string | null;
  body: string;
  createdAt: string;
};

/**
 * 관리자가 종료 처리한 매치의 결과. 누가 누구에게 투표했는지는 내려보내지 않는다.
 */
export type MatchResults = {
  winner: Team;
  /** userId → 팀 (종료 시점 5대5 배정) */
  teams: Record<string, Team>;
  /** kind → { 대상 userId: 득표수 } */
  tallies: Record<VoteKind, Record<string, number>>;
  /** 내가 투표한 대상 */
  myVotes: Partial<Record<VoteKind, string>>;
  screenshots: Screenshot[];
  comments: Comment[];
};

export type MatchCardData = {
  date: string;
  participants: Participant[];
  settings: MatchSettings | null;
  /** 종료된 매치만 존재 */
  results: MatchResults | null;
};

export type ActionResult = { ok: true } | { ok: false; error: string };
