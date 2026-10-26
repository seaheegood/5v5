import { LANES } from "./constants";
import type { Participant, Schedule } from "./types";

const laneOrder = (p: Participant) => (p.lane ? LANES.indexOf(p.lane) : LANES.length);

/** 라인 순서(탑→서폿, 자리 미정은 뒤) → 닉네임 순 정렬 */
export function sortParticipants(list: Participant[]): Participant[] {
  return [...list].sort((a, b) => laneOrder(a) - laneOrder(b) || a.nickname.localeCompare(b.nickname, "ko"));
}

/** 참여(join) 응답만 참여자로 변환 */
export function toParticipants(schedules: Schedule[]): Participant[] {
  return sortParticipants(
    schedules
      .filter((s) => s.status === "join")
      .map((s) => ({
        userId: s.user.id,
        nickname: s.user.nickname,
        tier: s.user.tier,
        division: s.user.tier_division,
        team: s.team,
        lane: s.lane,
      })),
  );
}

/** 자리(팀+라인)에 들어간 참여자 수 */
export const seatedCount = (participants: Participant[]) => participants.filter((p) => p.team && p.lane).length;

/** 최다 득표자 닉네임 (동률이면 모두). 표가 없으면 null */
export function leaders(tally: Record<string, number>, participants: Participant[]): string | null {
  const max = Math.max(0, ...Object.values(tally));
  if (max === 0) return null;
  return participants
    .filter((p) => tally[p.userId] === max)
    .map((p) => p.nickname)
    .join(", ");
}
