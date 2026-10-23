import { LANE_LABEL, type Lane } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * 라인 아이콘. /public/icons/lanes/{lane}.svg 를 그대로 교체하면
 * (예: 공식 포지션 아이콘 PNG/SVG) 코드 수정 없이 아이콘이 바뀐다.
 */
export function LaneIcon({ lane, className }: { lane: Lane; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/icons/lanes/${lane}.svg`}
      alt={LANE_LABEL[lane]}
      title={LANE_LABEL[lane]}
      width={24}
      height={24}
      draggable={false}
      className={cn("size-6 shrink-0 select-none", className)}
    />
  );
}
