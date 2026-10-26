import "server-only";
import { randomUUID } from "node:crypto";
import type { Division, Lane, Tier } from "../constants";
import { addDays, todayKST } from "../date";
import { hashPin } from "../pin";
import type { PublicUser, Schedule, ScheduleStatus, Team, VoteKind } from "../types";
import {
  DuplicateNicknameError,
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
type ScheduleRow = { id: string; user_id: string; play_date: string; status: ScheduleStatus; lane: Lane | null };
type MatchSettingsRow = { play_date: string; match_format: string; stake: string; updated_by: string | null; updated_at: string };
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
  const add = (diff: number, entries: [number, Lane | null][]) => {
    for (const [i, lane] of entries)
      schedules.push({
        id: randomUUID(),
        user_id: users[i].id,
        play_date: addDays(today, diff),
        status: lane ? "join" : "decline",
        lane,
      });
  };
  const ten: [number, Lane][] = [
    [10, "top"], [5, "top"], [1, "jungle"], [6, "jungle"], [2, "mid"],
    [0, "mid"], [3, "adc"], [7, "adc"], [4, "support"], [8, "support"],
  ];
  add(-7, ten); // 지난 매치 (종료됨)
  add(0, ten); // 오늘 매치 (10명, 아직 종료 전 → 관리자 종료 처리 확인용)
  add(1, [[0, "top"], [1, "jungle"], [2, "mid"], [3, "adc"], [4, "support"], [5, "top"], [6, "jungle"], [7, "adc"], [9, null]]);
  add(2, [[1, "jungle"], [2, "mid"], [8, "support"]]);
  add(8, ten);

  const settings: MatchSettingsRow[] = [
    { play_date: addDays(today, -7), match_format: "단판", stake: "커피 내기", updated_by: users[2].id, updated_at: now },
    { play_date: addDays(today, 1), match_format: "3판 2선승제", stake: "진 팀이 치킨 쏘기", updated_by: users[1].id, updated_at: now },
  ];

  // 지난 매치 종료 처리: 라인별 첫 번째 = 블루, 두 번째 = 레드, 블루 승
  const lastWeek = addDays(today, -7);
  const results: MatchResultRow[] = [{ play_date: lastWeek, winner: "blue", finished_by: users[0].id }];
  const players: PlayerRow[] = ten.map(([i], n) => ({
    play_date: lastWeek,
    user_id: users[i].id,
    team: n % 2 === 0 ? "blue" : "red",
  }));
  // 블루(승) = 서말파·조리신·박아리·이징크스·최쓰레쉬 / 레드(패) = 정다리우스·한니달리·김가렌·윤이즈·강룰루

  // 지난 매치 투표 (MVP 는 블루에서, 범인은 레드에서)
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
  const comments: MemComment[] = [
    { id: randomUUID(), play_date: lastWeek, user_id: users[8].id, body: "다음엔 진짜 잘할게요...", created_at: now },
    { id: randomUUID(), play_date: lastWeek, user_id: users[2].id, body: "미드 차이 ㅎㅎ", created_at: now },
  ];

  return { users, schedules, settings, results, players, votes, comments, screenshots: [] };
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
    if (existing) Object.assign(existing, { status: input.status, lane: input.lane });
    else store().schedules.push({ id: randomUUID(), ...input });
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
          stake: m.stake,
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
