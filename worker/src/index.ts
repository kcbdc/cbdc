export interface Env { DB: D1Database }

// 논문 R21 일치 계수 (Table 3 기준)
const COEFF = {
  outflowDigital: 0.35,      // OUTFLOW_DIGITAL_SENSITIVITY — ACF23 Table 3
  outflowRisk: 0.16,         // OUTFLOW_RISK_SENSITIVITY   — KS23 Table 2
  outflowCapBase: 0.05,      // OUTFLOW_CAP_BASE           — BoK(2023) §4.2
  outflowCapSlope: 0.06,     // OUTFLOW_CAP_SLOPE          — BoK(2023) §4.2
  cashBuffer: 0.35,          // OUTFLOW_CASH_BUFFER        — ACF23 Eq.(5)
  disinterOutflow: 0.95,     // DISINTER_OUTFLOW_COEFF     — KS23 Table 2
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
  stabilityK: 13,             // 논문 Eq.1: k=13
  theta2: 0.2217,             // 논문 Table 2: C×S interaction (p=0.0008)
  lolrTrigger: 0.45,          // v6 재보정 (논문 Section 3.1)
  lolrFailReduction: 0.23,
  lolrStabilityBoost: 0.35,
}

type Params = {
  experiment_id: string; country: string; arch: string; cap: number; days: number;
  crisis: string; shock: number; digital: number; concentration: number; cash: number;
  dynamic_cap: boolean; lolr: boolean; tiered: boolean; threshold: number; mc_n: number;
}

type DayPoint = {
  day: number; outflow: number; failed: number; stability: number; stress: number;
  welfare: number; welfare_norm: number; cap: number; lolr_support: number;
  pay_eff: number; inclusion: number; innovation: number; risk: number; disinter: number; oper: number
}

function clamp(x: number, a = 0, b = 1) { return Math.max(a, Math.min(b, x)) }
function randn(seed: number) { const x = Math.sin(seed * 9999 + 17) * 10000; return (x - Math.floor(x)) * 2 - 1 }
async function sha256(message: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(message))
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('')
}
function json(data: unknown, status = 200) { return cors(new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8' } })) }
function cors(r: Response) {
  const h = new Headers(r.headers)
  h.set('access-control-allow-origin', '*')
  h.set('access-control-allow-methods', 'GET,POST,DELETE,OPTIONS')
  h.set('access-control-allow-headers', 'content-type,authorization')
  return new Response(r.body, { status: r.status, statusText: r.statusText, headers: h })
}

async function runSimulation(p: Params) {
  const days = clamp(Math.round(p.days || 90), 7, 365)
  const capNorm = clamp((p.cap || 0) / 50000000)
  const densityMap: Record<string, number> = { korea: 0.82, us: 0.65, eu: 0.70, china: 0.86, sweden: 0.95 }
  const density = densityMap[p.country] ?? 0.70
  const series: DayPoint[] = []
  let failed = 0
  let currentCap = p.cap || 20000000

  for (let day = 1; day <= days; day++) {
    const crisisPulse = 1 + 0.35 * Math.sin((day / days) * Math.PI)
    const tierMitigation = p.tiered ? 0.065 : 0
    // 논문 Eq.2: peak_outflow = κ + θ₁·S + θ₂·(C×S)
    let outflow = (COEFF.outflowCapBase
      + COEFF.outflowCapSlope * capNorm
      + COEFF.outflowDigital * p.digital
      + COEFF.theta2 * (p.concentration * p.shock)  // C×S 교호항
      - COEFF.cashBuffer * p.cash
      - tierMitigation)
    outflow = clamp(outflow * crisisPulse)

    const fragility = clamp(COEFF.fragConcentration * p.concentration + COEFF.fragDensity * density + COEFF.fragOutflow * outflow + COEFF.fragShock * p.shock)
    const oper = clamp(0.12 + COEFF.stressOper * p.shock)
    let stress = clamp(COEFF.stressOutflow * outflow + COEFF.stressFrag * fragility + COEFF.stressShock * p.shock + oper * 0.15)
    // 논문 Eq.1: Stab_t = 1/(1+exp(k(s_t−θ))), k=13
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
    if (p.dynamic_cap && outflow > 0.32) currentCap = Math.max(currentCap * 0.997, (p.cap || 20000000) * 0.30)

    const pay_eff = clamp(0.35 + 0.90 * outflow + 0.25 * p.digital)
    const inclusion = clamp(0.20 + 0.35 * p.digital + 0.20 * (1 - p.cash))
    const innovation = clamp(0.25 + 0.22 * capNorm + 0.25 * p.digital)
    const risk = clamp(0.70 * failed + stress * 0.30)
    const disinter = clamp(outflow * COEFF.disinterOutflow)
    // 논문 Section 3.6 복지함수: W = 0.25·PayEff + 0.10·Incl + 0.15·Innov - 0.30·Risk - 0.15·Disinter - 0.05·Oper
    const welfare = clamp(0.25 * pay_eff + 0.10 * inclusion + 0.15 * innovation - 0.30 * risk - 0.15 * disinter - 0.05 * oper + 0.30)

    series.push({ day, outflow: +outflow.toFixed(4), failed: +failed.toFixed(4), stability: +stability.toFixed(4), stress: +stress.toFixed(4), welfare: +welfare.toFixed(4), welfare_norm: +welfare.toFixed(4), cap: Math.round(currentCap), lolr_support: +lolr_support.toFixed(4), pay_eff: +pay_eff.toFixed(4), inclusion: +inclusion.toFixed(4), innovation: +innovation.toFixed(4), risk: +risk.toFixed(4), disinter: +disinter.toFixed(4), oper: +oper.toFixed(4) })
  }

  const last = series[series.length - 1]
  const fail_prob = clamp(last.failed + last.stress * 0.25)

  const explainRaw = [
    { name: 'Digital/CBDC flight', nameKo: '디지털·CBDC 이탈', value: p.digital * COEFF.outflowDigital, direction: 'risk' },
    { name: 'Concentration × Shock', nameKo: '집중도×충격(θ₂·C·S)', value: COEFF.theta2 * p.concentration * p.shock, direction: 'risk' },
    { name: 'Shock severity', nameKo: '충격 강도', value: p.shock * (COEFF.stressShock + COEFF.fragShock), direction: 'risk' },
    { name: 'Cash buffer', nameKo: '현금 완충', value: p.cash * COEFF.cashBuffer, direction: 'mitigation' },
    { name: 'Cap / Tiered rate', nameKo: '보유한도·계층금리', value: (p.tiered ? 0.065 : 0) + capNorm * 0.04, direction: 'mitigation' },
  ]
  const total = explainRaw.reduce((s, x) => s + Math.abs(x.value), 0) || 1
  const explain = explainRaw.map(x => ({ ...x, share: Math.abs(x.value) / total }))
  const fp = await sha256(JSON.stringify({ p, last }))

  return {
    experiment_id: p.experiment_id || 'EXP-CBDC',
    seed: 0, params: p, series, contagion: [], explain,
    summary: { fail_prob: +fail_prob.toFixed(4), stability: last.stability, stress: last.stress, welfare: last.welfare, failed: last.failed, lolr_support: last.lolr_support, threshold: p.threshold },
    fingerprint: fp,
    engine_version: 'worker-ts-v2.0-paper-aligned',
    ran_at: new Date().toISOString()
  }
}

async function runMonteCarlo(p: Params) {
  const n = clamp(Math.round(p.mc_n || 300), 50, 2000)
  const vals: number[] = []
  for (let i = 0; i < n; i++) {
    const pp = { ...p, shock: clamp(p.shock + randn(i) * 0.08), digital: clamp(p.digital + randn(i + 99) * 0.05), concentration: clamp(p.concentration + randn(i + 199) * 0.06) }
    vals.push((await runSimulation(pp)).summary.fail_prob)
  }
  vals.sort((a, b) => a - b)
  const mean = vals.reduce((a, b) => a + b, 0) / n
  const std = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / n)
  const bins = Array.from({ length: 10 }, (_, i) => ({ bin: i / 10, count: 0 }))
  vals.forEach(v => bins[Math.min(9, Math.floor(v * 10))].count++)
  return { mean_fail_prob: +mean.toFixed(4), std_fail_prob: +std.toFixed(4), p5: vals[Math.floor(n * .05)], p95: vals[Math.floor(n * .95)], n, histogram: bins }
}

function runSobolLike(_p: Params) {
  // 논문 Table 6 기준 Sobol 총 민감도 지수
  return {
    method: 'paper-table6-reference',
    note: 'Values from Paper Table 6 (Sobol total sensitivity indices, n=6 variables)',
    indices: [
      { name: 'Cap', nameKo: '보유한도', s1: .44, s1_conf: .04, st: .44, st_conf: .05 },
      { name: 'Shock S', nameKo: '충격 강도', s1: .31, s1_conf: .04, st: .31, st_conf: .04 },
      { name: 'Digital D', nameKo: '디지털 결제율', s1: .17, s1_conf: .03, st: .17, st_conf: .03 },
      { name: 'Concentration C', nameKo: '집중도', s1: .12, s1_conf: .02, st: .12, st_conf: .03 },
      { name: 'Tier-2 Rate', nameKo: '계층금리', s1: .06, s1_conf: .02, st: .06, st_conf: .02 },
      { name: 'LOLR', nameKo: 'LOLR', s1: .05, s1_conf: .02, st: .05, st_conf: .02 },
    ]
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (request.method === 'OPTIONS') return cors(new Response(null, { status: 204 }))
    try {
      if (url.pathname === '/api/health') return json({ ok: true, service: 'cbdc-worker-v2-paper-aligned', engine: 'worker-ts-v2.0', theta2: COEFF.theta2 })
      if (url.pathname === '/api/simulate' && request.method === 'POST') {
        const params = await request.json<Params>()
        const result = await runSimulation(params)
        await env.DB.prepare('INSERT INTO audit_trail (experiment_id, action, payload, fingerprint) VALUES (?, ?, ?, ?)')
          .bind(params.experiment_id || 'unknown', 'single_run', JSON.stringify(params), result.fingerprint).run()
        return json(result)
      }
      if (url.pathname === '/api/simulate/monte-carlo' && request.method === 'POST') return json(await runMonteCarlo(await request.json<Params>()))
      if (url.pathname === '/api/simulate/sobol' && request.method === 'POST') return json(runSobolLike(await request.json<Params>()))
      if (url.pathname === '/api/scenarios' && request.method === 'GET') {
        const { results } = await env.DB.prepare('SELECT id, name, params, result, created_at FROM scenarios ORDER BY id DESC LIMIT 100').all<{ id: number; name: string; params: string; result: string | null; created_at: string }>()
        return json(results.map(r => ({ ...r, params: JSON.parse(r.params), result: r.result ? JSON.parse(r.result) : undefined })))
      }
      if (url.pathname === '/api/scenarios' && request.method === 'POST') {
        const body = await request.json<{ name: string; params: Params; result?: unknown }>()
        const info = await env.DB.prepare('INSERT INTO scenarios (name, params, result) VALUES (?, ?, ?)')
          .bind(body.name || 'Untitled', JSON.stringify(body.params), body.result ? JSON.stringify(body.result) : null).run()
        return json({ id: info.meta.last_row_id, ...body, created_at: new Date().toISOString() }, 201)
      }
      const m = url.pathname.match(/^\/api\/scenarios\/(\d+)$/)
      if (m && request.method === 'DELETE') {
        await env.DB.prepare('DELETE FROM scenarios WHERE id = ?').bind(Number(m[1])).run()
        return json({ ok: true })
      }
      return json({ detail: 'Not found' }, 404)
    } catch (e: unknown) { return json({ detail: (e as Error)?.message || String(e) }, 500) }
  }
}
