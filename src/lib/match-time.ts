import { MATCH_FULL } from "./constants";
import type { MatchTime, Participant, TimePref } from "./types";

/**
 * 시작 시간 확정 규칙 (저장하지 않고 조회할 때마다 계산).
 * - 응답은 자리(팀+라인)에 있는 사람 것만 센다
 * - 관리자가 덮어쓴 시간이 있으면 그 시간
 * - 아니면 10칸이 다 차고 10명 모두 응답했을 때 최다 선택 시간 (동률이면 늦은 시간)
 */
export function computeMatchTime(
  participants: Participant[],
  rawPrefs: { user_id: string; start_min: number; reason: string }[],
  startOverride: number | null,
): MatchTime {
  const seated = participants.filter((p) => p.team && p.lane);
  const nickname = new Map(seated.map((p) => [p.userId, p.nickname]));
  const prefs: TimePref[] = rawPrefs
    .filter((p) => nickname.has(p.user_id))
    .map((p) => ({ userId: p.user_id, nickname: nickname.get(p.user_id)!, startMin: p.start_min, reason: p.reason }));

  const counts = new Map<number, number>();
  for (const p of prefs) counts.set(p.startMin, (counts.get(p.startMin) ?? 0) + 1);
  let leading: number | null = null;
  for (const [min, count] of counts) {
    const best = leading === null ? 0 : counts.get(leading)!;
    if (count > best || (count === best && min > leading!)) leading = min;
  }

  const allIn = seated.length >= MATCH_FULL && prefs.length >= MATCH_FULL;
  return {
    prefs,
    leading,
    overridden: startOverride !== null,
    confirmedStart: startOverride ?? (allIn ? leading : null),
  };
}
