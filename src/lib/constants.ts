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

/** 이 인원 이상 모이면 메인 화면에 매치 카드가 생긴다 */
export const MATCH_CARD_MIN = 5;
/** 5대5 확정 인원 */
export const MATCH_FULL = 10;
/** 라인별 필요 인원 (양 팀 1명씩) */
export const PER_LANE = 2;

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
export const STAKE_PRESETS = ["진 팀이 치킨 쏘기", "진 팀이 피자 쏘기", "커피 내기", "명예만 걸기"];

export const isLane = (v: unknown): v is Lane => typeof v === "string" && (LANES as readonly string[]).includes(v);
export const isTier = (v: unknown): v is Tier => typeof v === "string" && (TIERS as readonly string[]).includes(v);

export function countByLane(lanes: (Lane | null)[]): Record<Lane, number> {
  const counts = Object.fromEntries(LANES.map((l) => [l, 0])) as Record<Lane, number>;
  for (const lane of lanes) if (lane) counts[lane]++;
  return counts;
}
