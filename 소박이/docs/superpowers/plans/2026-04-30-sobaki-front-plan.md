# 소박이 프론트엔드 구현 계획

**날짜**: 2026-04-30  
**대상**: `소박이/` — AppsInToss WebView 미니앱 (Vite + React)  
**스펙 참조**: `소박이/docs/superpowers/specs/2026-04-30-sobaki-design.md`

---

## Goal

소박이 앱의 WebView 프론트엔드를 구현한다. 토스 앱 내 미니앱으로 동작하며, 소박이 수달의 방을 canvas로 렌더링하고, 지출 기록 / 캘린더 / 퀘스트 / 아이템 도감 화면을 TDS 컴포넌트로 구성한다.

## Architecture


## Tech Stack

| 항목 | 기술 |
|------|------|
| 프레임워크 | `@apps-in-toss/web-framework` (Vite + React) |
| TDS | `@toss/tds-mobile` + `@toss/tds-mobile-ait` |
| 상태 관리 | Zustand (클라이언트) |
| 서버 상태 | TanStack Query v5 |
| HTTP | axios |
| 룸 렌더링 | react-konva |
| 애니메이션 | lottie-react |
| 테스트 | Vitest + @testing-library/react |
| 빌드/배포 | `ait build` / `ait deploy` |

---

## 구현 태스크

### Phase 0 — 프로젝트 초기 설정

#### Task 0-1: 패키지 설정 및 의존성 설치

**목표**: 소박이 미니앱 프로젝트 골격 구성

1. `package.json` 작성:


2. `granite.config.ts` 작성:


3. `vite.config.ts`:


4. `src/test/setup.ts`:


#### Task 0-2: 앱 진입점 + TDS Provider + 라우팅

**실패 테스트 작성** (`src/App.test.tsx`):


**구현** (`src/main.tsx`):


**구현** (`src/App.tsx`):


**구현** (`src/components/common/AppLayout.tsx`):


**커밋**: `feat: 소박이 AIT 앱 초기 설정 — TDS Provider, 탭 라우팅, 테스트 환경`

---

### Phase 1 — 인증 레이어 (getAnonymousKey → JWT)

#### Task 1-1: Zustand 인증 스토어

**목표**: `getAnonymousKey()` 호출 → 백엔드 POST /api/v1/auth/anonymous → JWT 저장

**실패 테스트** (`src/stores/authStore.test.ts`):


**구현** (`src/stores/authStore.ts`):


#### Task 1-2: API 클라이언트 + 인증 초기화 훅

**실패 테스트** (`src/api/client.test.ts`):


**구현** (`src/api/client.ts`):


**구현** (`src/api/auth.ts`):


**구현** (`src/hooks/useAuth.ts`):


**`src/main.tsx` 업데이트** — `<AuthGate>` 래퍼 추가:


**커밋**: `feat: 인증 레이어 — getAnonymousKey, JWT 저장, axios 클라이언트`

---

### Phase 2 — API 레이어 (TanStack Query hooks)

#### Task 2-1: Room API + useRoom hook

**실패 테스트** (`src/api/room.test.ts`):


**구현** (`src/api/room.ts`):


**구현** (`src/hooks/useRoom.ts`):


#### Task 2-2: Ledger / Items / Quests API

**구현** (`src/api/ledger.ts`):


**구현** (`src/api/items.ts`):


**구현** (`src/api/quests.ts`):


**구현** (`src/api/ai.ts`):


**커밋**: `feat: API 레이어 — room, ledger, items, quests, ai 엔드포인트`

---

### Phase 3 — Room 페이지 (홈 — 소박이의 방)

#### Task 3-1: react-konva 룸 캔버스

**실패 테스트** (`src/components/room/RoomCanvas.test.tsx`):


**구현** (`src/components/room/RoomCanvas.tsx`):


#### Task 3-2: 소박이 Lottie 캐릭터

**구현** (`src/components/sobak/SobakLottie.tsx`):


> **참고**: Lottie JSON 파일은 `src/assets/characters/sobak-idle.json`, `sobak-react.json`에 위치. 실제 구현 시 디자이너로부터 전달받은 파일 사용. 없을 경우 빈 JSON `{}` 으로 placeholder.

#### Task 3-3: Room 페이지 조합

**구현** (`src/pages/Room/index.tsx`):


**구현** (`src/hooks/useWindowSize.ts`):


**구현** (`src/pages/Room/ItemTooltip.tsx`):


**커밋**: `feat: Room 페이지 — react-konva 룸 캔버스, 소박이 Lottie, 아이템 툴팁`

---

### Phase 4 — 지출 기록 (Ledger) 모달

#### Task 4-1: 지출 기록 폼

**실패 테스트** (`src/pages/Room/LedgerModal.test.tsx`):


**구현** (`src/pages/Room/LedgerModal.tsx`):


**커밋**: `feat: 지출 기록 모달 — 금액/카테고리/절약 여부/영수증 AI 파싱`

---

### Phase 5 — 캘린더 가계부

#### Task 5-1: 월간 캘린더 페이지

**실패 테스트** (`src/pages/Calendar/index.test.tsx`):


**구현** (`src/pages/Calendar/index.tsx`):


**구현** (`src/pages/Calendar/CalendarGrid.tsx`):


**구현** (`src/pages/Calendar/DayDetail.tsx`):


**커밋**: `feat: 캘린더 가계부 — 월간 그리드, 날짜별 상세, 월간 통계`

---

### Phase 6 — 퀘스트 페이지

#### Task 6-1: 퀘스트 목록 + 진행도

**실패 테스트** (`src/pages/Quest/index.test.tsx`):


**구현** (`src/pages/Quest/index.tsx`):


**커밋**: `feat: 퀘스트 페이지 — 진행도 바, 보상 아이템 미리보기`

---

### Phase 7 — 아이템 도감

#### Task 7-1: 도감 그리드 페이지

**실패 테스트** (`src/pages/Catalog/index.test.tsx`):


**구현** (`src/pages/Catalog/index.tsx`):


**커밋**: `feat: 아이템 도감 — 4열 그리드, 희귀도별 테두리, 미획득 잠금 표시`

---

### Phase 8 — 설정 페이지

#### Task 8-1: 설정 (예산 + 계정)

**구현** (`src/pages/Settings/index.tsx`):


**커밋**: `feat: 설정 페이지 — 월/주 예산 설정, 계정 정보`

---

### Phase 9 — 공유 기능 + 통합 완성

#### Task 9-1: 퀘스트 완료 / 아이템 획득 공유

**구현** (`src/hooks/useShare.ts`):


#### Task 9-2: 최종 통합 테스트 + 환경변수

**`.env.development`**:


**`.env.production`**:


**`src/pages/Room/index.tsx` — 공유 버튼 추가**:


**`src/App.tsx` — AuthGate 적용 완성**:


**전체 통합 테스트** (`src/integration/app.test.tsx`):


**커밋**: `feat: 공유 기능, 통합 테스트, 환경변수 설정 — 소박이 프론트 MVP 완성`

---

## 구현 완료 체크리스트

| Phase | 내용 | 상태 |
|-------|------|------|
| 0 | 프로젝트 설정, TDS Provider, 탭 라우팅 | ⬜ |
| 1 | 인증 (getAnonymousKey → JWT → Zustand) | ⬜ |
| 2 | API 레이어 (axios + TanStack Query hooks) | ⬜ |
| 3 | Room 페이지 (react-konva + Lottie + 아이템 툴팁) | ⬜ |
| 4 | 지출 기록 모달 (폼 + 영수증 AI 파싱) | ⬜ |
| 5 | 캘린더 가계부 (월간 그리드 + 날짜 상세) | ⬜ |
| 6 | 퀘스트 페이지 (진행도 바 + 보상 미리보기) | ⬜ |
| 7 | 아이템 도감 (4열 그리드 + 잠금 표시) | ⬜ |
| 8 | 설정 페이지 (예산 + 계정) | ⬜ |
| 9 | 공유 기능 + 통합 테스트 + 배포 환경변수 | ⬜ |

## 주요 API 매핑

| 페이지 | Query Key | API |
|--------|-----------|-----|
| Room | `['room']` | GET /api/v1/room |
| Calendar | `['calendar', year, month]` | GET /api/v1/ledger/calendar |
| Quest | `['quests']` | GET /api/v1/quests/current |
| Catalog | `['items', 'catalog']` | GET /api/v1/items/catalog |
| Ledger 저장 | mutation | POST /api/v1/ledger/spending |
| 영수증 파싱 | mutation | POST /api/v1/ai/receipt/parse |
| 퀘스트 진행 | mutation | POST /api/v1/quests/{id}/progress |

## 빌드 & 배포

