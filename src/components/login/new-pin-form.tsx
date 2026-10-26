"use client";

import { useState, useTransition } from "react";
import { setNewPin } from "@/app/actions/auth";
import { INITIAL_PIN } from "@/lib/constants";
import { PinPad } from "./pin-pad";

/** 첫 로그인 PIN 재설정: 새 PIN 입력 → 한 번 더 입력 → 저장 */
export function NewPinForm({ next }: { next?: string }) {
  const [first, setFirst] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onChange = (value: string) => {
    setError(null);
    setPin(value);
    if (value.length < 4) return;

    if (first === null) {
      if (value === INITIAL_PIN) {
        setError(`${INITIAL_PIN}은 쓸 수 없어요`);
        setPin("");
        return;
      }
      setFirst(value);
      setPin("");
      return;
    }

    if (value !== first) {
      setError("PIN이 달라요. 처음부터 다시 입력해 주세요");
      setFirst(null);
      setPin("");
      return;
    }

    // 성공 시 서버에서 redirect
    startTransition(async () => {
      const result = await setNewPin(value, next);
      if (!result.ok) {
        setError(result.error);
        setFirst(null);
        setPin("");
      }
    });
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="text-center">
        <h2 className="text-xl font-bold">{first === null ? "새 PIN 4자리" : "한 번 더 입력"}</h2>
        <p className="mt-1 text-sm text-muted-foreground">처음 로그인했어요. 앞으로 쓸 PIN을 정해 주세요.</p>
      </div>
      <PinPad value={pin} onChange={onChange} disabled={pending} error={!!error} />
      <p className="min-h-6 text-center font-semibold text-destructive">{pending ? "" : error}</p>
    </div>
  );
}
