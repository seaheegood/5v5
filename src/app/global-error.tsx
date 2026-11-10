"use client";

import { useEffect } from "react";

/** 루트 레이아웃 자체가 실패했을 때의 최소 화면 (globals.css 가 없을 수 있어 인라인 스타일) */
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="ko">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          background: "#151c2b",
          color: "#eef2f8",
          fontFamily: "-apple-system, BlinkMacSystemFont, system-ui, sans-serif",
          textAlign: "center",
          padding: 24,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 20 }}>잠깐 문제가 생겼어요</h2>
        <p style={{ margin: 0, color: "#93a0b8", fontSize: 14 }}>잠시 후 다시 시도해 주세요.</p>
        <button
          onClick={() => retry()}
          style={{
            marginTop: 16,
            height: 48,
            padding: "0 24px",
            border: 0,
            borderRadius: 10,
            background: "#e6b44c",
            color: "#151c2b",
            fontSize: 16,
            fontWeight: 700,
          }}
        >
          다시 시도
        </button>
      </body>
    </html>
  );
}
