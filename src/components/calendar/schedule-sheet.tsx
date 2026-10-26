"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { deleteSchedule, saveSchedule } from "@/app/actions/schedule";
import { LANE_LABEL, TEAM_LABEL } from "@/lib/constants";
import { formatKoreanDate, todayKST } from "@/lib/date";
import { toParticipants } from "@/lib/participants";
import type { PublicUser, Schedule, ScheduleStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PlayerRow } from "../icons/player-row";
import { Button } from "../ui/button";
import { NativeSelect } from "../ui/native-select";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "../ui/drawer";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string | null;
  /** 해당 날짜의 모든 응답 */
  schedules: Schedule[];
  me: PublicUser;
  /** 관리자일 때만 전달: 다른 멤버 일정 대리 등록용 */
  users: PublicUser[];
  today: string;
  /** 관리자가 종료한 매치 날짜 */
  finished: boolean;
};

/** 달력 날짜 터치 시 올라오는 일정 등록 바텀 시트 */
export function ScheduleSheet({ open, onOpenChange, date, ...rest }: Props) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        {/* 날짜가 바뀌면 내부 상태(대상/참여여부/라인)를 초기화 */}
        {date && <SheetBody key={date} date={date} onDone={() => onOpenChange(false)} {...rest} />}
      </DrawerContent>
    </Drawer>
  );
}

function SheetBody({
  date,
  schedules,
  me,
  users,
  today,
  finished,
  onDone,
}: Omit<Props, "open" | "onOpenChange" | "date"> & { date: string; onDone: () => void }) {
  const [targetId, setTargetId] = useState(me.id);
  const target = users.find((u) => u.id === targetId) ?? me;
  const readOnly = (date < today || finished) && !me.is_admin;

  const joined = toParticipants(schedules);
  const declined = schedules.filter((s) => s.status === "decline");

  return (
    <>
      <DrawerHeader>
        <DrawerTitle>{formatKoreanDate(date)}</DrawerTitle>
        <DrawerDescription>
          참여 {joined.length} · 불참 {declined.length}
        </DrawerDescription>
      </DrawerHeader>

      <div className="flex flex-col gap-6 overflow-y-auto px-5 pb-2">
        {me.is_admin && users.length > 0 && (
          <label className="flex items-center gap-3 rounded-xl bg-primary/10 p-3 text-sm font-semibold">
            <span className="shrink-0 text-primary">대상</span>
            <NativeSelect
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="flex-1"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nickname}
                  {u.id === me.id ? " (나)" : ""}
                </option>
              ))}
            </NativeSelect>
          </label>
        )}

        {readOnly ? (
          <p className="rounded-xl bg-muted p-4 text-center text-muted-foreground">{finished ? "종료된 매치" : "지난 날짜"}</p>
        ) : (
          <ScheduleForm
            key={target.id}
            date={date}
            target={target}
            isSelf={target.id === me.id}
            existing={schedules.find((s) => s.user_id === target.id)}
            hasTicket={joined.length > 0}
            onSaved={onDone}
          />
        )}

        <DayRoster date={date} joined={joined} declined={declined} me={me} />
      </div>
    </>
  );
}

function ScheduleForm({
  date,
  target,
  isSelf,
  existing,
  hasTicket,
  onSaved,
}: {
  date: string;
  target: PublicUser;
  isSelf: boolean;
  existing?: Schedule;
  /** 이날 참여자가 있어 티켓이 있는지 */
  hasTicket: boolean;
  onSaved: () => void;
}) {
  const [status, setStatus] = useState<ScheduleStatus | null>(existing?.status ?? null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const seat = existing?.status === "join" && existing.team && existing.lane ? existing : null;

  const run = (action: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      const result = await action();
      if (result.ok) onSaved();
      else setError(result.error ?? "실패했어요.");
    });

  const save = () => run(() => saveSchedule({ date, status: status!, targetUserId: target.id }));
  const remove = () => run(() => deleteSchedule({ date, targetUserId: target.id }));

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-3">
        <h3 className="text-lg font-bold">{isSelf ? "참여 여부" : `${target.nickname} 참여 여부`}</h3>
        <div className="grid grid-cols-2 gap-2">
          {(["join", "decline"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={status === value}
              onClick={() => {
                setError(null);
                setStatus(value);
              }}
              className={cn(
                "h-16 rounded-xl border-2 text-lg font-bold transition-all active:scale-95",
                status !== value
                  ? "border-border text-muted-foreground"
                  : value === "join"
                    ? "border-success bg-success/15 text-success"
                    : "border-destructive bg-destructive/15 text-destructive",
              )}
            >
              {value === "join" ? "참여" : "불참"}
            </button>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          {seat
            ? `지금 ${TEAM_LABEL[seat.team!]} ${LANE_LABEL[seat.lane!]} 자리에 있어요.${status === "decline" ? " 불참하면 자리도 비워져요." : ""}`
            : "팀과 라인은 티켓에서 빈 칸을 눌러 정해요."}
        </p>
      </section>

      {error && <p className="text-sm font-semibold text-destructive">{error}</p>}

      <div className="flex flex-col gap-2">
        <Button size="lg" onClick={save} disabled={!status || status === existing?.status || pending}>
          {pending ? "저장 중" : "저장"}
        </Button>
        {hasTicket && (
          <Button asChild variant="secondary">
            <Link href={`${date < todayKST() ? "/history" : "/"}#ticket-${date}`}>티켓에서 자리 고르기</Link>
          </Button>
        )}
        {existing && (
          <Button variant="ghost" onClick={remove} disabled={pending} className="text-muted-foreground">
            응답 삭제
          </Button>
        )}
      </div>
    </div>
  );
}

/** 이날 참여자/불참자 명단. 관리자는 개별 삭제 가능 */
function DayRoster({
  date,
  joined,
  declined,
  me,
}: {
  date: string;
  joined: ReturnType<typeof toParticipants>;
  declined: Schedule[];
  me: PublicUser;
}) {
  const [pending, startTransition] = useTransition();

  const remove = (userId: string, nickname: string) => {
    if (!confirm(`${nickname} 응답을 삭제할까요?`)) return;
    startTransition(async () => {
      const result = await deleteSchedule({ date, targetUserId: userId });
      if (!result.ok) alert(result.error);
    });
  };

  if (joined.length === 0 && declined.length === 0) {
    return <p className="py-2 text-center text-sm text-muted-foreground">응답 없음</p>;
  }

  return (
    <section className={cn("flex flex-col gap-2 border-t pt-4", pending && "opacity-50")}>
      <h3 className="font-bold">참여자 {joined.length}명</h3>
      <ul className="divide-y divide-border/60">
        {joined.map((p) => (
          <li key={p.userId}>
            <PlayerRow
              lane={p.lane}
              nickname={p.nickname}
              tier={p.tier}
              division={p.division}
              highlight={p.userId === me.id}
            >
              {me.is_admin && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-10"
                  aria-label={`${p.nickname} 응답 삭제`}
                  onClick={() => remove(p.userId, p.nickname)}
                >
                  <X className="size-4" />
                </Button>
              )}
            </PlayerRow>
          </li>
        ))}
      </ul>

      {declined.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-sm">
          <span className="font-bold text-muted-foreground">불참</span>
          {declined.map((s) => (
            <span key={s.id} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
              {s.user.nickname}
              {me.is_admin && (
                <button
                  type="button"
                  aria-label={`${s.user.nickname} 응답 삭제`}
                  onClick={() => remove(s.user_id, s.user.nickname)}
                  className="-mr-1 p-0.5"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
