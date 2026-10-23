/**
 * 로그인 후 돌아갈 경로 검증 (오픈 리다이렉트 방지).
 * 같은 사이트의 절대 경로만 허용하고, 그 외에는 "/".
 */
export function safeNext(next: unknown): string {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  if (next === "/login" || next.startsWith("/login?")) return "/";
  return next;
}
