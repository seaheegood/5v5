import type { Division, Lane, Tier } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { LaneIcon } from "./lane-icon";
import { TierIcon } from "./tier-icon";

/** 유저 표시 공통 포맷: [라인 아이콘] 닉네임 [티어 아이콘] */
export function PlayerRow({
  lane,
  nickname,
  tier,
  division,
  highlight,
  className,
  children,
}: {
  lane?: Lane | null;
  nickname: string;
  tier: Tier;
  division?: Division | null;
  highlight?: boolean;
  className?: string;
  /** 오른쪽 끝 액션(삭제 버튼 등) */
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("flex min-h-11 items-center gap-2.5", className)}>
      {lane ? <LaneIcon lane={lane} /> : <span className="size-6 shrink-0" aria-hidden />}
      <span className={cn("truncate text-base font-medium", highlight && "font-bold text-primary")}>{nickname}</span>
      <TierIcon tier={tier} division={division} />
      {children && <div className="ml-auto flex items-center">{children}</div>}
    </div>
  );
}
