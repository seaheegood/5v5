"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { MAX_COMMENT_LENGTH } from "@/lib/constants";
import type { ActionResult, Comment } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

type Me = { id: string; isAdmin: boolean };

const commentTime = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/**
 * 댓글 목록 + 입력. 티켓 댓글과 개인 페이지 '응원하기'가 같이 쓴다 (이름과 저장 위치만 다름).
 * 누구나 작성, 작성자/관리자만 삭제. 작성자 이름을 누르면 그 멤버의 개인 페이지로.
 */
export function Thread({
  title,
  items,
  me,
  onAdd,
  onDelete,
}: {
  title: string;
  items: Comment[];
  me: Me;
  onAdd: (body: string) => Promise<ActionResult>;
  onDelete: (id: string) => Promise<ActionResult>;
}) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    startTransition(async () => {
      setError(null);
      const result = await onAdd(body);
      if (result.ok) setBody("");
      else setError(result.error);
    });
  };

  const remove = (id: string) => {
    if (!confirm(`${title}을 삭제할까요?`)) return;
    startTransition(async () => {
      const result = await onDelete(id);
      if (!result.ok) setError(result.error);
    });
  };

  return (
    <section className="mt-3 flex flex-col gap-2 rounded-xl bg-card p-4">
      <h4 className="font-bold">
        {title} <span className="text-sm font-normal text-muted-foreground tabular-nums">{items.length}</span>
      </h4>

      {items.length > 0 && (
        <ul className="flex flex-col divide-y divide-border/60">
          {items.map((c) => (
            <li key={c.id} className="flex items-start gap-2 py-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  {c.userId ? (
                    <Link
                      href={`/players/${c.userId}`}
                      className={cn("text-sm font-bold underline-offset-2 active:underline", c.userId === me.id && "text-primary")}
                    >
                      {c.nickname}
                    </Link>
                  ) : (
                    <span className="text-sm font-bold text-muted-foreground">탈퇴한 멤버</span>
                  )}
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {commentTime.format(new Date(c.createdAt))}
                  </span>
                </div>
                <p className="mt-0.5 text-base break-words whitespace-pre-wrap">{c.body}</p>
              </div>
              {(c.userId === me.id || me.isAdmin) && (
                <button
                  type="button"
                  onClick={() => remove(c.id)}
                  disabled={pending}
                  aria-label={`${title} 삭제`}
                  className="-mr-2 flex size-10 shrink-0 items-center justify-center text-muted-foreground"
                >
                  <X className="size-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={submit} className="flex gap-2">
        <Input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={MAX_COMMENT_LENGTH}
          placeholder={`${title} 달기`}
          enterKeyHint="send"
          className="flex-1"
        />
        <Button type="submit" disabled={pending || !body.trim()} className="shrink-0">
          {pending ? "등록 중" : "등록"}
        </Button>
      </form>
      {error && <p className="text-sm font-semibold text-destructive">{error}</p>}
    </section>
  );
}
