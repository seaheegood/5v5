"use client";

import { useState, useTransition } from "react";
import { updateProfile } from "@/app/actions/users";
import type { Lane } from "@/lib/constants";
import type { PublicUser } from "@/lib/types";
import { LaneMultiPicker } from "../lane-picker";
import { TierPicker, type TierValue } from "../tier-picker";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

/**
 * 프로필 편집. adminMode 면 닉네임/관리자 권한까지 수정 (관리자 페이지에서 사용).
 */
export function ProfileForm({ user, adminMode = false }: { user: PublicUser; adminMode?: boolean }) {
  const [nickname, setNickname] = useState(user.nickname);
  const [tier, setTier] = useState<TierValue>({ tier: user.tier, division: user.tier_division });
  const [lanes, setLanes] = useState<Lane[]>(user.preferred_lanes);
  const [isAdmin, setIsAdmin] = useState(user.is_admin);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const save = () =>
    startTransition(async () => {
      const result = await updateProfile({
        userId: user.id,
        ...tier,
        lanes,
        ...(adminMode ? { nickname, isAdmin } : {}),
      });
      setMessage(result.ok ? { ok: true, text: "저장됨" } : { ok: false, text: result.error });
    });

  return (
    <div className="flex flex-col gap-6">
      {adminMode && (
        <>
          <label className="flex flex-col gap-2">
            <span className="font-bold">닉네임</span>
            <Input value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={12} />
          </label>
          <label className="flex min-h-12 items-center justify-between rounded-xl bg-background/50 px-4">
            <span className="font-bold">관리자 권한</span>
            <input
              type="checkbox"
              checked={isAdmin}
              onChange={(e) => setIsAdmin(e.target.checked)}
              className="size-6 accent-[var(--primary)]"
            />
          </label>
        </>
      )}

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

      {message && (
        <p className={message.ok ? "font-semibold text-success" : "font-semibold text-destructive"}>{message.text}</p>
      )}

      <Button size="lg" onClick={save} disabled={pending}>
        {pending ? "저장 중" : "저장"}
      </Button>
    </div>
  );
}
