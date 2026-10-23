const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_RE = /^\d{4}-\d{2}$/;

/** 한국 시간 기준 오늘 (YYYY-MM-DD) */
export function todayKST(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** 타임존 영향을 받지 않도록 날짜 문자열을 UTC 자정으로 해석 */
function parse(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

export function isValidDate(date: unknown): date is string {
  // 2026-02-30 처럼 넘어가는 날짜를 막기 위해 왕복 비교
  if (typeof date !== "string" || !DATE_RE.test(date)) return false;
  const d = parse(date);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(date);
}

export function weekday(date: string): number {
  return parse(date).getUTCDay();
}

/** "2026-10-24" → "10월 24일 (토)" */
export function formatKoreanDate(date: string): string {
  const d = parse(date);
  return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 (${WEEKDAYS[d.getUTCDay()]})`;
}

export function toDateString(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** "2026-10" 형식 검증 후 { year, month } 반환, 잘못되면 이번 달 */
export function parseMonth(value: string | undefined): { year: number; month: number } {
  const source = value && MONTH_RE.test(value) ? value : todayKST().slice(0, 7);
  const [year, month] = source.split("-").map(Number);
  if (month < 1 || month > 12) return parseMonth(undefined);
  return { year, month };
}

export function shiftMonth(year: number, month: number, diff: number): string {
  const d = new Date(Date.UTC(year, month - 1 + diff, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** 달력 그리드: 앞쪽 빈칸(null) + 해당 월 날짜들. 일요일 시작. */
export function monthGrid(year: number, month: number): (string | null)[] {
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: (string | null)[] = Array(firstWeekday).fill(null);
  for (let day = 1; day <= days; day++) cells.push(toDateString(year, month, day));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function monthRange(year: number, month: number): { from: string; to: string } {
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { from: toDateString(year, month, 1), to: toDateString(year, month, days) };
}

export function addDays(date: string, diff: number): string {
  const d = parse(date);
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}
