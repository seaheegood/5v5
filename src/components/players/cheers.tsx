"use client";

import { addCheer, deleteCheer } from "@/app/actions/cheers";
import type { Comment } from "@/lib/types";
import { Thread } from "../thread/thread";

/** 개인 페이지 '응원하기' (동작은 티켓 댓글과 같음) */
export function Cheers({ targetId, cheers, me }: { targetId: string; cheers: Comment[]; me: { id: string; isAdmin: boolean } }) {
  return (
    <Thread
      title="응원"
      items={cheers}
      me={me}
      onAdd={(body, anonymous) => addCheer({ targetId, body, anonymous })}
      onDelete={deleteCheer}
      allowAnonymous
    />
  );
}
