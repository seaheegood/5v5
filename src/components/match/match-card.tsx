"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ChevronDown, Trash2 } from "lucide-react";
import { deleteMatch } from "@/app/actions/match";
import { MATCH_FULL } from "@/lib/constants";
import { formatKoreanDate } from "@/lib/date";
import type { MatchCardData } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PlayerRow } from "../icons/player-row";
import { Button } from "../ui/button";
import { LaneCoverage } from "./lane-coverage";
import { MatchResults } from "./match-results";
import { MatchSettingsSheet } from "./match-settings-sheet";
import { ProgressGauge } from "./progress-gauge";

/**
 * 매치 카드. past(지난 매치)면 세팅 수정/참여 버튼 없이 보기 전용 (관리자 삭제만 가능).
 */
export function MatchCard({
  card,
  me,
  past = false,
}: {
  card: MatchCardData;
  me: { id: string; isAdmin: boolean };
  past?: boolean;
}) {
  const [showRoster, setShowRoster] = useState(false);
  const [deleting, startDelete] = useTransition();
  const count = card.participants.length;
  const remaining = Math.max(0, MATCH_FULL - count);
  const confirmed = remaining === 0;
  const amIn = card.participants.some((p) => p.userId === me.id);

  const onDelete = () => {
    if (!confirm(`${formatKoreanDate(card.date)} 매치를 삭제할까요?`)) return;
    startDelete(async () => {
      const result = await deleteMatch(card.date);
      if (!result.ok) alert(result.error);
    });
  };

  return (
    <article
      className={cn(
        "rounded-2xl border-2 bg-card p-5 shadow-lg shadow-black/20",
        confirmed && !past ? "border-success/60" : "border-border",
        deleting && "opacity-50",
      )}
    >
      {/* 헤더 + 게이지 */}
      <header className="flex items-center justify-between gap-2">
        <h2 className="text-xl font-extrabold">{formatKoreanDate(card.date)}</h2>
        {confirmed && (
          <span className="shrink-0 rounded-full bg-success/20 px-3 py-1 text-sm font-bold text-success">확정</span>
        )}
      </header>

      <ProgressGauge value={count} max={MATCH_FULL} className="mt-4" />

      {!past && (
        <p className={cn("mt-3 text-base font-bold", confirmed ? "text-success" : "text-primary")}>
          {confirmed ? "매치 확정" : `${remaining}명 더 필요`}
          {count > MATCH_FULL && (
            <span className="ml-2 font-medium text-muted-foreground">대기 {count - MATCH_FULL}명</span>
          )}
        </p>
      )}

      {/* 참여자: 라인 현황은 항상, 명단은 펼쳐보기 */}
      <section className="mt-5">
        <LaneCoverage participants={card.participants} />
        <button
          type="button"
          onClick={() => setShowRoster((v) => !v)}
          aria-expanded={showRoster}
          className="mt-2 flex h-11 w-full items-center justify-between rounded-lg px-1 text-base font-bold"
        >
          참여자 {count}명
          <ChevronDown className={cn("size-5 text-muted-foreground transition-transform", showRoster && "rotate-180")} />
        </button>
        {showRoster && (
          <ul className="divide-y divide-border/60">
            {card.participants.map((p) => (
              <li key={p.userId}>
                <PlayerRow
                  lane={p.lane}
                  nickname={p.nickname}
                  tier={p.tier}
                  division={p.division}
                  highlight={p.userId === me.id}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 세팅 */}
      <section className="mt-3 rounded-xl bg-background/50 p-4">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-base">
          <dt className="text-muted-foreground">방식</dt>
          <dd className="font-semibold break-all">{card.settings?.matchFormat ?? "미정"}</dd>
          <dt className="text-muted-foreground">판돈</dt>
          <dd className="font-semibold break-all">{card.settings?.stake || "미정"}</dd>
        </dl>
        {(card.settings || !past) && (
          <div className="mt-3 flex items-center justify-between gap-2">
            <p className="truncate text-sm text-muted-foreground">
              {card.settings && `설정: ${card.settings.updatedByNickname ?? "탈퇴한 멤버"}`}
            </p>
            {!past && <MatchSettingsSheet date={card.date} settings={card.settings} />}
          </div>
        )}
      </section>

      {/* 결과: 투표 + 스크린샷 (경기 당일부터) */}
      {card.results && <MatchResults date={card.date} participants={card.participants} results={card.results} me={me} />}

      {/* 액션 */}
      {(!past || me.isAdmin) && (
        <div className="mt-4 flex gap-2">
          {!past && (
            <Button asChild variant={amIn ? "secondary" : "default"} className="flex-1">
              <Link href={`/calendar?date=${card.date}`}>{amIn ? "변경" : "참여"}</Link>
            </Button>
          )}
          {me.isAdmin && (
            <Button
              variant="outline"
              size={past ? "default" : "icon"}
              onClick={onDelete}
              disabled={deleting}
              aria-label="매치 삭제"
              className={cn(past && "flex-1")}
            >
              <Trash2 className="size-5 text-destructive" />
              {past && "삭제"}
            </Button>
          )}
        </div>
      )}
    </article>
  );
}
