"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { addComment, deleteComment } from "@/app/actions/results";
import { MAX_COMMENT_LENGTH } from "@/lib/constants";
import type { Comment } from "@/lib/types";
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

/** 티켓 댓글: 경기 전 자리 조율부터 경기 후 수다까지. 누구나 작성, 작성자/관리자만 삭제 */
export function Comments({ date, comments, me }: { date: string; comments: Comment[]; me: Me }) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    startTransition(async () => {
      setError(null);
      const result = await addComment({ date, body });
      if (result.ok) setBody("");
      else setError(result.error);
    });
  };

  const remove = (id: string) => {
    if (!confirm("댓글을 삭제할까요?")) return;
    startTransition(async () => {
      const result = await deleteComment(id);
      if (!result.ok) setError(result.error);
    });
  };

  return (
    <section className="mt-3 flex flex-col gap-2 rounded-xl bg-background/50 p-4">
      <h4 className="font-bold">
        댓글 <span className="text-sm font-normal text-muted-foreground tabular-nums">{comments.length}</span>
      </h4>

      {comments.length > 0 && (
        <ul className="flex flex-col divide-y divide-border/60">
          {comments.map((c) => (
            <li key={c.id} className="flex items-start gap-2 py-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className={cn("text-sm font-bold", c.userId === me.id && "text-primary")}>
                    {c.nickname ?? "탈퇴한 멤버"}
                  </span>
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
                  aria-label="댓글 삭제"
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
          placeholder="댓글 달기"
          enterKeyHint="send"
          className="flex-1"
        />
        <Button type="submit" disabled={pending || !body.trim()} className="shrink-0">
          등록
        </Button>
      </form>
      {error && <p className="text-sm font-semibold text-destructive">{error}</p>}
    </section>
  );
}
