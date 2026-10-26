"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteMatch } from "@/app/actions/match";
import { MATCH_FULL, TEAM_LABEL } from "@/lib/constants";
import { formatKoreanDate, todayKST } from "@/lib/date";
import { seatedCount } from "@/lib/participants";
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

/**
 * 티켓(매치 카드). 그날 참여자가 1명이라도 있으면 생긴다.
 * - 모집 중: 1팀/2팀 × 라인 10칸에 각자 들어가고, 댓글로 조율
 * - 10칸이 다 차면 확정 → 경기 당일부터 관리자가 승리팀을 골라 종료
 * - 종료: 자리 잠금 + 결과(스크린샷/MVP/범인)
 * - past(지난 매치): 관리자만 자리 수정 가능
 */
export function MatchCard({
  card,
  me,
  members,
  past = false,
}: {
  card: MatchCardData;
  me: { id: string; isAdmin: boolean };
  /** 관리자에게만 전달: 칸에 다른 멤버 넣기용 */
  members: { id: string; nickname: string }[];
  past?: boolean;
}) {
  const [deleting, startDelete] = useTransition();
  const seated = seatedCount(card.participants);
  const remaining = MATCH_FULL - seated;
  const confirmed = remaining === 0;
  const results = card.results;
  const finished = results !== null;
  const locked = finished || (past && !me.isAdmin);
  const canFinish = me.isAdmin && !finished && confirmed && card.date <= todayKST();

  const onDelete = () => {
    if (!confirm(`${formatKoreanDate(card.date)} 티켓을 삭제할까요? (자리/댓글/투표/사진 모두 삭제)`)) return;
    startDelete(async () => {
      const result = await deleteMatch(card.date);
      if (!result.ok) alert(result.error);
    });
  };

  return (
    <article
      id={`ticket-${card.date}`}
      className={cn(
        "scroll-mt-20 rounded-2xl border-2 bg-card p-5 shadow-lg shadow-black/20",
        confirmed && !finished && !past ? "border-success/60" : "border-border",
        deleting && "opacity-50",
      )}
    >
      <header className="flex items-center justify-between gap-2">
        <h2 className="text-xl font-extrabold">{formatKoreanDate(card.date)}</h2>
        <span
          className={cn(
            "shrink-0 rounded-full px-3 py-1 text-sm font-bold",
            confirmed && !finished ? "bg-success/20 text-success" : "bg-muted text-muted-foreground",
          )}
        >
          {finished ? "종료" : confirmed ? "확정" : "모집 중"}
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
            ? "매치 확정 · 10명 다 모였어요"
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

      {/* 세팅 */}
      <section className="mt-3 rounded-xl bg-background/50 p-4">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-base">
          <dt className="text-muted-foreground">방식</dt>
          <dd className="font-semibold break-all">{card.settings?.matchFormat ?? "미정"}</dd>
          <dt className="text-muted-foreground">판돈</dt>
          <dd className="font-semibold break-all">{card.settings?.stake || "미정"}</dd>
        </dl>
        {(card.settings || (!past && !finished)) && (
          <div className="mt-3 flex items-center justify-between gap-2">
            <p className="truncate text-sm text-muted-foreground">
              {card.settings && `설정: ${card.settings.updatedByNickname ?? "탈퇴한 멤버"}`}
            </p>
            {!past && !finished && <MatchSettingsSheet date={card.date} settings={card.settings} />}
          </div>
        )}
      </section>

      {/* 결과: 관리자가 종료한 뒤 열림 (스크린샷/투표) */}
      {finished && (
        <MatchResults date={card.date} participants={card.participants} results={results} me={me} defaultOpen={!past} />
      )}

      {/* 댓글: 티켓이 생길 때부터 항상 */}
      <Comments date={card.date} comments={card.comments} me={me} />

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
      {me.isAdmin && confirmed && !finished && !canFinish && (
        <p className="mt-2 text-center text-xs text-muted-foreground">경기 당일부터 종료할 수 있어요</p>
      )}
    </article>
  );
}
