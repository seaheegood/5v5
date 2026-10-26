-- =====================================================================
-- 2026-10 업데이트: 응원하기 + 판돈 숫자화
-- 운영 중인 DB 에 이 파일만 실행하면 된다 (Neon SQL Editor). 여러 번 실행해도 안전.
-- 기존 데이터는 지우지 않는다. 지금 배포된 앱도 이 SQL 실행 후 그대로 동작한다.
-- (처음 설치하는 DB 는 db/schema.sql 하나로 충분, 이 파일 불필요)
-- =====================================================================

-- 1) 판돈: 1인당 금액(원) 칸 추가
alter table public.match_settings add column if not exists stake_amount integer
  check (stake_amount between 0 and 10000000);

-- 2) 숫자로만 적혀 있던 예전 판돈("30000", "50,000원")은 금액으로 옮긴다.
--    "치킨" 같은 글자 판돈은 그대로 두고, 앱에서는 '미정'으로 보인다.
update public.match_settings
set stake_amount = regexp_replace(stake, '[^0-9]', '', 'g')::integer
where stake_amount is null
  and stake ~ '^\s*[0-9][0-9,]*\s*원?\s*$'
  and char_length(regexp_replace(stake, '[^0-9]', '', 'g')) between 1 and 7;

-- 3) 응원하기 테이블
create table if not exists public.user_cheers (
  id          uuid primary key default gen_random_uuid(),
  target_id   uuid not null references public.users (id) on delete cascade,
  author_id   uuid references public.users (id) on delete set null,
  body        text not null check (char_length(btrim(body)) between 1 and 300),
  created_at  timestamptz not null default now()
);

create index if not exists user_cheers_target_idx
  on public.user_cheers (target_id, created_at);

-- 확인용: 판돈이 금액으로 옮겨졌는지 (stake_amount 가 null 이면 '미정')
select play_date, stake as 예전_판돈, stake_amount as 새_판돈 from public.match_settings order by play_date;
