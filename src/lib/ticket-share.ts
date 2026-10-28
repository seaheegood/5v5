import "server-only";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { MATCH_FULL, formatStake, formatTimeRange } from "./constants";
import { getTicket } from "./data";
import { formatKoreanDate, isValidDate } from "./date";
import { seatedCount } from "./participants";
import { STATUS_LABEL, ticketStatus } from "./ticket-status";

/** 요청 기준 사이트 주소 (https://5v5-xxx.vercel.app) */
export async function siteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** "/ticket/2026-10-31?v=7" → { date, v } */
export function parseTicketPath(path: string | undefined): { date: string; v: string } | null {
  const m = path?.match(/^\/ticket\/(\d{4}-\d{2}-\d{2})(?:\?(.*))?$/);
  if (!m || !isValidDate(m[1])) return null;
  return { date: m[1], v: new URLSearchParams(m[2] ?? "").get("v") ?? "" };
}

/**
 * 공유 미리보기 메타데이터 (카톡/메시지 썸네일).
 * 미리보기 봇은 로그인을 못 하므로 /ticket → /login?next=/ticket/… 로 넘어간 로그인 화면에서도 같은 값을 쓴다.
 * 이미지 주소의 v 는 카톡 캐시를 피하기 위한 버전 (공유 버튼이 자리/시간 상태로 붙인다).
 */
export async function ticketShareMetadata(date: string, v: string): Promise<Metadata> {
  const [origin, card] = await Promise.all([siteOrigin(), getTicket(date, "")]);
  const title = `${formatKoreanDate(date)} 5v5 내전`;

  let description = "아직 참여한 사람이 없어요";
  if (card) {
    const seated = seatedCount(card.participants);
    const status = ticketStatus(card);
    const parts = [`${STATUS_LABEL[status]} ${seated}/${MATCH_FULL}`];
    if (card.time.confirmedStart !== null) parts.push(formatTimeRange(card.time.confirmedStart, card.settings?.matchFormat));
    if (card.settings?.pcBang) parts.push(card.settings.pcBang);
    if (card.settings?.stake) parts.push(`판돈 ${formatStake(card.settings.stake)}`);
    description = parts.join(" · ");
  }

  const image = `${origin}/og/ticket/${date}${v ? `?v=${encodeURIComponent(v)}` : ""}`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${origin}/ticket/${date}`,
      siteName: "5v5",
      type: "website",
      locale: "ko_KR",
      images: [{ url: image, width: 1200, height: 630, alt: `${title} 티켓` }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}
