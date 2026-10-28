import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login/login-form";
import { getCurrentUser } from "@/lib/auth";
import { getUsers } from "@/lib/data";
import type { Metadata } from "next";
import { safeNext } from "@/lib/redirect";
import { parseTicketPath, ticketShareMetadata } from "@/lib/ticket-share";

export const dynamic = "force-dynamic";

/**
 * 공유된 티켓 링크를 미리보기 봇이 열면 로그인 화면(/login?next=/ticket/…)으로 오므로,
 * 여기서 그 티켓의 제목/설명/썸네일을 내려준다.
 */
export async function generateMetadata({ searchParams }: { searchParams: Promise<{ next?: string }> }): Promise<Metadata> {
  const ticket = parseTicketPath(safeNext((await searchParams).next));
  return ticket ? ticketShareMetadata(ticket.date, ticket.v) : {};
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  if (await getCurrentUser()) redirect(next);
  const users = await getUsers();

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-8 px-5 pt-[max(3rem,env(safe-area-inset-top))] pb-10">
      <header className="text-center">
        <h1 className="text-5xl font-black tracking-tight text-primary">5v5</h1>
        <p className="mt-2 text-muted-foreground">주말 내전</p>
      </header>
      <LoginForm users={users} next={next} />
    </main>
  );
}
