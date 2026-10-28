"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import { Button } from "../ui/button";

/**
 * 티켓 공유: 폰에서는 기본 공유 팝업(링크 복사·카카오톡·메시지 등),
 * 공유 팝업이 없는 환경(PC 등)에서는 링크를 복사한다.
 * version 은 썸네일 캐시를 피하기 위한 값 (자리/시간이 바뀌면 달라짐).
 */
export function ShareButton({ path, title, text, version }: { path: string; title: string; text: string; version: string }) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = `${location.origin}${path}?v=${encodeURIComponent(version)}`;
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (e) {
        // 사용자가 팝업을 닫은 경우는 그대로 끝
        if ((e as Error).name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("링크를 복사하세요", url);
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button variant="secondary" size="sm" onClick={share} className="h-11 shrink-0 px-4">
      {copied ? <Check className="size-4 text-success" /> : <Share2 className="size-4" />}
      {copied ? "링크 복사됨" : "공유"}
    </Button>
  );
}
