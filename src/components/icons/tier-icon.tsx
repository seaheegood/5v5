import { ROMAN, formatTier, hasDivision, type Division, type Tier } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * 티어 엠블럼 + 디비전 로마 숫자 (예: [G] II).
 * /public/icons/tiers/{tier}.svg 교체로 실제 엠블럼 적용 가능.
 */
export function TierIcon({
  tier,
  division,
  className,
}: {
  tier: Tier;
  division?: Division | null;
  className?: string;
}) {
  const label = formatTier(tier, division ?? null);
  return (
    <span className="inline-flex shrink-0 items-center gap-0.5" title={label}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/icons/tiers/${tier}.svg`}
        alt={label}
        width={24}
        height={24}
        draggable={false}
        className={cn("size-6 select-none", className)}
      />
      {division && hasDivision(tier) && (
        <span aria-hidden className="text-xs font-extrabold text-muted-foreground tabular-nums">
          {ROMAN[division]}
        </span>
      )}
    </span>
  );
}
