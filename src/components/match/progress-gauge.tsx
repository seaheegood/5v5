import { cn } from "@/lib/utils";

/** N/10 게이지: 10칸 세그먼트. 가득 차면 초록색 */
export function ProgressGauge({ value, max, className }: { value: number; max: number; className?: string }) {
  const filled = Math.min(value, max);
  const full = filled >= max;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        role="progressbar"
        aria-label="참여 인원"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={filled}
        className="flex flex-1 gap-1"
      >
        {Array.from({ length: max }, (_, i) => (
          <span
            key={i}
            className={cn(
              "h-4 flex-1 rounded-[3px] transition-colors duration-500",
              i < filled ? (full ? "bg-success" : "bg-primary") : "bg-muted",
            )}
          />
        ))}
      </div>
      <span className={cn("min-w-14 text-right text-xl font-extrabold tabular-nums", full && "text-success")}>
        {value}/{max}
      </span>
    </div>
  );
}
