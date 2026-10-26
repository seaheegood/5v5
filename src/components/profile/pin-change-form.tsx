"use client";

import { useState, useTransition } from "react";
import { changeMyPin } from "@/app/actions/users";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

const digitsOnly = (v: string) => v.replace(/\D/g, "").slice(0, 4);

/** 본인 PIN 변경 (현재 PIN 확인) */
export function PinChangeForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () =>
    startTransition(async () => {
      const result = await changeMyPin(current, next);
      setMessage(result.ok ? { ok: true, text: "변경됨" } : { ok: false, text: result.error });
      if (result.ok) {
        setCurrent("");
        setNext("");
      }
    });

  const pinInput = (value: string, set: (v: string) => void, placeholder: string) => (
    <Input
      type="password"
      inputMode="numeric"
      autoComplete="off"
      value={value}
      onChange={(e) => set(digitsOnly(e.target.value))}
      placeholder={placeholder}
      className="text-center tracking-[0.3em] placeholder:tracking-normal"
    />
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        {pinInput(current, setCurrent, "현재 PIN")}
        {pinInput(next, setNext, "새 PIN")}
      </div>
      {message && (
        <p className={message.ok ? "text-sm font-semibold text-success" : "text-sm font-semibold text-destructive"}>
          {message.text}
        </p>
      )}
      <Button variant="secondary" onClick={submit} disabled={pending || next.length !== 4 || current.length !== 4}>
        PIN 변경
      </Button>
    </div>
  );
}
