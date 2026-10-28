import { getCurrentUser } from "@/lib/auth";
import { getTicket } from "@/lib/data";
import { isValidDate } from "@/lib/date";
import { buildIcs } from "@/lib/ics";

/** 확정된 매치를 내 캘린더에 추가 (.ics). 로그인 + 그 경기 자리에 있는 사람만 */
export async function GET(request: Request, { params }: { params: Promise<{ date: string }> }) {
  const me = await getCurrentUser();
  if (!me) return new Response("Unauthorized", { status: 401 });

  const { date } = await params;
  if (!isValidDate(date)) return new Response("Not found", { status: 404 });
  const card = await getTicket(date, me.id);
  const seat = card?.participants.find((p) => p.userId === me.id && p.team && p.lane);
  if (!card || !seat || card.time.confirmedStart === null) return new Response("Not found", { status: 404 });

  const ics = buildIcs({
    date,
    startMin: card.time.confirmedStart,
    matchFormat: card.settings?.matchFormat ?? null,
    stake: card.settings?.stake ?? null,
    pcBang: card.settings?.pcBang ?? null,
    team: seat.team!,
    lane: seat.lane!,
    url: new URL(`/ticket/${date}`, request.url).toString(),
  });

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="5v5-${date}.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}
