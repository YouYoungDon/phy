# 소박이 (Sobak's Little Joys) — 설계 문서

**날짜**: 2026-04-30  
**플랫폼**: 앱인토스 (AppsInToss) WebView 미니앱  
**상태**: 확정

---

## 1. 앱 개요

소박이는 **방치형 힐링 절약 앱**이다. 사용자가 소비를 기록하고 절약 퀘스트를 완수할 때마다, 소박이 수달이 사는 방에 음식/소품 아이템이 자동으로 하나씩 생겨난다. 강제로 줍거나 터치할 필요 없이 방이 점점 채워지는 모습을 보며 절약의 즐거움을 느끼는 구조다.

**핵심 감성**: 네코 아츠메(고양이 수집)처럼 들어왔을 때 "어, 이게 왜 생겼지?" 라는 궁금증과 소박한 보람.

---

## 2. 타겟 사용자

- 소비를 줄이고 싶지만 강제성 있는 가계부는 부담스러운 20-30대
- 귀여운 캐릭터/힐링 콘텐츠에 반응하는 사용자
- 토스 앱 내 일상적으로 사용하는 기존 토스 사용자

---

## 3. 플랫폼 스택

| 구분 | 기술 |
|------|------|
| 앱인토스 프레임워크 | `@apps-in-toss/web-framework` (Vite + React WebView) |
| TDS | `@toss/tds-mobile` |
| 상태 관리 | Zustand (클라이언트) + TanStack Query (서버) |
| 룸 렌더링 | react-konva (Canvas 기반) |
| 캐릭터 애니메이션 | lottie-react |
| 백엔드 | Spring Boot 3 + Java 17 |
| DB | PostgreSQL 15 + JPA/Hibernate |
| 이미지 저장 | AWS S3 |
| AI 검증 | Claude Vision API (`claude-3-5-sonnet-20241022`) |
| 인증 | 앱인토스 mTLS (서버 사이드) |

---

## 4. 화면 구성 (6개)

### 4.1 홈 — 소박이의 방 (룸)

- react-konva Canvas로 방 배경 렌더링
- 절약 행동으로 생긴 아이템들이 방 안에 배치됨 (자동, 사용자 터치 불필요)
- 소박이 수달 Lottie 애니메이션 (기본 대기, 아이템 발견 반응)
- 하단: "오늘 기록하기" 플로팅 버튼
- 아이템 탭 시: 어떤 절약 행동으로 생겼는지 툴팁 표시

### 4.2 지출 기록

- 금액 입력 + 카테고리 선택 (식비/카페/쇼핑/교통/기타)
- 절약 여부 체크 ("원래 살 뻔했는데 참았어요")
- 영수증 사진 첨부 → Claude Vision AI 자동 파싱 (금액, 가게명, 날짜)
- 메모 입력 (선택)
- 저장 시 daily_ledger sequence_no 자동 증가

### 4.3 캘린더 가계부

- 월간 캘린더 뷰 (TDS Calendar 컴포넌트)
- 날짜 탭 시 해당일 지출 목록 + 총액 표시
- 퀘스트 완료일에 스탬프 표시
- 날짜별 일기/감정(mood) 기록 가능
- 월간 절약 통계 (총 절약액, 퀘스트 완료 횟수)

### 4.4 퀘스트

- 현재 진행 중인 퀘스트 카드 (예: "카페 3번 참기", "배달 대신 직접 만들기")
- 진행률 바 + 완료 시 아이템 생성 미리보기
- 히스토리: 완료한 퀘스트 목록

### 4.5 아이템 도감

- 획득한 아이템 / 미획득(실루엣) 전체 그리드
- 아이템 탭 시: 이름, 획득 조건, 획득 날짜
- 미획득 아이템은 "???" 표시로 수집 욕구 자극

### 4.6 설정

- 예산 설정 (월/주)
- 알림 설정
- 계정 정보 (앱인토스 연동)

---

## 5. 아이템 시스템

### 5.1 생성 원칙

아이템은 **특정 절약 행동과 1:1 매핑**된다. 카페를 참으면 카페 관련 아이템, 배달을 참으면 집밥 아이템이 생기는 식으로 행동과 보상이 직결된다.

### 5.2 아이템 카테고리 및 예시

| 카테고리 | 아이템 예시 | 생성 조건 |
|---------|------------|---------|
| 길거리 음식 | 떡볶이, 순대, 붕어빵, 어묵, 호떡 | 분식 지출 절약 |
| 카페/디저트 | 아이스크림, 버블티, 마카롱, 크로플 | 카페 지출 절약 |
| 가정식 | 밥, 라면, 김치찌개, 된장찌개, 계란프라이 | 배달 대신 직접 요리 |
| 과자/간식 | 포테이토칩, 초코파이, 쿠키, 사탕 | 편의점 지출 절약 |
| 음료 | 커피, 주스, 우유, 보리차 | 음료 지출 절약 |
| 계절/특별 | 수박 조각, 군밤, 팥빙수, 따뜻한 국물 | 계절 퀘스트 완료 |
| 소품 | 화분, 쿠션, 양초, 책 | 쇼핑 절약 |
| 소박이 굿즈 | 소박이 인형, 소박이 머그컵 | 마일스톤 달성 |

**총 50개 이상** item_master 테이블에 시드 데이터로 관리.

### 5.3 아이템 희귀도

| 등급 | 색상 | 비율 | 조건 |
|-----|-----|-----|-----|
| 일반 | 회색 | 70% | 1회 절약 |
| 희귀 | 파란색 | 20% | 3연속 절약 |
| 특별 | 보라색 | 10% | 주간 퀘스트 완료 |

---

## 6. 비주얼 디자인

- **캐릭터**: 소박이 수달 — 파스텔톤, 수채화 느낌
- **로고**: SOBAK'S LITTLE JOYS (영문 타이포 + 수달 일러스트)
- **메인 컬러**: `#BA68C8` (보라색 계열)
- **배경**: 따뜻한 크림/베이지 톤 방 인테리어
- **폰트**: TDS 기본 + 손글씨 포인트 폰트
- **룸 스타일**: 도트/픽셀이 아닌 부드러운 수채화 일러스트

---

## 7. 백엔드 아키텍처

### 7.1 구조

```
sobaki-back/
├── src/main/java/com/sobaki/
│   ├── auth/           # mTLS 토스 인증
│   ├── user/           # 사용자 관리
│   ├── ledger/         # 가계부 (daily_ledgers, spending_items)
│   ├── item/           # 아이템 마스터 + 사용자 아이템
│   ├── quest/          # 퀘스트 정의 + 진행
│   ├── room/           # 룸 + 아이템 배치
│   ├── ai/             # Claude Vision API 영수증 파싱
│   └── common/         # 공통 응답, 예외 처리
```

### 7.2 핵심 API

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/v1/ledger/spending` | 지출 기록 저장 |
| GET | `/api/v1/ledger/calendar?year=&month=` | 월간 캘린더 데이터 |
| POST | `/api/v1/ai/receipt/parse` | 영수증 이미지 AI 파싱 |
| GET | `/api/v1/items/my` | 내 아이템 목록 |
| GET | `/api/v1/items/catalog` | 전체 아이템 도감 |
| GET | `/api/v1/room` | 룸 현재 상태 |
| GET | `/api/v1/quests/current` | 현재 퀘스트 |
| POST | `/api/v1/quests/{id}/progress` | 퀘스트 진행 업데이트 |

---

## 8. 데이터베이스 스키마 (10개 테이블)

### 8.1 users

```sql
CREATE TABLE users (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  toss_user_id    VARCHAR(100) UNIQUE NOT NULL,
  nickname        VARCHAR(50),
  profile_image   VARCHAR(500),
  monthly_budget  BIGINT DEFAULT 0,
  weekly_budget   BIGINT DEFAULT 0,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);
```

### 8.2 daily_ledgers (가계부 — 핵심 테이블)

```sql
CREATE TABLE daily_ledgers (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES users(id),
  record_date     DATE NOT NULL,
  sequence_no     INT NOT NULL DEFAULT 1,         -- 하루 복수 기록 지원, 백엔드에서 (user_id, record_date)의 MAX+1로 자동 계산
  total_spent     BIGINT DEFAULT 0,
  total_saved     BIGINT DEFAULT 0,
  budget_amount   BIGINT,
  diary_content   TEXT,
  mood            VARCHAR(20),                    -- happy/neutral/sad/proud
  quest_completed BOOLEAN DEFAULT FALSE,
  item_spawned    BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, record_date, sequence_no)
);
```

### 8.3 spending_items (개별 지출 항목)

```sql
CREATE TABLE spending_items (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  ledger_id       BIGINT NOT NULL REFERENCES daily_ledgers(id),
  user_id         BIGINT NOT NULL REFERENCES users(id),
  amount          BIGINT NOT NULL,
  category        VARCHAR(50) NOT NULL,            -- food/cafe/shopping/transport/etc
  description     VARCHAR(200),
  is_saved        BOOLEAN DEFAULT FALSE,           -- 절약 여부
  receipt_image   VARCHAR(500),                    -- S3 URL
  raw_data        JSONB,                           -- AI 파싱 결과 + 향후 토스 거래내역 연동용
  spend_time      TIMESTAMP,
  location_id     BIGINT REFERENCES locations(id), -- 향후 위치 기반 연동
  created_at      TIMESTAMP DEFAULT NOW()
);
```

### 8.4 locations (향후 위치 기반 서비스 확장용)

```sql
CREATE TABLE locations (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(200),
  address     VARCHAR(500),
  latitude    DECIMAL(10, 8),
  longitude   DECIMAL(11, 8),
  category    VARCHAR(50),
  created_at  TIMESTAMP DEFAULT NOW()
);
```

### 8.5 item_master (아이템 정의 — 시드 데이터)

```sql
CREATE TABLE item_master (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(100) NOT NULL,
  description     TEXT,
  image_url       VARCHAR(500),
  category        VARCHAR(50),                    -- food/drink/props/special
  rarity          VARCHAR(20) DEFAULT 'COMMON',   -- COMMON/RARE/SPECIAL
  spawn_condition VARCHAR(200),                   -- 생성 조건 설명
  trigger_category VARCHAR(50),                  -- 어떤 지출 카테고리 절약 시 생성
  trigger_count   INT DEFAULT 1,                  -- 몇 번 절약해야 생성되는지
  is_active       BOOLEAN DEFAULT TRUE,
  sort_order      INT DEFAULT 0
);
```

### 8.6 user_items (사용자 획득 아이템)

```sql
CREATE TABLE user_items (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES users(id),
  item_id         BIGINT NOT NULL REFERENCES item_master(id),
  obtained_at     TIMESTAMP DEFAULT NOW(),
  obtained_reason VARCHAR(200),                   -- 어떤 행동으로 획득했는지
  UNIQUE (user_id, item_id)
);
```

### 8.7 quests (퀘스트 정의)

```sql
CREATE TABLE quests (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  title           VARCHAR(200) NOT NULL,
  description     TEXT,
  quest_type      VARCHAR(50),                    -- daily/weekly/special
  target_category VARCHAR(50),
  target_count    INT DEFAULT 1,
  target_amount   BIGINT,
  reward_item_id  BIGINT REFERENCES item_master(id),
  is_active       BOOLEAN DEFAULT TRUE
);
```

### 8.8 user_quests (퀘스트 진행 상태)

```sql
CREATE TABLE user_quests (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES users(id),
  quest_id        BIGINT NOT NULL REFERENCES quests(id),
  status          VARCHAR(20) DEFAULT 'IN_PROGRESS', -- IN_PROGRESS/COMPLETED/FAILED
  current_count   INT DEFAULT 0,
  started_at      TIMESTAMP DEFAULT NOW(),
  completed_at    TIMESTAMP
);
```

### 8.9 rooms (룸 상태)

```sql
CREATE TABLE rooms (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id         BIGINT UNIQUE NOT NULL REFERENCES users(id),
  room_theme      VARCHAR(50) DEFAULT 'default',
  background_url  VARCHAR(500),
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);
```

### 8.10 room_placements (룸 내 아이템 배치)

```sql
CREATE TABLE room_placements (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  room_id         BIGINT NOT NULL REFERENCES rooms(id),
  user_item_id    BIGINT NOT NULL REFERENCES user_items(id),
  pos_x           FLOAT NOT NULL,
  pos_y           FLOAT NOT NULL,
  scale           FLOAT DEFAULT 1.0,
  rotation        FLOAT DEFAULT 0.0,
  layer_order     INT DEFAULT 0,
  placed_at       TIMESTAMP DEFAULT NOW()
);
```

---

## 9. AI 영수증 파싱

**모델**: `claude-3-5-sonnet-20241022`  
**입력**: Base64 인코딩된 영수증 이미지  
**출력**: JSON (`{ amount, store_name, date, items[], category }`)

**프롬프트 전략**:
```
이 영수증 이미지에서 다음 정보를 JSON으로 추출해주세요:
- total_amount: 총 결제 금액 (숫자만)
- store_name: 가게/업체명
- purchase_date: 구매 날짜 (YYYY-MM-DD)
- items: 개별 항목 목록 [{ name, price }]
- category: food/cafe/shopping/transport/etc 중 하나

확인 불가한 항목은 null로 반환하세요.
```

**원본 응답은 `raw_data` JSONB 컬럼에 저장** → 향후 토스 거래내역 API 연동 시에도 동일 필드 재사용.

---

## 10. 앱인토스 연동

### 10.1 인증 (mTLS)

- 토스 인증 서버와 통신은 서버 사이드 mTLS로 처리
- 프론트 → 백엔드 API 호출 시 JWT 토큰 기반
- `@apps-in-toss/web-framework`의 WebView 환경에서는 `appLogin()` 미지원 → 백엔드에서 처리

### 10.2 앨범/사진 접근

- WebView 환경: HTML `<input type="file" accept="image/*">` 사용
- 영수증 이미지 선택 후 S3 업로드 → AI 파싱 요청

### 10.3 공유 기능

- `share()` from `@apps-in-toss/web-framework` 사용 가능 ✅
- 퀘스트 완료 시 / 특별 아이템 획득 시 공유 유도

---

## 11. MVP 범위

**MVP에 포함**:
- 홈(룸) 화면 — react-konva + Lottie
- 지출 기록 (영수증 AI 파싱 포함)
- 캘린더 가계부 (기록 조회)
- 아이템 자동 생성 (절약 행동 → 아이템)
- 퀘스트 시스템 (기본 daily 퀘스트)
- 아이템 도감

**MVP 이후 확장**:
- 토스 거래내역 API 자동 동기화 (raw_data 재사용)
- 위치 기반 "근처 저렴한 가게" 추천 (locations 테이블 활용)
- 소셜 기능 (친구 룸 방문)
- 룸 테마 변경
- 주간/월간 절약 리포트

---

## 12. 디렉터리 구조

```
phy/
├── 소박이/                          # 앱인토스 미니앱 (프론트)
│   ├── granite.config.ts
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Room/               # 홈 룸 화면
│   │   │   ├── Ledger/             # 지출 기록
│   │   │   ├── Calendar/           # 캘린더 가계부
│   │   │   ├── Quest/              # 퀘스트
│   │   │   ├── Catalog/            # 아이템 도감
│   │   │   └── Settings/           # 설정
│   │   ├── components/
│   │   │   ├── room/               # Canvas 룸 컴포넌트
│   │   │   ├── sobak/              # 소박이 캐릭터 애니메이션
│   │   │   └── common/
│   │   ├── hooks/
│   │   ├── stores/                 # Zustand
│   │   ├── api/                    # TanStack Query + axios
│   │   └── assets/
│   │       ├── characters/         # 소박이 Lottie
│   │       ├── items/              # 아이템 이미지
│   │       └── room/               # 배경, 소품
│   └── docs/superpowers/specs/
│       └── 2026-04-30-sobaki-design.md
│
└── sobaki-back/                     # Spring Boot 백엔드
    └── src/main/java/com/sobaki/
        ├── auth/
        ├── user/
        ├── ledger/
        ├── item/
        ├── quest/
        ├── room/
        ├── ai/
        └── common/
```

---

## 13. 확장성 고려사항

| 향후 기능 | 현재 설계에서 준비된 부분 |
|----------|----------------------|
| 토스 거래내역 자동 연동 | `spending_items.raw_data` JSONB 필드 |
| 위치 기반 서비스 | `locations` 테이블, `spending_items.location_id` FK |
| 하루 복수 기록 | `daily_ledgers.sequence_no` + UNIQUE 제약 |
| AI 파싱 고도화 | `raw_data`에 원본 응답 전체 저장 |
| 새로운 아이템 추가 | `item_master` 시드 데이터만 추가 |
| 룸 테마 확장 | `rooms.room_theme` 컬럼 |
