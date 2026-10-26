import type { Team } from "@/lib/types";

/** 1팀(blue) = 하늘색, 2팀(red) = 장미색 */
export const TEAM_STYLE: Record<Team, { on: string; text: string }> = {
  blue: { on: "border-sky-400 bg-sky-400/15 text-sky-400", text: "text-sky-400" },
  red: { on: "border-rose-400 bg-rose-400/15 text-rose-400", text: "text-rose-400" },
};
