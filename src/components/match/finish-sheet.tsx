"use client";

import { useState, useTransition } from "react";
import { Flag } from "lucide-react";
import { finishMatch } from "@/app/actions/results";
import { LANES, MATCH_FULL, TEAM_LABEL } from "@/lib/constants";
import { formatKoreanDate } from "@/lib/date";
import type { Participant, Team } from "@/lib/types";
import { cn } from "@/lib/utils";
import { LaneIcon } from "../icons/lane-icon";
import { Button } from "../ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "../ui/drawer";

const TEAM_SIZE = MATCH_FULL / 2;

export const TEAM_STYLE: Record<Team, { on: string; text: string }> = {
  blue: { on: "border-sky-400 bg-sky-400/15 text-sky-400", text: "text-sky-400" },
  red: { on: "border-rose-400 bg-rose-400/15 text-rose-400", text: "text-rose-400" },
};

/** 라인별로 첫 번째 = 1팀, 두 번째 = 2팀 으로 미리 채워 둔다 (관리자가 수정) */
function autoAssign(participants: Participant[]): Record<string, Team> {
  const teams: Record<string, Team> = {};
  for (const lane of LANES) {
    const [first, second] = participants.filter((p) => p.lane === lane);
    if (first) teams[first.userId] = "blue";
    if (second) teams[second.userId] = "red";
  }
  return teams;
}

/** 관리자: 매치 종료 (5대5 팀 배정 + 승리팀) */
export function FinishSheet({ date, participants }: { date: string; participants: Participant[] }) {
  const [open, setOpen] = useState(false);
  const [teams, setTeams] = useState<Record<string, Team>>({});
  const [winner, setWinner] = useState<Team | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const count = (team: Team) => Object.values(teams).filter((t) => t === team).length;
  const ready = count("blue") === TEAM_SIZE && count("red") === TEAM_SIZE && winner !== null;

  const onOpenChange = (next: boolean) => {
    if (next) {
      setTeams(autoAssign(participants));
      setWinner(null);
      setError(null);
    }
    setOpen(next);
  };

  // 같은 팀을 다시 누르면 배정 해제 (대기)
  const pick = (userId: string, team: Team) =>
    setTeams((prev) => {
      const next = { ...prev };
      if (next[userId] === team) delete next[userId];
      else next[userId] = team;
      return next;
    });

  const save = () =>
    startTransition(async () => {
      const result = await finishMatch({ date, winner: winner!, teams });
      if (result.ok) setOpen(false);
      else setError(result.error);
    });

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerTrigger asChild>
        <Button className="flex-1">
          <Flag className="size-5" />
          종료
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>매치 종료</DrawerTitle>
          <DrawerDescription>{formatKoreanDate(date)} · 팀과 승리팀을 정하면 투표가 열려요</DrawerDescription>
        </DrawerHeader>

        <div className="flex flex-col gap-5 overflow-y-auto px-5 py-2">
          <section className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <h3 className="font-bold">팀</h3>
              <span className="text-sm font-bold tabular-nums">
                <span className={TEAM_STYLE.blue.text}>
                  {TEAM_LABEL.blue} {count("blue")}/{TEAM_SIZE}
                </span>
                <span className="mx-1.5 text-muted-foreground">·</span>
                <span className={TEAM_STYLE.red.text}>
                  {TEAM_LABEL.red} {count("red")}/{TEAM_SIZE}
                </span>
              </span>
            </div>
            <ul className="flex flex-col gap-1.5">
              {participants.map((p) => (
                <li key={p.userId} className="flex items-center gap-2">
                  <LaneIcon lane={p.lane} className="size-5" />
                  <span className="flex-1 truncate">{p.nickname}</span>
                  {(["blue", "red"] as const).map((team) => (
                    <button
                      key={team}
                      type="button"
                      aria-pressed={teams[p.userId] === team}
                      onClick={() => pick(p.userId, team)}
                      className={cn(
                        "h-10 w-16 rounded-lg border-2 text-sm font-bold transition-all active:scale-95",
                        teams[p.userId] === team ? TEAM_STYLE[team].on : "border-border text-muted-foreground",
                      )}
                    >
                      {TEAM_LABEL[team]}
                    </button>
                  ))}
                </li>
              ))}
            </ul>
            {participants.length > MATCH_FULL && (
              <p className="text-xs text-muted-foreground">팀을 고르지 않은 멤버는 대기로 남아요</p>
            )}
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="font-bold">승리팀</h3>
            <div className="grid grid-cols-2 gap-2">
              {(["blue", "red"] as const).map((team) => (
                <button
                  key={team}
                  type="button"
                  aria-pressed={winner === team}
                  onClick={() => setWinner(team)}
                  className={cn(
                    "h-14 rounded-xl border-2 text-lg font-bold transition-all active:scale-95",
                    winner === team ? TEAM_STYLE[team].on : "border-border text-muted-foreground",
                  )}
                >
                  {TEAM_LABEL[team]} 승
                </button>
              ))}
            </div>
          </section>

          {error && <p className="text-sm font-semibold text-destructive">{error}</p>}
        </div>

        <DrawerFooter>
          <Button size="lg" onClick={save} disabled={!ready || pending}>
            {pending ? "저장 중" : "종료하고 투표 열기"}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
