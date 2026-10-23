"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MATCH_CARD_MIN, MATCH_FULL } from "@/lib/constants";
import { monthGrid, shiftMonth, weekday } from "@/lib/date";
import type { PublicUser, Schedule } from "@/lib/types";
import { cn } from "@/lib/utils";
import { LaneIcon } from "../icons/lane-icon";
import { Button } from "../ui/button";
import { ScheduleSheet } from "./schedule-sheet";

const WEEK = ["일", "월", "화", "수", "목", "금", "토"];

export function CalendarView({
  year,
  month,
  today,
  schedules,
  me,
  users,
  initialDate,
}: {
  year: number;
  month: number;
  today: string;
  schedules: Schedule[];
  me: PublicUser;
  users: PublicUser[];
  initialDate?: string;
}) {
  // 시트가 닫히는 애니메이션 동안 내용이 유지되도록 날짜와 open 상태를 분리
  const [selected, setSelected] = useState<string | null>(initialDate ?? null);
  const [open, setOpen] = useState(Boolean(initialDate));

  const byDate = useMemo(() => {
    const map = new Map<string, Schedule[]>();
    for (const s of schedules) map.set(s.play_date, [...(map.get(s.play_date) ?? []), s]);
    return map;
  }, [schedules]);

  const openDate = (date: string) => {
    setSelected(date);
    setOpen(true);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* 월 이동 */}
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="icon" aria-label="이전 달">
          <Link href={`/calendar?month=${shiftMonth(year, month, -1)}`} replace>
            <ChevronLeft className="size-6" />
          </Link>
        </Button>
        <h2 className="text-2xl font-extrabold tabular-nums">
          {year}년 {month}월
        </h2>
        <Button asChild variant="ghost" size="icon" aria-label="다음 달">
          <Link href={`/calendar?month=${shiftMonth(year, month, 1)}`} replace>
            <ChevronRight className="size-6" />
          </Link>
        </Button>
      </div>

      {/* 요일 */}
      <div className="grid grid-cols-7 text-center text-sm font-bold">
        {WEEK.map((w, i) => (
          <span key={w} className={cn(i === 0 && "text-destructive", i === 6 && "text-sky-400")}>
            {w}
          </span>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7 gap-1">
        {monthGrid(year, month).map((date, i) => {
          if (!date) return <span key={`empty-${i}`} />;

          const list = byDate.get(date) ?? [];
          const joinCount = list.filter((s) => s.status === "join").length;
          const mine = list.find((s) => s.user_id === me.id);
          const day = weekday(date);

          return (
            <button
              key={date}
              type="button"
              onClick={() => openDate(date)}
              aria-label={`${month}월 ${Number(date.slice(8))}일, 참여 ${joinCount}명`}
              className={cn(
                "relative flex h-16 flex-col items-center gap-0.5 rounded-xl border-2 border-transparent pt-1.5 transition-transform active:scale-95",
                joinCount >= MATCH_FULL
                  ? "bg-success/25"
                  : joinCount >= MATCH_CARD_MIN
                    ? "bg-primary/20"
                    : joinCount > 0 && "bg-muted/70",
                date === today && "border-primary",
                date < today && "opacity-40",
              )}
            >
              <span
                className={cn(
                  "text-base font-semibold tabular-nums",
                  day === 0 && "text-destructive",
                  day === 6 && "text-sky-400",
                )}
              >
                {Number(date.slice(8))}
              </span>
              {joinCount > 0 && (
                <span
                  className={cn(
                    "text-[11px] font-bold tabular-nums",
                    joinCount >= MATCH_FULL
                      ? "text-success"
                      : joinCount >= MATCH_CARD_MIN
                        ? "text-primary"
                        : "text-muted-foreground",
                  )}
                >
                  {joinCount}명
                </span>
              )}
              {mine?.status === "join" && mine.lane && (
                <LaneIcon lane={mine.lane} className="absolute right-0.5 bottom-0.5 size-3.5" />
              )}
              {mine?.status === "decline" && (
                <span className="absolute right-1 bottom-1 size-2 rounded-full bg-destructive" aria-hidden />
              )}
            </button>
          );
        })}
      </div>

      {/* 범례 */}
      <ul className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl bg-card p-4 text-sm text-muted-foreground">
        <li className="flex items-center gap-2">
          <span className="size-4 rounded bg-primary/20" /> {MATCH_CARD_MIN}명 이상
        </li>
        <li className="flex items-center gap-2">
          <span className="size-4 rounded bg-success/25" /> {MATCH_FULL}명 확정
        </li>
        <li className="flex items-center gap-2">
          <LaneIcon lane="mid" className="size-4" /> 내 라인
        </li>
        <li className="flex items-center gap-2">
          <span className="ml-1 size-2 rounded-full bg-destructive" /> 불참
        </li>
      </ul>

      <ScheduleSheet
        open={open}
        onOpenChange={setOpen}
        date={selected}
        schedules={selected ? (byDate.get(selected) ?? []) : []}
        me={me}
        users={users}
        today={today}
      />
    </div>
  );
}
