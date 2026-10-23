import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // iOS 자동 확대 방지를 위해 16px(text-base) 이상 유지
        "flex h-12 w-full rounded-lg border-2 border-input bg-background/60 px-4 text-base placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
