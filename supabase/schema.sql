-- =====================================================================
-- 5v5 내전 일정 앱 - Supabase 스키마
-- Supabase Dashboard > SQL Editor 에 통째로 붙여넣고 Run.
--
-- 보안 모델
--   * 브라우저는 Supabase에 직접 접근하지 않는다.
--   * 모든 읽기/쓰기는 Next.js 서버(Server Component / Server Action)가
--     service_role 키로 수행하고, 권한 체크(본인/관리자)는 서버 코드에서 한다.
--   * 따라서 모든 테이블에 RLS를 켜고 정책을 만들지 않는다
--     → anon / authenticated 키로는 아무것도 읽거나 쓸 수 없다.
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
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  -- 디비전이 있는 티어(아이언~다이아)는 필수, 없는 티어는 null
  constraint users_tier_division_check check (
    (tier in ('unranked', 'master', 'grandmaster', 'challenger')) = (tier_division is null)
  )
);

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
-- match_votes : 매치 투표 (MVP / 범인). 참여자 1명당 종류별 1표, 본인 제외
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
-- match_screenshots : 매치 결과 스크린샷 (파일은 Storage 'match-screenshots' 버킷)
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

-- 비공개 버킷 (서버가 signed URL 을 발급해서 보여줌). 5MB, 이미지만
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('match-screenshots', 'match-screenshots', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- RLS : 켜기만 하고 정책은 만들지 않음 (service_role 만 접근 가능)
-- ---------------------------------------------------------------------
alter table public.users             enable row level security;
alter table public.schedules         enable row level security;
alter table public.match_settings    enable row level security;
alter table public.match_votes       enable row level security;
alter table public.match_screenshots enable row level security;

-- ---------------------------------------------------------------------
-- 운영 팁
-- ---------------------------------------------------------------------
-- * 가장 먼저 가입한 멤버는 앱에서 자동으로 관리자가 된다.
-- * 수동으로 관리자 지정:
--     update public.users set is_admin = true where nickname = '조리신';
-- * PIN 잠금 수동 해제:
--     update public.users set failed_pin_attempts = 0, locked_until = null where nickname = '김가렌';
