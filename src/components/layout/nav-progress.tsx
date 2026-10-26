"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * 내부 링크를 누르는 순간 헤더 아래에 진행 바를 띄우고, 화면이 바뀌면 숨긴다.
 * 서버 응답(0.3~0.7초)을 기다리는 동안에도 눌렸다는 게 바로 보이게 한다.
 */
export function NavProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [active, setActive] = useState(false);

  // 이동이 끝나면(주소가 바뀌면) 숨김
  useEffect(() => setActive(false), [pathname, searchParams]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element).closest("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      // 같은 화면 안의 #앵커 이동은 제외
      if (url.pathname === location.pathname && url.search === location.search) return;
      setActive(true);
    };
    document.addEventListener("click", onClick, true);
    // 응답이 안 오는 경우를 대비해 10초 뒤에는 숨김
    const timer = active ? setTimeout(() => setActive(false), 10000) : undefined;
    return () => {
      document.removeEventListener("click", onClick, true);
      clearTimeout(timer);
    };
  }, [active]);

  if (!active) return null;
  return (
    <div role="progressbar" aria-label="이동 중" className="fixed inset-x-0 top-0 z-50 mx-auto h-1 max-w-lg overflow-hidden">
      <div className="h-full w-1/3 animate-[nav-progress_0.9s_ease-in-out_infinite] rounded-full bg-primary" />
    </div>
  );
}
