import "server-only";
import { ImageResponse } from "next/og";
import { loadPretendard } from "@/lib/og-font";

/**
 * 홈 화면 앱 아이콘 (안드로이드 매니페스트·iOS apple-touch-icon 공용).
 * 1팀 파랑 / 2팀 빨강 대각선 분할 + 경계 금색 사선 + 가운데 "5v5".
 * 탭 파비콘(src/app/icon.svg)도 같은 디자인이니 바꿀 때 같이 고치기.
 */
export const ICON_COLOR = {
  blue: "#1d5fae",
  red: "#b3334d",
  gold: "#c8aa6e",
  text: "#ffffff",
};

/**
 * @param maskable 안드로이드가 원/물방울 등으로 잘라내도 글자가 남도록
 *                 글자를 가운데 안전영역(지름 80%) 안으로 줄인다.
 */
export async function renderAppIcon(size: number, { maskable = false } = {}) {
  const font = await loadPretendard(900);
  const fontSize = Math.round(size * (maskable ? 0.27 : 0.34));
  const c = ICON_COLOR;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: `linear-gradient(135deg, ${c.blue} 0%, ${c.blue} 48.5%, ${c.gold} 48.5%, ${c.gold} 51.5%, ${c.red} 51.5%, ${c.red} 100%)`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            fontFamily: font ? "Pretendard" : undefined,
            fontWeight: 900,
            fontSize,
            letterSpacing: -fontSize * 0.04,
            lineHeight: 1,
            color: c.text,
            textShadow: `0 ${Math.max(1, size * 0.012)}px ${size * 0.03}px rgba(0,0,0,0.45)`,
          }}
        >
          <span>5</span>
          <span style={{ color: c.gold, fontSize: fontSize * 0.82, margin: `0 ${fontSize * 0.04}px` }}>v</span>
          <span>5</span>
        </div>
      </div>
    ),
    {
      width: size,
      height: size,
      fonts: font ? [{ name: "Pretendard", data: font, weight: 900, style: "normal" }] : undefined,
    },
  );
}
