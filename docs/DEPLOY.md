# 실행 & 배포 가이드

다른 컴퓨터에서 이 저장소를 받아 **Supabase에 DB를 만들고, Vercel에 배포**하기까지의 순서입니다.
소요 시간은 약 15분입니다.

## 0. 준비물
- Node.js **20.9 이상** (권장: 22 LTS 이상) 및 npm
- GitHub 계정 (이 저장소)
- [Supabase](https://supabase.com) 계정 (무료 플랜으로 충분)
- [Vercel](https://vercel.com) 계정 (GitHub로 로그인 권장)

---

## 1. GitHub에 올리기 (최초 1회, 코드를 작성한 컴퓨터에서)

```bash
cd 5v5
git init
git add .
git commit -m "init: 5v5 내전 일정 앱"
git branch -M main
git remote add origin https://github.com/<내계정>/5v5.git   # GitHub에서 빈 저장소 먼저 생성
git push -u origin main
```

> `.env`, `.env*.local`, `node_modules`, `.next`는 `.gitignore`로 제외됩니다. **비밀키가 커밋되지 않았는지** 한 번 확인하세요.

## 2. 저장소 받기 (배포할 컴퓨터에서)

```bash
git clone https://github.com/<내계정>/5v5.git
cd 5v5
npm install
```

## 3. Supabase 프로젝트 만들기

1. Supabase Dashboard → **New project**
   - Region: **Northeast Asia (Seoul)** 권장
   - DB 비밀번호는 아무거나 (앱에서는 쓰지 않음)
2. 왼쪽 메뉴 **SQL Editor** → New query → `supabase/schema.sql` 내용 전체 붙여넣기 → **Run**
3. 테이블과 버킷이 생겼는지 확인
   - **Table Editor**: `users`, `schedules`, `match_settings`, `match_votes`, `match_screenshots` 5개 테이블
   - **Storage**: `match-screenshots` 버킷 (비공개)
4. **Project Settings → API** (또는 *API Keys*)에서 두 값 복사
   - `Project URL` → `SUPABASE_URL`
   - `service_role` (secret) 키 → `SUPABASE_SERVICE_ROLE_KEY`
     - 새 대시보드에서는 **Secret key**(`sb_secret_...`)를 써도 됩니다.

> ⚠️ service_role/secret 키는 RLS를 무시하는 **관리자 키**입니다. 서버 환경변수로만 쓰고, `NEXT_PUBLIC_` 접두어를 절대 붙이지 마세요.

## 4. 로컬 실행 (선택)

> Supabase 없이 화면만 보려면 `npm run dev:mock`. 모든 멤버의 PIN은 `0000`입니다. 자세한 내용은 README를 보세요.

```bash
cp .env.example .env.local
# .env.local 편집: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 입력
# SESSION_SECRET 생성:
openssl rand -base64 32     # 출력값을 SESSION_SECRET에 붙여넣기

npm run dev
```

- PC: http://localhost:3000
- 휴대폰 테스트(같은 와이파이): `npm run dev -- -H 0.0.0.0` 후 `http://<PC의 IP>:3000`
  - 로컬(http)에서는 쿠키 `secure` 옵션이 꺼져 있어 로그인이 정상 동작합니다.

## 5. Vercel 배포

1. Vercel Dashboard → **Add New… → Project** → GitHub의 `5v5` 저장소 **Import**
2. Framework Preset: **Next.js** (자동 감지). Build/Output 설정은 기본값 그대로 둡니다.
3. **Environment Variables**에 3개 추가 (Production / Preview 모두 체크)

   | Key | Value |
   | --- | --- |
   | `SUPABASE_URL` | Supabase Project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role(secret) 키 |
   | `SESSION_SECRET` | `openssl rand -base64 32` 결과 (로컬과 달라도 됨) |

4. **Deploy** → 완료 후 `https://5v5-xxxx.vercel.app` 접속
5. (선택) **Settings → Functions → Function Region**을 `icn1 (Seoul)`로 바꾸면 Supabase(서울)와 가까워 응답이 빨라집니다.

이후 `main` 브랜치에 push하면 자동으로 다시 배포됩니다.

## 6. 첫 세팅

1. 배포된 주소에 접속합니다. 멤버가 0명이면 바로 **새 멤버 추가** 화면이 뜹니다.
2. 처음 가입한 사람이 **자동으로 관리자**가 되므로, 관리자가 될 사람이 먼저 가입하세요.
3. 단톡방에 링크를 공유합니다. 각자 **새 멤버 추가**로 닉네임, PIN, 티어, 가능 라인을 등록합니다.
4. 휴대폰 브라우저의 **"홈 화면에 추가"**를 쓰면 앱처럼 실행할 수 있습니다.

### 관리자 수동 지정 / PIN 잠금 해제 (SQL Editor)
```sql
update public.users set is_admin = true where nickname = '조리신';
update public.users set failed_pin_attempts = 0, locked_until = null where nickname = '김가렌';
```
PIN을 잊은 멤버는 앱의 **관리 탭 → 멤버 → PIN 초기화**로 처리하면 됩니다.

---

## 트러블슈팅

| 증상 | 원인 / 해결 |
| --- | --- |
| `SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다` | Vercel 환경변수 누락. 추가 후 **Redeploy** 필요 (환경변수는 재배포해야 반영) |
| `SESSION_SECRET 환경변수(32자 이상)가 필요합니다` | `openssl rand -base64 32` 값 사용 (44자) |
| 로그인 후 바로 다시 로그인 화면 | `SESSION_SECRET`이 배포마다 바뀌었거나, http 도메인에서 production 실행 중 (secure 쿠키) |
| `relation "public.users" does not exist` | `schema.sql`을 실행하지 않았거나 다른 프로젝트에 실행 |
| 가입 시 "가입에 실패했어요" | Supabase 키가 anon 키인지 확인. RLS 때문에 **service_role** 키가 필요 |
| 아이콘이 깨짐 | `public/icons/...` 파일명이 `lib/constants.ts`의 라인/티어 키와 같은지 확인 |

## 참고: 보안 메모
- 가입 페이지는 링크를 아는 사람 누구나 쓸 수 있습니다. 링크가 외부로 퍼지면 관리 탭에서 해당 멤버를 삭제하세요.
  - 막고 싶다면 `register` 액션(`src/app/actions/auth.ts`)에서 `INVITE_CODE` 환경변수를 비교하는 코드를 추가하면 됩니다.
- PIN은 4자리라 강한 비밀번호가 아닙니다. 지인끼리 쓰는 앱 수준의 보호라고 보면 됩니다.
