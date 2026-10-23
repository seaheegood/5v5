import "server-only";
import { db, MOCK_DB } from "./supabase";

/**
 * 매치 스크린샷 저장소. 실제로는 Supabase Storage 비공개 버킷,
 * 목업 모드에서는 메모리에 data URL 로 보관한다.
 */
const BUCKET = "match-screenshots";
const SIGNED_URL_SECONDS = 60 * 60;

const mockFiles = ((globalThis as unknown as { __5v5MockFiles?: Map<string, string> }).__5v5MockFiles ??= new Map());

export async function uploadImage(path: string, file: File): Promise<boolean> {
  if (MOCK_DB) {
    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    mockFiles.set(path, `data:${file.type};base64,${base64}`);
    return true;
  }
  const { error } = await db().storage.from(BUCKET).upload(path, file, { contentType: file.type });
  return !error;
}

export async function removeImages(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  if (MOCK_DB) {
    for (const path of paths) mockFiles.delete(path);
    return;
  }
  await db().storage.from(BUCKET).remove(paths);
}

/** path → 보기용 URL */
export async function getImageUrls(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  if (MOCK_DB) return Object.fromEntries(paths.map((p) => [p, mockFiles.get(p) ?? ""]));

  const { data } = await db().storage.from(BUCKET).createSignedUrls(paths, SIGNED_URL_SECONDS);
  const urls: Record<string, string> = {};
  for (const d of data ?? []) if (d.path && d.signedUrl) urls[d.path] = d.signedUrl;
  return urls;
}
