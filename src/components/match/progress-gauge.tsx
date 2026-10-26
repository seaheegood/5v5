import { cn } from "@/lib/utils";

/** N/10 게이지: 10칸 세그먼트. 가득 차면 초록색. sm 은 요약 카드용 */
export function ProgressGauge({
  value,
  max,
  size = "md",
  className,
}: {
  value: number;
  max: number;
  size?: "sm" | "md";
  className?: string;
}) {
  const filled = Math.min(value, max);
  const full = filled >= max;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        role="progressbar"
        aria-label="채워진 자리"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={filled}
        className="flex flex-1 gap-1"
      >
        {Array.from({ length: max }, (_, i) => (
          <span
            key={i}
            className={cn(
              "flex-1 rounded-[3px] transition-colors duration-500",
              size === "sm" ? "h-2.5" : "h-4",
              i < filled ? (full ? "bg-success" : "bg-primary") : "bg-muted",
            )}
          />
        ))}
      </div>
      <span
        className={cn(
          "min-w-14 text-right font-extrabold tabular-nums",
          size === "sm" ? "text-base" : "text-xl",
          full && "text-success",
        )}
      >
        {value}/{max}
      </span>
    </div>
  );
}
