"use client";

import { Delete } from "lucide-react";
import { cn } from "@/lib/utils";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"] as const;

/** 4자리 PIN 입력용 큰 숫자 키패드 (모바일 키보드 대신) */
export function PinPad({
  value,
  onChange,
  disabled,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
}) {
  const press = (key: (typeof KEYS)[number]) => {
    if (key === "del") onChange(value.slice(0, -1));
    else if (value.length < 4) onChange(value + key);
  };

  return (
    <div className="flex flex-col items-center gap-8">
      <div className={cn("flex gap-4", error && "animate-[shake_0.3s]")} aria-label={`${value.length}/4 입력됨`}>
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn(
              "size-5 rounded-full border-2 transition-colors",
              i < value.length ? (error ? "border-destructive bg-destructive" : "border-primary bg-primary") : "border-muted-foreground",
            )}
          />
        ))}
      </div>

      <div className="grid w-full max-w-xs grid-cols-3 gap-3">
        {KEYS.map((key, i) =>
          key === "" ? (
            <span key={i} />
          ) : (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => press(key)}
              aria-label={key === "del" ? "지우기" : key}
              className="flex h-16 items-center justify-center rounded-2xl bg-secondary text-2xl font-bold transition-transform active:scale-90 active:bg-accent disabled:opacity-40"
            >
              {key === "del" ? <Delete className="size-6" /> : key}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
