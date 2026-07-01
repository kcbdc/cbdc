# CBDC Crisis Management Simulator v2.0

> 논문 "Central Bank Digital Currency Design, Systemic Risk, and Financial Stability" (JFS R21) 기반  
> Paper-aligned web simulation tool with bilingual (KOR/ENG) interface

## 주요 변경사항 (v1.0 → v2.0)

### ① 한/영 전환 버튼 추가
- 오른쪽 상단 **KOR / ENG 버튼** — 클릭 시 전체 UI가 즉시 전환
- 탭 제목, 파라미터 레이블, 결과 설명, 국가명, 저장 버튼 모두 전환

### ② 논문과의 불일치 수정

| 항목 | v1.0 | v2.0 (논문 일치) |
|---|---|---|
| LOLR 발동 임계값 | 0.55 | **0.45** (논문 v6 재보정) |
| OLS 교호항 | C×S 없음 | **θ₂=0.2217·(C×S)** 반영 (논문 Eq.2) |
| Disintermediation | 미반영 | **0.95 계수** 반영 (Table 3) |
| Dynamic Cap 공식 | 단순 0.997 | **max(0.30, 1−0.30·o_t)** 반영 |
| 복지함수 | 단순 | **논문 Section 3.6 공식** 반영 |
| 기여요인 | 4개 | **5개** (C×S 교호항 추가) |
| Sobol 지수 | 임의 | **논문 Table 6 기준값** 사용 |
| 엔진 버전 | worker-ts-mvp-v1.0 | **worker-ts-v2.0-paper-aligned** |

### ③ 4개 탭 구성
- **시뮬레이션**: 기본 실행 및 결과
- **논문 대조**: 4개 설계 비교표 + 막대차트 + 계수 테이블
- **Monte Carlo**: N=1~500 확률 분포 히스토그램
- **민감도 분석**: 논문 Table 6 Sobol 지수

### ④ CSV 다운로드
- 시계열 데이터 CSV 직접 다운로드
- Monte Carlo 히스토그램 CSV

---

## 파일 구조

```
cbdc_v2/
├── client/
│   ├── src/
│   │   ├── main.tsx        ← 메인 React 앱 (한/영 전환 + 논문 엔진)
│   │   └── style.css       ← 스타일
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
├── worker/
│   ├── src/
│   │   └── index.ts        ← Cloudflare Worker API (논문 계수 반영)
│   ├── migrations/
│   │   └── 0001_init.sql
│   ├── package.json
│   ├── tsconfig.json
│   └── wrangler.toml
├── docs/
│   ├── manual_ko.md        ← 한국어 매뉴얼
│   ├── manual_en.md        ← 영문 매뉴얼
│   └── ARCHITECTURE.md
├── data/                   ← 논문 실험 결과 CSV
│   ├── table4_korea_design_comparison.csv
│   ├── table5_five_country_comparison.csv
│   ├── korea_dyncap_90day_series.csv
│   ├── table7a_korea_cap_analysis.csv
│   ├── monte_carlo_korea_dyncap_n300.csv
│   ├── paper_vs_simulator_gap_analysis.csv
│   └── README.md
└── README.md
```

---

## 빠른 시작

### 로컬 개발
```bash
# 클라이언트
cd client && npm install && npm run dev

# Worker (Cloudflare)
cd worker && npm install && npx wrangler dev
```

### 배포 (Cloudflare)
```bash
cd client && npm run build
cd worker && npx wrangler deploy
```

---

## 논문 핵심 수치

| 항목 | 값 | 출처 |
|---|---|---|
| θ₂ (C×S 교호항) | **0.2217** (p=0.0008) | 논문 Table 2 |
| 95% CI | [0.0923, 0.3512] | 논문 Table 2 |
| AUC-ROC | 0.636 | 논문 Table 7 |
| Korea P(Fail) — DynCap+Tiered | **0.1400** | 논문 Table 4 |
| Korea P(Fail) — Unconstrained | **0.4118** | 논문 Table 4 |
| 감소폭 | **27.2pp** | 논문 Table 4 |
| 최적 임계값 | **5.5M KRW** | 논문 Table 7a |
| 엔진 시드 | 20260618 | 논문 Section 3.1 |
| 분석 기간 | 90일 | 논문 Section 3.1 |

