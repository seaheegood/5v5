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
  /** 티켓 자리. 자리 미정이면 둘 다 null */
  team: Team | null;
  lane: Lane | null;
  user: Pick<PublicUser, "id" | "nickname" | "tier" | "tier_division">;
};

export type Participant = {
  userId: string;
  nickname: string;
  tier: Tier;
  division: Division | null;
  /** 티켓 자리. 자리 미정이면 둘 다 null */
  team: Team | null;
  lane: Lane | null;
};

export type MatchSettings = {
  /** null 이면 방식 미정 */
  matchFormat: string | null;
  /** 1인당 판돈(원). null 이면 미정, 0 이면 없음 */
  stake: number | null;
  pcBang: string | null;
  /** 관리자가 덮어쓴 시작 시간(분). null 이면 응답으로 자동 확정 */
  startOverride: number | null;
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
  /** 익명 응원이면 관리자/작성자 본인이 아닐 때 null (서버에서 지워서 보냄) */
  userId: string | null;
  nickname: string | null;
  body: string;
  createdAt: string;
  /** 익명 응원 여부 */
  anonymous?: boolean;
  /** 내가 쓴 글 (익명이어도 삭제 버튼/표시용) */
  mine?: boolean;
};

/** 원하는 시작 시간 응답 */
export type TimePref = {
  userId: string;
  nickname: string;
  startMin: number;
  reason: string;
};

/** 티켓의 시작 시간 조율 상태 */
export type MatchTime = {
  /** 자리에 있는 사람들의 응답 */
  prefs: TimePref[];
  /** 확정 시작 시간(분). 10칸이 다 차고 10명 모두 응답했거나, 관리자가 정했으면 값이 있음 */
  confirmedStart: number | null;
  /** 관리자가 덮어쓴 시간인지 */
  overridden: boolean;
  /** 최다 선택 시간 (응답이 있으면) */
  leading: number | null;
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
};

export type MatchCardData = {
  date: string;
  participants: Participant[];
  settings: MatchSettings | null;
  /** 티켓 댓글 (항상 열림) */
  comments: Comment[];
  /** 시작 시간 조율 */
  time: MatchTime;
  /** 종료된 매치만 존재 */
  results: MatchResults | null;
};

/** 개인 페이지의 경기 한 건 (종료된 매치) */
export type PlayerMatch = {
  date: string;
  team: Team;
  won: boolean;
  /** 이 경기에서 번 돈(+)/잃은 돈(-). 판돈 미정이면 null */
  profit: number | null;
  /** 이 경기에서 최다 득표(동점 포함)로 뽑힌 상. 개인 페이지에서만 채운다 */
  award?: VoteKind | null;
};

/** 통산 전적 */
export type PlayerRecord = {
  wins: number;
  losses: number;
  /** 판돈이 걸린 경기의 합계 (+ 딴 돈 / - 잃은 돈) */
  profit: number;
  matches: PlayerMatch[];
};

/** 개인 페이지용: 통산 전적 + MVP/범인 횟수 */
export type PlayerProfile = PlayerRecord & {
  /** 최다 득표 MVP 횟수 (동점이면 모두 인정) */
  mvp: number;
  /** 최다 득표 범인 횟수 (동점이면 모두 인정) */
  blame: number;
};

export type ActionResult = { ok: true } | { ok: false; error: string };
