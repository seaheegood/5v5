import { getCurrentUser } from "@/lib/auth";
import { repo } from "@/lib/repo";
import { readImage } from "@/lib/storage";

/** 비공개 스크린샷 보기: 로그인한 멤버에게만 파일을 흘려보낸다 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getCurrentUser())) return new Response("Unauthorized", { status: 401 });

  const shot = await repo.findScreenshot((await params).id);
  const file = shot && (await readImage(shot.storage_path));
  if (!file) return new Response("Not found", { status: 404 });

  return new Response(file.body, {
    headers: {
      "Content-Type": file.type,
      // 파일은 경로마다 고유(uuid)라 바뀌지 않음. 브라우저에만 캐시
      "Cache-Control": "private, max-age=86400, immutable",
    },
  });
}
