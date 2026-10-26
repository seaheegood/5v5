import { redirect } from "next/navigation";
import { PlayerRow } from "@/components/icons/player-row";
import { NewPinForm } from "@/components/login/new-pin-form";
import { getCurrentUser } from "@/lib/auth";
import { safeNext } from "@/lib/redirect";

export const dynamic = "force-dynamic";

/** 관리자가 만든 계정/초기화한 PIN(0000)으로 들어온 경우 새 PIN 설정 */
export default async function ChangePinPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (!me.must_change_pin) redirect(next);

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-8 px-5 pt-[max(3rem,env(safe-area-inset-top))] pb-10">
      <header className="flex flex-col items-center gap-3">
        <h1 className="text-5xl font-black tracking-tight text-primary">5v5</h1>
        <PlayerRow lane={me.preferred_lanes[0]} nickname={me.nickname} tier={me.tier} division={me.tier_division} />
      </header>
      <NewPinForm next={next} />
    </main>
  );
}
