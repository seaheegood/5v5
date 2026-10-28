import { ImageResponse } from "next/og";
import { LANES, LANE_LABEL, MATCH_FULL, ROMAN, TEAM_LABEL, formatStake, formatTier, formatTimeRange, hasDivision } from "@/lib/constants";
import { getTicket } from "@/lib/data";
import { LANE_ICON_DATA, TIER_ICON_DATA } from "@/lib/icon-data";
import { formatKoreanDate, isValidDate } from "@/lib/date";
import { seatedCount } from "@/lib/participants";
import { STATUS_LABEL, ticketStatus, type TicketStatus } from "@/lib/ticket-status";
import type { Team } from "@/lib/types";

/**
 * 공유 썸네일 (1200x630 PNG). 카톡/메시지 미리보기 봇이 로그인 없이 가져가므로 공개 경로.
 * 티켓 화면처럼: 날짜·상태·게이지·시간·PC방·판돈 + 1팀/2팀 10칸 자리표.
 */

// 한글 폰트는 이미지 번들 한도(500KB) 때문에 런타임에 받아서 인스턴스마다 한 번만 캐시
const FONT_URL = "https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/public/static/Pretendard-Bold.otf";
let font: Promise<ArrayBuffer> | null = null;
const loadFont = () =>
  (font ??= fetch(FONT_URL).then((r) => {
    if (!r.ok) throw new Error(`font ${r.status}`);
    return r.arrayBuffer();
  }));

const C = {
  bg: "#0c1322",
  card: "#151e33",
  cell: "#0f172a",
  line: "#2b3754",
  text: "#eef2f8",
  muted: "#93a0b8",
  gold: "#e6b44c",
  green: "#3fbf7a",
  blue: "#38bdf8",
  red: "#fb7185",
};
const TEAM_COLOR: Record<Team, string> = { blue: C.blue, red: C.red };
const BADGE: Record<TicketStatus, { bg: string; fg: string }> = {
  recruiting: { bg: "#263149", fg: C.muted },
  scheduling: { bg: "#3a3220", fg: C.gold },
  confirmed: { bg: "#183a2a", fg: C.green },
  finished: { bg: "#263149", fg: C.muted },
};

export async function GET(_request: Request, { params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  if (!isValidDate(date)) return new Response("Not found", { status: 404 });

  const [card, fontData] = await Promise.all([getTicket(date, ""), loadFont().catch(() => null)]);

  const seated = card ? seatedCount(card.participants) : 0;
  const status: TicketStatus = card ? ticketStatus(card) : "recruiting";
  const full = seated >= MATCH_FULL;
  const gaugeColor = full ? C.green : C.gold;
  const results = card?.results ?? null;
  const time = card?.time.confirmedStart ?? null;

  const infoLines: [string, string][] = [];
  if (results) infoLines.push(["결과", `${TEAM_LABEL[results.winner]} 승리`]);
  if (time !== null) infoLines.push(["시간", formatTimeRange(time, card?.settings?.matchFormat)]);
  else if (!results)
    infoLines.push(["시간", full ? `조율 중 (${card?.time.prefs.length ?? 0}/${MATCH_FULL})` : "10명 모이면 조율"]);
  if (card?.settings?.pcBang) infoLines.push(["장소", card.settings.pcBang]);
  if (card?.settings?.matchFormat) infoLines.push(["방식", card.settings.matchFormat]);
  if (card?.settings?.stake) infoLines.push(["판돈", formatStake(card.settings.stake)]);

  const occupant = (team: Team, lane: (typeof LANES)[number]) =>
    card?.participants.find((p) => p.team === team && p.lane === lane) ?? null;

  const image = (
    <div style={{ display: "flex", width: "100%", height: "100%", background: C.bg, padding: 36, gap: 28, fontFamily: "Pretendard", color: C.text }}>
      {/* 왼쪽: 날짜/상태/게이지/정보 */}
      <div style={{ display: "flex", flexDirection: "column", width: 440, gap: 18 }}>
        <div style={{ display: "flex", fontSize: 40, fontWeight: 800, color: C.gold }}>5v5</div>
        <div style={{ display: "flex", fontSize: 50, fontWeight: 800, lineHeight: 1.1 }}>{formatKoreanDate(date)}</div>
        <div style={{ display: "flex" }}>
          <div
            style={{
              display: "flex",
              padding: "6px 18px",
              borderRadius: 999,
              fontSize: 26,
              background: BADGE[status].bg,
              color: BADGE[status].fg,
            }}
          >
            {STATUS_LABEL[status]}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", gap: 6, flex: 1 }}>
            {Array.from({ length: MATCH_FULL }, (_, i) => (
              <div key={i} style={{ display: "flex", flex: 1, height: 18, borderRadius: 4, background: i < seated ? gaugeColor : "#263149" }} />
            ))}
          </div>
          <div style={{ display: "flex", fontSize: 34, fontWeight: 800, color: full ? C.green : C.text }}>
            {seated}/{MATCH_FULL}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 6 }}>
          {infoLines.map(([label, value]) => (
            <div key={label} style={{ display: "flex", gap: 14, fontSize: 28 }}>
              <div style={{ display: "flex", color: C.muted, width: 70 }}>{label}</div>
              <div style={{ display: "flex", flex: 1, color: label === "결과" && results ? TEAM_COLOR[results.winner] : C.text }}>
                {value.length > 18 ? `${value.slice(0, 17)}…` : value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 오른쪽: 자리표 */}
      <div style={{ display: "flex", flexDirection: "column", flex: 1, background: C.card, borderRadius: 24, padding: "22px 24px", gap: 12 }}>
        <div style={{ display: "flex", fontSize: 26 }}>
          <div style={{ display: "flex", width: 64 }} />
          {(["blue", "red"] as const).map((team) => (
            <div key={team} style={{ display: "flex", flex: 1, justifyContent: "center", color: TEAM_COLOR[team] }}>
              {TEAM_LABEL[team]}
              {results ? (team === results.winner ? " 승" : " 패") : ""}
            </div>
          ))}
        </div>
        {LANES.map((lane) => (
          <div key={lane} style={{ display: "flex", alignItems: "center", gap: 10, height: 76 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 54, fontSize: 16, color: C.muted }}>
              <img src={LANE_ICON_DATA[lane]} width={30} height={30} alt="" />
              {LANE_LABEL[lane]}
            </div>
            {(["blue", "red"] as const).map((team) => {
              const p = occupant(team, lane);
              return (
                <div
                  key={team}
                  style={{
                    display: "flex",
                    flex: 1,
                    height: 68,
                    alignItems: "center",
                    gap: 10,
                    padding: "0 16px",
                    borderRadius: 16,
                    border: `3px ${p ? "solid" : "dashed"} ${C.line}`,
                    background: p ? C.cell : "transparent",
                    justifyContent: p ? "flex-start" : "center",
                    fontSize: 27,
                    color: p ? C.text : C.muted,
                  }}
                >
                  {p ? (
                    <>
                      <div style={{ display: "flex", maxWidth: 210, overflow: "hidden" }}>
                        {p.nickname.length > 7 ? `${p.nickname.slice(0, 6)}…` : p.nickname}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <img src={TIER_ICON_DATA[p.tier]} width={30} height={30} alt={formatTier(p.tier, p.division)} />
                        {p.division && hasDivision(p.tier) ? (
                          <div style={{ display: "flex", fontSize: 20, color: C.muted }}>{ROMAN[p.division]}</div>
                        ) : null}
                      </div>
                    </>
                  ) : (
                    "빈 자리"
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );

  return new ImageResponse(image, {
    width: 1200,
    height: 630,
    fonts: fontData ? [{ name: "Pretendard", data: fontData, weight: 700, style: "normal" }] : undefined,
    headers: {
      // 자리 상태가 바뀌면 공유 링크의 v 가 바뀌므로 짧게 캐시
      "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=86400",
    },
  });
}
