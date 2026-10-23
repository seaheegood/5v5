import { LANES } from "./constants";
import type { Participant, Schedule } from "./types";

/** 라인 순서(탑→서폿) → 닉네임 순 정렬 */
export function sortParticipants(list: Participant[]): Participant[] {
  return [...list].sort(
    (a, b) => LANES.indexOf(a.lane) - LANES.indexOf(b.lane) || a.nickname.localeCompare(b.nickname, "ko"),
  );
}

export function toParticipants(schedules: Schedule[]): Participant[] {
  return sortParticipants(
    schedules
      .filter((s) => s.status === "join" && s.lane)
      .map((s) => ({
        userId: s.user.id,
        nickname: s.user.nickname,
        tier: s.user.tier,
        division: s.user.tier_division,
        lane: s.lane!,
      })),
  );
}

