import "server-only";
import { addDays, todayKST } from "./date";
import { toParticipants } from "./participants";
import { repo } from "./repo";
import type { MatchCardData, MatchResults, PlayerProfile, PlayerRecord, PublicUser, Schedule, VoteKind } from "./types";
import type { RecordRow } from "./repo/types";

export function getUsers(): Promise<PublicUser[]> {
  return repo.listUsers();
}

/** 기간 내 모든 응답(참여/불참). from/to 는 포함 */
export function getSchedules(range: { from?: string; to?: string }): Promise<Schedule[]> {
  return repo.listSchedules(range);
}

/** 이 날짜들 중 종료된 날짜 */
export async function getFinishedDates(dates: string[]): Promise<string[]> {
  return (await repo.listResults(dates)).map((r) => r.play_date);
}

/**
 * 티켓(매치 카드) 목록 = 참여자가 1명이라도 있는 날.
 * - upcoming: 오늘 포함 이후, 날짜 오름차순
 * - past: 어제까지, 최근 날짜 먼저
 */
export async function getMatchCards(when: "upcoming" | "past", meId: string): Promise<MatchCardData[]> {
  const today = todayKST();
  const range = when === "upcoming" ? { from: today } : { to: addDays(today, -1) };
  const cards = await loadCards(range, meId);
  return when === "past" ? cards.reverse() : cards;
}

/** 티켓 하나 (상세 화면). 그날 참여자가 없으면 null */
export async function getTicket(date: string, meId: string): Promise<MatchCardData | null> {
  return (await loadCards({ from: date, to: date }, meId))[0] ?? null;
}

async function loadCards(range: { from?: string; to?: string }, meId: string): Promise<MatchCardData[]> {
  const schedules = await getSchedules(range);

  const byDate = new Map<string, Schedule[]>();
  for (const s of schedules) {
    if (s.status !== "join") continue;
    byDate.set(s.play_date, [...(byDate.get(s.play_date) ?? []), s]);
  }

  const cardDates = [...byDate.keys()];

  // 결과(투표/스크린샷)는 관리자가 종료 처리한 매치만, 댓글은 항상
  const [settings, results, comments] = await Promise.all([
    repo.listSettings(cardDates),
    getMatchResults(cardDates, meId),
    repo.listComments(cardDates),
  ]);
  const settingsByDate = new Map(settings.map((row) => [row.play_date, row]));

  return cardDates.map((date) => {
    const row = settingsByDate.get(date);
    return {
      date,
      participants: toParticipants(byDate.get(date)!),
      settings: row
        ? {
            matchFormat: row.match_format,
            stake: row.stake_amount,
            updatedAt: row.updated_at,
            updatedByNickname: row.updater_nickname,
          }
        : null,
      comments: comments
        .filter((c) => c.play_date === date)
        .map((c) => ({ id: c.id, userId: c.user_id, nickname: c.nickname, body: c.body, createdAt: c.created_at })),
      results: results.get(date) ?? null,
    };
  });
}

/** 종료된 날짜만 골라 팀/투표 집계/스크린샷을 모은다. 투표자 정보는 내 표만 남기고 버린다 */
async function getMatchResults(candidates: string[], meId: string): Promise<Map<string, MatchResults>> {
  const map = new Map<string, MatchResults>();
  if (candidates.length === 0) return map;

  const finished = await repo.listResults(candidates);
  const dates = finished.map((r) => r.play_date);
  if (dates.length === 0) return map;

  for (const r of finished)
    map.set(r.play_date, {
      winner: r.winner,
      teams: {},
      tallies: { mvp: {}, blame: {} },
      myVotes: {},
      screenshots: [],
    });

  const [players, votes, shots] = await Promise.all([
    repo.listPlayers(dates),
    repo.listVotes(dates),
    repo.listScreenshots(dates),
  ]);

  for (const p of players) map.get(p.play_date)!.teams[p.user_id] = p.team;


  for (const v of votes) {
    const result = map.get(v.play_date)!;
    result.tallies[v.kind][v.target_id] = (result.tallies[v.kind][v.target_id] ?? 0) + 1;
    if (v.voter_id === meId) result.myVotes[v.kind] = v.target_id;
  }

  for (const s of shots) {
    map.get(s.play_date)!.screenshots.push({
      id: s.id,
      url: `/api/screenshots/${s.id}`,
      uploaderId: s.uploader_id,
      uploaderNickname: s.uploader_nickname,
    });
  }

  return map;
}

function toRecord(rows: RecordRow[]): PlayerRecord {
  const matches = rows.map((r) => {
    const won = r.team === r.winner;
    return {
      date: r.play_date,
      team: r.team,
      won,
      profit: r.stake_amount === null ? null : won ? r.stake_amount : -r.stake_amount,
    };
  });
  return {
    wins: matches.filter((m) => m.won).length,
    losses: matches.filter((m) => !m.won).length,
    profit: matches.reduce((sum, m) => sum + (m.profit ?? 0), 0),
    matches,
  };
}

/**
 * 한 멤버의 통산 전적/수익 + MVP/범인 횟수 (종료된 매치 기준, 최근 경기 먼저).
 * MVP/범인은 그 경기 최다 득표자 (동점이면 모두, 표가 없으면 없음).
 */
export async function getPlayerProfile(userId: string): Promise<PlayerProfile> {
  const record = toRecord(await repo.listRecords(userId));
  const votes = await repo.listVotes(record.matches.map((m) => m.date));

  const awardOf = (date: string): VoteKind | null => {
    for (const kind of ["mvp", "blame"] as const) {
      const tally = new Map<string, number>();
      for (const v of votes) if (v.play_date === date && v.kind === kind) tally.set(v.target_id, (tally.get(v.target_id) ?? 0) + 1);
      const max = Math.max(0, ...tally.values());
      if (max > 0 && tally.get(userId) === max) return kind;
    }
    return null;
  };

  const matches = record.matches.map((m) => ({ ...m, award: awardOf(m.date) }));
  return {
    ...record,
    matches,
    mvp: matches.filter((m) => m.award === "mvp").length,
    blame: matches.filter((m) => m.award === "blame").length,
  };
}

/** 전체 멤버 전적 (응원 목록용): userId → 기록 */
export async function getAllRecords(): Promise<Map<string, PlayerRecord>> {
  const byUser = new Map<string, RecordRow[]>();
  for (const r of await repo.listRecords()) byUser.set(r.user_id, [...(byUser.get(r.user_id) ?? []), r]);
  return new Map([...byUser].map(([id, rows]) => [id, toRecord(rows)]));
}
