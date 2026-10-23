import "server-only";
import { MATCH_CARD_MIN } from "./constants";
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

/**
 * 매치 카드 = 참여자가 MATCH_CARD_MIN 명 이상인 날.
 * - upcoming: 오늘 포함 이후, 날짜 오름차순. 1~4명인 날은 pending 으로 따로 반환
 * - past: 어제까지, 최근 날짜 먼저
 */
export async function getMatchCards(
  when: "upcoming" | "past",
  meId: string,
): Promise<{
  cards: MatchCardData[];
  pending: { date: string; count: number }[];
}> {
  const today = todayKST();
  const schedules = await getSchedules(when === "upcoming" ? { from: today } : { to: addDays(today, -1) });

  const byDate = new Map<string, Schedule[]>();
  for (const s of schedules) {
    if (s.status !== "join") continue;
    byDate.set(s.play_date, [...(byDate.get(s.play_date) ?? []), s]);
  }

  const entries = [...byDate];
  if (when === "past") entries.reverse();

  const cardDates = entries.filter(([, list]) => list.length >= MATCH_CARD_MIN).map(([date]) => date);
  const pending =
    when === "upcoming"
      ? entries.filter(([, list]) => list.length < MATCH_CARD_MIN).map(([date, list]) => ({ date, count: list.length }))
      : [];

  // 결과(투표/스크린샷)는 경기 당일부터
  const [settings, results] = await Promise.all([
    repo.listSettings(cardDates),
    getMatchResults(
      cardDates.filter((date) => date <= today),
      meId,
    ),
  ]);
  const settingsByDate = new Map(settings.map((row) => [row.play_date, row]));

  const cards = cardDates.map((date) => {
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
      results: results.get(date) ?? null,
    };
  });

  return { cards, pending };
}

/** 날짜별 투표 집계 + 스크린샷. 투표자 정보는 내 표만 남기고 버린다 */
async function getMatchResults(dates: string[], meId: string): Promise<Map<string, MatchResults>> {
  const map = new Map<string, MatchResults>();
  if (dates.length === 0) return map;

  for (const date of dates) map.set(date, { tallies: { mvp: {}, blame: {} }, myVotes: {}, screenshots: [] });

  const [votes, shots] = await Promise.all([repo.listVotes(dates), repo.listScreenshots(dates)]);

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
