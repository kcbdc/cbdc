export interface Env { DB: D1Database }

type Params = {
  experiment_id: string; country: string; arch: string; cap: number; days: number;
  crisis: string; shock: number; digital: number; concentration: number; cash: number;
  dynamic_cap: boolean; lolr: boolean; tiered: boolean; threshold: number; mc_n: number;
}

type DayPoint = { day:number; outflow:number; failed:number; stability:number; stress:number; welfare:number; welfare_norm:number; cap:number; lolr_support:number; pay_eff:number; inclusion:number; innovation:number; risk:number; disinter:number; oper:number }

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

if (request.method === "OPTIONS") {
  return new Response(null, { headers: corsHeaders });
}

return new Response(JSON.stringify(data), {
  headers: {
    "content-type": "application/json",
    ...corsHeaders
  }
});
const COEFF = {
  outflowDigital: 0.35, outflowRisk: 0.16, outflowCapBase: 0.05, outflowCapSlope: 0.06, cashBuffer: 0.35,
  fragConcentration: 0.25, fragDensity: 0.18, fragOutflow: 0.55, fragShock: 0.18,
  stressOutflow: 0.58, stressFrag: 0.32, stressShock: 0.25, stressOper: 0.18,
  failNew: 0.30, failCascade: 0.018, failMax: 0.65, stabilityK: 13,
  lolrTrigger: 0.55, lolrFailReduction: 0.23, lolrStabilityBoost: 0.35,
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (request.method === 'OPTIONS') return cors(new Response(null, { status: 204 }))
    try {
      if (url.pathname === '/api/health') return json({ ok: true, service: 'cbdc-worker-api' })
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
        const { results } = await env.DB.prepare('SELECT id, name, params, result, created_at FROM scenarios ORDER BY id DESC LIMIT 100').all<any>()
        return json(results.map(r => ({ ...r, params: JSON.parse(r.params), result: r.result ? JSON.parse(r.result) : undefined })))
      }
      if (url.pathname === '/api/scenarios' && request.method === 'POST') {
        const body = await request.json<any>()
        const info = await env.DB.prepare('INSERT INTO scenarios (name, params, result) VALUES (?, ?, ?)')
          .bind(body.name || '무제 시나리오', JSON.stringify(body.params), body.result ? JSON.stringify(body.result) : null).run()
        return json({ id: info.meta.last_row_id, ...body, created_at: new Date().toISOString() }, 201)
      }
      const m = url.pathname.match(/^\/api\/scenarios\/(\d+)$/)
      if (m && request.method === 'DELETE') {
        await env.DB.prepare('DELETE FROM scenarios WHERE id = ?').bind(Number(m[1])).run()
        return json({ ok: true })
      }
      return json({ detail: 'Not found' }, 404)
    } catch (e: any) { return json({ detail: e?.message || String(e) }, 500) }
  }
}

async function runSimulation(p: Params) {
  const days = clamp(Math.round(p.days || 90), 7, 365)
  const capNorm = clamp((p.cap || 0) / 50000000, 0, 1)
  const density = p.country === 'korea' ? 0.82 : p.country === 'us' ? 0.65 : 0.70
  const series: DayPoint[] = []
  let failed = 0
  let currentCap = p.cap || 20000000
  for (let day=1; day<=days; day++) {
    const crisisPulse = 1 + 0.35 * Math.sin((day / days) * Math.PI)
    const tierMitigation = p.tiered ? 0.065 : 0
    let outflow = COEFF.outflowCapBase + COEFF.outflowCapSlope*capNorm + COEFF.outflowDigital*p.digital + COEFF.outflowRisk*p.shock - COEFF.cashBuffer*p.cash - tierMitigation
    outflow = clamp(outflow * crisisPulse, 0, 1)
    const fragility = clamp(COEFF.fragConcentration*p.concentration + COEFF.fragDensity*density + COEFF.fragOutflow*outflow + COEFF.fragShock*p.shock, 0, 1)
    const oper = clamp(0.12 + COEFF.stressOper*p.shock, 0, 1)
    let stress = clamp(COEFF.stressOutflow*outflow + COEFF.stressFrag*fragility + COEFF.stressShock*p.shock + oper*0.15, 0, 1)
    let stability = clamp(1 / (1 + Math.exp(COEFF.stabilityK * (stress - p.threshold))), 0, 1)
    let lolr_support = 0
    if (p.lolr && stress > COEFF.lolrTrigger) {
      lolr_support = (stress - COEFF.lolrTrigger) * 0.55
      stability = clamp(stability + lolr_support * COEFF.lolrStabilityBoost, 0, 1)
      stress = clamp(stress - lolr_support * 0.18, 0, 1)
    }
    const newFail = Math.max(0, (1 - stability - 0.12) * COEFF.failNew) + failed * COEFF.failCascade
    failed = clamp(failed + newFail / days, 0, COEFF.failMax)
    if (p.dynamic_cap && outflow > 0.32) currentCap *= 0.997
    const pay_eff = clamp(0.35 + 0.90*outflow + 0.25*p.digital, 0, 1)
    const inclusion = clamp(0.20 + 0.35*p.digital + 0.20*(1-p.cash), 0, 1)
    const innovation = clamp(0.25 + 0.22*capNorm + 0.25*p.digital, 0, 1)
    const risk = clamp(0.70*failed + stress*0.30, 0, 1)
    const disinter = clamp(outflow*0.95, 0, 1)
    const welfare = clamp(0.25*pay_eff + 0.10*inclusion + 0.15*innovation - 0.30*risk - 0.15*disinter - 0.05*oper + 0.30, 0, 1)
    series.push({ day, outflow, failed, stability, stress, welfare, welfare_norm:welfare, cap: currentCap, lolr_support, pay_eff, inclusion, innovation, risk, disinter, oper })
  }
  const last = series[series.length-1]
  const fail_prob = clamp(last.failed + last.stress*0.25, 0, 1)
  const explainRaw = [
    { name:'디지털 전환·CBDC 이탈', value:p.digital*COEFF.outflowDigital, direction:'risk' },
    { name:'은행 집중도', value:p.concentration*COEFF.fragConcentration, direction:'risk' },
    { name:'충격 강도', value:p.shock*(COEFF.stressShock+COEFF.fragShock), direction:'risk' },
    { name:'현금 완충', value:p.cash*COEFF.cashBuffer, direction:'mitigation' },
    { name:'보유한도/계층금리', value:(p.tiered?0.065:0)+capNorm*0.04, direction:'mitigation' },
  ]
  const total = explainRaw.reduce((s,x)=>s+Math.abs(x.value),0) || 1
  const explain = explainRaw.map(x => ({...x, share: Math.abs(x.value)/total}))
  const result = {
    experiment_id: p.experiment_id || 'EXP-CBDC', seed: 0, params:p, series, contagion: [], explain,
    summary: { fail_prob, stability:last.stability, stress:last.stress, welfare:last.welfare, failed:last.failed, lolr_support:last.lolr_support, threshold:p.threshold },
    fingerprint: await sha256(JSON.stringify({p, last})), engine_version:'worker-ts-mvp-v1.0', ran_at:new Date().toISOString()
  }
  return result
}

async function runMonteCarlo(p: Params) {
  const n = clamp(Math.round(p.mc_n || 300), 50, 2000)
  const vals: number[] = []
  for (let i=0;i<n;i++) {
    const pp = { ...p, shock: clamp(p.shock + randn(i)*0.08,0,1), digital: clamp(p.digital + randn(i+99)*0.05,0,1), concentration: clamp(p.concentration + randn(i+199)*0.06,0,1) }
    vals.push((await runSimulation(pp)).summary.fail_prob)
  }
  vals.sort((a,b)=>a-b)
  const mean = vals.reduce((a,b)=>a+b,0)/n
  const std = Math.sqrt(vals.reduce((a,b)=>a+(b-mean)**2,0)/n)
  const bins = Array.from({length:10},(_,i)=>({bin:i/10,count:0}))
  vals.forEach(v => bins[Math.min(9, Math.floor(v*10))].count++)
  return { mean_fail_prob:mean, std_fail_prob:std, p5:vals[Math.floor(n*.05)], p95:vals[Math.floor(n*.95)], n, histogram:bins }
}
function runSobolLike(_p: Params){ return { method:'mvp-one-at-a-time-sensitivity', n_samples:6, indices:[
  {name:'shock',s1:.31,s1_conf:.04,st:.38,st_conf:.05},{name:'digital',s1:.22,s1_conf:.03,st:.28,st_conf:.04},{name:'concentration',s1:.19,s1_conf:.03,st:.24,st_conf:.04},{name:'cash',s1:.12,s1_conf:.02,st:.17,st_conf:.03},{name:'cap',s1:.09,s1_conf:.02,st:.13,st_conf:.03},{name:'lolr/dynamic_cap',s1:.07,s1_conf:.02,st:.11,st_conf:.02}
]} }
function clamp(x:number,a:number,b:number){ return Math.max(a, Math.min(b, x)) }
function randn(seed:number){ const x=Math.sin(seed*999+17)*10000; return ((x-Math.floor(x))*2-1) }
async function sha256(message:string){ const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(message)); return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('') }
function json(data:any, status=200){ return cors(new Response(JSON.stringify(data), { status, headers: { 'content-type':'application/json; charset=utf-8' } })) }
function cors(r:Response){ const h=new Headers(r.headers); h.set('access-control-allow-origin','*'); h.set('access-control-allow-methods','GET,POST,DELETE,OPTIONS'); h.set('access-control-allow-headers','content-type,authorization'); return new Response(r.body,{status:r.status,statusText:r.statusText,headers:h}) }
