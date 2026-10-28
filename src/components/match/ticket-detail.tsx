"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, MapPin, Trash2 } from "lucide-react";
import { deleteMatch } from "@/app/actions/match";
import { MATCH_FULL, TEAM_LABEL, formatStake, formatTimeRange, pcBangMapUrl } from "@/lib/constants";
import { formatKoreanDate, todayKST } from "@/lib/date";
import { seatedCount } from "@/lib/participants";
import { STATUS_BADGE, STATUS_LABEL, ticketStatus } from "@/lib/ticket-status";
import type { MatchCardData } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { Comments } from "./comments";
import { FinishSheet } from "./finish-sheet";
import { MatchResults } from "./match-results";
import { MatchSettingsSheet } from "./match-settings-sheet";
import { ProgressGauge } from "./progress-gauge";
import { SlotBoard } from "./slot-board";
import { TEAM_STYLE } from "./team-style";
import { TimeSection } from "./time-section";

/**
 * 티켓 상세 (/ticket/[date]).
 * 상태·게이지 → 자리 10칸 → 시작 시간 → 방식·판돈·PC방 → 결과(종료 후) → 댓글 → 관리자 버튼
 * - 모집 중: 빈 칸에 들어가기, 댓글로 조율
 * - 10칸이 다 차면 시간 조율 중 → 10명 모두 시작 시간을 내면 확정
 * - 경기 당일부터 관리자가 승리팀을 골라 종료 (시간 확정과 무관)
 * - 종료: 자리 잠금 + 결과(스크린샷/MVP/범인)
 * - 지난 날짜: 관리자만 자리 수정 가능
 */
export function TicketDetail({
  card,
  me,
  members,
}: {
  card: MatchCardData;
  me: { id: string; isAdmin: boolean };
  /** 관리자에게만 전달: 칸에 다른 멤버 넣기용 */
  members: { id: string; nickname: string }[];
}) {
  const router = useRouter();
  const [deleting, startDelete] = useTransition();
  const today = todayKST();
  const past = card.date < today;
  const seated = seatedCount(card.participants);
  const remaining = MATCH_FULL - seated;
  const full = remaining === 0;
  const status = ticketStatus(card);
  const confirmed = status === "confirmed";
  const results = card.results;
  const finished = results !== null;
  const locked = finished || (past && !me.isAdmin);
  const canFinish = me.isAdmin && !finished && full && card.date <= today;

  const onDelete = () => {
    if (!confirm(`${formatKoreanDate(card.date)} 티켓을 삭제할까요? (자리/댓글/투표/사진 모두 삭제)`)) return;
    startDelete(async () => {
      const result = await deleteMatch(card.date);
      if (result.ok) router.replace(past ? "/history" : "/");
      else alert(result.error);
    });
  };

  return (
    <div className={cn("flex flex-col", deleting && "opacity-50")}>
      <header className="flex items-center justify-between gap-2">
        <h2 className="text-2xl font-extrabold">{formatKoreanDate(card.date)}</h2>
        <span className={cn("shrink-0 rounded-full px-3 py-1 text-sm font-bold", STATUS_BADGE[status])}>
          {STATUS_LABEL[status]}
        </span>
      </header>

      <ProgressGauge value={seated} max={MATCH_FULL} className="mt-4" />

      <p
        className={cn(
          "mt-3 text-base font-bold",
          finished ? TEAM_STYLE[results.winner].text : confirmed ? "text-success" : "text-primary",
        )}
      >
        {finished
          ? `${TEAM_LABEL[results.winner]} 승리`
          : confirmed
            ? `매치 확정 · ${formatTimeRange(card.time.confirmedStart!, card.settings?.matchFormat)}`
            : full
              ? `10명 다 모였어요 · 시작 시간을 내 주세요 (${card.time.prefs.length}/${MATCH_FULL})`
              : past
              ? `${remaining}자리 비어 있었어요`
              : `${remaining}자리 남음 · 빈 칸을 눌러 들어가세요`}
      </p>

      <SlotBoard
        date={card.date}
        participants={card.participants}
        me={me}
        members={members}
        locked={locked}
        winner={results?.winner ?? null}
      />

      {/* 시작 시간 조율 (종료된 매치는 확정 시간이 있을 때만 보기) */}
      {(!finished || card.time.confirmedStart !== null) && (
        <TimeSection card={card} me={me} locked={finished || past} />
      )}

      {/* 방식·판돈 한 줄 */}
      <section className="mt-3 flex items-center gap-3 rounded-xl bg-card px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm">
            <span className="text-muted-foreground">방식</span>{" "}
            <b>{card.settings?.matchFormat ?? "미정"}</b>
            <span className="mx-1.5 text-muted-foreground">·</span>
            <span className="text-muted-foreground">판돈</span> <b>{formatStake(card.settings?.stake)}</b>
          </p>
          {card.settings?.pcBang && (
            <a
              href={pcBangMapUrl(card.settings.pcBang)}
              target="_blank"
              rel="noreferrer"
              className="mt-1 flex items-center gap-1 text-sm font-semibold underline-offset-2 active:underline"
            >
              <MapPin className="size-4 shrink-0 text-primary" />
              <span className="truncate">{card.settings.pcBang}</span>
            </a>
          )}
          {card.settings && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              설정: {card.settings.updatedByNickname ?? "탈퇴한 멤버"}
            </p>
          )}
        </div>
        {/* 지난/종료된 매치는 관리자만 (판돈을 바꾸면 수익도 다시 계산된다) */}
        {((!past && !finished) || me.isAdmin) && <MatchSettingsSheet date={card.date} settings={card.settings} />}
      </section>

      {/* 종료된 매치는 결과가 길어서 댓글로 바로 가는 줄을 둔다 */}
      {finished && (
        <a href="#comments" className="mt-3 flex h-12 items-center justify-between rounded-xl bg-card px-4 font-bold">
          댓글 {card.comments.length}
          <span className="flex items-center gap-1 text-sm font-normal text-muted-foreground">
            아래로 <ChevronDown className="size-4" />
          </span>
        </a>
      )}

      {/* 결과: 관리자가 종료한 뒤 열림 (스크린샷/투표) */}
      {finished && (
        <MatchResults date={card.date} participants={card.participants} results={results} me={me} defaultOpen />
      )}

      <div id="comments" className="scroll-mt-20">
        <Comments date={card.date} comments={card.comments} me={me} />
      </div>

      {/* 관리자 */}
      {me.isAdmin && (
        <div className="mt-4 flex gap-2">
          {canFinish && <FinishSheet date={card.date} />}
          <Button
            variant="outline"
            size={canFinish ? "icon" : "default"}
            onClick={onDelete}
            disabled={deleting}
            aria-label="티켓 삭제"
            className={cn(!canFinish && "flex-1")}
          >
            <Trash2 className="size-5 text-destructive" />
            {!canFinish && "티켓 삭제"}
          </Button>
        </div>
      )}
      {me.isAdmin && full && !finished && !canFinish && (
        <p className="mt-2 text-center text-xs text-muted-foreground">경기 당일부터 종료할 수 있어요</p>
      )}
    </div>
  );
}
