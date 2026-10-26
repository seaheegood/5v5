import Link from "next/link";
import { History } from "lucide-react";
import { MatchCard } from "@/components/match/match-card";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { getMatchCards, getUsers } from "@/lib/data";

/** 메인: 오늘 이후 티켓. 지난 매치는 /history */
export default async function HomePage() {
  const me = await requireUser();
  const [cards, users] = await Promise.all([getMatchCards("upcoming", me.id), me.is_admin ? getUsers() : []]);
  const members = users.map(({ id, nickname }) => ({ id, nickname }));

  return (
    <div className="flex flex-col gap-5">
      {cards.length === 0 ? (
        <section className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed p-8 text-center">
          <p className="text-lg font-bold">예정된 티켓 없음</p>
          <p className="text-sm text-muted-foreground">달력에서 되는 날에 참여하면 티켓이 생겨요</p>
          <Button asChild size="lg" className="w-full">
            <Link href="/calendar">일정 등록</Link>
          </Button>
        </section>
      ) : (
        cards.map((card) => (
          <MatchCard key={card.date} card={card} me={{ id: me.id, isAdmin: me.is_admin }} members={members} />
        ))
      )}

      <Button asChild variant="ghost" className="text-muted-foreground">
        <Link href="/history">
          <History className="size-5" />
          이전 매치 보기
        </Link>
      </Button>
    </div>
  );
}
