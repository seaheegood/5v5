// public/icons 의 라인/티어 SVG 를 공유 썸네일(og 이미지)용 data URL 모듈로 만든다.
// 아이콘 파일을 바꾸면: npm run icons
import { readdirSync, readFileSync, writeFileSync } from "node:fs";

const read = (dir) =>
  Object.fromEntries(
    readdirSync(`public/icons/${dir}`)
      .filter((f) => f.endsWith(".svg"))
      .sort()
      .map((f) => [f.replace(/\.svg$/, ""), `data:image/svg+xml;base64,${readFileSync(`public/icons/${dir}/${f}`).toString("base64")}`]),
  );

const out = `// 자동 생성 파일 (scripts/gen-icon-data.mjs). 직접 고치지 말고 npm run icons
// 공유 썸네일은 서버에서 이미지를 그릴 때 자기 주소의 파일을 못 불러와서(SSRF 차단) 아이콘을 코드에 넣어 둔다.
export const LANE_ICON_DATA: Record<string, string> = ${JSON.stringify(read("lanes"), null, 2)};

export const TIER_ICON_DATA: Record<string, string> = ${JSON.stringify(read("tiers"), null, 2)};
`;
writeFileSync("src/lib/icon-data.ts", out);
console.log("src/lib/icon-data.ts 생성");
