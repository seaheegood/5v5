"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusScreen } from "@/components/layout/status-screen";

/**
 * 예상 못 한 오류 화면. 루트에 둬서 (app)/layout 의 로그인 확인(DB 조회) 실패까지 잡는다.
 * Neon 무료 플랜은 잠들었다 깨어날 때 첫 요청이 실패할 수 있어서 "다시 시도"를 크게.
 */
export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusScreen
      icon={RotateCw}
      title="잠깐 문제가 생겼어요"
      description={
        <>
          서버가 깨어나는 중일 수 있어요.
          <br />
          잠시 후 다시 시도해 주세요.
        </>
      }
      fullScreen
    >
      <Button onClick={() => retry()}>다시 시도</Button>
      <Button asChild variant="ghost">
        <Link href="/">홈으로</Link>
      </Button>
    </StatusScreen>
  );
}
