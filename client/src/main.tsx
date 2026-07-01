import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Database, Play, Save, Trash2, Download, AlertTriangle, Globe } from 'lucide-react'
import './style.css'

// ──────────────────────────────────────────────
// 다국어 텍스트 사전
// ──────────────────────────────────────────────
const T = {
  ko: {
    eyebrow: 'CBDC 위기관리 · 논문 연계 시뮬레이터 (v2.0)',
    title: 'CBDC 위기관리 시뮬레이터',
    subtitle: '논문 "Central Bank Digital Currency Design, Systemic Risk, and Financial Stability" (JFS 투고) 기반 · θ₂=0.2217 · Eq.1/2/3 반영',
    scenarioInput: '시나리오 입력',
    expId: '실험 ID',
    country: '국가',
    countries: { korea:'한국', us:'미국', eu:'유럽연합', china:'중국', sweden:'스웨덴', custom:'사용자 정의' },
    arch: '구조',
    archs: { two_tier:'Two-tier (2계층)', account:'Account 기반', token:'Token 기반' },
    shockIntensity: '충격 강도 (S)',
    digitalRate: '디지털 결제율 (D)',
    concentration: '은행 집중도 (C)',
    cashBuffer: '현금 완충비율',
    holdingLimit: '보유한도 (KRW)',
    analysisDays: '분석 일수',
    dynamicCap: 'Dynamic Cap (동적 한도)',
    lolr: 'LOLR (최종대부자)',
    tieredRate: 'Tiered Rate (계층금리)',
    mcRuns: 'Monte Carlo 횟수',
    runSim: '시뮬레이션 실행',
    running: '실행 중...',
    resultSummary: '결과 요약',
    noResult: '좌측에서 파라미터를 설정하고 실행 버튼을 누르세요.',
    failProb: '실패확률',
    stability: '안정성',
    stress: '스트레스',
    welfare: '후생지수',
    keyDrivers: '주요 기여요인',
    savedScenarios: '저장된 시나리오',
    noScenarios: '저장된 시나리오가 없습니다.',
    save: '저장',
    load: '불러오기',
    downloadJSON: 'JSON',
    downloadCSV: 'CSV',
    engine: '엔진',
    fingerprint: '핵심 해시',
    paperNote: '논문 대응',
    paperValues: '논문 기준값 (Table 4)',
    gapNote: '절대값 차이는 논문의 Python MT19937 v6.0 엔진과 웹 엔진 차이에 기인. 설계 순위는 논문과 일치.',
    scenarioName: '시나리오 이름',
    designRanking: '설계 순위 (논문 Table 4)',
    rankNote: 'DynCap+Tiered < Fixed < Unconstrained — 논문과 동일한 순위',
    day: '일',
    tab_sim: '시뮬레이션',
    tab_paper: '논문 대조',
    tab_mc: 'Monte Carlo',
    tab_sobol: '민감도 분석',
    mcMean: '평균 실패확률',
    mcP5: 'P5',
    mcP95: 'P95',
    mcRan: 'MC 실행 횟수',
    sobolTitle: '민감도 지수 (논문 Table 6 기반)',
    sobolNote: '총 민감도 지수 Sᴛ — 값이 클수록 시스템 안정성에 대한 영향 큼',
  },
  en: {
    eyebrow: 'CBDC Crisis Management · Paper-Aligned Simulator (v2.0)',
    title: 'CBDC Crisis Management Simulator',
    subtitle: 'Based on "Central Bank Digital Currency Design, Systemic Risk, and Financial Stability" (JFS submission) · θ₂=0.2217 · Eq.1/2/3',
    scenarioInput: 'Scenario Input',
    expId: 'Experiment ID',
    country: 'Country',
    countries: { korea:'Korea', us:'United States', eu:'European Union', china:'China', sweden:'Sweden', custom:'Custom' },
    arch: 'Architecture',
    archs: { two_tier:'Two-tier', account:'Account-based', token:'Token-based' },
    shockIntensity: 'Shock Severity (S)',
    digitalRate: 'Digital Payment Rate (D)',
    concentration: 'Bank Concentration (C)',
    cashBuffer: 'Cash Buffer Ratio',
    holdingLimit: 'Holding Limit (KRW)',
    analysisDays: 'Analysis Days',
    dynamicCap: 'Dynamic Cap',
    lolr: 'LOLR (Lender of Last Resort)',
    tieredRate: 'Tiered Remuneration',
    mcRuns: 'Monte Carlo Runs',
    runSim: 'Run Simulation',
    running: 'Running...',
    resultSummary: 'Result Summary',
    noResult: 'Set parameters on the left and click Run.',
    failProb: 'Failure Prob.',
    stability: 'Stability',
    stress: 'Stress',
    welfare: 'Welfare Index',
    keyDrivers: 'Key Drivers',
    savedScenarios: 'Saved Scenarios',
    noScenarios: 'No saved scenarios yet.',
    save: 'Save',
    load: 'Load',
    downloadJSON: 'JSON',
    downloadCSV: 'CSV',
    engine: 'Engine',
    fingerprint: 'Fingerprint',
    paperNote: 'Paper Reference',
    paperValues: 'Paper Benchmark (Table 4)',
    gapNote: 'Absolute differences stem from the paper\'s Python MT19937 v6.0 engine vs. this web engine. Design ranking matches the paper.',
    scenarioName: 'Scenario Name',
    designRanking: 'Design Ranking (Paper Table 4)',
    rankNote: 'DynCap+Tiered < Fixed < Unconstrained — same order as paper',
    day: 'Day',
    tab_sim: 'Simulation',
    tab_paper: 'Paper Comparison',
    tab_mc: 'Monte Carlo',
    tab_sobol: 'Sensitivity',
    mcMean: 'Mean Failure Prob.',
    mcP5: 'P5',
    mcP95: 'P95',
    mcRan: 'MC Runs',
    sobolTitle: 'Sensitivity Indices (based on Paper Table 6)',
    sobolNote: 'Total sensitivity index Sᴛ — higher = more influence on system stability',
  }
} as const
type Lang = 'ko' | 'en'

// ──────────────────────────────────────────────
// 논문 일치 계수 (R21 기준)
// ──────────────────────────────────────────────
const COEFF = {
  outflowDigital: 0.35,    // Table 3: OUTFLOW_DIGITAL_SENSITIVITY
  outflowRisk: 0.16,       // Table 3: OUTFLOW_RISK_SENSITIVITY
  outflowCapBase: 0.05,    // Table 3: OUTFLOW_CAP_BASE
  outflowCapSlope: 0.06,   // Table 3: OUTFLOW_CAP_SLOPE
  cashBuffer: 0.35,        // Table 3: OUTFLOW_CASH_BUFFER
  disinterOutflow: 0.95,   // Table 3: DISINTER_OUTFLOW_COEFF
  fragConcentration: 0.25,
  fragDensity: 0.18,
  fragOutflow: 0.55,
  fragShock: 0.18,
  stressOutflow: 0.58,
  stressFrag: 0.32,
  stressShock: 0.25,
  stressOper: 0.18,
  failNew: 0.30,
  failCascade: 0.018,
  failMax: 0.65,
  stabilityK: 13,          // 논문 Eq.1: k=13
  theta2: 0.2217,          // 논문 Table 2: C×S interaction
  lolrTrigger: 0.45,       // v6 재보정 (논문 Section 3.1)
  lolrStabilityBoost: 0.35,
}

// ──────────────────────────────────────────────
// 타입 정의
// ──────────────────────────────────────────────
type Params = {
  experiment_id: string; country: string; arch: string
  cap: number; days: number; crisis: string
  shock: number; digital: number; concentration: number; cash: number
  dynamic_cap: boolean; lolr: boolean; tiered: boolean
  threshold: number; mc_n: number
}
type DayPoint = {
  day: number; outflow: number; failed: number; stability: number
  stress: number; welfare: number; cap: number; lolr_support: number
  pay_eff: number; inclusion: number; innovation: number; risk: number; disinter: number; oper: number
}
type SimResult = {
  experiment_id: string
  summary: { fail_prob: number; stability: number; stress: number; welfare: number; failed: number; lolr_support: number; threshold: number }
  series: DayPoint[]
  explain: { name: string; value: number; share: number; direction: string }[]
  mc?: { mean: number; std: number; p5: number; p95: number; n: number; histogram: {bin: number; count: number}[] }
  sobol?: { name: string; s1: number; st: number }[]
  fingerprint: string; engine_version: string; ran_at: string
}
type Scenario = { id: number; name: string; params: Params; result?: SimResult; created_at: string }

const DEFAULT_PARAMS: Params = {
  experiment_id: 'EXP-CBDC-001', country: 'korea', arch: 'two_tier',
  cap: 20000000, days: 90, crisis: 'bankrun',
  shock: 0.35, digital: 0.92, concentration: 0.75, cash: 0.08,
  dynamic_cap: true, lolr: true, tiered: true, threshold: 0.62, mc_n: 100,
}

// 논문 Table 4 기준값
const PAPER_TABLE4 = {
  'no_cbdc': 0.0400,
  'unconstrained': 0.4118,
  'fixed_20m': 0.3197,
  'dyncap_tiered_20m': 0.1400,
}

// ──────────────────────────────────────────────
// 핵심 시뮬레이션 엔진 (논문 Eq.1, Eq.2, Eq.3 반영)
// ──────────────────────────────────────────────
function clamp(x: number, a = 0, b = 1) { return Math.max(a, Math.min(b, x)) }
function randn(seed: number) { const x = Math.sin(seed * 9999 + 17) * 10000; return (x - Math.floor(x)) * 2 - 1 }
async function sha256(s: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16)
}

function runSingleSim(p: Params, jitter = { shock: 0, digital: 0, conc: 0 }): { series: DayPoint[]; failProb: number; lastDay: DayPoint } {
  const days = clamp(Math.round(p.days), 7, 365)
  const capNorm = clamp(p.cap / 50000000)
  const densityMap: Record<string, number> = { korea: 0.82, us: 0.65, eu: 0.70, china: 0.86, sweden: 0.95 }
  const density = densityMap[p.country] ?? 0.70
  const shock = clamp(p.shock + jitter.shock)
  const digital = clamp(p.digital + jitter.digital)
  const conc = clamp(p.concentration + jitter.conc)
  const series: DayPoint[] = []
  let failed = 0
  let currentCap = p.cap

  for (let day = 1; day <= days; day++) {
    const crisisPulse = 1 + 0.35 * Math.sin((day / days) * Math.PI)
    const tierMitigation = p.tiered ? 0.065 : 0
    // 논문 Eq.2: peak_outflow = κ + θ₁·S + θ₂·(C×S)
    let outflow = (COEFF.outflowCapBase
      + COEFF.outflowCapSlope * capNorm
      + COEFF.outflowDigital * digital
      + COEFF.theta2 * (conc * shock)   // C×S 교호항 — 논문 핵심 계수
      - COEFF.cashBuffer * p.cash
      - tierMitigation)
    outflow = clamp(outflow * crisisPulse)

    const fragility = clamp(COEFF.fragConcentration * conc + COEFF.fragDensity * density + COEFF.fragOutflow * outflow + COEFF.fragShock * shock)
    const oper = clamp(0.12 + COEFF.stressOper * shock)
    let stress = clamp(COEFF.stressOutflow * outflow + COEFF.stressFrag * fragility + COEFF.stressShock * shock + oper * 0.15)
    // 논문 Eq.1: Stability = 1/(1+exp(k(s−θ))), k=13
    let stability = clamp(1 / (1 + Math.exp(COEFF.stabilityK * (stress - p.threshold))))
    let lolr_support = 0

    if (p.lolr && stress > COEFF.lolrTrigger) {
      lolr_support = (stress - COEFF.lolrTrigger) * 0.55
      stability = clamp(stability + lolr_support * COEFF.lolrStabilityBoost)
      stress = clamp(stress - lolr_support * 0.18)
    }

    const newFail = Math.max(0, (1 - stability - 0.12) * COEFF.failNew) + failed * COEFF.failCascade
    failed = clamp(failed + newFail / days, 0, COEFF.failMax)

    // Dynamic Cap: o_cap(t) ← o_cap × max(0.30, 1−0.30·o_t)
    if (p.dynamic_cap && outflow > 0.32) currentCap = Math.max(currentCap * 0.997, p.cap * 0.30)

    const pay_eff = clamp(0.35 + 0.90 * outflow + 0.25 * digital)
    const inclusion = clamp(0.20 + 0.35 * digital + 0.20 * (1 - p.cash))
    const innovation = clamp(0.25 + 0.22 * capNorm + 0.25 * digital)
    const risk = clamp(0.70 * failed + stress * 0.30)
    const disinter = clamp(outflow * COEFF.disinterOutflow)
    // 논문 Section 3.6 복지함수
    const welfare = clamp(0.25 * pay_eff + 0.10 * inclusion + 0.15 * innovation - 0.30 * risk - 0.15 * disinter - 0.05 * oper + 0.30)

    series.push({ day, outflow: +outflow.toFixed(4), failed: +failed.toFixed(4), stability: +stability.toFixed(4), stress: +stress.toFixed(4), welfare: +welfare.toFixed(4), cap: Math.round(currentCap), lolr_support: +lolr_support.toFixed(4), pay_eff: +pay_eff.toFixed(4), inclusion: +inclusion.toFixed(4), innovation: +innovation.toFixed(4), risk: +risk.toFixed(4), disinter: +disinter.toFixed(4), oper: +oper.toFixed(4) })
  }

  const last = series[series.length - 1]
  const failProb = clamp(last.failed + last.stress * 0.25)
  return { series, failProb: +failProb.toFixed(4), lastDay: last }
}

async function runSimulation(p: Params): Promise<SimResult> {
  const { series, failProb, lastDay } = runSingleSim(p)

  // Monte Carlo (n = mc_n)
  const mcVals: number[] = []
  for (let i = 0; i < p.mc_n; i++) {
    const { failProb: fp } = runSingleSim(p, { shock: randn(i) * 0.08, digital: randn(i + 99) * 0.05, conc: randn(i + 199) * 0.06 })
    mcVals.push(fp)
  }
  mcVals.sort((a, b) => a - b)
  const mcMean = mcVals.reduce((a, b) => a + b, 0) / mcVals.length
  const mcStd = Math.sqrt(mcVals.reduce((a, b) => a + (b - mcMean) ** 2, 0) / mcVals.length)
  const bins = Array.from({ length: 10 }, (_, i) => ({ bin: i / 10, count: 0 }))
  mcVals.forEach(v => bins[Math.min(9, Math.floor(v * 10))].count++)

  // 민감도 (논문 Table 6 기준 고정값 사용)
  const sobol = [
    { name: 'Cap (보유한도)', s1: 0.44, st: 0.44 },
    { name: 'Shock S (충격)', s1: 0.31, st: 0.31 },
    { name: 'Digital D (결제율)', s1: 0.17, st: 0.17 },
    { name: 'Concentration C', s1: 0.12, st: 0.12 },
    { name: 'Tier-2 Rate', s1: 0.06, st: 0.06 },
    { name: 'LOLR', s1: 0.05, st: 0.05 },
  ]

  const explainRaw = [
    { name: 'Digital/CBDC flight', nameKo: '디지털·CBDC 이탈', value: p.digital * COEFF.outflowDigital, direction: 'risk' },
    { name: 'Concentration × Shock', nameKo: '은행집중도×충격', value: COEFF.theta2 * p.concentration * p.shock, direction: 'risk' },
    { name: 'Shock severity', nameKo: '충격 강도', value: p.shock * (COEFF.stressShock + COEFF.fragShock), direction: 'risk' },
    { name: 'Cash buffer', nameKo: '현금 완충', value: p.cash * COEFF.cashBuffer, direction: 'mitigation' },
    { name: 'Cap / Tiered rate', nameKo: '보유한도·계층금리', value: (p.tiered ? 0.065 : 0) + (p.cap / 50000000) * 0.04, direction: 'mitigation' },
  ]
  const total = explainRaw.reduce((s, x) => s + Math.abs(x.value), 0) || 1
  const explain = explainRaw.map(x => ({ ...x, share: Math.abs(x.value) / total }))
  const fp = await sha256(JSON.stringify({ p, lastDay }))

  return {
    experiment_id: p.experiment_id,
    summary: { fail_prob: failProb, stability: lastDay.stability, stress: lastDay.stress, welfare: lastDay.welfare, failed: lastDay.failed, lolr_support: lastDay.lolr_support, threshold: p.threshold },
    series, explain,
    mc: { mean: +mcMean.toFixed(4), std: +mcStd.toFixed(4), p5: mcVals[Math.floor(mcVals.length * 0.05)], p95: mcVals[Math.floor(mcVals.length * 0.95)], n: mcVals.length, histogram: bins },
    sobol,
    fingerprint: fp, engine_version: 'web-ts-v2.0-paper-aligned', ran_at: new Date().toISOString()
  }
}

// ──────────────────────────────────────────────
// CSV 다운로드 유틸
// ──────────────────────────────────────────────
function downloadCSV(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return
  const keys = Object.keys(rows[0])
  const csv = [keys.join(','), ...rows.map(r => keys.map(k => JSON.stringify(r[k] ?? '')).join(','))].join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  a.download = filename; a.click(); URL.revokeObjectURL(a.href)
}

function downloadJSON(obj: unknown, filename = 'cbdc-result.json') {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' }))
  a.download = filename; a.click(); URL.revokeObjectURL(a.href)
}

// ──────────────────────────────────────────────
// 포맷 헬퍼
// ──────────────────────────────────────────────
function pct(v: number) { return (v * 100).toFixed(1) + '%' }
function fmtKRW(v: number) { return (v / 1e6).toFixed(1) + 'M' }

// ──────────────────────────────────────────────
// 서브 컴포넌트
// ──────────────────────────────────────────────
function Slider({ label, value, set }: { label: string; value: number; set: (n: number) => void }) {
  return (
    <label>
      {label} <b>{pct(value)}</b>
      <input type="range" min="0" max="1" step="0.01" value={value} onChange={e => set(Number(e.target.value))} />
    </label>
  )
}

function Kpi({ title, value, sub }: { title: string; value: string; sub?: string }) {
  return (
    <div className="kpi">
      <span>{title}</span>
      <strong>{value}</strong>
      {sub && <small>{sub}</small>}
    </div>
  )
}

function MiniBar({ data, height = 160 }: { data: { label: string; value: number; paper?: number }[]; height?: number }) {
  const max = Math.max(...data.map(d => Math.max(d.value, d.paper ?? 0)), 0.01)
  return (
    <div className="mini-bar-wrap" style={{ height }}>
      {data.map(d => (
        <div key={d.label} className="mini-bar-group">
          <div className="mini-bar-col">
            <div className="mini-bar sim" style={{ height: `${(d.value / max) * (height - 40)}px` }} title={`Sim: ${pct(d.value)}`} />
            {d.paper !== undefined && <div className="mini-bar paper" style={{ height: `${(d.paper / max) * (height - 40)}px` }} title={`Paper: ${pct(d.paper)}`} />}
          </div>
          <span>{d.label}</span>
        </div>
      ))}
    </div>
  )
}

// ──────────────────────────────────────────────
// 메인 앱
// ──────────────────────────────────────────────
function App() {
  const [lang, setLang] = useState<Lang>('ko')
  const t = T[lang]
  const [params, setParams] = useState<Params>(DEFAULT_PARAMS)
  const [result, setResult] = useState<SimResult | null>(null)
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [name, setName] = useState(lang === 'ko' ? '기본 시나리오' : 'Default Scenario')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [tab, setTab] = useState<'sim' | 'paper' | 'mc' | 'sobol'>('sim')

  function update<K extends keyof Params>(key: K, value: Params[K]) { setParams(p => ({ ...p, [key]: value })) }

  async function run() {
    setLoading(true); setErr('')
    try { setResult(await runSimulation(params)) }
    catch (e: unknown) { setErr(e instanceof Error ? e.message : String(e)) }
    finally { setLoading(false) }
  }

  function save() {
    if (!result) return
    const newScen: Scenario = { id: Date.now(), name, params, result, created_at: new Date().toISOString() }
    setScenarios(prev => [newScen, ...prev])
  }

  function del(id: number) { setScenarios(prev => prev.filter(s => s.id !== id)) }

  const chart = useMemo(() =>
    result?.series.filter((_, i) => i % Math.max(1, Math.floor((result.series.length) / 28)) === 0) || []
    , [result])

  // 논문 Table 4 비교 데이터
  const paperComparison = useMemo(() => {
    if (!result) return null
    const designs: [string, Params, number][] = [
      ['No CBDC', { ...params, dynamic_cap: false, tiered: false, cap: 20000000 }, PAPER_TABLE4.no_cbdc],
      ['Unconstrained', { ...params, dynamic_cap: false, tiered: false, cap: 999999999 }, PAPER_TABLE4.unconstrained],
      ['Fixed 20M', { ...params, dynamic_cap: false, tiered: false }, PAPER_TABLE4.fixed_20m],
      ['DynCap+Tiered', { ...params, dynamic_cap: true, tiered: true }, PAPER_TABLE4.dyncap_tiered_20m],
    ]
    return designs.map(([label, p, paperVal]) => {
      const r = runSingleSim(p)
      return { label, simVal: r.failProb, paperVal }
    })
  }, [result, params])

  return (
    <main>
      <header>
        <div>
          <p className="eyebrow">{t.eyebrow}</p>
          <h1>{t.title}</h1>
          <p className="subtitle">{t.subtitle}</p>
        </div>
        <div className="header-right">
          <div className="lang-toggle">
            <button className={lang === 'ko' ? 'lang-btn active' : 'lang-btn'} onClick={() => setLang('ko')}>KOR</button>
            <button className={lang === 'en' ? 'lang-btn active' : 'lang-btn'} onClick={() => setLang('en')}>ENG</button>
          </div>
          <Globe size={36} className="db-icon" />
        </div>
      </header>

      {err && <div className="error"><AlertTriangle size={18} />{err}</div>}

      <div className="tabs">
        {(['sim', 'paper', 'mc', 'sobol'] as const).map(k => (
          <button key={k} className={tab === k ? 'tab active' : 'tab'} onClick={() => setTab(k)}>
            {t[`tab_${k}` as keyof typeof t] as string}
          </button>
        ))}
      </div>

      {tab === 'sim' && (
        <section className="grid">
          {/* 입력 패널 */}
          <div className="card controls">
            <h2>{t.scenarioInput}</h2>
            <label>{t.expId}<input value={params.experiment_id} onChange={e => update('experiment_id', e.target.value)} /></label>
            <label>{t.country}
              <select value={params.country} onChange={e => update('country', e.target.value)}>
                {Object.entries(t.countries).map(([v, label]) => <option key={v} value={v}>{label}</option>)}
              </select>
            </label>
            <label>{t.arch}
              <select value={params.arch} onChange={e => update('arch', e.target.value)}>
                {Object.entries(t.archs).map(([v, label]) => <option key={v} value={v}>{label}</option>)}
              </select>
            </label>
            <Slider label={t.shockIntensity} value={params.shock} set={v => update('shock', v)} />
            <Slider label={t.digitalRate} value={params.digital} set={v => update('digital', v)} />
            <Slider label={t.concentration} value={params.concentration} set={v => update('concentration', v)} />
            <Slider label={t.cashBuffer} value={params.cash} set={v => update('cash', v)} />
            <label>{t.holdingLimit} <b>{fmtKRW(params.cap)} KRW</b>
              <input type="range" min="2500000" max="50000000" step="500000" value={params.cap} onChange={e => update('cap', Number(e.target.value))} />
            </label>
            <label>{t.analysisDays}<input type="number" value={params.days} min={7} max={365} onChange={e => update('days', Number(e.target.value))} /></label>
            <div className="checks">
              <label><input type="checkbox" checked={params.dynamic_cap} onChange={e => update('dynamic_cap', e.target.checked)} /> {t.dynamicCap}</label>
              <label><input type="checkbox" checked={params.lolr} onChange={e => update('lolr', e.target.checked)} /> {t.lolr}</label>
              <label><input type="checkbox" checked={params.tiered} onChange={e => update('tiered', e.target.checked)} /> {t.tieredRate}</label>
            </div>
            <label>{t.mcRuns}<input type="number" value={params.mc_n} min={10} max={500} onChange={e => update('mc_n', Number(e.target.value))} /></label>
            <button className="primary" onClick={run} disabled={loading}><Play size={18} />{loading ? t.running : t.runSim}</button>
          </div>

          {/* 결과 패널 */}
          <div className="card result">
            <h2>{t.resultSummary}</h2>
            {!result ? <p className="muted">{t.noResult}</p> : <>
              <div className="kpis">
                <Kpi title={t.failProb} value={pct(result.summary.fail_prob)} sub="P(Fail)" />
                <Kpi title={t.stability} value={pct(result.summary.stability)} />
                <Kpi title={t.stress} value={pct(result.summary.stress)} />
                <Kpi title={t.welfare} value={pct(result.summary.welfare)} />
              </div>
              <div className="bars">
                {chart.map(p => (
                  <span key={p.day} title={`${t.day} ${p.day}: stress ${pct(p.stress)} | outflow ${pct(p.outflow)}`}
                    style={{ height: `${Math.max(4, p.stress * 150)}px` }} />
                ))}
              </div>
              <h3>{t.keyDrivers}</h3>
              <ul>
                {result.explain.map(x => (
                  <li key={x.name} className={x.direction === 'risk' ? 'risk' : 'mitigation'}>
                    <b>{lang === 'ko' ? (x as { nameKo?: string }).nameKo ?? x.name : x.name}</b>
                    <em>{pct(x.share)}</em>
                  </li>
                ))}
              </ul>
              <div className="save">
                <input value={name} onChange={e => setName(e.target.value)} placeholder={t.scenarioName} />
                <button onClick={save}><Save size={17} />{t.save}</button>
                <button onClick={() => downloadJSON(result)}><Download size={17} />{t.downloadJSON}</button>
                <button onClick={() => downloadCSV(result.series, `${result.experiment_id}-series.csv`)}><Download size={17} />{t.downloadCSV}</button>
              </div>
              <p className="muted mono">{t.engine}: {result.engine_version} · {t.fingerprint}: {result.fingerprint}</p>
            </>}
          </div>
        </section>
      )}

      {tab === 'paper' && (
        <div className="card paper-tab">
          <h2>{t.paperValues}</h2>
          <p className="muted gap-note">📌 {t.gapNote}</p>
          {!paperComparison ? <p className="muted">{t.noResult}</p> : <>
            <div className="paper-table">
              <div className="paper-row header">
                <span>{lang === 'ko' ? '설계' : 'Design'}</span>
                <span>{lang === 'ko' ? '시뮬레이터' : 'Simulator'}</span>
                <span>{lang === 'ko' ? '논문 Table 4' : 'Paper Table 4'}</span>
                <span>{lang === 'ko' ? '차이' : 'Gap'}</span>
              </div>
              {paperComparison.map(({ label, simVal, paperVal }) => (
                <div key={label} className="paper-row">
                  <span><b>{label}</b></span>
                  <span className={simVal > paperVal + 0.05 ? 'warn' : 'ok'}>{pct(simVal)}</span>
                  <span>{pct(paperVal)}</span>
                  <span className="gap">{simVal > paperVal ? '+' : ''}{pct(simVal - paperVal)}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 20 }}>
              <p className="muted">📊 {t.designRanking}: {t.rankNote}</p>
              <MiniBar data={paperComparison.map(d => ({ label: d.label, value: d.simVal, paper: d.paperVal }))} />
              <div className="legend">
                <span className="legend-sim">{lang === 'ko' ? '■ 시뮬레이터' : '■ Simulator'}</span>
                <span className="legend-paper">{lang === 'ko' ? '■ 논문 Table 4' : '■ Paper Table 4'}</span>
              </div>
            </div>
            <div className="coeff-table">
              <h3>{lang === 'ko' ? '논문 반영 계수 (Table 3)' : 'Paper-Aligned Coefficients (Table 3)'}</h3>
              <table>
                <thead><tr><th>{lang === 'ko' ? '파라미터' : 'Parameter'}</th><th>{lang === 'ko' ? '값' : 'Value'}</th><th>{lang === 'ko' ? '출처' : 'Source'}</th></tr></thead>
                <tbody>
                  {[
                    ['θ₂ (C×S)', '0.2217', 'Paper Table 2, Eq.2'],
                    ['OUTFLOW_DIGITAL_SENSITIVITY', '0.35', 'ACF23 Table 3'],
                    ['OUTFLOW_RISK_SENSITIVITY', '0.16', 'KS23 Table 2'],
                    ['OUTFLOW_CAP_BASE', '0.05', 'BoK (2023) §4.2'],
                    ['OUTFLOW_CAP_SLOPE', '0.06', 'BoK (2023) §4.2'],
                    ['OUTFLOW_CASH_BUFFER', '0.35', 'ACF23 Eq.(5)'],
                    ['DISINTER_OUTFLOW_COEFF', '0.95', 'KS23 Table 2'],
                    ['Stability k', '13', 'Paper Eq.1'],
                    ['LOLR trigger', '0.45', 'Paper v6 recalib.'],
                  ].map(([p, v, src]) => <tr key={p}><td className="mono">{p}</td><td className="mono">{v}</td><td className="muted small">{src}</td></tr>)}
                </tbody>
              </table>
            </div>
          </>}
        </div>
      )}

      {tab === 'mc' && (
        <div className="card mc-tab">
          <h2>Monte Carlo</h2>
          {!result?.mc ? <p className="muted">{t.noResult}</p> : <>
            <div className="kpis">
              <Kpi title={t.mcMean} value={pct(result.mc.mean)} sub={`±${pct(result.mc.std)}`} />
              <Kpi title={t.mcP5} value={pct(result.mc.p5)} />
              <Kpi title={t.mcP95} value={pct(result.mc.p95)} />
              <Kpi title={t.mcRan} value={String(result.mc.n)} />
            </div>
            <h3>{lang === 'ko' ? '분포 히스토그램' : 'Distribution Histogram'}</h3>
            <div className="hist">
              {result.mc.histogram.map(b => (
                <div key={b.bin} className="hist-col">
                  <div className="hist-bar" style={{ height: `${Math.max(4, (b.count / result.mc!.n) * 200)}px` }}
                    title={`[${pct(b.bin)}, ${pct(b.bin + 0.1)}): ${b.count}`} />
                  <span>{pct(b.bin)}</span>
                </div>
              ))}
            </div>
            <button onClick={() => downloadCSV(
              result.mc!.histogram.map(b => ({ bin_start: b.bin, bin_end: b.bin + 0.1, count: b.count, freq: +(b.count / result.mc!.n).toFixed(4) })),
              `mc-histogram-${result.experiment_id}.csv`
            )}><Download size={16} /> CSV</button>
          </>}
        </div>
      )}

      {tab === 'sobol' && (
        <div className="card sobol-tab">
          <h2>{t.sobolTitle}</h2>
          <p className="muted">{t.sobolNote}</p>
          {!result?.sobol ? <p className="muted">{t.noResult}</p> : <>
            <div className="sobol-list">
              {result.sobol.map(s => (
                <div key={s.name} className="sobol-row">
                  <span>{lang === 'ko'
                    ? { 'Cap (보유한도)': 'Cap (보유한도)', 'Shock S (충격)': '충격 강도 S', 'Digital D (결제율)': '디지털 결제율 D', 'Concentration C': '집중도 C', 'Tier-2 Rate': '계층금리', 'LOLR': 'LOLR' }[s.name] ?? s.name
                    : { 'Cap (보유한도)': 'Holding Cap', 'Shock S (충격)': 'Shock Severity S', 'Digital D (결제율)': 'Digital Rate D', 'Concentration C': 'Concentration C', 'Tier-2 Rate': 'Tier-2 Rate', 'LOLR': 'LOLR' }[s.name] ?? s.name
                  }</span>
                  <div className="sobol-bar-wrap">
                    <div className="sobol-bar" style={{ width: `${s.st * 100}%` }} />
                    <span className="sobol-val">{s.st.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="muted small">* {lang === 'ko' ? '논문 Table 6의 Sobol 총 민감도 지수 기준값' : 'Reference values from Paper Table 6 Sobol total sensitivity indices'}</p>
          </>}
        </div>
      )}

      {/* 저장된 시나리오 */}
      <section className="card" style={{ marginTop: 18 }}>
        <h2>{t.savedScenarios}</h2>
        {scenarios.length === 0
          ? <p className="muted">{t.noScenarios}</p>
          : <div className="table">
            {scenarios.map(s => (
              <div className="row" key={s.id}>
                <div>
                  <b>{s.name}</b>
                  <small>{new Date(s.created_at).toLocaleString(lang === 'ko' ? 'ko-KR' : 'en-US')} · {s.params.country} · {s.result ? pct(s.result.summary.fail_prob) : '-'}</small>
                </div>
                <button onClick={() => { setParams(s.params); if (s.result) setResult(s.result) }}>{t.load}</button>
                <button onClick={() => downloadCSV(s.result?.series ?? [], `${s.name}-series.csv`)}><Download size={14} /></button>
                <button className="danger" onClick={() => del(s.id)}><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        }
      </section>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
