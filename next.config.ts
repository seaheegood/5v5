import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 서버 액션에서 Supabase service role 키를 사용하므로 별도 설정 불필요.
  // 라인/티어 아이콘은 /public 정적 파일을 <img>로 사용 (외부 CDN 미사용).
};

export default nextConfig;
