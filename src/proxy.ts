import { NextResponse, type NextRequest } from "next/server";

/**
 * 현재 요청 경로를 x-pathname 헤더로 넘겨서,
 * 로그인이 필요한 페이지(requireUser)가 /login?next=<원래 경로> 로 보낼 수 있게 한다.
 * (예: 단톡방에 공유된 /calendar?date=2026-10-24 링크 → 로그인 → 다시 그 날짜로)
 */
export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set("x-pathname", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!_next/|icons/|favicon.ico).*)"],
};
