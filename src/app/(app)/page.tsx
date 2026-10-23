import Link from "next/link";
import { History } from "lucide-react";
import { MatchCard } from "@/components/match/match-card";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { MATCH_CARD_MIN } from "@/lib/constants";
import { getMatchCards } from "@/lib/data";
import { formatKoreanDate } from "@/lib/date";

/** 메인: 오늘 이후 매치 카드만. 지난 매치는 /history */
export default async function HomePage() {
  const me = await requireUser();
  const { cards, pending } = await getMatchCards("upcoming", me.id);

  return (
    <div className="flex flex-col gap-5">
      {cards.length === 0 ? (
        <section className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed p-8 text-center">
          <p className="text-lg font-bold">예정된 매치 없음</p>
          <p className="text-sm text-muted-foreground">{MATCH_CARD_MIN}명 이상 모이면 카드 생성</p>
          <Button asChild size="lg" className="w-full">
            <Link href="/calendar">일정 등록</Link>
          </Button>
        </section>
      ) : (
        cards.map((card) => <MatchCard key={card.date} card={card} me={{ id: me.id, isAdmin: me.is_admin }} />)
      )}

      {pending.length > 0 && (
        <section className="rounded-2xl bg-card p-5">
          <h2 className="mb-3 font-bold">모집 중</h2>
          <ul className="flex flex-col gap-2">
            {pending.map(({ date, count }) => (
              <li key={date}>
                <Link
                  href={`/calendar?date=${date}`}
                  className="flex h-12 items-center justify-between rounded-xl bg-background/50 px-4 active:bg-accent"
                >
                  <span className="font-semibold">{formatKoreanDate(date)}</span>
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {count}/{MATCH_CARD_MIN}명
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
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
