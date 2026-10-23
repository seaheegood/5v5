import "server-only";
import { db } from "./supabase";
import { PUBLIC_USER_COLUMNS } from "./auth";
import { MATCH_CARD_MIN } from "./constants";
import { toParticipants } from "./participants";
import { addDays, todayKST } from "./date";
import { getImageUrls } from "./storage";
import type { MatchCardData, MatchResults, PublicUser, Schedule, VoteKind } from "./types";

const SCHEDULE_COLUMNS = "id, user_id, play_date, status, lane, user:users(id, nickname, tier, tier_division)";

export async function getUsers(): Promise<PublicUser[]> {
  const { data, error } = await db().from("users").select(PUBLIC_USER_COLUMNS).order("nickname");
  if (error) throw error;
  return data as PublicUser[];
}

/** 기간 내 모든 응답(참여/불참). from/to 는 포함 */
export async function getSchedules({ from, to }: { from?: string; to?: string }): Promise<Schedule[]> {
  let query = db().from("schedules").select(SCHEDULE_COLUMNS);
  if (from) query = query.gte("play_date", from);
  if (to) query = query.lte("play_date", to);

  const { data, error } = await query.order("play_date");
  if (error) throw error;
  return data as unknown as Schedule[];
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

  const settingsByDate = new Map<string, MatchCardData["settings"]>();
  if (cardDates.length > 0) {
    const { data, error } = await db()
      .from("match_settings")
      .select("play_date, match_format, stake, updated_at, updater:users(nickname)")
      .in("play_date", cardDates);
    if (error) throw error;

    for (const row of data as unknown as {
      play_date: string;
      match_format: string;
      stake: string;
      updated_at: string;
      updater: { nickname: string } | null;
    }[]) {
      settingsByDate.set(row.play_date, {
        matchFormat: row.match_format,
        stake: row.stake,
        updatedAt: row.updated_at,
        updatedByNickname: row.updater?.nickname ?? null,
      });
    }
  }

  // 결과(투표/스크린샷)는 경기 당일부터
  const results = await getMatchResults(
    cardDates.filter((date) => date <= today),
    meId,
  );

  const cards = cardDates.map((date) => ({
    date,
    participants: toParticipants(byDate.get(date)!),
    settings: settingsByDate.get(date) ?? null,
    results: results.get(date) ?? null,
  }));

  return { cards, pending };
}

/** 날짜별 투표 집계 + 스크린샷. 투표자 정보는 내 표만 남기고 버린다 */
async function getMatchResults(dates: string[], meId: string): Promise<Map<string, MatchResults>> {
  const map = new Map<string, MatchResults>();
  if (dates.length === 0) return map;

  for (const date of dates) map.set(date, { tallies: { mvp: {}, blame: {} }, myVotes: {}, screenshots: [] });

  const [votes, shots] = await Promise.all([
    db().from("match_votes").select("play_date, voter_id, kind, target_id").in("play_date", dates),
    db()
      .from("match_screenshots")
      .select("id, play_date, storage_path, uploader_id, created_at, uploader:users(nickname)")
      .in("play_date", dates)
      .order("created_at"),
  ]);
  if (votes.error) throw votes.error;
  if (shots.error) throw shots.error;

  for (const v of votes.data as { play_date: string; voter_id: string; kind: VoteKind; target_id: string }[]) {
    const result = map.get(v.play_date)!;
    result.tallies[v.kind][v.target_id] = (result.tallies[v.kind][v.target_id] ?? 0) + 1;
    if (v.voter_id === meId) result.myVotes[v.kind] = v.target_id;
  }

  const rows = shots.data as unknown as {
    id: string;
    play_date: string;
    storage_path: string;
    uploader_id: string | null;
    uploader: { nickname: string } | null;
  }[];
  const urls = await getImageUrls(rows.map((r) => r.storage_path));
  for (const r of rows) {
    if (!urls[r.storage_path]) continue;
    map.get(r.play_date)!.screenshots.push({
      id: r.id,
      url: urls[r.storage_path],
      uploaderId: r.uploader_id,
      uploaderNickname: r.uploader?.nickname ?? null,
    });
  }

  return map;
}
