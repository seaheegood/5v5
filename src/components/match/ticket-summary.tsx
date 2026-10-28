import Link from "next/link";
import { ChevronRight, Clock, MapPin } from "lucide-react";
import { LANES, LANE_LABEL, MATCH_FULL, TEAM_LABEL, formatStartTime, formatTimeRange } from "@/lib/constants";
import { formatKoreanDate, todayKST } from "@/lib/date";
import { leaders, seatedCount } from "@/lib/participants";
import { STATUS_BADGE, STATUS_LABEL, ticketStatus } from "@/lib/ticket-status";
import type { MatchCardData, Team } from "@/lib/types";
import { cn } from "@/lib/utils";
import { LaneIcon } from "../icons/lane-icon";
import { FinishSheet } from "./finish-sheet";
import { ProgressGauge } from "./progress-gauge";
import { TEAM_STYLE } from "./team-style";

const TEAMS: Team[] = ["blue", "red"];

/** 빈 칸 목록 ("1팀 미드" ...) */
function emptySlots(card: MatchCardData): string[] {
  const empty: string[] = [];
  for (const team of TEAMS)
    for (const lane of LANES)
      if (!card.participants.some((p) => p.team === team && p.lane === lane))
        empty.push(`${TEAM_LABEL[team]} ${LANE_LABEL[lane]}`);
  return empty;
}

/**
 * 메인/이전 매치 목록의 요약 카드. 누르면 /ticket/[date] 상세로.
 * 관리자 종료 버튼은 링크 밖에 둔다 (탭 영역이 겹치지 않게).
 */
export function TicketSummary({ card, me }: { card: MatchCardData; me: { id: string; isAdmin: boolean } }) {
  const seated = seatedCount(card.participants);
  const full = seated >= MATCH_FULL;
  const status = ticketStatus(card);
  const results = card.results;
  const today = todayKST();
  const canFinish = me.isAdmin && !results && full && card.date <= today;
  const { confirmedStart, prefs, leading } = card.time;
  const pcBang = card.settings?.pcBang;
  const mine = card.participants.find((p) => p.userId === me.id);
  const latest = card.comments.at(-1);

  return (
    <article
      className={cn(
        "rounded-2xl border-2 bg-card shadow-lg shadow-black/20",
        status === "confirmed" && card.date >= today ? "border-success/60" : "border-border",
      )}
    >
      <Link href={`/ticket/${card.date}`} className="flex flex-col gap-2.5 p-4 active:opacity-70">
        <header className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-extrabold">{formatKoreanDate(card.date)}</h2>
          <span className="flex items-center gap-1">
            <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold", STATUS_BADGE[status])}>
              {STATUS_LABEL[status]}
            </span>
            <ChevronRight className="size-5 text-muted-foreground" />
          </span>
        </header>

        {results ? (
          <Finished card={card} meId={me.id} />
        ) : (
          <>
            <ProgressGauge value={seated} max={MATCH_FULL} size="sm" />
            <div className="flex items-center justify-between gap-3 text-sm">
              {mine?.team && mine.lane ? (
                <span className="flex shrink-0 items-center gap-1.5 font-bold text-primary">
                  <LaneIcon lane={mine.lane} className="size-4" />
                  내 자리: {TEAM_LABEL[mine.team]} {LANE_LABEL[mine.lane]}
                </span>
              ) : (
                <span className="shrink-0 text-muted-foreground">{mine ? "자리 미정" : "자리 없음"}</span>
              )}
              <span className="truncate text-right text-muted-foreground">
                <EmptyHint card={card} seated={seated} today={today} />
              </span>
            </div>
          </>
        )}

        {/* 시간 · PC방 */}
        {(confirmedStart !== null || (full && !results) || pcBang) && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            {confirmedStart !== null ? (
              <span className="flex items-center gap-1 font-semibold text-success tabular-nums">
                <Clock className="size-4" />
                {formatTimeRange(confirmedStart, card.settings?.matchFormat)}
              </span>
            ) : (
              full &&
              !results && (
                <span className="flex items-center gap-1 text-primary tabular-nums">
                  <Clock className="size-4" />
                  시간 응답 {prefs.length}/{MATCH_FULL}
                  {leading !== null && ` · 1위 ${formatStartTime(leading)}`}
                </span>
              )
            )}
            {pcBang && (
              <span className="flex min-w-0 items-center gap-1 text-muted-foreground">
                <MapPin className="size-4 shrink-0" />
                <span className="truncate">{pcBang}</span>
              </span>
            )}
          </div>
        )}

        <p className="flex items-center gap-2 rounded-lg bg-background/50 px-3 py-2 text-sm">
          <span className="shrink-0 text-muted-foreground">💬 {card.comments.length}</span>
          {latest ? (
            <span className="truncate">
              <b className="font-semibold">{latest.nickname ?? "탈퇴한 멤버"}</b>{" "}
              <span className="text-muted-foreground">{latest.body}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">아직 댓글 없음</span>
          )}
        </p>
      </Link>

      {canFinish && (
        <div className="flex px-4 pb-4">
          <FinishSheet date={card.date} />
        </div>
      )}
    </article>
  );
}

function EmptyHint({ card, seated, today }: { card: MatchCardData; seated: number; today: string }) {
  const remaining = MATCH_FULL - seated;
  if (remaining === 0) return card.date === today ? "오늘 경기" : null;
  if (remaining <= 3) return `빈 자리: ${emptySlots(card).join(" · ")}`;
  return `${remaining}자리 남음`;
}

/** 종료된 매치: 승리팀(+ 내 승패), MVP/범인, 댓글·사진 수 */
function Finished({ card, meId }: { card: MatchCardData; meId: string }) {
  const results = card.results!;
  const myTeam = results.teams[meId];
  const mvp = leaders(results.tallies.mvp, card.participants);
  const blame = leaders(results.tallies.blame, card.participants);

  return (
    <>
      <p className={cn("font-bold", TEAM_STYLE[results.winner].text)}>
        {TEAM_LABEL[results.winner]} 승리
        {myTeam && (
          <span className="ml-2 text-sm font-semibold text-muted-foreground">
            · 나: {myTeam === results.winner ? "승" : "패"}
          </span>
        )}
      </p>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <span className="truncate rounded-lg bg-primary/10 px-3 py-2">
          <b className="text-primary">MVP</b> {mvp ?? "-"}
        </span>
        <span className="truncate rounded-lg bg-destructive/10 px-3 py-2">
          <b className="text-destructive">범인</b> {blame ?? "-"}
        </span>
      </div>
      {results.screenshots.length > 0 && (
        <span className="text-sm text-muted-foreground">📷 사진 {results.screenshots.length}장</span>
      )}
    </>
  );
}
