# Architecture

## 목표

무료 또는 무료 범위가 큰 서비스만으로 CBDC 리스크 시뮬레이터를 공개 배포할 수 있도록 구조를 단순화합니다.

## 권장 운영 구조

```text
사용자 브라우저
  ↓
Cloudflare Pages: React UI
  ↓ /api/*
Cloudflare Worker: API + 시뮬레이션 엔진
  ↓
Cloudflare D1: 시나리오, 감사로그 저장
```

## 왜 Python/FastAPI를 제거했는가

GitHub Pages와 Cloudflare Pages는 정적 프론트 배포에 강하지만 Python 서버를 직접 상시 실행하지 않습니다. Cloudflare Workers는 JavaScript/TypeScript 런타임이므로 기존 Python 계산 로직을 TypeScript로 이식하거나, Python 엔진을 외부 서비스로 분리해야 합니다.

## API 목록

| Method | Path | 설명 |
|---|---|---|
| GET | `/api/health` | API 상태 확인 |
| POST | `/api/simulate` | 단일 시뮬레이션 |
| POST | `/api/simulate/monte-carlo` | Monte Carlo 간이 실행 |
| POST | `/api/simulate/sobol` | 민감도 분석 간이 결과 |
| GET | `/api/scenarios` | 저장 시나리오 목록 |
| POST | `/api/scenarios` | 시나리오 저장 |
| DELETE | `/api/scenarios/:id` | 시나리오 삭제 |

## D1 테이블

### scenarios
- id
- name
- params
- result
- created_at

### audit_trail
- id
- experiment_id
- action
- payload
- fingerprint
- created_at

## 향후 확장 우선순위

1. Firebase Auth 또는 Cloudflare Access 기반 로그인
2. 원본 Python 수식의 TypeScript 정밀 이식
3. 보고서 HTML/PDF 생성
4. 관리자 전용 시나리오 비교 화면
5. 외부 Python 엔진 연동 모드 추가
