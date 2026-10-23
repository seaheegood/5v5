import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createMockDb } from "./mock-db";

/** npm run dev:mock → Supabase 없이 인메모리 목업 DB 사용 (개발 서버에서만) */
export const MOCK_DB = process.env.MOCK_DB === "1" && process.env.NODE_ENV !== "production";

let client: SupabaseClient | null = null;

/**
 * service_role 키를 쓰는 서버 전용 클라이언트.
 * RLS 정책이 없으므로 이 클라이언트만 DB에 접근할 수 있다.
 * 권한(본인/관리자) 검사는 반드시 호출하는 쪽(Server Action)에서 한다.
 */
export function db(): SupabaseClient {
  if (client) return client;
  if (MOCK_DB) return (client = createMockDb());

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다.");
  }

  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
