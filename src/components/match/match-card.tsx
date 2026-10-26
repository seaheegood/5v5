"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ChevronDown, Trash2 } from "lucide-react";
import { deleteMatch } from "@/app/actions/match";
import { MATCH_FULL, TEAM_LABEL } from "@/lib/constants";
import { formatKoreanDate, todayKST } from "@/lib/date";
import type { MatchCardData, Participant, Team } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PlayerRow } from "../icons/player-row";
import { Button } from "../ui/button";
import { FinishSheet, TEAM_STYLE } from "./finish-sheet";
import { LaneCoverage } from "./lane-coverage";
import { MatchResults } from "./match-results";
import { MatchSettingsSheet } from "./match-settings-sheet";
import { ProgressGauge } from "./progress-gauge";

/**
 * 매치 카드.
 * - 모집 중: 참여/변경, 세팅 수정. 10명이 모이고 경기 당일이 되면 관리자에게 [종료] 버튼
 * - 종료(관리자): 팀별 명단 + 결과(투표/댓글/스크린샷)
 * - past(지난 매치): 참여/세팅 수정 없음
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
  const results = card.results;
  const finished = results !== null;
  const canFinish = me.isAdmin && !finished && count >= MATCH_FULL && card.date <= todayKST();
  const canJoin = !past && !finished;
  // 다른 버튼이 없으면 삭제 버튼을 넓게
  const wideDelete = !canFinish && !canJoin;

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
        confirmed && !past && !finished ? "border-success/60" : "border-border",
        deleting && "opacity-50",
      )}
    >
      {/* 헤더 + 게이지 */}
      <header className="flex items-center justify-between gap-2">
        <h2 className="text-xl font-extrabold">{formatKoreanDate(card.date)}</h2>
        {finished ? (
          <span className="shrink-0 rounded-full bg-muted px-3 py-1 text-sm font-bold text-muted-foreground">종료</span>
        ) : (
          confirmed && (
            <span className="shrink-0 rounded-full bg-success/20 px-3 py-1 text-sm font-bold text-success">확정</span>
          )
        )}
      </header>

      <ProgressGauge value={count} max={MATCH_FULL} className="mt-4" />

      {finished ? (
        <p className={cn("mt-3 text-base font-bold", TEAM_STYLE[results.winner].text)}>
          {TEAM_LABEL[results.winner]} 승리
        </p>
      ) : (
        !past && (
        <p className={cn("mt-3 text-base font-bold", confirmed ? "text-success" : "text-primary")}>
          {confirmed ? "매치 확정" : `${remaining}명 더 필요`}
          {count > MATCH_FULL && (
            <span className="ml-2 font-medium text-muted-foreground">대기 {count - MATCH_FULL}명</span>
          )}
        </p>
        )
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
        {showRoster &&
          (finished ? (
            <TeamRoster participants={card.participants} teams={results.teams} winner={results.winner} meId={me.id} />
          ) : (
            <Roster participants={card.participants} meId={me.id} />
          ))}
      </section>

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

      {/* 결과: 관리자가 종료한 뒤 열림 (스크린샷/투표/댓글) */}
      {finished && (
        <MatchResults date={card.date} participants={card.participants} results={results} me={me} defaultOpen={!past} />
      )}

      {/* 액션 */}
      {(canJoin || me.isAdmin) && (
        <div className="mt-4 flex gap-2">
          {canFinish && <FinishSheet date={card.date} participants={card.participants} />}
          {canJoin && (
            <Button asChild variant={amIn ? "secondary" : "default"} className="flex-1">
              <Link href={`/calendar?date=${card.date}`}>{amIn ? "변경" : "참여"}</Link>
            </Button>
          )}
          {me.isAdmin && (
            <Button
              variant="outline"
              size={wideDelete ? "default" : "icon"}
              onClick={onDelete}
              disabled={deleting}
              aria-label="매치 삭제"
              className={cn(wideDelete && "flex-1")}
            >
              <Trash2 className="size-5 text-destructive" />
              {wideDelete && "삭제"}
            </Button>
          )}
        </div>
      )}
    </article>
  );
}

function Roster({ participants, meId }: { participants: Participant[]; meId: string }) {
  return (
    <ul className="divide-y divide-border/60">
      {participants.map((p) => (
        <li key={p.userId}>
          <PlayerRow lane={p.lane} nickname={p.nickname} tier={p.tier} division={p.division} highlight={p.userId === meId} />
        </li>
      ))}
    </ul>
  );
}

/** 종료된 매치: 이긴 팀 → 진 팀 → 대기 순으로 */
function TeamRoster({
  participants,
  teams,
  winner,
  meId,
}: {
  participants: Participant[];
  teams: Record<string, Team>;
  winner: Team;
  meId: string;
}) {
  const order: Team[] = winner === "blue" ? ["blue", "red"] : ["red", "blue"];
  const bench = participants.filter((p) => !teams[p.userId]);

  return (
    <div className="flex flex-col gap-3">
      {order.map((team) => (
        <div key={team}>
          <h4 className={cn("px-1 text-sm font-bold", TEAM_STYLE[team].text)}>
            {TEAM_LABEL[team]} {team === winner ? "승" : "패"}
          </h4>
          <Roster participants={participants.filter((p) => teams[p.userId] === team)} meId={meId} />
        </div>
      ))}
      {bench.length > 0 && (
        <div>
          <h4 className="px-1 text-sm font-bold text-muted-foreground">대기</h4>
          <Roster participants={bench} meId={meId} />
        </div>
      )}
    </div>
  );
}
