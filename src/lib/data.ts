import "server-only";
import { addDays, todayKST } from "./date";
import { toParticipants } from "./participants";
import { repo } from "./repo";
import type { MatchCardData, MatchResults, PublicUser, Schedule } from "./types";

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
            stake: row.stake,
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
