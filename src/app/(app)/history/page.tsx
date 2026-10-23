import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MatchCard } from "@/components/match/match-card";
import { requireUser } from "@/lib/auth";
import { getMatchCards } from "@/lib/data";

/** 지난 매치 (최근 순, 보기 전용) */
export default async function HistoryPage() {
  const me = await requireUser();
  const { cards } = await getMatchCards("past");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-1">
        <Link href="/" aria-label="뒤로" className="-ml-2 flex size-11 items-center justify-center">
          <ArrowLeft className="size-6" />
        </Link>
        <h2 className="text-xl font-bold">이전 매치</h2>
      </div>
      {cards.length === 0 ? (
        <p className="py-10 text-center text-muted-foreground">이전 매치 없음</p>
      ) : (
        cards.map((card) => <MatchCard key={card.date} card={card} me={{ id: me.id, isAdmin: me.is_admin }} past />)
      )}
    </div>
  );
}
