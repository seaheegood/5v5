import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { LaneIcon } from "@/components/icons/lane-icon";
import { TierIcon } from "@/components/icons/tier-icon";
import { Cheers } from "@/components/players/cheers";
import { MatchHistory } from "@/components/players/match-history";
import { requireUser } from "@/lib/auth";
import { LANE_LABEL, formatProfit, formatTier } from "@/lib/constants";
import { getPlayerProfile } from "@/lib/data";
import { repo } from "@/lib/repo";
import { cn } from "@/lib/utils";

const profitColor = (n: number) => (n > 0 ? "text-success" : n < 0 ? "text-destructive" : "text-muted-foreground");

/** 개인 페이지: 통산 전적, 수익(판돈), MVP/범인 횟수, 최근 경기, 응원하기 */
export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await requireUser();
  const [user, record, cheers] = await Promise.all([repo.findUser(id), getPlayerProfile(id), repo.listCheers(id)]);
  if (!user) notFound();

  const games = record.wins + record.losses;
  const winRate = games > 0 ? Math.round((record.wins / games) * 100) : null;

  return (
    <div className="flex flex-col gap-3">
      <Link href="/players" className="-ml-2 flex h-11 items-center gap-0.5 self-start pr-3 text-lg font-bold">
        <ChevronLeft className="size-6" />
        응원하기
      </Link>

      {/* 프로필 */}
      <section className="flex items-center gap-4 rounded-2xl bg-card p-5">
        <TierIcon tier={user.tier} className="size-14" />
        <div className="min-w-0">
          <h2 className={cn("truncate text-2xl font-extrabold", user.id === me.id && "text-primary")}>{user.nickname}</h2>
          <p className="text-sm text-muted-foreground">{formatTier(user.tier, user.tier_division)}</p>
          {user.preferred_lanes.length > 0 && (
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              {user.preferred_lanes.map((lane) => (
                <span key={lane} className="flex items-center gap-1">
                  <LaneIcon lane={lane} className="size-4" />
                  {LANE_LABEL[lane]}
                </span>
              ))}
            </p>
          )}
        </div>
      </section>

      {/* 통산 전적 / 수익 */}
      <section className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-card p-4">
          <p className="text-sm text-muted-foreground">통산 전적</p>
          <p className="mt-1 text-2xl font-extrabold tabular-nums">
            {record.wins}승 {record.losses}패
          </p>
          <p className="text-sm text-muted-foreground tabular-nums">
            {winRate === null ? "아직 경기 없음" : `승률 ${winRate}% · ${games}경기`}
          </p>
        </div>
        <div className="rounded-2xl bg-card p-4">
          <p className="text-sm text-muted-foreground">판돈 수익</p>
          <p className={cn("mt-1 text-2xl font-extrabold tabular-nums", profitColor(record.profit))}>
            {formatProfit(record.profit)}
          </p>
          <p className="text-sm text-muted-foreground">이기면 +판돈, 지면 -판돈</p>
        </div>
      </section>

      {/* MVP / 범인 횟수 */}
      <section className="grid grid-cols-2 gap-2">
        <div className="flex items-center justify-between rounded-2xl bg-primary/10 px-4 py-3">
          <span className="font-bold text-primary">MVP</span>
          <span className="text-xl font-extrabold tabular-nums">{record.mvp}회</span>
        </div>
        <div className="flex items-center justify-between rounded-2xl bg-destructive/10 px-4 py-3">
          <span className="font-bold text-destructive">범인</span>
          <span className="text-xl font-extrabold tabular-nums">{record.blame}회</span>
        </div>
      </section>

      {/* 경기 기록 (최근 3경기, 더 있으면 펼쳐보기) */}
      <MatchHistory matches={record.matches} />

      {/* 응원하기 */}
      <Cheers
        targetId={user.id}
        cheers={cheers.map((c) => {
          // 익명 응원: 관리자에게만 실명을 보낸다 (작성자 본인은 '익명 (나)'로 표시, 실명은 안 보냄)
          const mine = c.author_id === me.id;
          const reveal = !c.is_anonymous || me.is_admin;
          return {
            id: c.id,
            userId: reveal ? c.author_id : null,
            nickname: reveal ? c.nickname : null,
            body: c.body,
            createdAt: c.created_at,
            anonymous: c.is_anonymous,
            mine,
          };
        })}
        me={{ id: me.id, isAdmin: me.is_admin }}
      />
    </div>
  );
}
