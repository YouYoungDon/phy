# 소박이 백엔드 구현 계획

**날짜**: 2026-04-30  
**대상**: `sobaki-back/` — Spring Boot 3 + Java 17 + PostgreSQL 15  
**스펙 참조**: `소박이/docs/superpowers/specs/2026-04-30-sobaki-design.md`  
**소스코드**: `sobaki-back/src/`

---

## Goal

소박이 앱의 REST API 서버를 구현한다. 사용자 인증(익명 키 기반), 가계부 기록, AI 영수증 파싱, 아이템 자동 생성, 퀘스트, 룸 조회 API를 제공한다.

## Architecture


## Tech Stack

| 항목 | 기술 |
|------|------|
| 프레임워크 | Spring Boot 3.2, Java 17 |
| DB | PostgreSQL 15, JPA/Hibernate |
| 마이그레이션 | Flyway |
| 인증 | JWT (HS256), 익명 키 기반 |
| 스토리지 | AWS S3 (SDK v2) |
| AI | Anthropic Claude API (`claude-3-5-sonnet-20241022`) |
| 빌드 | Gradle |
| 테스트 | JUnit 5, Mockito, H2 (테스트용) |
| 로컬 환경 | Docker Compose (PostgreSQL) |

---

## API 엔드포인트 요약

| Method | Path | Auth | 설명 |
|--------|------|------|------|
| POST | `/api/v1/auth/anonymous` | 없음 | 익명 키 로그인 → JWT |
| POST | `/api/v1/ledger/spending` | JWT | 지출 기록 저장 |
| GET | `/api/v1/ledger/calendar` | JWT | 월간 캘린더 |
| POST | `/api/v1/ai/receipt/parse` | JWT | 영수증 AI 파싱 |
| GET | `/api/v1/items/my` | JWT | 내 아이템 목록 |
| GET | `/api/v1/items/catalog` | JWT | 전체 아이템 도감 |
| GET | `/api/v1/room` | JWT | 룸 현재 상태 |
| GET | `/api/v1/quests/current` | JWT | 현재 퀘스트 |
| POST | `/api/v1/quests/{id}/progress` | JWT | 퀘스트 진행 |

## 구현 순서

1. Phase 0: 프로젝트 기반 (Spring Boot 스캐폴딩, Docker Compose)
2. Phase 1: 공통 인프라 (ApiResponse, 예외 처리, JWT)
3. Phase 2: DB 마이그레이션 (Flyway — 테이블, 아이템 50개, 퀘스트 6개)
4. Phase 3: User 도메인 (익명 키 기반 JWT 인증)
5. Phase 4: Ledger 도메인 (지출 기록, 캘린더)
6. Phase 5: Item 도메인 (아이템 자동 생성 로직)
7. Phase 6: Quest 도메인 (퀘스트 진행 관리)
8. Phase 7: Room 도메인 (아이템 자동 배치)
9. Phase 8: AI 영수증 파싱 (S3 업로드 + Claude Vision)
10. Phase 9: 통합 테스트 + 프로덕션 설정
