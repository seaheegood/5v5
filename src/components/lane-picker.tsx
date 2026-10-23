"use client";

import { LANES, LANE_LABEL, PER_LANE, type Lane } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { LaneIcon } from "./icons/lane-icon";

const base =
  "relative flex h-16 flex-1 flex-col items-center justify-center gap-1 rounded-xl border-2 text-sm font-bold transition-all active:scale-95 disabled:opacity-40";
const on = "border-primary bg-primary/15 text-primary";
const off = "border-border bg-background/40 text-muted-foreground";

/**
 * 일정 참여용: 라인 '딱 1개'만 선택 (라디오 그룹).
 * counts 를 주면 해당 날짜의 라인별 현재 인원(n/2)을 같이 보여준다.
 */
export function LanePicker({
  value,
  onChange,
  preferred = [],
  counts,
  disabled,
}: {
  value: Lane | null;
  onChange: (lane: Lane) => void;
  preferred?: Lane[];
  counts?: Record<Lane, number>;
  disabled?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label="플레이할 라인" className="flex gap-1.5">
      {LANES.map((lane) => {
        const selected = value === lane;
        return (
          <button
            key={lane}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(lane)}
            className={cn(base, selected ? on : off)}
          >
            {preferred.includes(lane) && (
              <span className="absolute top-1 right-1 size-1.5 rounded-full bg-primary" aria-label="주 라인" />
            )}
            <LaneIcon lane={lane} className={cn(!selected && "opacity-60")} />
            <span>{LANE_LABEL[lane]}</span>
            {counts && (
              <span
                className={cn(
                  "absolute -bottom-2 rounded-full bg-card px-1.5 text-[10px] leading-4 tabular-nums",
                  counts[lane] >= PER_LANE ? "text-success" : "text-muted-foreground",
                )}
              >
                {counts[lane]}/{PER_LANE}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** 프로필용: 가능 라인 '중복' 선택 */
export function LaneMultiPicker({ value, onChange }: { value: Lane[]; onChange: (lanes: Lane[]) => void }) {
  const toggle = (lane: Lane) =>
    onChange(value.includes(lane) ? value.filter((l) => l !== lane) : LANES.filter((l) => l === lane || value.includes(l)));

  return (
    <div role="group" aria-label="가능 라인" className="flex gap-1.5">
      {LANES.map((lane) => {
        const selected = value.includes(lane);
        return (
          <button
            key={lane}
            type="button"
            aria-pressed={selected}
            onClick={() => toggle(lane)}
            className={cn(base, selected ? on : off)}
          >
            <LaneIcon lane={lane} className={cn(!selected && "opacity-60")} />
            <span>{LANE_LABEL[lane]}</span>
          </button>
        );
      })}
    </div>
  );
}
