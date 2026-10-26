"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Home, Shield, User } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const items = [
    { href: "/", label: "매치", icon: Home },
    { href: "/calendar", label: "달력", icon: CalendarDays },
    { href: "/profile", label: "내 정보", icon: User },
    ...(isAdmin ? [{ href: "/admin", label: "관리", icon: Shield }] : []),
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-lg border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="mx-auto flex max-w-lg">
        {items.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" || pathname.startsWith("/history") : pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-xs font-semibold",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="size-6" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
