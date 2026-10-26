-- =====================================================================
-- 5v5 내전 일정 앱 - Postgres 스키마 (Neon)
-- Neon Console > SQL Editor 에 통째로 붙여넣고 Run. 여러 번 실행해도 안전하다.
--
-- 보안 모델
--   * 브라우저는 DB에 직접 접근하지 않는다.
--   * 모든 읽기/쓰기는 Next.js 서버(Server Component / Server Action)가
--     DATABASE_URL 로 수행하고, 권한 체크(본인/관리자)는 서버 코드에서 한다.
--   * 스크린샷 파일은 DB가 아닌 Vercel Blob(비공개)에 저장하고 경로만 기록한다.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 공통: updated_at 자동 갱신 트리거
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- users : 멤버 (닉네임 + 4자리 PIN, 관리자 여부, 티어, 선호 라인 '중복' 가능)
-- ---------------------------------------------------------------------
create table if not exists public.users (
  id                  uuid primary key default gen_random_uuid(),
  nickname            text not null
                      check (char_length(btrim(nickname)) between 1 and 12),
  -- PIN 원문은 저장하지 않는다. 서버에서 scrypt 로 해시한 "salt:hash" 문자열.
  pin_hash            text not null,
  is_admin            boolean not null default false,
  tier                text not null default 'unranked'
                      check (tier in (
                        'unranked', 'iron', 'bronze', 'silver', 'gold', 'platinum',
                        'emerald', 'diamond', 'master', 'grandmaster', 'challenger'
                      )),
  -- 디비전 1~4 (화면에는 I~IV). 언랭/마스터/그마/챌린저는 null
  tier_division       smallint check (tier_division between 1 and 4),
  -- 프로필의 가능 라인: 복수 선택
  preferred_lanes     text[] not null default '{}'
                      check (preferred_lanes <@ array['top', 'jungle', 'mid', 'adc', 'support']::text[]),
  -- PIN 무차별 대입 방지 (5회 실패 시 잠금)
  failed_pin_attempts integer not null default 0,
  locked_until        timestamptz,
  -- 관리자가 만든 계정/초기화한 PIN(0000)은 첫 로그인 때 재설정 강제
  must_change_pin     boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  -- 디비전이 있는 티어(아이언~다이아)는 필수, 없는 티어는 null
  constraint users_tier_division_required check (
    (tier in ('unranked', 'master', 'grandmaster', 'challenger')) = (tier_division is null)
  )
);

-- 이전 버전 스키마로 이미 만든 DB 에도 컬럼 추가 (재실행 안전)
alter table public.users add column if not exists must_change_pin boolean not null default false;

-- 닉네임 대소문자 무시 유일
create unique index if not exists users_nickname_lower_key
  on public.users (lower(nickname));

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- schedules : 날짜별 참여 응답 (유저당 하루 1건, 참여 시 라인 '딱 1개')
-- ---------------------------------------------------------------------
create table if not exists public.schedules (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users (id) on delete cascade,
  play_date   date not null,
  status      text not null check (status in ('join', 'decline')),
  lane        text check (lane in ('top', 'jungle', 'mid', 'adc', 'support')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint schedules_user_date_key unique (user_id, play_date),
  -- 참여(join)면 라인 필수 1개, 불참(decline)이면 라인 없음
  constraint schedules_lane_matches_status check (
    (status = 'join' and lane is not null) or
    (status = 'decline' and lane is null)
  )
);

create index if not exists schedules_play_date_idx
  on public.schedules (play_date);

drop trigger if exists schedules_set_updated_at on public.schedules;
create trigger schedules_set_updated_at
  before update on public.schedules
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- match_settings : 날짜별 매치 카드 설정 (방식/판돈, 마지막 수정자)
--   - 카드 자체는 "참여자 5명 이상"이면 자동 노출되므로 별도 행이 필요 없다.
--   - 누군가 방식/판돈을 수정하는 순간 upsert 된다.
-- ---------------------------------------------------------------------
create table if not exists public.match_settings (
  play_date     date primary key,
  match_format  text not null default '단판'
                check (char_length(match_format) between 1 and 30),
  stake         text not null default ''
                check (char_length(stake) <= 50),
  updated_by    uuid references public.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

drop trigger if exists match_settings_set_updated_at on public.match_settings;
create trigger match_settings_set_updated_at
  before update on public.match_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- match_results : 관리자가 '종료' 처리한 매치 (행이 있으면 종료 상태)
--   - 종료 시 블루/레드 팀 배정과 승리팀을 기록하고, 이때부터 투표/댓글/스크린샷이 열린다
-- ---------------------------------------------------------------------
create table if not exists public.match_results (
  play_date    date primary key,
  winner       text not null check (winner in ('blue', 'red')),
  finished_by  uuid references public.users (id) on delete set null,
  finished_at  timestamptz not null default now()
);

-- 종료 시점의 팀 배정 (5대5)
create table if not exists public.match_players (
  play_date  date not null references public.match_results (play_date) on delete cascade,
  user_id    uuid not null references public.users (id) on delete cascade,
  team       text not null check (team in ('blue', 'red')),
  primary key (play_date, user_id)
);

-- ---------------------------------------------------------------------
-- match_comments : 종료된 매치의 댓글
-- ---------------------------------------------------------------------
create table if not exists public.match_comments (
  id          uuid primary key default gen_random_uuid(),
  play_date   date not null,
  user_id     uuid references public.users (id) on delete set null,
  body        text not null check (char_length(btrim(body)) between 1 and 300),
  created_at  timestamptz not null default now()
);

create index if not exists match_comments_play_date_idx
  on public.match_comments (play_date, created_at);

-- ---------------------------------------------------------------------
-- match_votes : 매치 투표. MVP 는 이긴 팀에서, 범인은 진 팀에서.
--   투표자는 그 경기 10명, 종류별 1표, 본인 제외
--   - 누가 누구에게 투표했는지는 화면에 노출하지 않고 집계만 보여준다
-- ---------------------------------------------------------------------
create table if not exists public.match_votes (
  play_date   date not null,
  voter_id    uuid not null references public.users (id) on delete cascade,
  kind        text not null check (kind in ('mvp', 'blame')),
  target_id   uuid not null references public.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  primary key (play_date, voter_id, kind),
  constraint match_votes_not_self check (voter_id <> target_id)
);

drop trigger if exists match_votes_set_updated_at on public.match_votes;
create trigger match_votes_set_updated_at
  before update on public.match_votes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- match_screenshots : 매치 결과 스크린샷 (파일은 Vercel Blob, 여기엔 경로만)
-- ---------------------------------------------------------------------
create table if not exists public.match_screenshots (
  id            uuid primary key default gen_random_uuid(),
  play_date     date not null,
  storage_path  text not null unique,
  uploader_id   uuid references public.users (id) on delete set null,
  created_at    timestamptz not null default now()
);

create index if not exists match_screenshots_play_date_idx
  on public.match_screenshots (play_date);

-- ---------------------------------------------------------------------
-- 운영 팁
-- ---------------------------------------------------------------------
-- * 멤버가 0명일 때만 앱에서 직접 가입할 수 있고, 그 사람이 관리자가 된다.
--   이후 계정은 관리자가 '관리' 탭에서 만든다 (초기 PIN 0000, 첫 로그인 때 재설정).
-- * 수동으로 관리자 지정:
--     update public.users set is_admin = true where nickname = '조리신';
-- * PIN 잠금 수동 해제:
--     update public.users set failed_pin_attempts = 0, locked_until = null where nickname = '김가렌';
