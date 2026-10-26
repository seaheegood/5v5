"use client";

import { useState, useTransition } from "react";
import { Flag } from "lucide-react";
import { finishMatch } from "@/app/actions/results";
import { TEAM_LABEL } from "@/lib/constants";
import { formatKoreanDate } from "@/lib/date";
import type { Team } from "@/lib/types";
import { cn } from "@/lib/utils";
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
import { TEAM_STYLE } from "./team-style";

/** 관리자: 매치 종료. 팀은 티켓 자리 그대로이므로 승리팀만 고른다 */
export function FinishSheet({ date }: { date: string }) {
  const [open, setOpen] = useState(false);
  const [winner, setWinner] = useState<Team | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onOpenChange = (next: boolean) => {
    if (next) {
      setWinner(null);
      setError(null);
    }
    setOpen(next);
  };

  const save = () =>
    startTransition(async () => {
      const result = await finishMatch({ date, winner: winner! });
      if (result.ok) setOpen(false);
      else setError(result.error);
    });

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerTrigger asChild>
        <Button className="flex-1">
          <Flag className="size-5" />
          종료 · 승리팀 선택
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>매치 종료</DrawerTitle>
          <DrawerDescription>{formatKoreanDate(date)} · 이긴 팀을 고르면 MVP/범인 투표가 열려요</DrawerDescription>
        </DrawerHeader>

        <div className="flex flex-col gap-3 px-5 py-2">
          <div className="grid grid-cols-2 gap-2">
            {(["blue", "red"] as const).map((team) => (
              <button
                key={team}
                type="button"
                aria-pressed={winner === team}
                onClick={() => setWinner(team)}
                className={cn(
                  "h-20 rounded-xl border-2 text-xl font-bold transition-all active:scale-95",
                  winner === team ? TEAM_STYLE[team].on : "border-border text-muted-foreground",
                )}
              >
                {TEAM_LABEL[team]} 승
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">팀은 티켓의 1팀/2팀 자리 그대로 기록돼요. 종료 후에는 자리를 바꿀 수 없어요.</p>
          {error && <p className="text-sm font-semibold text-destructive">{error}</p>}
        </div>

        <DrawerFooter>
          <Button size="lg" onClick={save} disabled={!winner || pending}>
            {pending ? "저장 중" : "종료하고 투표 열기"}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
