import "server-only";
import { del, get, put } from "@vercel/blob";
import { MOCK_DB } from "./repo";

/**
 * 매치 스크린샷 파일 저장소.
 * - 실제: Vercel Blob 비공개(private) 스토어. 보기는 /api/screenshots/[id] 가 로그인 확인 후 스트리밍
 * - 목업: 메모리
 * BLOB_READ_WRITE_TOKEN 은 Vercel 에서 Blob 스토어를 프로젝트에 연결하면 자동으로 들어간다.
 */
const mockFiles = ((globalThis as unknown as { __5v5MockFiles?: Map<string, { body: Buffer; type: string }> })
  .__5v5MockFiles ??= new Map());

export async function uploadImage(path: string, file: File): Promise<void> {
  if (MOCK_DB) {
    mockFiles.set(path, { body: Buffer.from(await file.arrayBuffer()), type: file.type });
    return;
  }
  await put(path, file, { access: "private", contentType: file.type });
}

export async function removeImages(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  if (MOCK_DB) {
    for (const path of paths) mockFiles.delete(path);
    return;
  }
  await del(paths);
}

export async function readImage(path: string): Promise<{ body: BodyInit; type: string } | null> {
  if (MOCK_DB) {
    const file = mockFiles.get(path);
    return file ? { body: new Uint8Array(file.body), type: file.type } : null;
  }
  const result = await get(path, { access: "private" });
  if (!result || result.statusCode !== 200) return null;
  return { body: result.stream, type: result.blob.contentType };
}
