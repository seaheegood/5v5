"use client";

import { useState, useTransition } from "react";
import { ChevronDown, KeyRound, Trash2 } from "lucide-react";
import { deleteUser, resetPin } from "@/app/actions/users";
import { INITIAL_PIN } from "@/lib/constants";
import type { PublicUser } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PlayerRow } from "../icons/player-row";
import { Button } from "../ui/button";
import { ProfileForm } from "./profile-form";

/** 관리자 페이지: 멤버 1명 (펼쳐서 수정/PIN 초기화/삭제) */
export function AdminUserCard({ user, isMe }: { user: PublicUser; isMe: boolean }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const remove = () => {
    if (!confirm(`${user.nickname} 삭제? (일정 응답도 함께 삭제)`)) return;
    startTransition(async () => {
      const result = await deleteUser(user.id);
      if (!result.ok) alert(result.error);
    });
  };

  const reset = () => {
    if (!confirm(`${user.nickname} PIN을 ${INITIAL_PIN}으로 초기화할까요? (다음 로그인 때 새 PIN 설정)`)) return;
    startTransition(async () => {
      const result = await resetPin(user.id);
      alert(result.ok ? `초기화됨. ${user.nickname}에게 PIN ${INITIAL_PIN}을 알려 주세요.` : result.error);
    });
  };

  return (
    <li className={cn("rounded-2xl border-2 bg-card", pending && "opacity-50")}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-4 py-2"
      >
        <PlayerRow
          lane={user.preferred_lanes[0]}
          nickname={user.nickname}
          tier={user.tier}
          division={user.tier_division}
          className="flex-1"
        />
        {user.must_change_pin && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground">PIN 미설정</span>
        )}
        {user.is_admin && <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-bold text-primary">관리자</span>}
        <ChevronDown className={cn("size-5 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="flex flex-col gap-6 border-t px-4 py-5">
          <ProfileForm user={user} adminMode />
          {!isMe && (
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={reset} disabled={pending}>
                <KeyRound className="size-5" />
                PIN 초기화
              </Button>
              <Button variant="destructive" onClick={remove} disabled={pending}>
                <Trash2 className="size-5" />
                삭제
              </Button>
            </div>
          )}
        </div>
      )}
    </li>
  );
}
