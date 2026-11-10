import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** 에러·404 같은 안내 화면 공용 틀: 아이콘 + 제목 + 설명 + 버튼들 */
export function StatusScreen({
  icon: Icon,
  title,
  description,
  children,
  fullScreen = false,
}: {
  icon: LucideIcon;
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
  /** 헤더/탭바가 없는 곳(루트)에서는 화면 가운데에 */
  fullScreen?: boolean;
}) {
  return (
    <div
      className={cn(
        "mx-auto flex max-w-lg flex-col items-center px-6 text-center",
        fullScreen ? "min-h-dvh justify-center py-10" : "py-16",
      )}
    >
      <div className="mb-5 flex size-16 items-center justify-center rounded-2xl bg-card text-primary">
        <Icon className="size-8" />
      </div>
      <h2 className="text-xl font-bold">{title}</h2>
      {description && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>}
      {children && <div className="mt-8 flex w-full max-w-xs flex-col gap-2">{children}</div>}
    </div>
  );
}
