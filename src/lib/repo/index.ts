import "server-only";
import { memoryRepo } from "./memory";
import { postgresRepo } from "./postgres";
import type { Repo } from "./types";

export { DuplicateNicknameError, SlotTakenError } from "./types";

/** npm run dev:mock → DB 없이 인메모리 저장소 사용 (개발 서버에서만, production 에서는 항상 꺼짐) */
export const MOCK_DB = process.env.MOCK_DB === "1" && process.env.NODE_ENV !== "production";

/** 앱의 모든 DB 접근은 이 객체를 통한다 */
export const repo: Repo = MOCK_DB ? memoryRepo : postgresRepo;
