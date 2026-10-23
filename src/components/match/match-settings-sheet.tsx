"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { updateMatchSettings } from "@/app/actions/match";
import { MATCH_FORMAT_PRESETS, STAKE_PRESETS } from "@/lib/constants";
import { formatKoreanDate } from "@/lib/date";
import type { MatchSettings } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "../ui/drawer";

function Chips({ options, value, onPick }: { options: string[]; value: string; onPick: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onPick(option)}
          className={cn(
            "h-10 rounded-full border-2 px-4 text-sm font-semibold transition-colors",
            value === option ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground",
          )}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

/** 매치 방식/판돈 수정 바텀 시트 (누구나 수정 가능) */
export function MatchSettingsSheet({ date, settings }: { date: string; settings: MatchSettings | null }) {
  const [open, setOpen] = useState(false);
  const [matchFormat, setMatchFormat] = useState(settings?.matchFormat ?? MATCH_FORMAT_PRESETS[0]);
  const [stake, setStake] = useState(settings?.stake ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onOpenChange = (next: boolean) => {
    if (next) {
      // 열 때마다 최신 서버 값으로 초기화
      setMatchFormat(settings?.matchFormat ?? MATCH_FORMAT_PRESETS[0]);
      setStake(settings?.stake ?? "");
      setError(null);
    }
    setOpen(next);
  };

  const save = () =>
    startTransition(async () => {
      const result = await updateMatchSettings({ date, matchFormat, stake });
      if (result.ok) setOpen(false);
      else setError(result.error);
    });

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerTrigger asChild>
        <Button variant="outline" size="sm" className="shrink-0">
          <Pencil className="size-4" />
          수정
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>세팅</DrawerTitle>
          <DrawerDescription>{formatKoreanDate(date)}</DrawerDescription>
        </DrawerHeader>

        <div className="flex flex-col gap-6 overflow-y-auto px-5 py-2">
          <section className="flex flex-col gap-3">
            <label htmlFor="match-format" className="font-bold">
              방식
            </label>
            <Chips options={MATCH_FORMAT_PRESETS} value={matchFormat} onPick={setMatchFormat} />
            <Input
              id="match-format"
              value={matchFormat}
              maxLength={30}
              onChange={(e) => setMatchFormat(e.target.value)}
              placeholder="직접 입력"
            />
          </section>

          <section className="flex flex-col gap-3">
            <label htmlFor="match-stake" className="font-bold">
              판돈
            </label>
            <Chips options={STAKE_PRESETS} value={stake} onPick={setStake} />
            <Input
              id="match-stake"
              value={stake}
              maxLength={50}
              onChange={(e) => setStake(e.target.value)}
              placeholder="직접 입력"
            />
          </section>

          {error && <p className="text-sm font-semibold text-destructive">{error}</p>}
        </div>

        <DrawerFooter>
          <Button size="lg" onClick={save} disabled={pending || !matchFormat.trim()}>
            {pending ? "저장 중" : "저장"}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
