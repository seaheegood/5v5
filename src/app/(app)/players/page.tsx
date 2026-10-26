import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { PlayerRow } from "@/components/icons/player-row";
import { requireUser } from "@/lib/auth";
import { formatProfit } from "@/lib/constants";
import { getAllRecords, getUsers } from "@/lib/data";
import { cn } from "@/lib/utils";

/** 응원하기: 전체 멤버 목록 (로그인 화면처럼). 누르면 개인 페이지 */
export default async function PlayersPage() {
  const me = await requireUser();
  const [users, records] = await Promise.all([getUsers(), getAllRecords()]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold">응원하기</h2>
        <p className="mt-1 text-sm text-muted-foreground">멤버를 눌러 전적을 보고 응원을 남겨요</p>
      </div>
      <ul className="flex flex-col gap-2">
        {users.map((user) => {
          const record = records.get(user.id);
          return (
            <li key={user.id}>
              <Link
                href={`/players/${user.id}`}
                className="flex items-center gap-2 rounded-xl border-2 border-border bg-card px-4 py-2 transition-all active:scale-[0.98] active:border-primary"
              >
                <PlayerRow
                  lane={user.preferred_lanes[0]}
                  nickname={user.nickname}
                  tier={user.tier}
                  division={user.tier_division}
                  highlight={user.id === me.id}
                  className="min-w-0 flex-1"
                />
                {record && (
                  <span className="shrink-0 text-right text-xs leading-tight tabular-nums">
                    <span className="block text-muted-foreground">
                      {record.wins}승 {record.losses}패
                    </span>
                    <span
                      className={cn(
                        "block font-bold",
                        record.profit > 0 ? "text-success" : record.profit < 0 ? "text-destructive" : "text-muted-foreground",
                      )}
                    >
                      {formatProfit(record.profit)}
                    </span>
                  </span>
                )}
                <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
