import { LANES, PER_LANE, countByLane } from "@/lib/constants";
import type { Participant } from "@/lib/types";
import { cn } from "@/lib/utils";
import { LaneIcon } from "../icons/lane-icon";

/** 라인별 충원 현황 (라인당 2명 = 양 팀 1명씩) */
export function LaneCoverage({ participants }: { participants: Participant[] }) {
  const counts = countByLane(participants.map((p) => p.lane));

  return (
    <div className="grid grid-cols-5 gap-1.5">
      {LANES.map((lane) => (
        <div
          key={lane}
          className={cn(
            "flex items-center justify-center gap-1 rounded-lg py-1.5 text-sm font-bold tabular-nums",
            counts[lane] >= PER_LANE
              ? "bg-success/15 text-success"
              : counts[lane] === 0
                ? "bg-destructive/15 text-destructive"
                : "bg-muted text-muted-foreground",
          )}
        >
          <LaneIcon lane={lane} className="size-5" />
          {counts[lane]}/{PER_LANE}
        </div>
      ))}
    </div>
  );
}
