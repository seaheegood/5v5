"use client";

import { DIVISIONS, ROMAN, TIERS, TIER_LABEL, hasDivision, type Division, type Tier } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { TierIcon } from "./icons/tier-icon";

export type TierValue = { tier: Tier; division: Division | null };

const chip = "rounded-xl border-2 font-bold transition-all active:scale-95";
const on = "border-primary bg-primary/15 text-primary";
const off = "border-border text-muted-foreground";

/** 티어 + 디비전(I~IV) 선택. 마스터 이상/언랭은 디비전 없음 */
export function TierPicker({ value, onChange }: { value: TierValue; onChange: (value: TierValue) => void }) {
  const pickTier = (tier: Tier) =>
    onChange({ tier, division: hasDivision(tier) ? (value.division ?? 4) : null });

  return (
    <div className="flex flex-col gap-2">
      <div role="radiogroup" aria-label="티어" className="grid grid-cols-4 gap-1.5">
        {TIERS.map((tier) => (
          <button
            key={tier}
            type="button"
            role="radio"
            aria-checked={value.tier === tier}
            onClick={() => pickTier(tier)}
            className={cn(chip, "flex h-16 flex-col items-center justify-center gap-1 text-xs", value.tier === tier ? on : off)}
          >
            <TierIcon tier={tier} className="size-7" />
            {TIER_LABEL[tier]}
          </button>
        ))}
      </div>

      {hasDivision(value.tier) && (
        <div role="radiogroup" aria-label="디비전" className="grid grid-cols-4 gap-1.5">
          {DIVISIONS.map((division) => (
            <button
              key={division}
              type="button"
              role="radio"
              aria-checked={value.division === division}
              onClick={() => onChange({ tier: value.tier, division })}
              className={cn(chip, "h-12 text-lg", value.division === division ? on : off)}
            >
              {ROMAN[division]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
