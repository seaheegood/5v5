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

/** 경기 당일부터 보이는 결과 (투표 집계 + 스크린샷). 누가 누구에게 투표했는지는 내려보내지 않는다 */
export type MatchResults = {
  /** kind → { 대상 userId: 득표수 } */
  tallies: Record<VoteKind, Record<string, number>>;
  /** 내가 투표한 대상 */
  myVotes: Partial<Record<VoteKind, string>>;
  screenshots: Screenshot[];
};

export type MatchCardData = {
  date: string;
  participants: Participant[];
  settings: MatchSettings | null;
  /** 경기 당일/지난 매치만 존재 */
  results: MatchResults | null;
};

export type ActionResult = { ok: true } | { ok: false; error: string };
