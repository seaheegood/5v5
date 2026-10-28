import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 공유 미리보기: 카카오톡 등 JS 를 실행하지 않는 미리보기 봇이 기본 목록에 없어서
  // 모든 요청에서 메타데이터(og:image 등)를 <head> 에 넣는다 (generateMetadata 는 로그인/티켓 화면뿐)
  htmlLimitedBots: /.*/,
  experimental: {
    // 스크린샷 업로드용 (클라이언트에서 압축 후 전송, 서버에서 4MB 제한)
    serverActions: { bodySizeLimit: "5mb" },
  },
};

export default nextConfig;
