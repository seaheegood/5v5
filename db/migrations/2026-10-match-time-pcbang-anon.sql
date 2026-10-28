-- =====================================================================
-- 2026-10 업데이트 2: 시작 시간 조율 + PC방 + 익명 응원
-- 운영 중인 DB 에 이 파일만 실행하면 된다 (Neon SQL Editor). 여러 번 실행해도 안전.
-- 컬럼/테이블 추가만 한다. 기존 데이터는 그대로이고, 지금 배포된 앱도 실행 후 그대로 동작한다.
-- (처음 설치하는 DB 는 db/schema.sql 하나로 충분, 이 파일 불필요)
-- =====================================================================

-- 1) 티켓 세팅: 관리자가 덮어쓴 시작 시간(분 단위, 10:00=600 ~ 다음날 02:00=1560) + PC방
alter table public.match_settings add column if not exists start_override smallint
  check (start_override between 600 and 1560 and start_override % 30 = 0);
alter table public.match_settings add column if not exists pc_bang text
  check (char_length(pc_bang) <= 40);

-- 2) 각자 원하는 시작 시간 + 사유 (자리에 들어간 사람만, 하루 1개)
create table if not exists public.match_time_prefs (
  play_date   date not null,
  user_id     uuid not null references public.users (id) on delete cascade,
  start_min   smallint not null check (start_min between 600 and 1560 and start_min % 30 = 0),
  reason      text not null default '' check (char_length(reason) <= 100),
  updated_at  timestamptz not null default now(),
  primary key (play_date, user_id)
);

-- 3) 응원 익명 여부 (기존 응원은 실명)
alter table public.user_cheers add column if not exists is_anonymous boolean not null default false;

-- 4) 방식 미정 허용: 관리자가 시간만 먼저 정할 때 방식이 '단판'으로 바뀌지 않게 (기존 값은 그대로)
alter table public.match_settings alter column match_format drop not null;

-- 확인용
select
  (select count(*) from information_schema.columns where table_name = 'match_settings' and column_name in ('start_override', 'pc_bang')) as 세팅_새컬럼_2개,
  (select count(*) from information_schema.tables where table_name = 'match_time_prefs') as 시간응답_테이블_1개,
  (select count(*) from information_schema.columns where table_name = 'user_cheers' and column_name = 'is_anonymous') as 익명컬럼_1개;
