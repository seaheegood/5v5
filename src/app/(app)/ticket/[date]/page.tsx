import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { ShareButton } from "@/components/match/share-button";
import { TicketDetail } from "@/components/match/ticket-detail";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { getTicket, getUsers } from "@/lib/data";
import type { Metadata } from "next";
import { formatKoreanDate, isValidDate, todayKST } from "@/lib/date";
import { MATCH_FULL, formatTimeRange } from "@/lib/constants";
import { seatedCount } from "@/lib/participants";
import { STATUS_LABEL, ticketStatus } from "@/lib/ticket-status";
import { ticketShareMetadata } from "@/lib/ticket-share";
import type { MatchCardData } from "@/lib/types";

/** 공유 문구: "5v5 내전 7/10 · 21:00 ~ 24:00 · 강남 PC방 · 빈 자리 들어오세요!" */
function shareText(card: MatchCardData): string {
  const seated = seatedCount(card.participants);
  const parts = [`${STATUS_LABEL[ticketStatus(card)]} ${seated}/${MATCH_FULL}`];
  if (card.time.confirmedStart !== null) parts.push(formatTimeRange(card.time.confirmedStart, card.settings?.matchFormat));
  if (card.settings?.pcBang) parts.push(card.settings.pcBang);
  if (!card.results && seated < MATCH_FULL) parts.push(`${MATCH_FULL - seated}자리 남았어요!`);
  return parts.join(" · ");
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ date: string }>;
  searchParams: Promise<{ v?: string }>;
}): Promise<Metadata> {
  const { date } = await params;
  return isValidDate(date) ? ticketShareMetadata(date, (await searchParams).v ?? "") : {};
}

/** 티켓 상세. 단톡방에 /ticket/2026-10-31 처럼 링크로 공유할 수 있다 */
export default async function TicketPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  if (!isValidDate(date)) notFound();

  const me = await requireUser();
  const [card, users] = await Promise.all([getTicket(date, me.id), me.is_admin ? getUsers() : []]);
  const back = date < todayKST() ? "/history" : "/";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <Link href={back} className="-ml-2 flex h-11 items-center gap-0.5 pr-3 text-lg font-bold">
          <ChevronLeft className="size-6" />
          {back === "/" ? "매치" : "이전 매치"}
        </Link>
        {card && (
          <ShareButton
            path={`/ticket/${date}`}
            title={`${formatKoreanDate(date)} 5v5 내전`}
            text={shareText(card)}
            version={`${seatedCount(card.participants)}.${card.time.confirmedStart ?? 0}.${card.results ? 1 : 0}`}
          />
        )}
      </div>

      {card ? (
        <TicketDetail
          card={card}
          me={{ id: me.id, isAdmin: me.is_admin }}
          members={users.map(({ id, nickname }) => ({ id, nickname }))}
        />
      ) : (
        <section className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed p-8 text-center">
          <p className="text-lg font-bold">{formatKoreanDate(date)} 티켓 없음</p>
          <p className="text-sm text-muted-foreground">아직 아무도 참여하지 않았거나 삭제된 티켓이에요</p>
          <Button asChild size="lg" className="w-full">
            <Link href={`/calendar?date=${date}`}>달력에서 참여하기</Link>
          </Button>
        </section>
      )}
    </div>
  );
}
