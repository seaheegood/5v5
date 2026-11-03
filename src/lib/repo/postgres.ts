import "server-only";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import type { PublicUser, Schedule } from "../types";
import {
  DuplicateNicknameError,
  SlotTakenError,
  type CheerRow,
  type CommentRow,
  type PlayerRow,
  type RecordRow,
  type Repo,
  type ResultRow,
  type ScreenshotRow,
  type SettingsRow,
  type TimePrefRow,
  type VoteRow,
} from "./types";

/**
 * Neon(Postgres) 구현. HTTP 드라이버라 서버리스(Vercel Functions)에서 커넥션 관리가 필요 없다.
 * date/timestamp 는 드라이버가 JS Date 로 바꾸지 않도록 SQL 에서 ::text 로 받는다.
 */
let client: NeonQueryFunction<false, false> | null = null;

function neonClient(): NeonQueryFunction<false, false> {
  if (client) return client;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL 환경변수가 필요합니다.");
  return (client = neon(url));
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** 클라이언트에서 온 id 가 uuid 형식이 아니면 Postgres 가 에러를 내므로 미리 걸러낸다 */
const isUuid = (id: string) => UUID_RE.test(id);

const isUniqueViolation = (e: unknown) => (e as { code?: string })?.code === "23505";

const byNickname = (a: PublicUser, b: PublicUser) => a.nickname.localeCompare(b.nickname, "ko");

type ScheduleJoinRow = Omit<Schedule, "user"> & Pick<PublicUser, "nickname" | "tier" | "tier_division">;

/** sql 클라이언트를 주입받는 형태 (기본은 Neon, 테스트에서는 다른 Postgres 로 교체 가능) */
export function createPostgresRepo(sql: () => NeonQueryFunction<false, false>): Repo {
  return {
    // ── users ─────────────────────────────
    async listUsers() {
      const rows = await sql()`
        select id, nickname, tier, tier_division, preferred_lanes, is_admin, must_change_pin from users`;
      return (rows as PublicUser[]).sort(byNickname);
    },

    async findUser(id) {
      if (!isUuid(id)) return null;
      const rows = await sql()`
        select id, nickname, tier, tier_division, preferred_lanes, is_admin, must_change_pin from users where id = ${id}`;
      return (rows[0] as PublicUser | undefined) ?? null;
    },

    async findAuth(id) {
      if (!isUuid(id)) return null;
      const rows = await sql()`
        select id, pin_hash, failed_pin_attempts, locked_until::text from users where id = ${id}`;
      return (rows[0] as Awaited<ReturnType<Repo["findAuth"]>>) ?? null;
    },

    async setLoginState(id, state) {
      await sql()`
        update users
        set failed_pin_attempts = ${state.failed_pin_attempts}, locked_until = ${state.locked_until}
        where id = ${id}`;
    },

    async countUsers() {
      const rows = await sql()`select count(*)::int as count from users`;
      return rows[0].count as number;
    },

    async createUser(input) {
      try {
        const rows = await sql()`
          insert into users (nickname, pin_hash, tier, tier_division, preferred_lanes, is_admin, must_change_pin)
          values (${input.nickname}, ${input.pin_hash}, ${input.tier}, ${input.tier_division},
                  ${input.preferred_lanes}::text[], ${input.is_admin}, ${input.must_change_pin})
          returning id`;
        return rows[0].id as string;
      } catch (e) {
        if (isUniqueViolation(e)) throw new DuplicateNicknameError();
        throw e;
      }
    },

    async updateUser(id, patch) {
      try {
        // nickname / is_admin 은 넘어온 경우에만 변경 (coalesce)
        await sql()`
          update users set
            tier = ${patch.tier},
            tier_division = ${patch.tier_division},
            preferred_lanes = ${patch.preferred_lanes}::text[],
            nickname = coalesce(${patch.nickname ?? null}, nickname),
            is_admin = coalesce(${patch.is_admin ?? null}::boolean, is_admin)
          where id = ${id}`;
      } catch (e) {
        if (isUniqueViolation(e)) throw new DuplicateNicknameError();
        throw e;
      }
    },

    async setPinHash(id, pinHash, mustChange) {
      await sql()`
        update users
        set pin_hash = ${pinHash}, must_change_pin = ${mustChange}, failed_pin_attempts = 0, locked_until = null
        where id = ${id}`;
    },

    async deleteUser(id) {
      await sql()`delete from users where id = ${id}`;
    },

    // ── schedules ─────────────────────────
    async listSchedules({ from, to }) {
      const rows = (await sql()`
        select s.id, s.user_id, s.play_date::text, s.status, s.team, s.lane, u.nickname, u.tier, u.tier_division
        from schedules s
        join users u on u.id = s.user_id
        where (${from ?? null}::date is null or s.play_date >= ${from ?? null}::date)
          and (${to ?? null}::date is null or s.play_date <= ${to ?? null}::date)
        order by s.play_date`) as ScheduleJoinRow[];

      return rows.map(({ nickname, tier, tier_division, ...s }) => ({
        ...s,
        user: { id: s.user_id, nickname, tier, tier_division },
      }));
    },

    async upsertSchedule(input) {
      // 불참이면 자리도 비우고, 참여면 이미 고른 자리는 그대로 둔다
      await sql()`
        insert into schedules (user_id, play_date, status)
        values (${input.user_id}, ${input.play_date}, ${input.status})
        on conflict (user_id, play_date)
        do update set
          status = excluded.status,
          team = case when excluded.status = 'decline' then null else schedules.team end,
          lane = case when excluded.status = 'decline' then null else schedules.lane end`;
    },

    async takeSlot(input) {
      try {
        await sql()`
          insert into schedules (user_id, play_date, status, team, lane)
          values (${input.user_id}, ${input.play_date}, 'join', ${input.team}, ${input.lane})
          on conflict (user_id, play_date)
          do update set status = 'join', team = excluded.team, lane = excluded.lane`;
      } catch (e) {
        if (isUniqueViolation(e)) throw new SlotTakenError();
        throw e;
      }
    },

    async clearSlot(userId, date) {
      await sql()`update schedules set team = null, lane = null where user_id = ${userId} and play_date = ${date}`;
    },

    async deleteSchedule(userId, date) {
      await sql()`delete from schedules where user_id = ${userId} and play_date = ${date}`;
    },

    async participantIds(date) {
      const rows = await sql()`
        select user_id from schedules where play_date = ${date} and status = 'join'`;
      return rows.map((r) => r.user_id as string);
    },

    // ── match settings ────────────────────
    async listSettings(dates) {
      if (dates.length === 0) return [];
      return (await sql()`
        select m.play_date::text, m.match_format, m.stake_amount, m.start_override, m.pc_bang,
               m.updated_at::text, u.nickname as updater_nickname
        from match_settings m
        left join users u on u.id = m.updated_by
        where m.play_date = any(${dates}::date[])`) as SettingsRow[];
    },

    async upsertSettings(input) {
      await sql()`
        insert into match_settings (play_date, match_format, stake_amount, pc_bang, updated_by)
        values (${input.play_date}, ${input.match_format}, ${input.stake_amount}, ${input.pc_bang}, ${input.updated_by})
        on conflict (play_date)
        do update set
          match_format = excluded.match_format,
          stake_amount = excluded.stake_amount,
          pc_bang = excluded.pc_bang,
          updated_by = excluded.updated_by`;
    },

    async setStartOverride(date, startMin, updatedBy) {
      // 세팅 행이 없으면 방식·판돈 미정으로 만든다
      await sql()`
        insert into match_settings (play_date, match_format, start_override, updated_by)
        values (${date}, null, ${startMin}, ${updatedBy})
        on conflict (play_date)
        do update set start_override = excluded.start_override, updated_by = excluded.updated_by`;
    },

    // ── time prefs (시작 시간 응답) ─────────
    async listTimePrefs(dates) {
      if (dates.length === 0) return [];
      return (await sql()`
        select play_date::text, user_id, start_min, reason
        from match_time_prefs
        where play_date = any(${dates}::date[])`) as TimePrefRow[];
    },

    async upsertTimePref(input) {
      await sql()`
        insert into match_time_prefs (play_date, user_id, start_min, reason)
        values (${input.play_date}, ${input.user_id}, ${input.start_min}, ${input.reason})
        on conflict (play_date, user_id)
        do update set start_min = excluded.start_min, reason = excluded.reason, updated_at = now()`;
    },

    async deleteTimePref(date, userId) {
      await sql()`delete from match_time_prefs where play_date = ${date} and user_id = ${userId}`;
    },

    async deleteMatch(date) {
      const db = sql();
      const [shots] = await db.transaction([
        db`delete from match_screenshots where play_date = ${date} returning storage_path`,
        db`delete from match_comments where play_date = ${date}`,
        db`delete from match_votes where play_date = ${date}`,
        db`delete from match_results where play_date = ${date}`, // match_players 는 cascade
        db`delete from match_settings where play_date = ${date}`,
        db`delete from match_time_prefs where play_date = ${date}`,
        db`delete from schedules where play_date = ${date}`,
      ]);
      return (shots as { storage_path: string }[]).map((s) => s.storage_path);
    },

    // ── results (종료) ────────────────────
    async listResults(dates) {
      if (dates.length === 0) return [];
      return (await sql()`
        select play_date::text, winner from match_results where play_date = any(${dates}::date[])`) as ResultRow[];
    },

    async listPlayers(dates) {
      if (dates.length === 0) return [];
      return (await sql()`
        select play_date::text, user_id, team from match_players where play_date = any(${dates}::date[])`) as PlayerRow[];
    },

    async finishMatch(input) {
      const db = sql();
      await db.transaction([
        db`insert into match_results (play_date, winner, finished_by)
           values (${input.play_date}, ${input.winner}, ${input.finished_by})`,
        db`insert into match_players (play_date, user_id, team)
           select ${input.play_date}::date, p.user_id, p.team
           from unnest(${input.players.map((p) => p.user_id)}::uuid[], ${input.players.map((p) => p.team)}::text[])
             as p(user_id, team)`,
      ]);
    },

    async reopenMatch(date) {
      const db = sql();
      await db.transaction([
        db`delete from match_votes where play_date = ${date}`,
        db`delete from match_results where play_date = ${date}`, // match_players 는 cascade
      ]);
    },

    // ── votes ─────────────────────────────
    async listVotes(dates) {
      if (dates.length === 0) return [];
      return (await sql()`
        select play_date::text, voter_id, kind, target_id
        from match_votes
        where play_date = any(${dates}::date[])`) as VoteRow[];
    },

    async upsertVote(input) {
      await sql()`
        insert into match_votes (play_date, voter_id, kind, target_id)
        values (${input.play_date}, ${input.voter_id}, ${input.kind}, ${input.target_id})
        on conflict (play_date, voter_id, kind)
        do update set target_id = excluded.target_id`;
    },

    async deleteVote(date, voterId, kind) {
      await sql()`
        delete from match_votes where play_date = ${date} and voter_id = ${voterId} and kind = ${kind}`;
    },

    async listRecords(userId) {
      return (await sql()`
        select p.user_id, p.play_date::text, p.team, r.winner, m.stake_amount
        from match_players p
        join match_results r on r.play_date = p.play_date
        left join match_settings m on m.play_date = p.play_date
        where ${userId ?? null}::uuid is null or p.user_id = ${userId ?? null}::uuid
        order by p.play_date desc`) as RecordRow[];
    },

    // ── comments ──────────────────────────
    async listComments(dates) {
      if (dates.length === 0) return [];
      return (await sql()`
        select c.id, c.play_date::text, c.user_id, u.nickname, c.body,
               to_char(c.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as created_at
        from match_comments c
        left join users u on u.id = c.user_id
        where c.play_date = any(${dates}::date[])
        order by c.created_at`) as CommentRow[];
    },

    async insertComment(input) {
      await sql()`
        insert into match_comments (play_date, user_id, body)
        values (${input.play_date}, ${input.user_id}, ${input.body})`;
    },

    async findComment(id) {
      if (!isUuid(id)) return null;
      const rows = await sql()`
        select c.id, c.play_date::text, c.user_id, u.nickname, c.body,
               to_char(c.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as created_at
        from match_comments c
        left join users u on u.id = c.user_id
        where c.id = ${id}`;
      return (rows[0] as CommentRow | undefined) ?? null;
    },

    async deleteComment(id) {
      if (!isUuid(id)) return;
      await sql()`delete from match_comments where id = ${id}`;
    },

    // ── cheers (응원하기) ──────────────────
    async listCheers(targetId) {
      if (!isUuid(targetId)) return [];
      return (await sql()`
        select c.id, c.target_id, c.author_id, u.nickname, c.body, c.is_anonymous,
               to_char(c.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as created_at
        from user_cheers c
        left join users u on u.id = c.author_id
        where c.target_id = ${targetId}
        order by c.created_at`) as CheerRow[];
    },

    async insertCheer(input) {
      await sql()`
        insert into user_cheers (target_id, author_id, body, is_anonymous)
        values (${input.target_id}, ${input.author_id}, ${input.body}, ${input.is_anonymous})`;
    },

    async findCheer(id) {
      if (!isUuid(id)) return null;
      const rows = await sql()`
        select c.id, c.target_id, c.author_id, u.nickname, c.body, c.is_anonymous,
               to_char(c.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as created_at
        from user_cheers c
        left join users u on u.id = c.author_id
        where c.id = ${id}`;
      return (rows[0] as CheerRow | undefined) ?? null;
    },

    async deleteCheer(id) {
      if (!isUuid(id)) return;
      await sql()`delete from user_cheers where id = ${id}`;
    },

    // ── screenshots ───────────────────────
    async listScreenshots(dates) {
      if (dates.length === 0) return [];
      return (await sql()`
        select s.id, s.play_date::text, s.storage_path, s.uploader_id, u.nickname as uploader_nickname
        from match_screenshots s
        left join users u on u.id = s.uploader_id
        where s.play_date = any(${dates}::date[])
        order by s.created_at`) as ScreenshotRow[];
    },

    async countScreenshots(date) {
      const rows = await sql()`select count(*)::int as count from match_screenshots where play_date = ${date}`;
      return rows[0].count as number;
    },

    async insertScreenshot(input) {
      await sql()`
        insert into match_screenshots (play_date, storage_path, uploader_id)
        values (${input.play_date}, ${input.storage_path}, ${input.uploader_id})`;
    },

    async findScreenshot(id) {
      if (!isUuid(id)) return null;
      const rows = await sql()`
        select s.id, s.play_date::text, s.storage_path, s.uploader_id, u.nickname as uploader_nickname
        from match_screenshots s
        left join users u on u.id = s.uploader_id
        where s.id = ${id}`;
      return (rows[0] as ScreenshotRow | undefined) ?? null;
    },

    async deleteScreenshot(id) {
      if (!isUuid(id)) return;
      await sql()`delete from match_screenshots where id = ${id}`;
    },
  };
}

export const postgresRepo = createPostgresRepo(neonClient);
