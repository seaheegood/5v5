import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // 스크린샷 업로드용 (클라이언트에서 압축 후 전송, 서버에서 4MB 제한)
    serverActions: { bodySizeLimit: "5mb" },
  },
};

export default nextConfig;
