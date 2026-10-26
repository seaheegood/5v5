"use client";

import { addComment, deleteComment } from "@/app/actions/results";
import type { Comment } from "@/lib/types";
import { Thread } from "../thread/thread";

/** 티켓 댓글: 경기 전 자리 조율부터 경기 후 수다까지 */
export function Comments({ date, comments, me }: { date: string; comments: Comment[]; me: { id: string; isAdmin: boolean } }) {
  return (
    <Thread
      title="댓글"
      items={comments}
      me={me}
      onAdd={(body) => addComment({ date, body })}
      onDelete={deleteComment}
    />
  );
}
