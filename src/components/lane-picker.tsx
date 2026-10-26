"use client";

import { LANES, LANE_LABEL, type Lane } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { LaneIcon } from "./icons/lane-icon";

const base =
  "relative flex h-16 flex-1 flex-col items-center justify-center gap-1 rounded-xl border-2 text-sm font-bold transition-all active:scale-95 disabled:opacity-40";
const on = "border-primary bg-primary/15 text-primary";
const off = "border-border bg-background/40 text-muted-foreground";

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
