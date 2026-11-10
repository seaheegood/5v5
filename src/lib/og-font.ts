import "server-only";

/**
 * 서버에서 이미지(공유 썸네일·앱 아이콘)를 그릴 때 쓰는 Pretendard 폰트.
 * 한글 폰트는 이미지 번들 한도(500KB) 때문에 런타임에 받아서 인스턴스마다 한 번만 캐시한다.
 * 받기에 실패하면 null → 폰트 없이(기본 글꼴로) 그린다.
 */
const BASE = "https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/public/static";
const FILES = { 700: "Pretendard-Bold.otf", 900: "Pretendard-Black.otf" } as const;
export type FontWeight = keyof typeof FILES;

const cache = new Map<FontWeight, Promise<ArrayBuffer | null>>();

export function loadPretendard(weight: FontWeight): Promise<ArrayBuffer | null> {
  let p = cache.get(weight);
  if (!p) {
    p = fetch(`${BASE}/${FILES[weight]}`)
      .then((r) => {
        if (!r.ok) throw new Error(`font ${r.status}`);
        return r.arrayBuffer();
      })
      .catch(() => {
        cache.delete(weight); // 다음 요청 때 다시 시도
        return null;
      });
    cache.set(weight, p);
  }
  return p;
}
