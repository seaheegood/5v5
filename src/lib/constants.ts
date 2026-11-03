export const LANES = ["top", "jungle", "mid", "adc", "support"] as const;
export type Lane = (typeof LANES)[number];

export const LANE_LABEL: Record<Lane, string> = {
  top: "탑",
  jungle: "정글",
  mid: "미드",
  adc: "원딜",
  support: "서폿",
};

export const TIERS = [
  "unranked",
  "iron",
  "bronze",
  "silver",
  "gold",
  "platinum",
  "emerald",
  "diamond",
  "master",
  "grandmaster",
  "challenger",
] as const;
export type Tier = (typeof TIERS)[number];

export const TIER_LABEL: Record<Tier, string> = {
  unranked: "언랭",
  iron: "아이언",
  bronze: "브론즈",
  silver: "실버",
  gold: "골드",
  platinum: "플래티넘",
  emerald: "에메랄드",
  diamond: "다이아",
  master: "마스터",
  grandmaster: "그마",
  challenger: "챌린저",
};

/** 디비전(I~IV)이 없는 티어 */
const NO_DIVISION_TIERS: readonly Tier[] = ["unranked", "master", "grandmaster", "challenger"];
export const DIVISIONS = [1, 2, 3, 4] as const;
export type Division = (typeof DIVISIONS)[number];
export const ROMAN: Record<Division, string> = { 1: "I", 2: "II", 3: "III", 4: "IV" };

export const hasDivision = (tier: Tier) => !NO_DIVISION_TIERS.includes(tier);
export const isDivision = (v: unknown): v is Division => typeof v === "number" && (DIVISIONS as readonly number[]).includes(v);

/** "골드 II", "마스터" */
export function formatTier(tier: Tier, division: Division | null) {
  return division && hasDivision(tier) ? `${TIER_LABEL[tier]} ${ROMAN[division]}` : TIER_LABEL[tier];
}

/** 5대5 확정 인원 */
export const MATCH_FULL = 10;

export const VOTE_LABEL = { mvp: "MVP", blame: "범인" } as const;
/** 댓글 최대 길이 */
export const MAX_COMMENT_LENGTH = 300;
/** 관리자가 만든 계정/초기화한 PIN. 첫 로그인 때 재설정해야 하고, 새 PIN 으로는 쓸 수 없다 */
export const INITIAL_PIN = "0000";
/** DB 값은 blue/red 로 저장하고, 화면에는 1팀/2팀으로 표시한다 */
export const TEAM_LABEL = { blue: "1팀", red: "2팀" } as const;
/** 매치당 스크린샷 최대 개수 */
export const MAX_SCREENSHOTS = 10;

export const MATCH_FORMAT_PRESETS = ["단판", "3판 2선승제", "5판 3선승제", "칼바람 내전"];
/** 1인당 판돈(원) 빠른 선택. 0 = 없음 */
export const STAKE_PRESETS = [0, 30000, 50000, 70000];
export const MAX_STAKE = 1_000_000;

/** 5000 → "5,000원", 0 → "없음", null → "미정" */
export function formatStake(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "미정";
  return amount === 0 ? "없음" : `${amount.toLocaleString("ko-KR")}원`;
}

/** 수익 표시: +5,000원 / -3,000원 / 0원 */
export function formatProfit(amount: number): string {
  return `${amount > 0 ? "+" : amount < 0 ? "-" : ""}${Math.abs(amount).toLocaleString("ko-KR")}원`;
}

export const isLane = (v: unknown): v is Lane => typeof v === "string" && (LANES as readonly string[]).includes(v);
export const isTier = (v: unknown): v is Tier => typeof v === "string" && (TIERS as readonly string[]).includes(v);

/** 원하는 시작 시간 선택지: 30분 단위 10:00(600) ~ 다음날 02:00(1560). 분 단위로 저장 */
export const START_MIN = 600;
export const START_MAX = 1560;
export const START_SLOTS = Array.from({ length: (START_MAX - START_MIN) / 30 + 1 }, (_, i) => START_MIN + i * 30);
export const MAX_REASON_LENGTH = 100;
export const MAX_PC_BANG_LENGTH = 40;

export const isStartSlot = (v: unknown): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= START_MIN && v <= START_MAX && v % 30 === 0;

/** 1290 → "21:30", 1500 → "01:00" (nextDay 표시는 옵션) */
export function formatStartTime(min: number, { nextDay = false } = {}): string {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  const text = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  return nextDay && min >= 1440 ? `${text}(다음날)` : text;
}

/** 방식별 예상 경기 시간(시간). 5판 3선승제 5h, 3판 2선승제 3h, 단판·칼바람 1h, 그 외 2h */
export function matchDurationHours(format: string | null | undefined): number {
  const f = format ?? "";
  if (f.includes("5판")) return 5;
  if (f.includes("3판")) return 3;
  if (f.includes("단판") || f.includes("칼바람")) return 1;
  return 2;
}

/** "21:00 ~ 24:00" (끝 시간이 24시를 넘으면 다음날 시각) */
export function formatTimeRange(start: number, format: string | null | undefined): string {
  return `${formatStartTime(start)} ~ ${formatStartTime(start + matchDurationHours(format) * 60)}`;
}

export const pcBangMapUrl = (name: string) => `https://map.naver.com/p/search/${encodeURIComponent(name)}`;
