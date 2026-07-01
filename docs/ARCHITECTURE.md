# Architecture (v2.0)

## 구조

```
브라우저
  ↓
Cloudflare Pages: React UI (main.tsx)
  ├── 한/영 전환 (useState lang)
  ├── 브라우저 내 시뮬레이션 엔진 (논문 Eq.1/2/3)
  ├── Monte Carlo (브라우저 내)
  └── CSV 다운로드
  ↓ /api/* (선택: 저장 기능 시)
Cloudflare Worker: API
  └── Cloudflare D1: 시나리오 저장
```

## API

| Method | Path | 설명 |
|---|---|---|
| GET | `/api/health` | 상태 확인 + 엔진 버전 |
| POST | `/api/simulate` | 단일 시뮬레이션 (논문 계수) |
| POST | `/api/simulate/monte-carlo` | Monte Carlo |
| POST | `/api/simulate/sobol` | 민감도 (논문 Table 6) |
| GET | `/api/scenarios` | 저장 목록 |
| POST | `/api/scenarios` | 저장 |
| DELETE | `/api/scenarios/:id` | 삭제 |

## 핵심 수식 (논문 Eq.1/2/3)

```
Eq.1  Stab_t = 1 / (1 + exp(13 · (s_t − θ)))
Eq.2  peak_outflow = κ + θ₁·S + θ₂·(C×S)  [θ₂=0.2217]
Eq.3  min P(Fail; cap) and max W(cap), cap ∈ [2.5M, 50M] KRW
```
