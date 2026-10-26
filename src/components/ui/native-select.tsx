import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * 네이티브 <select> (모바일에서 OS 기본 선택 UI 사용).
 * 브라우저 기본 화살표는 끝에 딱 붙어서, 숨기고 여백을 둔 화살표를 직접 그린다.
 */
function NativeSelect({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div className={cn("relative", className)}>
      <select
        data-slot="native-select"
        className="h-11 w-full appearance-none rounded-lg border-2 border-input bg-background pr-11 pl-3 text-base focus-visible:border-ring focus-visible:outline-none"
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3.5 size-5 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  );
}

export { NativeSelect };
