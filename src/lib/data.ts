import "server-only";
import { db } from "./supabase";
import { PUBLIC_USER_COLUMNS } from "./auth";
import { MATCH_CARD_MIN } from "./constants";
import { toParticipants } from "./participants";
import { addDays, todayKST } from "./date";
import type { MatchCardData, PublicUser, Schedule } from "./types";

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
export async function getMatchCards(when: "upcoming" | "past"): Promise<{
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

  const cards = cardDates.map((date) => ({
    date,
    participants: toParticipants(byDate.get(date)!),
    settings: settingsByDate.get(date) ?? null,
  }));

  return { cards, pending };
}
