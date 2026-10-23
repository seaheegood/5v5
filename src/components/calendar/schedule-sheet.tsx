"use client";

import { useMemo, useState, useTransition } from "react";
import { X } from "lucide-react";
import { deleteSchedule, saveSchedule } from "@/app/actions/schedule";
import { countByLane, type Lane } from "@/lib/constants";
import { formatKoreanDate } from "@/lib/date";
import { toParticipants } from "@/lib/participants";
import type { PublicUser, Schedule, ScheduleStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PlayerRow } from "../icons/player-row";
import { LanePicker } from "../lane-picker";
import { Button } from "../ui/button";
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
  onDone,
}: Omit<Props, "open" | "onOpenChange" | "date"> & { date: string; onDone: () => void }) {
  const [targetId, setTargetId] = useState(me.id);
  const target = users.find((u) => u.id === targetId) ?? me;
  const readOnly = date < today && !me.is_admin;

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
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="h-11 flex-1 rounded-lg border-2 border-input bg-background px-3 text-base"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nickname}
                  {u.id === me.id ? " (나)" : ""}
                </option>
              ))}
            </select>
          </label>
        )}

        {readOnly ? (
          <p className="rounded-xl bg-muted p-4 text-center text-muted-foreground">지난 날짜</p>
        ) : (
          <ScheduleForm
            key={target.id}
            date={date}
            target={target}
            isSelf={target.id === me.id}
            existing={schedules.find((s) => s.user_id === target.id)}
            schedules={schedules}
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
  schedules,
  onSaved,
}: {
  date: string;
  target: PublicUser;
  isSelf: boolean;
  existing?: Schedule;
  schedules: Schedule[];
  onSaved: () => void;
}) {
  const [status, setStatus] = useState<ScheduleStatus | null>(existing?.status ?? null);
  const [lane, setLane] = useState<Lane | null>(existing?.lane ?? null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // 대상 본인을 제외한 라인별 인원 + 지금 고른 라인
  const othersCounts = useMemo(
    () => countByLane(schedules.filter((s) => s.status === "join" && s.user_id !== target.id).map((s) => s.lane)),
    [schedules, target.id],
  );
  const counts = useMemo(() => {
    const next = { ...othersCounts };
    if (status === "join" && lane) next[lane]++;
    return next;
  }, [othersCounts, status, lane]);

  // ── 라인 1개 확정 로직 ──────────────────────────────
  // * 참여 선택 시: 주 라인이 1개뿐이면 자동 선택, 아니면 직접 고르게 함
  // * 불참 선택 시: 라인 해제
  // * 라인을 먼저 누르면: 자동으로 '참여' 처리
  // * 라인은 라디오 방식이라 항상 0개 또는 1개
  const pickStatus = (next: ScheduleStatus) => {
    setError(null);
    setStatus(next);
    if (next === "decline") setLane(null);
    else if (!lane && target.preferred_lanes.length === 1) setLane(target.preferred_lanes[0]);
  };
  const pickLane = (next: Lane) => {
    setError(null);
    setStatus("join");
    setLane(next);
  };

  const canSave = status === "decline" || (status === "join" && lane !== null);
  const unchanged = existing?.status === status && existing?.lane === lane;

  const run = (action: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      const result = await action();
      if (result.ok) onSaved();
      else setError(result.error ?? "실패했어요.");
    });

  const save = () =>
    run(() =>
      saveSchedule({ date, status: status!, lane: status === "join" ? lane : null, targetUserId: target.id }),
    );
  const remove = () => run(() => deleteSchedule({ date, targetUserId: target.id }));

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h3 className="text-lg font-bold">{isSelf ? "참여 여부" : `${target.nickname} 참여 여부`}</h3>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            aria-pressed={status === "join"}
            onClick={() => pickStatus("join")}
            className={cn(
              "h-16 rounded-xl border-2 text-lg font-bold transition-all active:scale-95",
              status === "join" ? "border-success bg-success/15 text-success" : "border-border text-muted-foreground",
            )}
          >
            참여
          </button>
          <button
            type="button"
            aria-pressed={status === "decline"}
            onClick={() => pickStatus("decline")}
            className={cn(
              "h-16 rounded-xl border-2 text-lg font-bold transition-all active:scale-95",
              status === "decline"
                ? "border-destructive bg-destructive/15 text-destructive"
                : "border-border text-muted-foreground",
            )}
          >
            불참
          </button>
        </div>
      </section>

      <section className={cn("flex flex-col gap-3 transition-opacity", status === "decline" && "opacity-40")}>
        <h3 className="text-lg font-bold">라인</h3>
        <LanePicker
          value={lane}
          onChange={pickLane}
          preferred={target.preferred_lanes}
          counts={counts}
          disabled={pending}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          <span className="mr-1 inline-block size-1.5 rounded-full bg-primary align-middle" /> 주 라인
        </p>
      </section>

      {error && <p className="text-sm font-semibold text-destructive">{error}</p>}

      <div className="flex flex-col gap-2">
        <Button size="lg" onClick={save} disabled={!canSave || unchanged || pending}>
          {pending ? "저장 중" : status === "join" && !lane ? "라인 선택" : "저장"}
        </Button>
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
