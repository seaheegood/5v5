import "server-only";
import { randomUUID } from "node:crypto";
import type { Division, Lane, Tier } from "../constants";
import { addDays, todayKST } from "../date";
import { hashPin } from "../pin";
import type { PublicUser, Schedule, ScheduleStatus, VoteKind } from "../types";
import { DuplicateNicknameError, type Repo, type ScreenshotRow, type SettingsRow, type VoteRow } from "./types";

/**
 * ⚠️ 목업 모드(npm run dev:mock)용 인메모리 저장소.
 * 서버를 재시작하면 초기화된다. production 에서는 사용되지 않는다 (repo/index.ts).
 */

type UserRow = PublicUser & { pin_hash: string; failed_pin_attempts: number; locked_until: string | null };
type ScheduleRow = { id: string; user_id: string; play_date: string; status: ScheduleStatus; lane: Lane | null };
type MatchSettingsRow = { play_date: string; match_format: string; stake: string; updated_by: string | null; updated_at: string };
type ShotRow = { id: string; play_date: string; storage_path: string; uploader_id: string | null; created_at: string };

type Store = {
  users: UserRow[];
  schedules: ScheduleRow[];
  settings: MatchSettingsRow[];
  votes: VoteRow[];
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
  add(-7, ten); // 지난 매치
  add(0, ten.slice(0, 6)); // 오늘 매치 (결과 투표/스크린샷 확인용)
  add(1, [[0, "top"], [1, "jungle"], [2, "mid"], [3, "adc"], [4, "support"], [5, "top"], [6, "jungle"], [7, "adc"], [9, null]]);
  add(2, [[1, "jungle"], [2, "mid"], [8, "support"]]);
  add(8, ten);

  const settings: MatchSettingsRow[] = [
    { play_date: addDays(today, -7), match_format: "단판", stake: "커피 내기", updated_by: users[2].id, updated_at: now },
    { play_date: addDays(today, 1), match_format: "3판 2선승제", stake: "진 팀이 치킨 쏘기", updated_by: users[1].id, updated_at: now },
  ];

  // 지난 매치 투표 (MVP: 박아리 3표 / 범인: 강룰루 2표 ...)
  const vote = (voter: number, kind: VoteKind, target: number): VoteRow => ({
    play_date: addDays(today, -7),
    voter_id: users[voter].id,
    kind,
    target_id: users[target].id,
  });
  const votes: VoteRow[] = [
    vote(0, "mvp", 2), vote(1, "mvp", 2), vote(5, "mvp", 2), vote(3, "mvp", 10), vote(4, "mvp", 10),
    vote(0, "blame", 8), vote(1, "blame", 8), vote(2, "blame", 6),
  ];

  return { users, schedules, settings, votes, screenshots: [] };
}

// 개발 서버 HMR 에도 유지되도록 globalThis 에 보관
const holder = globalThis as unknown as { __5v5MemoryStore?: Store };
const store = () => (holder.__5v5MemoryStore ??= seed());

const toPublic = ({ id, nickname, tier, tier_division, preferred_lanes, is_admin }: UserRow): PublicUser => ({
  id,
  nickname,
  tier,
  tier_division,
  preferred_lanes: [...preferred_lanes],
  is_admin,
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

  async setPinHash(id, pinHash) {
    const user = store().users.find((u) => u.id === id);
    if (user) Object.assign(user, { pin_hash: pinHash, failed_pin_attempts: 0, locked_until: null });
  },

  async deleteUser(id) {
    const s = store();
    s.users = s.users.filter((u) => u.id !== id);
    s.schedules = s.schedules.filter((r) => r.user_id !== id);
    s.votes = s.votes.filter((v) => v.voter_id !== id && v.target_id !== id);
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
    s.settings = s.settings.filter((m) => m.play_date !== date);
    s.schedules = s.schedules.filter((r) => r.play_date !== date);
    return paths;
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
