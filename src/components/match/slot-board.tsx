"use client";

import { useState, useTransition } from "react";
import { leaveSlot, takeSlot } from "@/app/actions/schedule";
import { LANES, LANE_LABEL, TEAM_LABEL, type Lane } from "@/lib/constants";
import { formatKoreanDate } from "@/lib/date";
import type { Participant, Team } from "@/lib/types";
import { cn } from "@/lib/utils";
import { LaneIcon } from "../icons/lane-icon";
import { TierIcon } from "../icons/tier-icon";
import { Button } from "../ui/button";
import { NativeSelect } from "../ui/native-select";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "../ui/drawer";
import { TEAM_STYLE } from "./team-style";

type Me = { id: string; isAdmin: boolean };
type Member = { id: string; nickname: string };
type Picked = { team: Team; lane: Lane; occupant: Participant | null };

const TEAMS: Team[] = ["blue", "red"];

/** 받침에 따라 '로' / '으로' (받침 없거나 ㄹ이면 '로') */
function ro(word: string): string {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  const jong = code >= 0 && code <= 11171 ? code % 28 : 0;
  return `${word}${jong === 0 || jong === 8 ? "로" : "으로"}`;
}

/**
 * 티켓 자리표: 1팀/2팀 × 탑~서폿 10칸.
 * - 빈 칸: 눌러서 들어가기 (참여 처리 + 다른 칸에 있었으면 이동). 관리자는 다른 멤버를 넣을 수 있음
 * - 내 칸: 자리 비우기 / 관리자는 다른 사람 칸에서 빼기
 * - locked(종료됨 / 지난 날짜): 보기만
 */
export function SlotBoard({
  date,
  participants,
  me,
  members,
  locked,
  winner,
}: {
  date: string;
  participants: Participant[];
  me: Me;
  /** 관리자만: 다른 멤버를 칸에 넣을 때 고를 목록 */
  members: Member[];
  locked: boolean;
  /** 종료된 매치면 팀 이름 옆에 승/패 */
  winner: Team | null;
}) {
  const [picked, setPicked] = useState<Picked | null>(null);
  const [open, setOpen] = useState(false);

  const occupant = (team: Team, lane: Lane) => participants.find((p) => p.team === team && p.lane === lane) ?? null;
  const unseated = participants.filter((p) => !p.team || !p.lane);

  const pick = (team: Team, lane: Lane) => {
    const who = occupant(team, lane);
    // 남의 칸은 관리자만 건드릴 수 있다
    if (locked || (who && who.userId !== me.id && !me.isAdmin)) return;
    setPicked({ team, lane, occupant: who });
    setOpen(true);
  };

  return (
    <section className="mt-5">
      <div className="grid grid-cols-[2.75rem_1fr_1fr] items-center gap-x-2 gap-y-2">
        <span />
        {TEAMS.map((team) => (
          <span key={team} className={cn("text-center text-sm font-bold", TEAM_STYLE[team].text)}>
            {TEAM_LABEL[team]}
            {winner && <span className="ml-1">{team === winner ? "승" : "패"}</span>}
          </span>
        ))}

        {LANES.map((lane) => (
          <Row key={lane} lane={lane}>
            {TEAMS.map((team) => {
              const who = occupant(team, lane);
              const mine = who?.userId === me.id;
              const clickable = !locked && (!who || mine || me.isAdmin);
              return (
                <button
                  key={team}
                  type="button"
                  onClick={() => pick(team, lane)}
                  disabled={!clickable}
                  aria-label={`${TEAM_LABEL[team]} ${LANE_LABEL[lane]}${who ? ` ${who.nickname}` : " 빈 자리"}`}
                  className={cn(
                    "flex h-12 w-full min-w-0 items-center gap-1.5 rounded-xl border-2 px-2.5 text-left transition-all",
                    clickable && "active:scale-95",
                    !who
                      ? "justify-center border-dashed text-sm font-semibold text-muted-foreground"
                      : mine
                        ? "border-primary bg-primary/15"
                        : "border-border bg-background/40",
                    !who && locked && "opacity-50",
                  )}
                >
                  {who ? (
                    <>
                      <span className={cn("truncate text-[15px]", mine ? "font-bold text-primary" : "font-semibold")}>
                        {who.nickname}
                      </span>
                      <TierIcon tier={who.tier} division={who.division} className="size-5" />
                    </>
                  ) : locked ? (
                    "빈 자리"
                  ) : (
                    "+ 들어가기"
                  )}
                </button>
              );
            })}
          </Row>
        ))}
      </div>

      {unseated.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl bg-background/50 px-3 py-2.5 text-sm">
          <span className="shrink-0 font-bold text-muted-foreground">자리 미정</span>
          {unseated.map((p, i) => (
            <span key={p.userId} className={cn(p.userId === me.id && "font-bold text-primary")}>
              {i > 0 && <span className="mr-2 font-normal text-muted-foreground">·</span>}
              {p.nickname}
            </span>
          ))}
        </div>
      )}

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          {picked && (
            <SlotSheet
              key={`${picked.team}-${picked.lane}`}
              date={date}
              picked={picked}
              me={me}
              members={members}
              participants={participants}
              onDone={() => setOpen(false)}
            />
          )}
        </DrawerContent>
      </Drawer>
    </section>
  );
}

function Row({ lane, children }: { lane: Lane; children: React.ReactNode }) {
  return (
    <>
      <span className="flex flex-col items-center gap-0.5 text-[11px] font-bold text-muted-foreground">
        <LaneIcon lane={lane} className="size-5" />
        {LANE_LABEL[lane]}
      </span>
      {children}
    </>
  );
}

function SlotSheet({
  date,
  picked,
  me,
  members,
  participants,
  onDone,
}: {
  date: string;
  picked: Picked;
  me: Me;
  members: Member[];
  participants: Participant[];
  onDone: () => void;
}) {
  const [targetId, setTargetId] = useState(me.id);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { team, lane, occupant } = picked;
  const place = `${TEAM_LABEL[team]} ${LANE_LABEL[lane]}`;

  const run = (action: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      const result = await action();
      if (result.ok) onDone();
      else setError(result.error ?? "실패했어요.");
    });

  const target = members.find((m) => m.id === targetId);
  const targetName = targetId === me.id ? "나" : (target?.nickname ?? "");
  const current = participants.find((p) => p.userId === targetId);
  const moving = current?.team && current.lane;

  return (
    <>
      <DrawerHeader>
        <DrawerTitle className={TEAM_STYLE[team].text}>
          {TEAM_LABEL[team]} · {LANE_LABEL[lane]}
        </DrawerTitle>
        <DrawerDescription>{formatKoreanDate(date)}</DrawerDescription>
      </DrawerHeader>

      <div className="flex flex-col gap-4 px-5 pb-2">
        {occupant ? (
          <>
            <div className="flex items-center gap-3 rounded-xl bg-background/50 p-4">
              <LaneIcon lane={lane} className="size-8" />
              <div>
                <p className="font-bold">{occupant.userId === me.id ? "내 자리예요" : `${occupant.nickname} 자리`}</p>
                <p className="text-sm text-muted-foreground">비우면 참여는 유지되고 '자리 미정'으로 가요</p>
              </div>
            </div>
            <Button
              size="lg"
              variant="outline"
              disabled={pending}
              onClick={() =>
                run(() =>
                  leaveSlot({ date, targetUserId: occupant.userId === me.id ? undefined : occupant.userId }),
                )
              }
            >
              {occupant.userId === me.id ? "자리 비우기" : `${occupant.nickname} 빼기`}
            </Button>
          </>
        ) : (
          <>
            {me.isAdmin && members.length > 0 && (
              <label className="flex items-center gap-3 rounded-xl bg-primary/10 p-3 text-sm font-semibold">
                <span className="shrink-0 text-primary">대상</span>
                <NativeSelect
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  className="flex-1"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nickname}
                      {m.id === me.id ? " (나)" : ""}
                    </option>
                  ))}
                </NativeSelect>
              </label>
            )}
            <div className="flex items-center gap-3 rounded-xl bg-background/50 p-4">
              <LaneIcon lane={lane} className="size-8" />
              <div>
                <p className="font-bold">{targetId === me.id ? "이 자리에 들어갈까요?" : `${targetName} 넣을까요?`}</p>
                <p className="text-sm text-muted-foreground">
                  {moving
                    ? `지금 ${TEAM_LABEL[current.team!]} ${LANE_LABEL[current.lane!]} 자리에서 옮겨져요`
                    : `이날 참여 + ${ro(LANE_LABEL[lane])} 등록돼요`}
                </p>
              </div>
            </div>
            <Button
              size="lg"
              disabled={pending}
              onClick={() =>
                run(() => takeSlot({ date, team, lane, targetUserId: targetId === me.id ? undefined : targetId }))
              }
            >
              {pending ? "들어가는 중" : targetId === me.id ? `${ro(place)} 들어가기` : `${targetName} 넣기`}
            </Button>
          </>
        )}
        {error && <p className="text-sm font-semibold text-destructive">{error}</p>}
      </div>
    </>
  );
}
