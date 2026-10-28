"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { updateMatchSettings } from "@/app/actions/match";
import { MATCH_FORMAT_PRESETS, MAX_PC_BANG_LENGTH, MAX_STAKE, STAKE_PRESETS, formatStake } from "@/lib/constants";
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

function Chips<T extends string | number>({
  options,
  value,
  onPick,
  label = String,
}: {
  options: T[];
  value: T;
  onPick: (v: T) => void;
  label?: (v: T) => string;
}) {
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
          {label(option)}
        </button>
      ))}
    </div>
  );
}

/** 입력칸 문자열 → 판돈 숫자 (숫자만 남김). 비어 있으면 NaN */
const parseStake = (text: string) => (text === "" ? Number.NaN : Number(text));

/** 매치 방식/판돈 수정 바텀 시트 (누구나 수정 가능) */
export function MatchSettingsSheet({ date, settings }: { date: string; settings: MatchSettings | null }) {
  const [open, setOpen] = useState(false);
  const [matchFormat, setMatchFormat] = useState(settings?.matchFormat ?? MATCH_FORMAT_PRESETS[0]);
  // 입력칸은 숫자 문자열로 다룬다 ("" = 아직 안 정함)
  const [stake, setStake] = useState(settings?.stake?.toString() ?? "");
  const [pcBang, setPcBang] = useState(settings?.pcBang ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onOpenChange = (next: boolean) => {
    if (next) {
      // 열 때마다 최신 서버 값으로 초기화
      setMatchFormat(settings?.matchFormat ?? MATCH_FORMAT_PRESETS[0]);
      setStake(settings?.stake?.toString() ?? "");
      setPcBang(settings?.pcBang ?? "");
      setError(null);
    }
    setOpen(next);
  };

  const save = () =>
    startTransition(async () => {
      const result = await updateMatchSettings({ date, matchFormat, stake: parseStake(stake), pcBang });
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
              판돈 <span className="text-sm font-normal text-muted-foreground">(1인당, 이긴 팀 +, 진 팀 -)</span>
            </label>
            <Chips
              options={STAKE_PRESETS}
              value={parseStake(stake)}
              onPick={(v) => setStake(String(v))}
              label={formatStake}
            />
            <div className="relative">
              <Input
                id="match-stake"
                inputMode="numeric"
                value={stake === "" ? "" : Number(stake).toLocaleString("ko-KR")}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
                  setStake(digits === "" ? "" : String(Math.min(Number(digits), MAX_STAKE)));
                }}
                placeholder="직접 입력 (숫자만)"
                className="pr-10 text-right tabular-nums"
              />
              <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-muted-foreground">원</span>
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <label htmlFor="match-pc-bang" className="font-bold">
              PC방 <span className="text-sm font-normal text-muted-foreground">(선택)</span>
            </label>
            <Input
              id="match-pc-bang"
              value={pcBang}
              maxLength={MAX_PC_BANG_LENGTH}
              onChange={(e) => setPcBang(e.target.value)}
              placeholder="예: 강남역 레드포스 PC방"
            />
          </section>

          {error && <p className="text-sm font-semibold text-destructive">{error}</p>}
        </div>

        <DrawerFooter>
          <Button size="lg" onClick={save} disabled={pending || !matchFormat.trim() || stake === ""}>
            {pending ? "저장 중" : "저장"}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
