import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusScreen } from "@/components/layout/status-screen";

export function NotFoundScreen({ fullScreen = false }: { fullScreen?: boolean }) {
  return (
    <StatusScreen
      icon={SearchX}
      title="없는 페이지예요"
      description="링크가 잘못됐거나, 삭제된 티켓·멤버일 수 있어요."
      fullScreen={fullScreen}
    >
      <Button asChild>
        <Link href="/">홈으로</Link>
      </Button>
    </StatusScreen>
  );
}
