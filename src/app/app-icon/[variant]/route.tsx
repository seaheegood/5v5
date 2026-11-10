import { renderAppIcon } from "@/lib/app-icon";

/** 매니페스트(src/app/manifest.ts)가 가리키는 홈 화면 아이콘 PNG. 빌드할 때 정적으로 만든다. */
const VARIANTS = {
  "192": { size: 192, maskable: false },
  "512": { size: 512, maskable: false },
  maskable: { size: 512, maskable: true },
} as const;

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(VARIANTS).map((variant) => ({ variant }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ variant: string }> }) {
  const v = VARIANTS[(await params).variant as keyof typeof VARIANTS];
  if (!v) return new Response("Not found", { status: 404 });
  return renderAppIcon(v.size, { maskable: v.maskable });
}
