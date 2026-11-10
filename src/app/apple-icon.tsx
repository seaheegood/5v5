import { renderAppIcon } from "@/lib/app-icon";

/** iOS "홈 화면에 추가" 아이콘. 꽉 찬 사각형으로 주면 iOS가 알아서 둥글게 깎는다. */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return renderAppIcon(180);
}
