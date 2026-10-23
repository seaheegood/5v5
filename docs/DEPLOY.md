# 배포 가이드 (Vercel + Neon + Vercel Blob)

GitHub 저장소를 Vercel에 연결하고, Vercel 안에서 DB(Neon)와 파일 저장소(Blob)를 만들어 붙이는 순서입니다.
계정은 **GitHub와 Vercel만 있으면 됩니다.** Neon은 Vercel 화면에서 바로 만들 수 있습니다. 약 15분 걸립니다.

> 서비스 화면 이름이나 메뉴 위치는 바뀔 수 있습니다. 아래는 2026년 10월 기준입니다.

## 1. Vercel에 프로젝트 만들기

1. https://vercel.com 에 GitHub 계정으로 로그인합니다.
2. **Add New… → Project** → `5v5` 저장소 **Import** → 설정은 그대로 두고 **Deploy**를 누릅니다.
   - 아직 DB가 없어서 사이트를 열면 에러가 납니다. 정상이니 다음 단계로 넘어가세요.

## 2. DB 만들기 (Neon)

1. 프로젝트 → **Storage** 탭 → **Create Database** → **Neon** 선택
   - 플랜은 **Free**를 고릅니다.
   - Region은 한국에서 가까운 아시아 리전(예: Singapore)을 고릅니다.
2. 만든 DB를 프로젝트에 **Connect**하면 환경변수 `DATABASE_URL`이 자동으로 추가됩니다.
   - **Settings → Environment Variables**에서 확인하세요.
   - 이름이 다르게 들어갔거나 없으면, Neon 콘솔의 **Connection string**(pooled)을 복사해서 `DATABASE_URL`로 직접 추가하세요.
3. Storage 화면에서 **Open in Neon** → **SQL Editor** → `db/schema.sql` 내용을 전체 붙여넣고 **Run**합니다.
   - **Tables** 메뉴에서 `users`, `schedules`, `match_settings`, `match_votes`, `match_screenshots` 5개가 생겼는지 확인하세요.

## 3. 스크린샷 저장소 만들기 (Vercel Blob)

1. 프로젝트 → **Storage** 탭 → **Create** → **Blob**을 선택합니다.
   - 접근 방식을 고르라고 하면 **Private**을 선택하세요.
2. 프로젝트에 **Connect**하면 `BLOB_READ_WRITE_TOKEN`이 자동으로 추가됩니다.

## 4. 세션 비밀키 추가

**Settings → Environment Variables**에서 다음 값을 추가합니다. Production과 Preview에 모두 체크하세요.

| Key | Value |
| --- | --- |
| `SESSION_SECRET` | 터미널에서 `openssl rand -base64 32` 실행 결과 |

최종적으로 `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, `SESSION_SECRET` 3개가 있어야 합니다.

## 5. 다시 배포

1. **Deployments** 탭 → 최신 배포의 **⋯ → Redeploy**를 누릅니다. 환경변수는 재배포해야 반영됩니다.
2. (권장) **Settings → Functions → Function Region**을 DB와 같은 리전으로 맞춥니다(예: Singapore = `sin1`).
   - 한 화면에 쿼리가 여러 번 나가므로, 서버와 DB가 가까울수록 빠릅니다.

이후에는 `main` 브랜치에 push할 때마다 자동으로 배포됩니다.

## 6. 첫 세팅

1. 배포된 주소에 접속합니다. 멤버가 0명이면 바로 **멤버 추가** 화면이 나옵니다.
2. **처음 가입한 사람이 관리자가 됩니다.** 관리자가 될 사람이 먼저 가입하세요.
3. 단톡방에 주소를 공유하고, 각자 멤버 추가로 가입하게 합니다.
4. 휴대폰 브라우저에서 **홈 화면에 추가**를 하면 앱처럼 쓸 수 있습니다.

관리자 수동 지정이나 PIN 잠금 해제는 Neon SQL Editor에서 할 수 있습니다.
```sql
update users set is_admin = true where nickname = '조리신';
update users set failed_pin_attempts = 0, locked_until = null where nickname = '김가렌';
```

## 로컬 실행

```bash
npm install
npm run dev:mock          # DB 없이 (PIN 0000)

# 실제 DB로 실행하려면
npx vercel link           # 이 폴더를 Vercel 프로젝트에 연결
npx vercel env pull .env.local
npm run dev
```

## 트러블슈팅

| 증상 | 확인할 것 |
| --- | --- |
| `DATABASE_URL 환경변수가 필요합니다` | Neon을 프로젝트에 Connect했는지 확인하세요. 환경변수를 추가한 뒤에는 **Redeploy**해야 합니다 |
| `SESSION_SECRET 환경변수(32자 이상)가 필요합니다` | `openssl rand -base64 32`로 만든 값(44자)을 넣으세요 |
| `relation "users" does not exist` | `db/schema.sql`을 실행하지 않았거나, 다른 Neon DB(브랜치)에 실행했습니다 |
| 스크린샷 업로드 실패 | Blob 스토어를 Connect했는지(`BLOB_READ_WRITE_TOKEN`), 스토어가 Private인지 확인하세요 |
| 로그인 후 다시 로그인 화면이 나옴 | 배포 사이에 `SESSION_SECRET`이 바뀌었는지 확인하세요 |
| 오랜만에 첫 접속이 느림 | Neon이 잠들었다가 깨어나는 중입니다(1초 이내). 정상입니다 |
