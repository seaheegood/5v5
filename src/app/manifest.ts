import type { MetadataRoute } from "next";

/** 크롬 "홈 화면에 추가" / 앱 설치용. 아이콘은 src/app/app-icon/[variant]/route.tsx 에서 그린다. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "5v5 · 주말 내전",
    short_name: "5v5",
    description: "주말 롤 5대5 내전 일정 잡기",
    lang: "ko",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#151c2b",
    theme_color: "#151c2b",
    icons: [
      { src: "/app-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/app-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/app-icon/maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
