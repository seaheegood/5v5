"use client";

import { useState, useTransition } from "react";
import { CalendarPlus, Clock } from "lucide-react";
import { deleteTimePref, saveTimePref, setStartOverride } from "@/app/actions/time";
import {
  MATCH_FULL,
  MAX_REASON_LENGTH,
  START_SLOTS,
  formatStartTime,
  formatTimeRange,
  matchDurationHours,
} from "@/lib/constants";
import { googleCalendarUrl } from "@/lib/ics";
import type { MatchCardData } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { NativeSelect } from "../ui/native-select";

type Me = { id: string; isAdmin: boolean };

/**
 * 시작 시간 조율 (티켓 상세).
 * - 자리에 있는 사람: 원하는 시작 시간 + 사유(선택) 저장/삭제
 * - 10칸이 다 차고 10명 모두 내면 최다 선택(동률이면 늦은 시간)으로 자동 확정
 * - 관리자: 시간을 직접 정하거나 자동으로 되돌리기
 * - 확정되면 자리에 있는 사람에게 캘린더 추가 버튼
 */
export function TimeSection({ card, me, locked }: { card: MatchCardData; me: Me; locked: boolean }) {
  const { prefs, confirmedStart, overridden, leading } = card.time;
  const seated = card.participants.filter((p) => p.team && p.lane);
  const mySeat = seated.find((p) => p.userId === me.id);
  const myPref = prefs.find((p) => p.userId === me.id);
  const format = card.settings?.matchFormat ?? null;
  const hours = matchDurationHours(format);
  const waiting = seated.filter((p) => !prefs.some((x) => x.userId === p.userId));

  // 시간별 묶음 (이른 시간 순)
  const groups = [...new Set(prefs.map((p) => p.startMin))]
    .sort((a, b) => a - b)
    .map((min) => ({ min, people: prefs.filter((p) => p.startMin === min) }));
  const top = groups.length ? Math.max(...groups.map((g) => g.people.length)) : 0;

  return (
    <section className="mt-3 flex flex-col gap-3 rounded-xl bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="flex items-center gap-1.5 font-bold">
          <Clock className="size-4 text-muted-foreground" />
          시작 시간
        </h3>
        <span className="text-xs text-muted-foreground">
          {format ?? "방식 미정"} · 약 {hours}시간
        </span>
      </div>

      {confirmedStart !== null ? (
        <div className="rounded-lg bg-success/15 px-3 py-2.5">
          <p className="text-lg font-extrabold text-success tabular-nums">{formatTimeRange(confirmedStart, format)}</p>
          <p className="text-xs text-muted-foreground">
            {overridden ? "관리자가 정한 시간" : "10명 응답 · 가장 많이 고른 시간으로 확정"}
            {confirmedStart >= 1440 && " · 다음날 새벽"}
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          응답 <b className="text-foreground tabular-nums">{prefs.length}</b>/{MATCH_FULL}
          {seated.length < MATCH_FULL ? " · 10칸이 차고 모두 응답하면 자동 확정" : " · 모두 응답하면 자동 확정"}
          {leading !== null && (
            <>
              {" "}· 지금 1위 <b className="text-primary">{formatStartTime(leading)}</b>
            </>
          )}
        </p>
      )}

      {/* 시간별 응답 */}
      {groups.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {groups.map(({ min, people }) => {
            const best = people.length === top && min === leading;
            return (
              <li
                key={min}
                className={cn(
                  "rounded-lg border-2 px-3 py-2",
                  min === confirmedStart ? "border-success/60" : best ? "border-primary/60" : "border-border",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold tabular-nums">{formatStartTime(min, { nextDay: true })}</span>
                  <span className="text-sm font-semibold text-muted-foreground tabular-nums">{people.length}명</span>
                </div>
                <p className="mt-0.5 text-sm">
                  {people.map((p, i) => (
                    <span key={p.userId}>
                      {i > 0 && ", "}
                      <span className={cn(p.userId === me.id && "font-bold text-primary")}>{p.nickname}</span>
                    </span>
                  ))}
                </p>
                {people
                  .filter((p) => p.reason)
                  .map((p) => (
                    <p key={p.userId} className="mt-0.5 text-xs text-muted-foreground">
                      {p.nickname}: {p.reason}
                    </p>
                  ))}
              </li>
            );
          })}
        </ul>
      )}
      {waiting.length > 0 && (
        <p className="text-xs text-muted-foreground">
          미응답: {waiting.map((p) => p.nickname).join(", ")}
        </p>
      )}

      {/* 내 응답 */}
      {mySeat && !locked && <MyPref date={card.date} initial={myPref ?? null} />}
      {!mySeat && !locked && (
        <p className="text-xs text-muted-foreground">자리에 들어가면 원하는 시작 시간을 낼 수 있어요</p>
      )}

      {/* 캘린더 */}
      {confirmedStart !== null && mySeat?.team && mySeat.lane && (
        <div className="grid grid-cols-2 gap-2">
          <Button asChild variant="secondary">
            <a href={`/api/calendar/${card.date}`}>
              <CalendarPlus className="size-5" />
              캘린더에 추가
            </a>
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              window.open(
                googleCalendarUrl({
                  date: card.date,
                  startMin: confirmedStart,
                  matchFormat: format,
                  stake: card.settings?.stake ?? null,
                  pcBang: card.settings?.pcBang ?? null,
                  team: mySeat.team!,
                  lane: mySeat.lane!,
                  url: `${location.origin}/ticket/${card.date}`,
                }),
                "_blank",
                "noopener",
              )
            }
          >
            구글 캘린더
          </Button>
        </div>
      )}

      {me.isAdmin && !card.results && (
        <AdminOverride date={card.date} override={card.settings?.startOverride ?? null} />
      )}
    </section>
  );
}

function MyPref({
  date,
  initial,
}: {
  date: string;
  initial: { startMin: number; reason: string } | null;
}) {
  const [startMin, setStartMin] = useState<number | "">(initial?.startMin ?? "");
  const [reason, setReason] = useState(initial?.reason ?? "");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const unchanged = initial !== null && initial.startMin === startMin && initial.reason === reason.trim();

  const run = (action: () => Promise<{ ok: boolean; error?: string }>, done: string) =>
    startTransition(async () => {
      const result = await action();
      setMessage(result.ok ? { ok: true, text: done } : { ok: false, text: result.error ?? "실패했어요." });
    });

  return (
    <div className="flex flex-col gap-2 border-t pt-3">
      <p className="text-sm font-bold">{initial ? "내 응답 수정" : "내가 원하는 시작 시간"}</p>
      <NativeSelect
        aria-label="원하는 시작 시간"
        value={startMin}
        onChange={(e) => setStartMin(e.target.value === "" ? "" : Number(e.target.value))}
      >
        <option value="">시간 선택</option>
        {START_SLOTS.map((min) => (
          <option key={min} value={min}>
            {formatStartTime(min, { nextDay: true })}
          </option>
        ))}
      </NativeSelect>
      <Input
        value={reason}
        maxLength={MAX_REASON_LENGTH}
        onChange={(e) => setReason(e.target.value)}
        placeholder="사유 (선택) 예: 9시 전엔 퇴근 못 해요"
      />
      {message && (
        <p className={cn("text-sm font-semibold", message.ok ? "text-success" : "text-destructive")}>{message.text}</p>
      )}
      <div className="flex gap-2">
        <Button
          className="flex-1"
          disabled={pending || startMin === "" || unchanged}
          onClick={() => run(() => saveTimePref({ date, startMin: Number(startMin), reason }), "저장됨")}
        >
          {pending ? "저장 중" : "시간 내기"}
        </Button>
        {initial && (
          <Button
            variant="ghost"
            disabled={pending}
            className="text-muted-foreground"
            onClick={() =>
              run(async () => {
                const result = await deleteTimePref(date);
                if (result.ok) {
                  setStartMin("");
                  setReason("");
                }
                return result;
              }, "응답을 지웠어요")
            }
          >
            응답 삭제
          </Button>
        )}
      </div>
    </div>
  );
}

/** 관리자: 시작 시간 직접 정하기 / 자동으로 되돌리기 */
function AdminOverride({ date, override }: { date: string; override: number | null }) {
  const [value, setValue] = useState<number | "">(override ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const save = (startMin: number | null) =>
    startTransition(async () => {
      setError(null);
      const result = await setStartOverride({ date, startMin });
      if (!result.ok) setError(result.error);
      else if (startMin === null) setValue("");
    });

  return (
    <div className="flex flex-col gap-2 border-t pt-3">
      <p className="text-sm font-bold text-primary">관리자 · 시간 직접 정하기</p>
      <div className="flex gap-2">
        <NativeSelect
          aria-label="확정 시작 시간"
          className="flex-1"
          value={value}
          onChange={(e) => setValue(e.target.value === "" ? "" : Number(e.target.value))}
        >
          <option value="">자동 (응답 기준)</option>
          {START_SLOTS.map((min) => (
            <option key={min} value={min}>
              {formatStartTime(min, { nextDay: true })}
            </option>
          ))}
        </NativeSelect>
        <Button
          variant="secondary"
          disabled={pending || value === (override ?? "")}
          onClick={() => save(value === "" ? null : value)}
        >
          {pending ? "저장 중" : "적용"}
        </Button>
      </div>
      {override !== null && <p className="text-xs text-muted-foreground">자동으로 되돌리려면 &apos;자동&apos;을 고르고 적용</p>}
      {error && <p className="text-sm font-semibold text-destructive">{error}</p>}
    </div>
  );
}
