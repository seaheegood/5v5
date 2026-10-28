import { LANE_LABEL, TEAM_LABEL, formatStake, matchDurationHours, type Lane } from "./constants";
import type { Team } from "./types";

/**
 * 캘린더 일정 (.ics / 구글 캘린더 링크). 순수 함수.
 * 시작 시간은 경기 날짜 0시(KST) 기준 분 단위 (1500 = 다음날 01:00).
 */
export type CalendarEvent = {
  date: string; // YYYY-MM-DD (KST)
  startMin: number;
  matchFormat: string | null;
  stake: number | null;
  pcBang: string | null;
  team: Team;
  lane: Lane;
  url: string; // 티켓 링크
};

/** KST 날짜 + 분 → UTC Date */
function toUtc(date: string, minutes: number): Date {
  return new Date(Date.parse(`${date}T00:00:00+09:00`) + minutes * 60000);
}

/** 20261031T120000Z */
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

function parts(e: CalendarEvent) {
  const start = toUtc(e.date, e.startMin);
  const end = toUtc(e.date, e.startMin + matchDurationHours(e.matchFormat) * 60);
  const title = `5v5 내전 (${TEAM_LABEL[e.team]} ${LANE_LABEL[e.lane]})`;
  const details = [`방식: ${e.matchFormat ?? "미정"}`, `판돈: ${formatStake(e.stake)}`, `티켓: ${e.url}`].join("\n");
  return { start, end, title, details, location: e.pcBang ?? "" };
}

/** ICS 텍스트 이스케이프 (RFC 5545) */
const esc = (v: string) => v.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");

export function buildIcs(e: CalendarEvent): string {
  const { start, end, title, details, location } = parts(e);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//5v5//match//KO",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:5v5-${e.date}@5v5`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(title)}`,
    `DESCRIPTION:${esc(details)}`,
    ...(location ? [`LOCATION:${esc(location)}`] : []),
    `URL:${e.url}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT1H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(title)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

export function googleCalendarUrl(e: CalendarEvent): string {
  const { start, end, title, details, location } = parts(e);
  const q = new URLSearchParams({ action: "TEMPLATE", text: title, dates: `${stamp(start)}/${stamp(end)}`, details });
  if (location) q.set("location", location);
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}
