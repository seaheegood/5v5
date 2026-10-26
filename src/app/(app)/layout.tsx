import Link from "next/link";
import { LogOut } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { PlayerRow } from "@/components/icons/player-row";
import { Suspense } from "react";
import { BottomNav } from "@/components/layout/bottom-nav";
import { NavProgress } from "@/components/layout/nav-progress";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** 로그인한 멤버 전용 영역: 상단 헤더 + 하단 탭바 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await requireUser();

  return (
    <div className="mx-auto min-h-dvh max-w-lg">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/95 px-5 pt-[env(safe-area-inset-top)] backdrop-blur">
        <h1>
          <Link href="/" className="flex h-14 items-center text-2xl font-black text-primary">
            5v5
          </Link>
        </h1>
        <div className="flex items-center gap-1">
          <PlayerRow
            lane={me.preferred_lanes[0]}
            nickname={me.nickname}
            tier={me.tier}
            division={me.tier_division}
          />
          <form action={logout}>
            <button type="submit" aria-label="로그아웃" className="flex size-11 items-center justify-center text-muted-foreground">
              <LogOut className="size-5" />
            </button>
          </form>
        </div>
      </header>
      <main className="px-4 pt-4 pb-[calc(5rem+env(safe-area-inset-bottom))]">{children}</main>
      <BottomNav isAdmin={me.is_admin} />
      <Suspense>
        <NavProgress />
      </Suspense>
    </div>
  );
}
