"use client";

import { useState, useTransition } from "react";
import { UserPlus } from "lucide-react";
import { createMember } from "@/app/actions/users";
import { INITIAL_PIN, type Lane } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { LaneMultiPicker } from "../lane-picker";
import { TierPicker, type TierValue } from "../tier-picker";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

/** 관리자: 멤버 계정 만들기 (초기 PIN 0000, 첫 로그인 때 재설정) */
export function AddMemberForm() {
  const [open, setOpen] = useState(false);
  const [nickname, setNickname] = useState("");
  const [tier, setTier] = useState<TierValue>({ tier: "unranked", division: null });
  const [lanes, setLanes] = useState<Lane[]>([]);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await createMember({ nickname, ...tier, lanes });
      if (result.ok) {
        setMessage({ ok: true, text: `${nickname.trim()} 추가됨 · 초기 PIN ${INITIAL_PIN}` });
        setNickname("");
        setTier({ tier: "unranked", division: null });
        setLanes([]);
      } else setMessage({ ok: false, text: result.error });
    });
  };

  if (!open)
    return (
      <div className="flex flex-col gap-2">
        <Button size="lg" onClick={() => setOpen(true)}>
          <UserPlus className="size-5" />
          멤버 추가
        </Button>
        {message?.ok && <p className="text-center text-sm font-semibold text-success">{message.text}</p>}
      </div>
    );

  return (
    <form onSubmit={submit} className="flex flex-col gap-5 rounded-2xl border-2 border-primary/40 bg-card p-5">
      <div>
        <h3 className="text-lg font-bold">멤버 추가</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          초기 PIN은 <b className="text-primary">{INITIAL_PIN}</b>이에요. 첫 로그인 때 새 PIN을 정해요.
        </p>
      </div>

      <label className="flex flex-col gap-2">
        <span className="font-bold">닉네임</span>
        <Input value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={12} autoFocus />
      </label>

      <div className="flex flex-col gap-2">
        <span className="font-bold">티어</span>
        <TierPicker value={tier} onChange={setTier} />
      </div>

      <div className="flex flex-col gap-2">
        <span className="font-bold">
          라인 <span className="text-sm font-normal text-muted-foreground">(중복 가능, 나중에 본인이 수정 가능)</span>
        </span>
        <LaneMultiPicker value={lanes} onChange={setLanes} />
      </div>

      {message && (
        <p className={cn("text-sm font-semibold", message.ok ? "text-success" : "text-destructive")}>{message.text}</p>
      )}

      <div className="grid grid-cols-[1fr_2fr] gap-2">
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          닫기
        </Button>
        <Button type="submit" disabled={pending || !nickname.trim()}>
          {pending ? "추가 중" : "추가"}
        </Button>
      </div>
    </form>
  );
}
