"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { TEAM_LABEL, formatProfit } from "@/lib/constants";
import { formatKoreanDate } from "@/lib/date";
import type { PlayerMatch } from "@/lib/types";
import { cn } from "@/lib/utils";
import { TEAM_STYLE } from "../match/team-style";

const RECENT = 3;

const profitColor = (n: number) => (n > 0 ? "text-success" : n < 0 ? "text-destructive" : "text-muted-foreground");

/** 개인 페이지 경기 기록: 최근 3경기, 그 이상이면 '전체 경기 보기'로 펼침. 누르면 그 티켓으로 */
export function MatchHistory({ matches }: { matches: PlayerMatch[] }) {
  const [showAll, setShowAll] = useState(false);
  if (matches.length === 0) return null;

  const shown = showAll ? matches : matches.slice(0, RECENT);
  const hidden = matches.length - RECENT;

  return (
    <section className="rounded-2xl bg-card p-4">
      <h3 className="mb-1 font-bold">
        {showAll ? "전체 경기" : "최근 경기"}{" "}
        <span className="text-sm font-normal text-muted-foreground tabular-nums">
          {shown.length}/{matches.length}
        </span>
      </h3>
      <ul className="divide-y divide-border/60">
        {shown.map((m) => (
          <li key={m.date}>
            <Link href={`/ticket/${m.date}`} className="flex h-12 items-center gap-3">
              <span className={cn("w-7 font-extrabold", m.won ? "text-success" : "text-destructive")}>
                {m.won ? "승" : "패"}
              </span>
              <span className="flex min-w-0 flex-1 items-center gap-1.5">
                <span className="truncate">{formatKoreanDate(m.date)}</span>
                {m.award && (
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-bold",
                      m.award === "mvp" ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive",
                    )}
                  >
                    {m.award === "mvp" ? "MVP" : "범인"}
                  </span>
                )}
              </span>
              <span className={cn("text-sm font-semibold", TEAM_STYLE[m.team].text)}>{TEAM_LABEL[m.team]}</span>
              <span
                className={cn(
                  "w-24 text-right font-bold tabular-nums",
                  m.profit === null ? "text-muted-foreground" : profitColor(m.profit),
                )}
              >
                {m.profit === null ? "판돈 미정" : formatProfit(m.profit)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="mt-2 flex h-11 w-full items-center justify-center gap-1 rounded-lg bg-background/50 text-sm font-semibold text-muted-foreground"
        >
          {showAll ? "최근 3경기만 보기" : `전체 경기 보기 (+${hidden}경기)`}
          <ChevronDown className={cn("size-4 transition-transform", showAll && "rotate-180")} />
        </button>
      )}
    </section>
  );
}
