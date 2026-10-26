"use client";

import { useState, useTransition } from "react";
import { ArrowLeft } from "lucide-react";
import { login, register } from "@/app/actions/auth";
import type { Lane } from "@/lib/constants";
import type { PublicUser } from "@/lib/types";
import { PlayerRow } from "../icons/player-row";
import { LaneMultiPicker } from "../lane-picker";
import { TierPicker, type TierValue } from "../tier-picker";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { PinPad } from "./pin-pad";

type Step = { name: "select" } | { name: "pin"; user: PublicUser };

/** next: 로그인 후 돌아갈 경로 (서버에서 safeNext 로 다시 검증) */
export function LoginForm({ users, next }: { users: PublicUser[]; next?: string }) {
  const [step, setStep] = useState<Step>({ name: "select" });

  // 멤버가 0명일 때만 직접 가입 (첫 관리자). 이후 계정은 관리자가 만든다
  if (users.length === 0) return <RegisterStep next={next} />;
  if (step.name === "pin") return <PinStep user={step.user} next={next} onBack={() => setStep({ name: "select" })} />;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-bold">닉네임 선택</h2>
      <ul className="grid grid-cols-1 gap-2">
        {users.map((user) => (
          <li key={user.id}>
            <button
              type="button"
              onClick={() => setStep({ name: "pin", user })}
              className="w-full rounded-xl border-2 border-border bg-card px-4 py-2 text-left transition-all active:scale-[0.98] active:border-primary"
            >
              <PlayerRow
                lane={user.preferred_lanes[0]}
                nickname={user.nickname}
                tier={user.tier}
                division={user.tier_division}
              />
            </button>
          </li>
        ))}
      </ul>
      <p className="text-center text-sm text-muted-foreground">닉네임이 없으면 관리자에게 계정을 요청하세요</p>
    </div>
  );
}

function PinStep({ user, next, onBack }: { user: PublicUser; next?: string; onBack: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onChange = (value: string) => {
    setError(null);
    setPin(value);
    if (value.length === 4) {
      // 4자리 입력 즉시 자동 로그인 (성공 시 서버에서 next 경로로 redirect)
      startTransition(async () => {
        const result = await login(user.id, value, next);
        if (!result.ok) {
          setError(result.error);
          setPin("");
        }
      });
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <button type="button" onClick={onBack} className="flex h-11 items-center gap-1 self-start text-muted-foreground">
        <ArrowLeft className="size-5" /> 뒤로
      </button>
      <div className="flex flex-col items-center gap-2">
        <PlayerRow
          lane={user.preferred_lanes[0]}
          nickname={user.nickname}
          tier={user.tier}
          division={user.tier_division}
        />
        <p className="text-muted-foreground">PIN 입력</p>
      </div>
      <PinPad value={pin} onChange={onChange} disabled={pending} error={!!error} />
      <p className="min-h-6 text-center font-semibold text-destructive">{pending ? "" : error}</p>
    </div>
  );
}

/** 첫 관리자 가입 (멤버 0명일 때만) */
function RegisterStep({ next }: { next?: string }) {
  const [nickname, setNickname] = useState("");
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [tier, setTier] = useState<TierValue>({ tier: "unranked", division: null });
  const [lanes, setLanes] = useState<Lane[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const pinOk = /^\d{4}$/.test(pin);
  const canSubmit = nickname.trim().length > 0 && pinOk && pin === pinConfirm && !pending;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await register({ nickname, pin, ...tier, lanes, next });
      if (!result.ok) setError(result.error);
    });
  };

  const digitsOnly = (v: string) => v.replace(/\D/g, "").slice(0, 4);

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold">관리자 가입</h2>
        <p className="mt-1 text-sm text-primary">첫 멤버가 관리자가 돼요. 다른 멤버 계정은 가입 후 관리 탭에서 만들어요.</p>
      </div>

      <label className="flex flex-col gap-2">
        <span className="font-bold">닉네임</span>
        <Input value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={12} />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-2">
          <span className="font-bold">PIN</span>
          <Input
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            value={pin}
            onChange={(e) => setPin(digitsOnly(e.target.value))}
            placeholder="4자리"
            className="text-center tracking-[0.5em] placeholder:tracking-normal"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="font-bold">PIN 확인</span>
          <Input
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            value={pinConfirm}
            onChange={(e) => setPinConfirm(digitsOnly(e.target.value))}
            placeholder="4자리"
            className="text-center tracking-[0.5em] placeholder:tracking-normal"
          />
        </label>
      </div>
      {pinConfirm.length === 4 && pin !== pinConfirm && <p className="-mt-4 text-sm text-destructive">PIN 불일치</p>}

      <div className="flex flex-col gap-2">
        <span className="font-bold">티어</span>
        <TierPicker value={tier} onChange={setTier} />
      </div>

      <div className="flex flex-col gap-2">
        <span className="font-bold">
          라인 <span className="text-sm font-normal text-muted-foreground">(중복 가능)</span>
        </span>
        <LaneMultiPicker value={lanes} onChange={setLanes} />
      </div>

      {error && <p className="font-semibold text-destructive">{error}</p>}

      <Button type="submit" size="lg" disabled={!canSubmit}>
        {pending ? "가입 중" : "가입"}
      </Button>
    </form>
  );
}
