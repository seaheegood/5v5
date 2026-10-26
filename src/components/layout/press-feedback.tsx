"use client";

import { useEffect } from "react";

/**
 * iOS Safari 는 문서에 touchstart 리스너가 없으면 :active 스타일을 그리지 않는다.
 * 빈 리스너를 하나 걸어서 버튼/링크 누름 효과(globals.css)가 아이폰에서도 보이게 한다.
 */
export function PressFeedback() {
  useEffect(() => {
    const noop = () => {};
    document.addEventListener("touchstart", noop, { passive: true });
    return () => document.removeEventListener("touchstart", noop);
  }, []);
  return null;
}
