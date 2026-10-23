import "server-only";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays, todayKST } from "./date";
import { hashPin } from "./pin";

/**
 * ⚠️ 로컬 UI 확인용 인메모리 DB (npm run dev:mock).
 * Supabase 없이 앱 전체 흐름(로그인/저장/리다이렉트)을 눌러볼 수 있게
 * 이 앱이 쓰는 supabase-js 쿼리 문법만 최소한으로 흉내 낸다.
 * 서버를 재시작하면 데이터는 초기화된다. production 에서는 사용 불가 (supabase.ts 참고).
 */

type Row = Record<string, unknown>;
type Tables = Record<"users" | "schedules" | "match_settings", Row[]>;

// 임베드 조인(alias:users(...))에 쓰는 FK 컬럼
const FOREIGN_KEYS: Record<string, string> = { "schedules.users": "user_id", "match_settings.users": "updated_by" };
const PRIMARY_KEY: Record<string, string> = { users: "id", schedules: "id", match_settings: "play_date" };

function seed(): Tables {
  const now = new Date().toISOString();
  const pin = hashPin("0000");
  const members: [string, string, number | null, string[]][] = [
    ["김가렌", "gold", 2, ["top", "mid"]],
    ["조리신", "platinum", 4, ["jungle"]],
    ["박아리", "diamond", 1, ["mid"]],
    ["이징크스", "silver", 3, ["adc"]],
    ["최쓰레쉬", "emerald", 2, ["support"]],
    ["정다리우스", "bronze", 1, ["top"]],
    ["한니달리", "gold", 4, ["jungle", "support"]],
    ["윤이즈", "master", null, ["adc", "mid"]],
    ["강룰루", "iron", 2, ["support"]],
    ["오제드", "unranked", null, ["mid"]],
    ["서말파", "challenger", null, ["top", "jungle"]],
  ];
  const users = members.map(([nickname, tier, tier_division, preferred_lanes], i) => ({
    id: randomUUID(),
    nickname,
    pin_hash: pin,
    is_admin: i === 0,
    tier,
    tier_division,
    preferred_lanes,
    failed_pin_attempts: 0,
    locked_until: null,
    created_at: now,
    updated_at: now,
  }));

  const today = todayKST();
  const schedules: Row[] = [];
  const add = (diff: number, entries: [number, string | null][]) => {
    for (const [i, lane] of entries)
      schedules.push({
        id: randomUUID(),
        user_id: users[i].id,
        play_date: addDays(today, diff),
        status: lane ? "join" : "decline",
        lane,
        created_at: now,
        updated_at: now,
      });
  };
  const ten: [number, string][] = [
    [10, "top"], [5, "top"], [1, "jungle"], [6, "jungle"], [2, "mid"],
    [0, "mid"], [3, "adc"], [7, "adc"], [4, "support"], [8, "support"],
  ];
  add(-7, ten); // 지난 매치
  add(1, [[0, "top"], [1, "jungle"], [2, "mid"], [3, "adc"], [4, "support"], [5, "top"], [6, "jungle"], [7, "adc"], [9, null]]);
  add(2, [[1, "jungle"], [2, "mid"], [8, "support"]]);
  add(8, ten);

  const match_settings: Row[] = [
    { play_date: addDays(today, -7), match_format: "단판", stake: "커피 내기", updated_by: users[2].id, created_at: now, updated_at: now },
    { play_date: addDays(today, 1), match_format: "3판 2선승제", stake: "진 팀이 치킨 쏘기", updated_by: users[1].id, created_at: now, updated_at: now },
  ];

  return { users, schedules, match_settings };
}

const store = globalThis as unknown as { __5v5MockDb?: Tables };
const tables = () => (store.__5v5MockDb ??= seed());

/** "a, b, alias:users(x, y)" → 최상위 콤마 기준 분리 */
function splitColumns(columns: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of columns) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else current += ch;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function project(table: string, row: Row, columns: string): Row {
  if (columns.trim() === "*") return { ...row };
  const out: Row = {};
  for (const col of splitColumns(columns)) {
    const embed = col.match(/^(\w+):(\w+)\((.*)\)$/);
    if (!embed) {
      out[col] = row[col];
      continue;
    }
    const [, alias, target, inner] = embed;
    const fk = FOREIGN_KEYS[`${table}.${target}`];
    const related = tables()[target as keyof Tables].find((r) => r.id === row[fk]);
    out[alias] = related ? project(target, related, inner) : null;
  }
  return out;
}

type Filter = (row: Row) => boolean;
type Result = { data: unknown; error: { code: string; message: string } | null; count?: number | null };

class Query implements PromiseLike<Result> {
  private filters: Filter[] = [];
  private op: "select" | "insert" | "update" | "upsert" | "delete" = "select";
  private columns = "*";
  private returning = false;
  private payload: Row | null = null;
  private conflict: string[] = [];
  private orderBy: { column: string; ascending: boolean } | null = null;
  private mode: "many" | "single" | "maybeSingle" = "many";
  private countOnly = false;

  constructor(private table: keyof Tables) {}

  select(columns = "*", options?: { count?: string; head?: boolean }) {
    if (this.op === "select") this.columns = columns;
    else {
      this.returning = true;
      this.columns = columns;
    }
    this.countOnly = Boolean(options?.head);
    return this;
  }
  insert(payload: Row) {
    this.op = "insert";
    this.payload = payload;
    return this;
  }
  update(payload: Row) {
    this.op = "update";
    this.payload = payload;
    return this;
  }
  upsert(payload: Row, options?: { onConflict?: string }) {
    this.op = "upsert";
    this.payload = payload;
    this.conflict = (options?.onConflict ?? PRIMARY_KEY[this.table]).split(",").map((c) => c.trim());
    return this;
  }
  delete() {
    this.op = "delete";
    return this;
  }
  eq(column: string, value: unknown) {
    this.filters.push((r) => r[column] === value);
    return this;
  }
  gte(column: string, value: string) {
    this.filters.push((r) => String(r[column]) >= value);
    return this;
  }
  lte(column: string, value: string) {
    this.filters.push((r) => String(r[column]) <= value);
    return this;
  }
  in(column: string, values: unknown[]) {
    this.filters.push((r) => values.includes(r[column]));
    return this;
  }
  order(column: string, options?: { ascending?: boolean }) {
    this.orderBy = { column, ascending: options?.ascending ?? true };
    return this;
  }
  single() {
    this.mode = "single";
    return this;
  }
  maybeSingle() {
    this.mode = "maybeSingle";
    return this;
  }

  then<A = Result, B = never>(
    onFulfilled?: ((value: Result) => A | PromiseLike<A>) | null,
    onRejected?: ((reason: unknown) => B | PromiseLike<B>) | null,
  ): PromiseLike<A | B> {
    return Promise.resolve()
      .then(() => this.execute())
      .then(onFulfilled, onRejected);
  }

  private matches = (row: Row) => this.filters.every((f) => f(row));

  private uniqueViolation(row: Row, self?: Row): Result | null {
    if (this.table !== "users" || typeof row.nickname !== "string") return null;
    const taken = tables().users.some(
      (u) => u !== self && String(u.nickname).toLowerCase() === String(row.nickname).toLowerCase(),
    );
    return taken ? { data: null, error: { code: "23505", message: "duplicate nickname" } } : null;
  }

  private execute(): Result {
    const rows = tables()[this.table];
    const now = new Date().toISOString();
    let affected: Row[];

    switch (this.op) {
      case "select":
        affected = rows.filter(this.matches);
        break;
      case "insert": {
        const dup = this.uniqueViolation(this.payload!);
        if (dup) return dup;
        const row: Row = {
          ...(PRIMARY_KEY[this.table] === "id" ? { id: randomUUID() } : {}),
          ...(this.table === "users" ? { is_admin: false, failed_pin_attempts: 0, locked_until: null } : {}),
          created_at: now,
          updated_at: now,
          ...this.payload,
        };
        rows.push(row);
        affected = [row];
        break;
      }
      case "update": {
        affected = rows.filter(this.matches);
        for (const row of affected) {
          const dup = this.uniqueViolation({ ...row, ...this.payload }, row);
          if (dup) return dup;
        }
        for (const row of affected) Object.assign(row, this.payload, { updated_at: now });
        break;
      }
      case "upsert": {
        const existing = rows.find((r) => this.conflict.every((c) => r[c] === this.payload![c]));
        if (existing) Object.assign(existing, this.payload, { updated_at: now });
        else
          rows.push({
            ...(PRIMARY_KEY[this.table] === "id" ? { id: randomUUID() } : {}),
            created_at: now,
            updated_at: now,
            ...this.payload,
          });
        affected = [existing ?? rows[rows.length - 1]];
        break;
      }
      case "delete": {
        affected = rows.filter(this.matches);
        tables()[this.table] = rows.filter((r) => !affected.includes(r));
        // FK 동작 흉내: users 삭제 시 schedules cascade, match_settings.updated_by set null
        if (this.table === "users") {
          const ids = new Set(affected.map((u) => u.id));
          tables().schedules = tables().schedules.filter((s) => !ids.has(s.user_id));
          for (const m of tables().match_settings) if (ids.has(m.updated_by)) m.updated_by = null;
        }
        break;
      }
    }

    if (this.countOnly) return { data: null, error: null, count: affected.length };
    if (this.op !== "select" && !this.returning) return { data: null, error: null };

    if (this.orderBy) {
      const { column, ascending } = this.orderBy;
      affected = [...affected].sort(
        (a, b) => String(a[column]).localeCompare(String(b[column]), "ko") * (ascending ? 1 : -1),
      );
    }
    const data = affected.map((r) => project(this.table, r, this.columns));

    if (this.mode === "many") return { data, error: null };
    if (data.length > 1 || (this.mode === "single" && data.length === 0))
      return { data: null, error: { code: "PGRST116", message: "expected a single row" } };
    return { data: data[0] ?? null, error: null };
  }
}

export function createMockDb(): SupabaseClient {
  return { from: (table: keyof Tables) => new Query(table) } as unknown as SupabaseClient;
}
