import type { Metadata, Viewport } from "next";
import { PressFeedback } from "@/components/layout/press-feedback";
import "./globals.css";

export const metadata: Metadata = {
  title: "5v5 · 주말 내전",
  description: "주말 롤 5대5 내전 일정 잡기",
  openGraph: { siteName: "5v5", type: "website", locale: "ko_KR" },
  appleWebApp: { capable: true, title: "5v5", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // 더블탭 확대 방지 (버튼 연타 UX)
  viewportFit: "cover", // 노치/홈 인디케이터 safe-area 대응
  themeColor: "#151c2b",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="min-h-dvh font-sans">
        <PressFeedback />
        {children}
      </body>
    </html>
  );
}
