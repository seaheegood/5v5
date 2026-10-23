# 배포 가이드 (처음부터 오픈까지)

이 문서만 순서대로 따라 하면 친구들에게 링크를 공유하는 단계까지 끝납니다. 약 30분 걸립니다.

- **구성:** Vercel(호스팅) + Neon(DB) + Vercel Blob(스크린샷). 전부 무료 플랜입니다.
- **필요한 것:** 웹 브라우저, GitHub 계정(`seaheegood`). 코드는 이미 https://github.com/seaheegood/5v5 에 있습니다.
- **로컬 설치는 필요 없습니다.** 모든 작업을 웹에서 합니다.

> 서비스 화면의 메뉴 이름이나 위치는 바뀔 수 있습니다. 아래는 2026년 10월 기준이니, 이름이 조금 달라도 비슷한 메뉴를 찾으면 됩니다.

---

## 1. Vercel 가입과 GitHub 연결

1. https://vercel.com → **Sign Up** → **Continue with GitHub**로 가입합니다.
   - 플랜을 물으면 **Hobby**(무료)를 고릅니다.
2. Vercel이 GitHub 접근 권한을 요청하면 허용합니다.
   - "All repositories"와 "Only select repositories" 중에 고르라고 하면 **Only select repositories → `5v5`**를 선택하면 됩니다.

## 2. 프로젝트 가져오기 (첫 배포)

1. Vercel 대시보드 → **Add New… → Project**
2. 목록에서 `5v5` 옆의 **Import**를 누릅니다.
   - 목록에 없으면 **Adjust GitHub App Permissions**를 눌러 `5v5` 저장소 접근을 허용하세요.
3. 설정 화면은 **아무것도 바꾸지 말고** **Deploy**를 누릅니다.
   - Framework는 Next.js로 자동 감지됩니다. 환경변수는 다음 단계에서 넣습니다.
4. 1~2분 뒤 배포가 끝납니다. 아직 DB가 없어서 **사이트를 열면 에러가 나는 게 정상**입니다.
5. 배포 주소(예: `https://5v5-xxxx.vercel.app`)를 메모해 두세요.

## 3. DB 만들기 (Neon)

1. 프로젝트 화면 → **Storage** 탭 → **Create Database** (또는 Browse Marketplace) → **Neon**을 선택합니다.
2. 생성 옵션을 고릅니다.
   - Plan: **Free**
   - Region: 한국과 가까운 **아시아 리전**(예: Singapore). 고른 리전을 메모해 두세요(5단계에서 사용).
   - 이름: 아무거나 (예: `5v5-db`)
3. 만든 뒤 **Connect Project**에서 `5v5` 프로젝트에 연결합니다.
   - 환경은 Production, Preview, Development 모두 체크된 상태로 둡니다.
4. **Settings → Environment Variables**에 `DATABASE_URL`이 생겼는지 확인합니다.
   - 없거나 다른 이름(`POSTGRES_URL` 등)만 있으면, 같은 값을 `DATABASE_URL`이라는 이름으로 하나 더 추가하세요.
     값은 Neon 콘솔 → **Connect**의 connection string이고, `-pooler`가 들어간 주소를 쓰면 됩니다.
5. **테이블 만들기**
   1. Storage 탭에서 방금 만든 DB → **Open in Neon**을 누릅니다(Neon 콘솔이 열림).
   2. 왼쪽 **SQL Editor**를 엽니다.
   3. GitHub의 [`db/schema.sql`](../db/schema.sql)을 열고 **Raw** 버튼을 눌러 전체 내용을 복사합니다.
   4. SQL Editor에 붙여넣고 **Run**을 누릅니다.
   5. 왼쪽 **Tables**에 `users`, `schedules`, `match_settings`, `match_votes`, `match_screenshots` 5개가 보이면 성공입니다.

## 4. 스크린샷 저장소 만들기 (Vercel Blob)

1. Vercel 프로젝트 → **Storage** 탭 → **Create** → **Blob**을 선택합니다.
2. 이름은 아무거나 넣습니다. 접근 방식(Access)을 고르라고 하면 **Private**을 선택합니다.
3. **Connect Project**에서 `5v5`에 연결합니다.
4. **Settings → Environment Variables**에 `BLOB_READ_WRITE_TOKEN`이 생겼는지 확인합니다.

## 5. 나머지 설정

### 5-1. 세션 비밀키 (`SESSION_SECRET`)

로그인 쿠키에 서명하는 비밀값입니다. **32자 이상의 아무 랜덤 문자열**이면 됩니다. 아래 중 편한 방법으로 만드세요.

| 환경 | 명령 |
| --- | --- |
| Mac / Linux 터미널 | `openssl rand -base64 32` |
| Windows PowerShell | `[Convert]::ToBase64String((1..32 \| ForEach-Object { Get-Random -Max 256 }))` |
| Node.js가 있으면 | `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |

**Settings → Environment Variables → Add New**에서 추가합니다.
- Key: `SESSION_SECRET`
- Value: 위에서 만든 값
- Environments: Production, Preview, Development 모두 체크

> 이 값은 한 번 정하면 바꾸지 마세요. 바꾸면 모든 멤버가 로그아웃됩니다.

이제 환경변수 목록에 **`DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, `SESSION_SECRET`** 3개가 있어야 합니다.

### 5-2. 서버 리전 맞추기 (권장)

**Settings → Functions → Function Region**을 3단계에서 고른 DB 리전과 같은 곳으로 바꿉니다.
- 예: Neon을 Singapore에 만들었다면 `Singapore (sin1)`

화면 하나를 그릴 때 DB 쿼리가 여러 번 나가서, 서버와 DB가 가까울수록 체감 속도가 빨라집니다.

## 6. 다시 배포

**Deployments** 탭 → 맨 위 배포의 **⋯ → Redeploy → Redeploy**를 누릅니다.
환경변수와 리전은 재배포해야 반영됩니다. 1~2분 기다리세요.

## 7. 동작 확인 (혼자 해볼 수 있는 순서)

배포 주소를 **휴대폰**으로 열고 아래 순서대로 확인합니다. 매치 카드는 5명이 있어야 생기므로, 테스트 계정을 잠깐 만들었다가 지웁니다.

1. **관리자 가입**
   - 멤버가 0명이라 바로 **멤버 추가** 화면이 나옵니다.
   - **본인 닉네임**으로 가입하세요. 첫 가입자가 관리자가 됩니다.
   - 가입 후 하단 탭에 **관리**가 보이면 성공입니다.
2. **프로필:** **내 정보**에서 티어와 라인을 바꾸고 **저장** → 상단 헤더에 반영되는지 확인합니다.
3. **테스트 멤버 4명 만들기**
   - 오른쪽 위 로그아웃 → **멤버 추가**로 `테스트1`~`테스트4`를 만듭니다. PIN은 아무거나 넣으세요.
   - 하나 만들 때마다 로그아웃하고 다음 계정을 만듭니다.
   - 끝나면 본인 계정으로 다시 로그인합니다.
4. **일정 등록**
   - **달력**에서 **오늘** 날짜를 누르고 **참여** + 라인 → **저장**합니다.
   - 같은 시트 맨 위 **대상** 드롭다운에서 `테스트1`~`테스트4`를 하나씩 골라 각각 참여로 저장합니다(관리자 대리 등록).
5. **매치 카드:** **매치** 탭에 오늘 날짜 카드가 생기고 `5/10`, "5명 더 필요"가 보이면 성공입니다.
6. **세팅:** 카드의 **수정**에서 방식과 판돈을 저장 → "설정: 본인 닉네임"이 표시되는지 확인합니다.
7. **결과**(오늘 날짜라서 보입니다)
   - **MVP**와 **범인**에서 테스트 멤버를 하나씩 눌러 숫자가 올라가는지 확인합니다.
   - **스크린샷 → 추가**로 사진을 1장 올리고, 썸네일을 눌러 크게 보이는지 확인합니다.
8. **정리 (중요)**
   - 매치 카드의 🗑 버튼으로 **카드를 삭제**합니다. 그날의 일정, 투표, 사진이 모두 지워집니다.
   - **관리** 탭에서 `테스트1`~`테스트4`를 펼쳐 각각 **삭제**합니다.

여기까지 문제가 없으면 오픈 준비가 끝났습니다. 막히는 단계가 있으면 맨 아래 **트러블슈팅**을 보세요.

## 8. 친구들에게 공유

단톡방 공지 예시:

```
⚔️ 주말 내전 일정 앱 오픈!
https://5v5-xxxx.vercel.app

1) 접속 → [멤버 추가] → 닉네임 / PIN 4자리 / 티어 / 라인 입력
2) [달력]에서 되는 날 누르고 참여 + 라인 선택 → 저장
3) 5명 이상 모이면 [매치] 탭에 카드가 생겨요

📱 홈 화면에 추가하면 앱처럼 쓸 수 있어요
 - 아이폰: Safari 공유 버튼 → 홈 화면에 추가
 - 안드로이드: Chrome 메뉴(⋮) → 홈 화면에 추가
PIN 잊어버리면 저한테 말해주세요 (초기화해 드림)
```

- PIN을 잊은 멤버는 **관리 탭 → 해당 멤버 → PIN 초기화**로 새 PIN을 정해서 알려 주세요. 잠금도 함께 풀립니다.
- 다른 친구에게 관리자 권한을 주려면 **관리 탭 → 해당 멤버 → 관리자 권한** 체크 → **저장**하면 됩니다.

## 9. 운영 중에 할 일

| 언제 | 할 일 |
| --- | --- |
| 코드를 고쳤을 때 | `main` 브랜치에 push하면 Vercel이 자동으로 다시 배포합니다 |
| DB 구조를 바꿀 때 | Neon SQL Editor에서 `alter table ...`을 실행하고 `db/schema.sql`도 같이 수정합니다 ([NOTES.md](NOTES.md) 참고) |
| 한 달에 한 번쯤 | Neon 콘솔과 Vercel의 **Usage**에서 사용량을 확인합니다(한도에 가까워지면 메일도 옵니다) |
| 가끔 | DB 백업: Neon 콘솔 → **Backup & Restore**, 또는 `pg_dump "$DATABASE_URL" > backup.sql` |

### (선택) 주소 바꾸기

- **Vercel 기본 주소 변경:** **Settings → Domains**에서 `5v5-xxxx.vercel.app`을 원하는 `○○○.vercel.app`으로 바꿀 수 있습니다(이미 쓰는 이름이 아닐 때).
- **개인 도메인:** 같은 화면에서 추가하고, 안내대로 도메인 업체의 DNS를 설정하면 됩니다.

---

## (참고) 로컬에서 실행

```bash
git clone https://github.com/seaheegood/5v5.git && cd 5v5
npm install

npm run dev:mock            # DB 없이 가짜 데이터로 (모든 PIN 0000)

# 실제 DB로 실행하려면 (Vercel CLI가 환경변수를 받아옴)
npx vercel link             # 이 폴더를 Vercel 프로젝트에 연결
npx vercel env pull .env.local
npm run dev
```

## 트러블슈팅

| 증상 | 원인 / 해결 |
| --- | --- |
| 사이트에 "Application error" 또는 500 | **Deployments → 해당 배포 → Logs**에서 에러 메시지를 확인하고 아래 표에서 찾으세요 |
| `DATABASE_URL 환경변수가 필요합니다` | 3단계의 Connect가 안 됐거나 이름이 다릅니다. 환경변수를 추가한 뒤 **Redeploy**하세요 |
| `SESSION_SECRET 환경변수(32자 이상)가 필요합니다` | 5-1단계 값을 넣고 **Redeploy**하세요 |
| `relation "users" does not exist` | 3-5단계(`schema.sql` 실행)를 안 했거나, 다른 DB/브랜치에 실행했습니다 |
| 스크린샷 업로드 실패 | 4단계 Blob 연결(`BLOB_READ_WRITE_TOKEN`)을 확인하세요. 스토어가 **Private**인지도 확인하세요 |
| 로그인했는데 다시 로그인 화면이 나옴 | `SESSION_SECRET`이 바뀌었는지 확인하세요. 주소가 `https`인지도 확인하세요 |
| PIN 잠김 | 5분 기다리거나, 관리자가 **PIN 초기화**를 해 주세요 |
| 관리자 계정을 잃어버림 | Neon SQL Editor에서 `update users set is_admin = true where nickname = '닉네임';`을 실행하세요 |
| 오랜만에 접속하면 첫 화면이 조금 느림 | Neon이 잠들었다가 깨어나는 중입니다(1초 이내). 정상입니다 |
| 환경변수를 바꿨는데 반영이 안 됨 | 환경변수는 **Redeploy** 후에 적용됩니다 |
