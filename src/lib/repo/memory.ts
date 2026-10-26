import "server-only";
import { randomUUID } from "node:crypto";
import type { Division, Lane, Tier } from "../constants";
import { addDays, todayKST } from "../date";
import { hashPin } from "../pin";
import type { PublicUser, Schedule, ScheduleStatus, Team, VoteKind } from "../types";
import {
  type CheerRow,
  DuplicateNicknameError,
  SlotTakenError,
  type CommentRow,
  type PlayerRow,
  type Repo,
  type ResultRow,
  type ScreenshotRow,
  type SettingsRow,
  type VoteRow,
} from "./types";

/**
 * ⚠️ 목업 모드(npm run dev:mock)용 인메모리 저장소.
 * 서버를 재시작하면 초기화된다. production 에서는 사용되지 않는다 (repo/index.ts).
 */

type UserRow = PublicUser & { pin_hash: string; failed_pin_attempts: number; locked_until: string | null };
type ScheduleRow = {
  id: string;
  user_id: string;
  play_date: string;
  status: ScheduleStatus;
  team: Team | null;
  lane: Lane | null;
};
type MatchSettingsRow = {
  play_date: string;
  match_format: string;
  stake_amount: number | null;
  updated_by: string | null;
  updated_at: string;
};
type MemCheer = { id: string; target_id: string; author_id: string | null; body: string; created_at: string };
type MatchResultRow = { play_date: string; winner: Team; finished_by: string | null };
type MemComment = { id: string; play_date: string; user_id: string | null; body: string; created_at: string };
type ShotRow = { id: string; play_date: string; storage_path: string; uploader_id: string | null; created_at: string };

type Store = {
  users: UserRow[];
  schedules: ScheduleRow[];
  settings: MatchSettingsRow[];
  results: MatchResultRow[];
  players: PlayerRow[];
  votes: VoteRow[];
  comments: MemComment[];
  cheers: MemCheer[];
  screenshots: ShotRow[];
};

function seed(): Store {
  const now = new Date().toISOString();
  const pin = hashPin("0000");
  const members: [string, Tier, Division | null, Lane[]][] = [
    ["김가렌", "gold", 2, ["top", "mid"]],
    ["조리신", "platinum", 4, ["jungle"]],
    ["박아리", "diamond", 1, ["mid"]],
    ["이징크스", "silver", 3, ["adc"]],
    ["최쓰레쉬", "emerald", 2, ["support"]],
    ["정다리우스", "bronze", 1, ["top"]],
    ["한니달리", "gold", 4, ["jungle", "support"]],
    ["윤이즈", "master", null, ["adc", "mid"]],
    ["강룰루", "iron", 2, ["support"]],
    ["오제드", "unranked", null, ["mid"]],
    ["서말파", "challenger", null, ["top", "jungle"]],
  ];
  const users: UserRow[] = members.map(([nickname, tier, tier_division, preferred_lanes], i) => ({
    id: randomUUID(),
    nickname,
    tier,
    tier_division,
    preferred_lanes,
    is_admin: i === 0,
    must_change_pin: nickname === "오제드", // 첫 로그인 PIN 재설정 확인용
    pin_hash: pin,
    failed_pin_attempts: 0,
    locked_until: null,
  }));

  const today = todayKST();
  const schedules: ScheduleRow[] = [];
  // [멤버 번호, 팀, 라인] = 자리 있음 / [멤버 번호, "join"] = 자리 미정 / [멤버 번호, "decline"] = 불참
  type Seed = [number, Team, Lane] | [number, "join" | "decline"];
  const add = (diff: number, entries: Seed[]) => {
    for (const [i, a, lane] of entries)
      schedules.push({
        id: randomUUID(),
        user_id: users[i].id,
        play_date: addDays(today, diff),
        status: a === "decline" ? "decline" : "join",
        team: a === "blue" || a === "red" ? a : null,
        lane: lane ?? null,
      });
  };
  // 1팀(blue) = 서말파·조리신·박아리·이징크스·최쓰레쉬 / 2팀(red) = 정다리우스·한니달리·김가렌·윤이즈·강룰루
  const ten: Seed[] = [
    [10, "blue", "top"], [5, "red", "top"], [1, "blue", "jungle"], [6, "red", "jungle"], [2, "blue", "mid"],
    [0, "red", "mid"], [3, "blue", "adc"], [7, "red", "adc"], [4, "blue", "support"], [8, "red", "support"],
  ];
  // 2주 전: 2팀 승 (판돈 50,000원). 전적/수익이 사람마다 다르게 나오도록 라인업을 조금 다르게
  const twoWeeks: Seed[] = [
    [10, "red", "top"], [5, "blue", "top"], [1, "blue", "jungle"], [6, "red", "jungle"], [2, "red", "mid"],
    [0, "blue", "mid"], [3, "blue", "adc"], [7, "red", "adc"], [9, "blue", "support"], [8, "red", "support"],
  ];
  add(-14, twoWeeks);
  // 3~12주 전: 매주 한 판씩 (경기 기록 '전체 보기' 확인용)
  const olderWeeks = Array.from({ length: 10 }, (_, i) => -(i + 3) * 7);
  for (const diff of olderWeeks) add(diff, diff % 14 === 0 ? twoWeeks : ten);
  add(-7, ten); // 지난 매치 (종료됨, 1팀 승, 판돈 30,000원)
  add(0, ten); // 오늘 매치 (10자리 다 참, 아직 종료 전 → 관리자 종료 확인용)
  // 내일: 7자리 + 자리 미정 2명 + 불참 1명 (김가렌은 아직 응답 없음 → 빈 칸 들어가기 확인용)
  add(1, [
    [10, "blue", "top"], [1, "blue", "jungle"], [7, "blue", "adc"], [4, "blue", "support"],
    [6, "red", "jungle"], [2, "red", "mid"], [3, "red", "adc"],
    [5, "join"], [9, "join"], [8, "decline"],
  ]);
  add(2, [[1, "blue", "jungle"], [2, "join"], [8, "red", "support"]]);
  add(8, ten);

  const settings: MatchSettingsRow[] = [
    { play_date: addDays(today, -14), match_format: "3판 2선승제", stake_amount: 50000, updated_by: users[0].id, updated_at: now },
    ...olderWeeks.map((diff, i) => ({
      play_date: addDays(today, diff),
      match_format: "단판",
      stake_amount: i % 3 === 0 ? 50000 : 30000,
      updated_by: users[0].id,
      updated_at: now,
    })),
    { play_date: addDays(today, -7), match_format: "단판", stake_amount: 30000, updated_by: users[2].id, updated_at: now },
    { play_date: addDays(today, 1), match_format: "3판 2선승제", stake_amount: 30000, updated_by: users[1].id, updated_at: now },
  ];

  // 지난 매치 종료 처리: 1팀 승, 자리 그대로 스냅샷
  const lastWeek = addDays(today, -7);
  const twoWeeksAgo = addDays(today, -14);
  const results: MatchResultRow[] = [
    { play_date: twoWeeksAgo, winner: "red", finished_by: users[0].id },
    { play_date: lastWeek, winner: "blue", finished_by: users[0].id },
    ...olderWeeks.map((diff, i): MatchResultRow => ({
      play_date: addDays(today, diff),
      winner: i % 3 === 1 ? "red" : "blue",
      finished_by: users[0].id,
    })),
  ];
  const lineupOf = (diff: number) => (diff === -14 || (diff < -14 && diff % 14 === 0) ? twoWeeks : ten);
  const players: PlayerRow[] = [-14, -7, ...olderWeeks].flatMap((diff) =>
    lineupOf(diff).map(([i, team]) => ({ play_date: addDays(today, diff), user_id: users[i].id, team: team as Team })),
  );

  // 지난 매치 투표 (MVP 는 1팀에서, 범인은 2팀에서)
  const vote = (voter: number, kind: VoteKind, target: number): VoteRow => ({
    play_date: addDays(today, -7),
    voter_id: users[voter].id,
    kind,
    target_id: users[target].id,
  });
  const votes: VoteRow[] = [
    vote(0, "mvp", 2), vote(1, "mvp", 2), vote(5, "mvp", 2), vote(3, "mvp", 10), vote(4, "mvp", 10),
    vote(1, "blame", 8), vote(2, "blame", 8), vote(3, "blame", 6),
  ];
  const comment = (date: string, user: number, body: string, minutesAgo: number): MemComment => ({
    id: randomUUID(),
    play_date: date,
    user_id: users[user].id,
    body,
    created_at: new Date(Date.now() - minutesAgo * 60000).toISOString(),
  });
  const tomorrow = addDays(today, 1);
  const comments: MemComment[] = [
    comment(lastWeek, 8, "다음엔 진짜 잘할게요...", 9000),
    comment(lastWeek, 2, "미드 차이 ㅎㅎ", 8990),
    comment(tomorrow, 1, "미드 누가 와요?? 1팀 미드 비었어요", 90),
    comment(tomorrow, 2, "전 2팀 미드 먹었습니다 ㅎ", 80),
    comment(tomorrow, 5, "탑 둘 다 찼네.. 서폿 가도 됨?", 60),
  ];

  const cheer = (target: number, author: number, body: string, minutesAgo: number): MemCheer => ({
    id: randomUUID(),
    target_id: users[target].id,
    author_id: users[author].id,
    body,
    created_at: new Date(Date.now() - minutesAgo * 60000).toISOString(),
  });
  const cheers: MemCheer[] = [
    cheer(2, 1, "미드 차이 ㄹㅇ 인정합니다", 3000),
    cheer(2, 8, "다음에 같은 팀 해주세요 🙏", 1200),
    cheer(0, 2, "가렌 장인 화이팅...", 600),
  ];

  return { users, schedules, settings, results, players, votes, comments, cheers, screenshots: [] };
}

// 개발 서버 HMR 에도 유지되도록 globalThis 에 보관
const holder = globalThis as unknown as { __5v5MemoryStore?: Store };
const store = () => (holder.__5v5MemoryStore ??= seed());

const toPublic = ({ id, nickname, tier, tier_division, preferred_lanes, is_admin, must_change_pin }: UserRow): PublicUser => ({
  id,
  nickname,
  tier,
  tier_division,
  preferred_lanes: [...preferred_lanes],
  is_admin,
  must_change_pin,
});

const nicknameTaken = (nickname: string, exceptId?: string) =>
  store().users.some((u) => u.id !== exceptId && u.nickname.toLowerCase() === nickname.toLowerCase());

const nicknameOf = (id: string | null) => store().users.find((u) => u.id === id)?.nickname ?? null;

const toScreenshot = (s: ShotRow): ScreenshotRow => ({
  id: s.id,
  play_date: s.play_date,
  storage_path: s.storage_path,
  uploader_id: s.uploader_id,
  uploader_nickname: nicknameOf(s.uploader_id),
});

const toComment = (c: MemComment): CommentRow => ({ ...c, nickname: nicknameOf(c.user_id) });
const toCheer = (c: MemCheer): CheerRow => ({ ...c, nickname: nicknameOf(c.author_id) });

export const memoryRepo: Repo = {
  // ── users ─────────────────────────────
  async listUsers() {
    return store()
      .users.map(toPublic)
      .sort((a, b) => a.nickname.localeCompare(b.nickname, "ko"));
  },

  async findUser(id) {
    const user = store().users.find((u) => u.id === id);
    return user ? toPublic(user) : null;
  },

  async findAuth(id) {
    const user = store().users.find((u) => u.id === id);
    return user
      ? { id, pin_hash: user.pin_hash, failed_pin_attempts: user.failed_pin_attempts, locked_until: user.locked_until }
      : null;
  },

  async setLoginState(id, state) {
    const user = store().users.find((u) => u.id === id);
    if (user) Object.assign(user, state);
  },

  async countUsers() {
    return store().users.length;
  },

  async createUser(input) {
    if (nicknameTaken(input.nickname)) throw new DuplicateNicknameError();
    const id = randomUUID();
    store().users.push({ ...input, id, failed_pin_attempts: 0, locked_until: null });
    return id;
  },

  async updateUser(id, patch) {
    const user = store().users.find((u) => u.id === id);
    if (!user) return;
    if (patch.nickname !== undefined && nicknameTaken(patch.nickname, id)) throw new DuplicateNicknameError();
    user.tier = patch.tier;
    user.tier_division = patch.tier_division;
    user.preferred_lanes = [...patch.preferred_lanes];
    if (patch.nickname !== undefined) user.nickname = patch.nickname;
    if (patch.is_admin !== undefined) user.is_admin = patch.is_admin;
  },

  async setPinHash(id, pinHash, mustChange) {
    const user = store().users.find((u) => u.id === id);
    if (user)
      Object.assign(user, { pin_hash: pinHash, must_change_pin: mustChange, failed_pin_attempts: 0, locked_until: null });
  },

  async deleteUser(id) {
    const s = store();
    s.users = s.users.filter((u) => u.id !== id);
    s.schedules = s.schedules.filter((r) => r.user_id !== id);
    s.votes = s.votes.filter((v) => v.voter_id !== id && v.target_id !== id);
    s.players = s.players.filter((p) => p.user_id !== id);
    for (const m of s.results) if (m.finished_by === id) m.finished_by = null;
    for (const m of s.comments) if (m.user_id === id) m.user_id = null;
    s.cheers = s.cheers.filter((c) => c.target_id !== id);
    for (const c of s.cheers) if (c.author_id === id) c.author_id = null;
    for (const m of s.settings) if (m.updated_by === id) m.updated_by = null;
    for (const m of s.screenshots) if (m.uploader_id === id) m.uploader_id = null;
  },

  // ── schedules ─────────────────────────
  async listSchedules({ from, to }) {
    return store()
      .schedules.filter((s) => (!from || s.play_date >= from) && (!to || s.play_date <= to))
      .sort((a, b) => a.play_date.localeCompare(b.play_date))
      .map((s): Schedule => {
        const user = store().users.find((u) => u.id === s.user_id)!;
        return {
          ...s,
          user: { id: user.id, nickname: user.nickname, tier: user.tier, tier_division: user.tier_division },
        };
      });
  },

  async upsertSchedule(input) {
    const existing = store().schedules.find((s) => s.user_id === input.user_id && s.play_date === input.play_date);
    if (!existing) store().schedules.push({ id: randomUUID(), ...input, team: null, lane: null });
    else {
      existing.status = input.status;
      if (input.status === "decline") Object.assign(existing, { team: null, lane: null });
    }
  },

  async takeSlot(input) {
    const rows = store().schedules;
    const taken = rows.find(
      (s) => s.play_date === input.play_date && s.team === input.team && s.lane === input.lane && s.user_id !== input.user_id,
    );
    if (taken) throw new SlotTakenError();
    const existing = rows.find((s) => s.user_id === input.user_id && s.play_date === input.play_date);
    if (existing) Object.assign(existing, { status: "join", team: input.team, lane: input.lane });
    else rows.push({ id: randomUUID(), ...input, status: "join" });
  },

  async clearSlot(userId, date) {
    const existing = store().schedules.find((s) => s.user_id === userId && s.play_date === date);
    if (existing) Object.assign(existing, { team: null, lane: null });
  },

  async deleteSchedule(userId, date) {
    store().schedules = store().schedules.filter((s) => !(s.user_id === userId && s.play_date === date));
  },

  async participantIds(date) {
    return store()
      .schedules.filter((s) => s.play_date === date && s.status === "join")
      .map((s) => s.user_id);
  },

  // ── match settings ────────────────────
  async listSettings(dates) {
    return store()
      .settings.filter((m) => dates.includes(m.play_date))
      .map(
        (m): SettingsRow => ({
          play_date: m.play_date,
          match_format: m.match_format,
          stake_amount: m.stake_amount,
          updated_at: m.updated_at,
          updater_nickname: nicknameOf(m.updated_by),
        }),
      );
  },

  async upsertSettings(input) {
    const now = new Date().toISOString();
    const existing = store().settings.find((m) => m.play_date === input.play_date);
    if (existing) Object.assign(existing, input, { updated_at: now });
    else store().settings.push({ ...input, updated_at: now });
  },

  async deleteMatch(date) {
    const s = store();
    const paths = s.screenshots.filter((m) => m.play_date === date).map((m) => m.storage_path);
    s.screenshots = s.screenshots.filter((m) => m.play_date !== date);
    s.votes = s.votes.filter((v) => v.play_date !== date);
    s.comments = s.comments.filter((c) => c.play_date !== date);
    s.results = s.results.filter((r) => r.play_date !== date);
    s.players = s.players.filter((p) => p.play_date !== date);
    s.settings = s.settings.filter((m) => m.play_date !== date);
    s.schedules = s.schedules.filter((r) => r.play_date !== date);
    return paths;
  },

  // ── results (종료) ────────────────────
  async listResults(dates) {
    return store()
      .results.filter((r) => dates.includes(r.play_date))
      .map((r): ResultRow => ({ play_date: r.play_date, winner: r.winner }));
  },

  async listPlayers(dates) {
    return store().players.filter((p) => dates.includes(p.play_date));
  },

  async finishMatch(input) {
    const s = store();
    if (s.results.some((r) => r.play_date === input.play_date)) throw new Error("already finished");
    s.results.push({ play_date: input.play_date, winner: input.winner, finished_by: input.finished_by });
    s.players.push(...input.players.map((p) => ({ play_date: input.play_date, ...p })));
  },

  async reopenMatch(date) {
    const s = store();
    s.votes = s.votes.filter((v) => v.play_date !== date);
    s.results = s.results.filter((r) => r.play_date !== date);
    s.players = s.players.filter((p) => p.play_date !== date);
  },

  // ── votes ─────────────────────────────
  async listVotes(dates) {
    return store().votes.filter((v) => dates.includes(v.play_date));
  },

  async upsertVote(input) {
    const existing = store().votes.find(
      (v) => v.play_date === input.play_date && v.voter_id === input.voter_id && v.kind === input.kind,
    );
    if (existing) existing.target_id = input.target_id;
    else store().votes.push({ ...input });
  },

  async deleteVote(date, voterId, kind) {
    store().votes = store().votes.filter((v) => !(v.play_date === date && v.voter_id === voterId && v.kind === kind));
  },

  async listRecords(userId) {
    const s = store();
    return s.players
      .filter((p) => !userId || p.user_id === userId)
      .flatMap((p) => {
        const result = s.results.find((r) => r.play_date === p.play_date);
        if (!result) return [];
        const stake = s.settings.find((m) => m.play_date === p.play_date)?.stake_amount ?? null;
        return [{ user_id: p.user_id, play_date: p.play_date, team: p.team, winner: result.winner, stake_amount: stake }];
      })
      .sort((a, b) => b.play_date.localeCompare(a.play_date));
  },

  // ── comments ──────────────────────────
  async listComments(dates) {
    return store()
      .comments.filter((c) => dates.includes(c.play_date))
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map(toComment);
  },

  async insertComment(input) {
    store().comments.push({ id: randomUUID(), ...input, created_at: new Date().toISOString() });
  },

  async findComment(id) {
    const comment = store().comments.find((c) => c.id === id);
    return comment ? toComment(comment) : null;
  },

  async deleteComment(id) {
    store().comments = store().comments.filter((c) => c.id !== id);
  },

  // ── cheers (응원하기) ──────────────────
  async listCheers(targetId) {
    return store()
      .cheers.filter((c) => c.target_id === targetId)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map(toCheer);
  },

  async insertCheer(input) {
    store().cheers.push({ id: randomUUID(), ...input, created_at: new Date().toISOString() });
  },

  async findCheer(id) {
    const cheer = store().cheers.find((c) => c.id === id);
    return cheer ? toCheer(cheer) : null;
  },

  async deleteCheer(id) {
    store().cheers = store().cheers.filter((c) => c.id !== id);
  },

  // ── screenshots ───────────────────────
  async listScreenshots(dates) {
    return store()
      .screenshots.filter((s) => dates.includes(s.play_date))
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map(toScreenshot);
  },

  async countScreenshots(date) {
    return store().screenshots.filter((s) => s.play_date === date).length;
  },

  async insertScreenshot(input) {
    store().screenshots.push({ id: randomUUID(), ...input, created_at: new Date().toISOString() });
  },

  async findScreenshot(id) {
    const shot = store().screenshots.find((s) => s.id === id);
    return shot ? toScreenshot(shot) : null;
  },

  async deleteScreenshot(id) {
    store().screenshots = store().screenshots.filter((s) => s.id !== id);
  },
};
