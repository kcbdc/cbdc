# CBDC Platform — Cloudflare Free Architecture

이 패키지는 기존 `React + Node/Express + Python/FastAPI + SQLite` 구조를 무료 배포에 적합한 `Cloudflare Pages + Workers + D1` 구조로 재편한 MVP입니다.

## 1. 변경된 구조

```text
cbdc-cloudflare-free/
├─ client/                 # React + Vite 프론트엔드, Cloudflare Pages 배포
├─ worker/                 # Cloudflare Worker API, D1 연결
│  ├─ src/index.ts          # API + TypeScript 시뮬레이션 엔진
│  ├─ migrations/0001_init.sql
│  └─ wrangler.toml
└─ docs/
   └─ ARCHITECTURE.md
```

## 2. 원본 대비 기능 매핑

| 원본 기능 | 무료형 구현 방식 | 상태 |
|---|---|---|
| React 화면 | Cloudflare Pages | 구현 |
| Node/Express API | Cloudflare Workers | 구현 |
| SQLite/Prisma | Cloudflare D1 | 구현 |
| Python FastAPI 엔진 | Worker TypeScript 엔진 | 단순화 구현 |
| 시나리오 저장/삭제 | D1 | 구현 |
| 단일 시뮬레이션 | Worker API | 구현 |
| Monte Carlo | Worker API | 구현 |
| Sobol | 간이 민감도 분석 | 단순화 |
| PDF/LaTeX 보고서 | 미포함 | 추후 확장 |
| Firebase Auth | 선택 사항 | 별도 연동 가능 |

## 3. 로컬 실행

### 프론트엔드
```bash
cd client
npm install
npm run dev
```

### Worker API
```bash
cd worker
npm install
npm run dev
```

Vite 개발 서버는 `/api` 요청을 `http://localhost:8787`로 프록시합니다.

## 4. Cloudflare D1 생성

```bash
cd worker
npx wrangler login
npx wrangler d1 create cbdc_simulator_db
```

출력되는 `database_id`를 `worker/wrangler.toml`의 `REPLACE_WITH_YOUR_D1_DATABASE_ID`에 입력합니다.

## 5. D1 테이블 생성

```bash
npx wrangler d1 migrations apply cbdc_simulator_db --local
npx wrangler d1 migrations apply cbdc_simulator_db --remote
```

## 6. Worker 배포

```bash
cd worker
npm run deploy
```

## 7. Pages 배포

Cloudflare Pages에서 GitHub 저장소를 연결하고 다음처럼 설정합니다.

```text
Root directory: client
Build command: npm run build
Build output directory: dist
```

Pages에서 Worker API를 같은 도메인 `/api/*`로 붙이려면 Cloudflare Dashboard의 Routes 또는 Pages Functions/Worker route 설정을 사용합니다.

## 8. 정직한 한계

이 버전은 원본 Python 연구용 엔진을 완전히 동일하게 옮긴 것이 아닙니다. 무료 운영에 맞게 핵심 지표 계산·시나리오 저장·결과 시각화 위주로 단순화한 MVP입니다.

고급 기능이 필요하면 다음 중 하나를 선택하세요.

1. Python 엔진만 Render/Fly.io 등에 별도 배포
2. 무거운 계산은 Google Colab에서 실행 후 D1/Firestore에 결과 저장
3. Worker 엔진을 단계적으로 원본 Python 수식에 맞춰 TypeScript로 추가 이식
