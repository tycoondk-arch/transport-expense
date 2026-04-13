# 현장교통비신청시스템 풀스택 리팩토링 플랜

## Context

현재 시스템은 단일 HTML 파일(1,727줄)로 구성된 교통비 정산 앱입니다. Vanilla JS + localStorage 기반으로, 대중교통 모달 재사용 버그, 엑셀 컬럼 시프트, transit type 미저장 등 구조적 문제가 다수 존재합니다.

사용자의 기존 프로덕션 프로젝트(`biz-onecut-next`)에서 검증된 스택을 동일하게 적용하여 풀스택으로 전환합니다:
- Next.js 16 + React 19 + TypeScript + Tailwind CSS 4
- Prisma + SQLite (개발) → PostgreSQL (프로덕션 마이그레이션)
- NextAuth v5 + Credentials Provider
- OpenAI Vision API (OCR) - **API 키 보유 확인됨**
- tMAP API (지도/거리) - **API 키 미보유, 플레이스홀더로 구현 후 나중에 연동**

## 프로젝트 위치
- **현재 폴더에 생성**: `D:/lap/26.04.09 현장교통비신청시스템/`
- 기존 `교통비신청시스템.html`은 `_legacy/` 폴더로 이동하여 참조용 보존

---

## 프로젝트 구조

```
D:/lap/26.04.09 현장교통비신청시스템/
├── _legacy/
│   └── 교통비신청시스템.html         # 원본 보존 (참조용)
├── .github/workflows/
│   └── ci.yml                          # CI/CD 파이프라인
├── prisma/
│   ├── schema.prisma                   # DB 스키마
│   ├── migrations/
│   └── seed.ts                         # 초기 데이터
├── public/
│   ├── icons/                          # PWA 아이콘
│   └── manifest.json
├── app/
│   ├── globals.css                     # Tailwind 4 import
│   ├── layout.tsx                      # Root: SessionProvider, 폰트, 메타데이터
│   ├── page.tsx                        # → /dashboard 리다이렉트
│   ├── (auth)/
│   │   ├── layout.tsx                  # 인증 페이지 레이아웃
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx                  # 앱 셸: 헤더, 하단 네비, 월 피커
│   │   ├── dashboard/page.tsx          # [요구#7] 캘린더 대시보드
│   │   ├── fuel/page.tsx               # 주유/충전 영수증
│   │   ├── trips/page.tsx              # 회차별 신청
│   │   ├── transit/page.tsx            # [요구#6] 대중교통 전용 페이지
│   │   ├── summary/page.tsx            # 정산 요약
│   │   ├── export/page.tsx             # 엑셀/리포트 내보내기
│   │   └── settings/page.tsx           # 사용자 설정
│   └── api/
│       ├── auth/[...nextauth]/route.ts
│       ├── register/route.ts
│       ├── user/profile/route.ts       # GET/PUT 사용자 프로필
│       ├── ocr/route.ts                # [요구#1] OpenAI Vision OCR
│       ├── geocode/route.ts            # tMAP 주소→좌표
│       ├── distance/route.ts           # [요구#9] tMAP 경로 거리
│       ├── location-verify/route.ts    # [요구#2] 주유소 위치 검증
│       ├── fuel-receipts/
│       │   ├── route.ts                # GET(목록), POST(생성)
│       │   └── [id]/
│       │       ├── route.ts            # GET, PUT, DELETE
│       │       └── image/route.ts      # 이미지 서빙
│       ├── toll-receipts/              # 동일 CRUD 패턴
│       ├── transit-receipts/           # 동일 CRUD 패턴 + transitType
│       ├── trips/                      # 동일 CRUD 패턴
│       ├── monthly-summary/route.ts    # 서버사이드 정산 계산
│       └── export/
│           ├── excel/route.ts          # XLSX 생성/다운로드
│           └── report/route.ts         # [요구#8] 이미지 포함 리포트
├── components/
│   ├── ui/                             # [요구#11] 아토믹 UI (Button, Card, Input, Modal, RadioGroup, Alert, ProgressBar, Calendar 등)
│   ├── receipt/                        # CaptureZone, ReceiptItem, FuelReceiptModal, TollReceiptModal, TransitReceiptModal, ImageViewer, OcrOverlay
│   ├── trip/                           # TripCard, TripList, TripForm, CommuteDaysInput
│   ├── dashboard/                      # CalendarView, BudgetGauge, DaySummaryPopover
│   ├── summary/                        # SummaryTable, LimitBar
│   ├── export/                         # ExportPreview, Checklist
│   ├── settings/                       # ProfileForm, AddressSection, VehicleTypeSelector, FuelTypeSelector, DataManagement
│   ├── map/                            # TMapView, RouteDisplay, LocationVerifyBadge
│   └── layout/                         # AppHeader, BottomNav, MonthPicker
├── lib/
│   ├── prisma.ts                       # Prisma 싱글턴
│   ├── constants.ts                    # FUEL_EFFICIENCY, MONTHLY_LIMIT 등
│   ├── calculations.ts                 # [요구#5] 비즈니스 로직 (원안 보존)
│   ├── ocr.ts                          # OpenAI Vision 래퍼
│   ├── tmap.ts                         # tMAP API 래퍼
│   ├── distance.ts                     # Haversine + 반경 검증
│   ├── excel.ts                        # SheetJS 엑셀 생성
│   ├── validation.ts                   # 입력값 검증
│   ├── image.ts                        # 이미지 압축/유틸
│   └── report.ts                       # 리포트 생성
├── hooks/
│   ├── useMonthContext.ts              # 월 선택 상태
│   ├── useFuelReceipts.ts             # SWR 기반 CRUD
│   ├── useTollReceipts.ts
│   ├── useTransitReceipts.ts
│   ├── useTrips.ts
│   ├── useSummary.ts
│   ├── useOcr.ts
│   └── useLocationVerify.ts
├── types/index.ts                      # 공유 TypeScript 타입
├── auth.ts                             # NextAuth 설정 (biz-onecut-next 패턴)
├── auth.config.ts                      # 콜백 + 라우트 보호
├── middleware.ts                       # NextAuth 미들웨어
├── next.config.ts
├── vercel.json
├── package.json
├── tsconfig.json
├── eslint.config.mjs
├── postcss.config.mjs
├── vitest.config.ts
├── .env.example
├── .gitignore
└── CLAUDE.md
```

---

## 데이터베이스 스키마

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"          // 프로덕션 시 "postgresql"로 변경
  url      = env("DATABASE_URL")
}

// ===== AUTH (NextAuth v5 표준 + biz-onecut-next 패턴) =====

model User {
  id              String    @id @default(cuid())
  email           String    @unique
  name            String?
  password        String
  emailVerified   DateTime?
  image           String?
  accounts        Account[]
  sessions        Session[]
  profile         UserProfile?
  fuelReceipts    FuelReceipt[]
  tollReceipts    TollReceipt[]
  transitReceipts TransitReceipt[]
  trips           Trip[]
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

model UserProfile {
  id               String   @id @default(cuid())
  userId           String   @unique
  user             User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  department       String?
  displayName      String?
  workerType       String   @default("field")    // "field" | "home"
  vehicleType      String   @default("car")      // "car" | "transit"
  fuelType         String   @default("fuel")     // "fuel" | "electric" | "hydrogen"
  homeAddress      String?
  homeShortAddress String?
  homeLat          Float?
  homeLng          Float?
  siteAddress      String?
  siteShortAddress String?
  siteLat          Float?
  siteLng          Float?
  oneWayDistance    Float    @default(0)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
}

model Account { /* NextAuth 표준 */ }
model Session { /* NextAuth 표준 */ }
model VerificationToken { /* NextAuth 표준 */ }

// ===== 도메인 모델 =====

model FuelReceipt {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  month           String                          // "2026-04" (월별 파티션 인덱스)
  date            String                          // "2026-04-05"
  quantity        Float    @default(0)            // L, kWh, kg
  amount          Int      @default(0)            // 원
  stationName     String?                         // OCR 추출 주유소명
  stationAddress  String?                         // OCR 추출 주소
  stationLat      Float?
  stationLng      Float?
  locationStatus  String   @default("UNKNOWN")    // "NEAR_HOME" | "NEAR_SITE" | "UNKNOWN"
  locationReason  String?                         // UNKNOWN일 때 사유
  imageData       Bytes?                          // 원본 이미지 (DB 저장)
  imageMime       String?
  ocrRawJson      String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  @@index([userId, month])
}

model TollReceipt {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  month      String
  date       String
  amount     Int      @default(0)
  tripId     String?
  trip       Trip?    @relation(fields: [tripId], references: [id], onDelete: SetNull)
  imageData  Bytes?
  imageMime  String?
  ocrRawJson String?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  @@index([userId, month])
}

model TransitReceipt {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  month       String
  date        String
  amount      Int      @default(0)
  transitType String   @default("express")  // "express"(시외) | "local"(시내)
  tripId      String?
  trip        Trip?    @relation(fields: [tripId], references: [id], onDelete: SetNull)
  imageData   Bytes?
  imageMime   String?
  ocrRawJson  String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  @@index([userId, month])
}

model Trip {
  id              String            @id @default(cuid())
  userId          String
  user            User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  month           String
  roundNumber     Int
  startDate       String
  endDate         String
  commuteDays     Int               @default(0)
  tollReceipts    TollReceipt[]
  transitReceipts TransitReceipt[]
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
  @@unique([userId, month, roundNumber])
  @@index([userId, month])
}
```

**핵심 설계 결정:**
- `TransitReceipt`를 `TollReceipt`와 완전 분리 → 기존 모달 재사용 버그 근본 해결
- `FuelReceipt.locationStatus` + `locationReason` → 요구#2 위치 검증
- `imageData: Bytes` → 요구#8 원본 이미지 DB 저장
- `month` 필드 인덱스 → 월별 조회 성능 최적화
- SQLite↔PostgreSQL 호환 타입만 사용 → 요구#3 마이그레이션 대비

---

## 비즈니스 로직 보존 (요구#5)

`lib/calculations.ts`에 원본 로직 그대로 포팅:

```typescript
// 상수 (원본 lines 592-596 동일)
export const FUEL_EFFICIENCY = { fuel: 7, electric: 3.5, hydrogen: 65.8 } as const;
export const MONTHLY_LIMIT = 250_000;

// 핵심 수식 (원본 lines 688-749 동일)
// 평균단가 = 총주유금액 / 총주유량
// 주유비 = 평균단가 × 이동거리 ÷ 환산연비
// 현장근무자: 이동거리 = 왕복거리 (1회차당)
// 자택출근자: 이동거리 = 왕복거리 × 출퇴근일수
// 자차: 산출금액 = 주유비 + 통행료
// 대중교통: 산출금액 = 시외교통비 + 시내교통비
// 한도초과 시 마지막 회차에서 차감
```

---

## 외부 API 연동

### OpenAI Vision OCR (요구#1)
- **엔드포인트**: `POST https://api.openai.com/v1/chat/completions`
- **모델**: `gpt-4o-mini` (비용 효율, 영수증 OCR에 충분)
- **서버사이드 실행** (`/api/ocr/route.ts`) → API 키 노출 없음
- 주유 영수증: date, quantity, amount + **stationName, stationAddress** 추출 (위치 검증용)
- 통행료/대중교통: date, amount 추출

### tMAP API (요구#9) - **API 키 미보유, 플레이스홀더 우선 구현**
- **Geocoding**: `GET /tmap/geo/geocoding` → 주소→좌표 변환
- **경로 탐색**: `POST /tmap/routes` → 두 지점 간 실제 주행 거리(m) 반환
- **JavaScript SDK**: 프론트엔드 지도 표시 (`Tmapv2.Map`, `Marker`, `Polyline`)
- **환경변수**: `TMAP_APP_KEY` (서버), `NEXT_PUBLIC_TMAP_APP_KEY` (클라이언트 지도)
- **플레이스홀더 전략**: API 키 없을 때 수동 거리 입력 폴백 유지, 지도 영역에 "tMAP API 키를 설정하면 지도가 표시됩니다" 안내 표시. `lib/tmap.ts`에 `TMAP_APP_KEY` 존재 여부 체크하여 graceful degradation

### 위치 검증 흐름 (요구#2)
1. OCR에서 `stationAddress` 추출
2. tMAP Geocoding으로 좌표 변환
3. Haversine 거리 계산: 자택/파견지와의 거리
4. **반경 10km 이내**: `NEAR_HOME` 또는 `NEAR_SITE`
5. **미충족**: `UNKNOWN` → 사유 입력 필드 표시, DB 저장

---

## 구현 단계

### Phase 0: 프로젝트 스캐폴딩
- Next.js 16 프로젝트 생성, 의존성 설치
- Prisma 초기화 + 전체 스키마 작성 + 마이그레이션
- `lib/prisma.ts` 싱글턴 설정
- CI/CD 설정 파일 작성 (`.github/workflows/ci.yml`, `vercel.json`)
- `.env.example`, `.gitignore`, `CLAUDE.md`

**의존성:**
```
next@16 react@19 react-dom@19 @prisma/client next-auth@beta
@auth/prisma-adapter bcryptjs openai xlsx swr
prisma @types/bcryptjs tailwindcss@4 @tailwindcss/postcss
typescript @types/node @types/react eslint eslint-config-next
vitest @testing-library/react
```

### Phase 1: 인증 시스템 (요구#3)
- `auth.ts`, `auth.config.ts` → `biz-onecut-next` 패턴 복제
- `middleware.ts` → 인증 라우트 보호
- `/api/register/route.ts` → bcryptjs 해싱
- `/login`, `/register` 페이지
- `(app)/layout.tsx` → 세션 체크 + 앱 셸

### Phase 2: UI 컴포넌트 시스템 (요구#11)
- `components/ui/` 아토믹 컴포넌트 전체 작성
- `components/layout/` 앱 셸 컴포넌트
- Tailwind 4 테마 변수 → 디자인 변경 용이
- `(app)/layout.tsx` 하단 네비게이션 (7개 탭)

### Phase 3: 사용자 설정 + 프로필 (요구#3, #4)
- `/api/user/profile` CRUD
- 설정 페이지: 이름, 부서, 근무유형, 이동수단, 유종
- 주소 입력 + 자동 반영 (요구#4)
- `useMonthContext` 훅으로 월 선택 상태 관리

### Phase 4: 영수증 관리 + OCR (요구#1, #2, #6, #8)
- 주유 영수증 CRUD + `/api/ocr` OpenAI 연동
- 이미지 원본 DB 저장 (Bytes) + 서빙 API
- 위치 검증 (geocode → haversine → status/reason)
- 통행료 영수증 CRUD (수정 기능 추가 → 버그#3 수정)
- **대중교통 영수증 전용 페이지** (요구#6) → 시외/시내 타입 선택 → 버그#1, #4 완전 해결
- 수량(quantity) 필수 검증 추가 → 버그#5 수정

### Phase 5: 회차 관리 + 정산 (요구#5)
- 회차 CRUD API + 프론트엔드
- 서버사이드 정산 계산 (`/api/monthly-summary`)
- 현장근무자/자택출근자 분기 뷰
- 한도 조정 로직 (마지막 회차 차감)
- 정산요약 페이지 + LimitBar

### Phase 6: tMAP 지도 연동 (요구#9)
- `lib/tmap.ts` API 래퍼
- `/api/geocode`, `/api/distance` 엔드포인트
- `TMapView` 컴포넌트 (JavaScript SDK)
- 설정 페이지 "거리 자동 계산" 버튼 → 편도거리 자동입력
- 경로 시각화

### Phase 7: 캘린더 대시보드 (요구#7)
- `CalendarView`: 월간 그리드, 일별 영수증/금액 표시
- `BudgetGauge`: 잔여 한도 시각화 (250,000원 기준)
- `DaySummaryPopover`: 일별 상세 보기
- 퀵 액션 버튼

### Phase 8: 엑셀 내보내기 + 리포트 (요구#8)
- `lib/excel.ts` → 서버사이드 SheetJS (5개 시트 원본 양식 보존)
- **엑셀 컬럼 시프트 버그 수정** → 합계행 N/O열 정렬
- `/api/export/excel` → XLSX 스트림 다운로드
- `/api/export/report` → 기간별 이미지 포함 리포트 생성 (요구#8)
- 제출 체크리스트

### Phase 9: CI/CD + 테스트 + 마무리 (요구#12)
- `vitest` 단위 테스트: `calculations.ts`, `validation.ts`, `excel.ts`
- GitHub Actions CI 파이프라인: lint → type-check → test → build
- Vercel 자동 배포 설정
- PWA manifest
- 에러 바운더리, 로딩 스켈레톤
- 코드 포매팅 (Prettier)

---

## 버그 수정 매핑

| 버그 | 원인 (원본 라인) | 해결 |
|------|------------------|------|
| 대중교통 영수증이 통행료로 저장됨 | `handleTransitImage` → `openTollModal` (L929) | `TransitReceipt` 별도 모델 + 전용 페이지/모달 |
| 엑셀 합계행 컬럼 밀림 | 합계 offset 14에 3개 값 배치 (L1531) | N열(산출금액), O열(신청금액)에 정렬 |
| 통행료 수정 불가 | `editTollReceipt` 함수 미구현 | `TollReceiptModal` edit 모드 + 수정 버튼 |
| 대중교통 시외/시내 구분 미저장 | 타입 선택 UI 없음 | `TransitReceiptModal`에 RadioGroup 추가 |
| 주유량 0 허용 | 수량 검증 없음 (L966) | 프론트+API 모두 `quantity > 0` 필수 검증 |
| 통행료 모달에서 회차 목록 빈 값 | trips 탭 미방문 시 데이터 미로드 | 페이지 마운트 시 `useTrips` 훅으로 선로드 |

---

## CI/CD 설정 (요구#12)

### `.github/workflows/ci.yml`
```yaml
name: CI
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '24', cache: 'npm' }
      - run: npm ci
      - run: npx prisma generate
      - run: npm run lint
      - run: npx tsc --noEmit
      - run: npm test
      - run: npm run build
    env:
      DATABASE_URL: "file:./test.db"
      AUTH_SECRET: "ci-test-secret"
```

### `vercel.json`
```json
{
  "framework": "nextjs",
  "buildCommand": "npx prisma generate && npm run build",
  "regions": ["icn1"]
}
```

### `.env.example`
```
DATABASE_URL="file:./prisma/dev.db"
AUTH_SECRET="openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
OPENAI_API_KEY="sk-..."              # 필수 - OCR용
TMAP_APP_KEY=""                       # 선택 - 없으면 수동 거리입력 모드
NEXT_PUBLIC_TMAP_APP_KEY=""           # 선택 - 없으면 지도 미표시
```

---

## SQLite → PostgreSQL 마이그레이션 경로 (요구#3)

1. `schema.prisma`에서 `provider = "sqlite"` → `"postgresql"` 변경
2. `directUrl = env("DIRECT_URL")` 추가 (커넥션 풀링)
3. `npx prisma migrate deploy` 실행
4. Vercel 환경변수에 PostgreSQL URL 설정
5. 스키마는 호환 타입만 사용하므로 변경 없음 (`Bytes` → `BYTEA` 자동 매핑)

---

## 검증 방법

1. **인증**: 회원가입 → 로그인 → 세션 유지 → 로그아웃 확인
2. **OCR**: 주유 영수증 사진 업로드 → 날짜/금액/수량/주유소 자동 추출 확인
3. **위치 검증**: 주유소 주소 → 자택/파견지 반경 10km 판별 → 미충족 시 사유 입력
4. **회차 정산**: 회차 추가 → 주유비/통행료 계산 → 한도(25만원) 초과 시 마지막 회차 조정
5. **대중교통**: 전용 페이지에서 시외/시내 구분 입력 → 회차에 올바르게 집계
6. **캘린더**: 일별 영수증 표시 → 잔여 한도 게이지 확인
7. **엑셀**: 다운로드 → 5개 시트 구조 확인 → 합계행 컬럼 정렬 검증
8. **리포트**: 기간 선택 → 이미지 포함 리포트 다운로드
9. **tMAP**: 주소 입력 → 지도 표시 → "거리 계산" → 편도거리 자동입력
10. **CI**: `npm test` → `npm run build` 성공 확인

---

## 참조 파일

- `_legacy/교통비신청시스템.html` — 원본 비즈니스 로직, 계산 수식, 엑셀 양식의 source of truth
- `d:/lap/biz-onecut-next/auth.ts` — NextAuth v5 + Prisma 인증 패턴
- `d:/lap/biz-onecut-next/prisma/schema.prisma` — Prisma 스키마 컨벤션 (cuid, onDelete, 인덱스)
- `d:/lap/biz-onecut-next/lib/ocr.ts` — OCR 구현 패턴 (프롬프트, JSON 추출, 에러 처리)
- `d:/lap/biz-onecut-next/lib/kakao.ts` — 지도 API 연동 패턴 (tMAP으로 적용)
