import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login/login-form";
import { getCurrentUser } from "@/lib/auth";
import { getUsers } from "@/lib/data";
import { safeNext } from "@/lib/redirect";

export const dynamic = "force-dynamic";

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
