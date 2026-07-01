# CBDC 시뮬레이터 실험 결과 데이터

## 파일 목록

| 파일 | 내용 | 논문 대응 |
|------|------|-----------|
| table4_korea_design_comparison.csv | 한국 4가지 CBDC 설계 비교 | 논문 Table 4 |
| table5_five_country_comparison.csv | 5개국 DynCap+Tiered 비교 | 논문 Table 5 |
| korea_dyncap_90day_series.csv | 한국 DynCap+Tiered 90일 일별 시계열 | 논문 Appendix |
| table7a_korea_cap_analysis.csv | 한국 보유한도 별 위험 분석 | 논문 Table 7a |
| monte_carlo_korea_dyncap_n300.csv | Monte Carlo N=300 결과 | 논문 Table 4 CI |
| paper_vs_simulator_gap_analysis.csv | 논문값 vs 시뮬레이터 값 비교 | 불일치 설명 |

## 핵심 수치 (논문 Table 2)
- θ₂ = 0.2217 (p=0.0008) — concentration × shock 교호작용 계수
- 엔진: python-mt19937-v6.0 (논문 기준)
- 웹 시뮬레이터 엔진: worker-ts-v2.0 (논문 계수 반영)

## 설계 순위 (논문과 일치)
DynCap+Tiered < Fixed Limit < Unconstrained CBDC (실패확률 기준)
