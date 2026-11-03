import { MATCH_FULL } from "./constants";
import { seatedCount } from "./participants";
import type { MatchCardData } from "./types";

export type TicketStatus = "recruiting" | "scheduling" | "confirmed" | "finished";

export const STATUS_LABEL: Record<TicketStatus, string> = {
  recruiting: "모집 중",
  scheduling: "시간 조율 중",
  confirmed: "확정",
  finished: "종료",
};

/**
 * 모집 중(10칸 미만) → 시간 조율 중(10칸, 시작 시간 미확정) → 확정(10칸 + 시작 시간) → 종료.
 * 종료는 시작 시간과 상관없이 관리자가 할 수 있다.
 */
export function ticketStatus(card: MatchCardData): TicketStatus {
  if (card.results) return "finished";
  if (seatedCount(card.participants) < MATCH_FULL) return "recruiting";
  return card.time.confirmedStart === null ? "scheduling" : "confirmed";
}

export const STATUS_BADGE: Record<TicketStatus, string> = {
  recruiting: "bg-muted text-muted-foreground",
  scheduling: "bg-primary/20 text-primary",
  confirmed: "bg-success/20 text-success",
  finished: "bg-muted text-muted-foreground",
};
