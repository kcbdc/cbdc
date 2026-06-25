import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Database, Play, Save, Trash2, Download, AlertTriangle } from 'lucide-react'
import './style.css'

type Params = {
  experiment_id: string; country: string; arch: string; cap: number; days: number;
  crisis: string; shock: number; digital: number; concentration: number; cash: number;
  dynamic_cap: boolean; lolr: boolean; tiered: boolean; threshold: number; mc_n: number;
}

type Result = {
  experiment_id: string; summary: { fail_prob:number; stability:number; stress:number; welfare:number; failed:number; lolr_support:number; threshold:number };
  series: { day:number; outflow:number; failed:number; stability:number; stress:number; welfare:number; cap:number }[];
  explain: { name:string; value:number; share:number; direction:string }[];
  fingerprint: string; engine_version:string; ran_at:string;
}

type Scenario = { id:number; name:string; params:Params; result?:Result; created_at:string }

const DEFAULT_PARAMS: Params = {
  experiment_id: 'EXP-CBDC-001', country: 'korea', arch: 'two_tier', cap: 20000000, days: 90,
  crisis: 'bankrun', shock: 0.35, digital: 0.92, concentration: 0.75, cash: 0.08,
  dynamic_cap: true, lolr: true, tiered: true, threshold: 0.62, mc_n: 300,
}

const API_BASE = "https://cbdc-api.churchoffire.workers.dev/api";
async function api<T>(path:string, options:RequestInit = {}): Promise<T> {
  const r = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options.headers || {})
    }
  });

  if (!r.ok) {
    const errorBody = await r.json().catch(() => ({}));
    throw new Error(errorBody.detail || errorBody.error || r.statusText);
  }

  return r.json();
}

function pct(v:number){ return (v*100).toFixed(1) + '%' }
function fmt(v:number){ return new Intl.NumberFormat('ko-KR').format(v) }

function App(){
  const [params, setParams] = useState<Params>(() => JSON.parse(localStorage.getItem('cbdc_params') || 'null') || DEFAULT_PARAMS)
  const [result, setResult] = useState<Result | null>(null)
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [name, setName] = useState('기본 시나리오')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  useEffect(() => { localStorage.setItem('cbdc_params', JSON.stringify(params)) }, [params])
  useEffect(() => { refresh() }, [])
  async function refresh(){ setScenarios(await api<Scenario[]>('/scenarios').catch(() => [])) }
  async function run(){ setLoading(true); setErr(''); try { setResult(await api<Result>('/simulate', { method:'POST', body: JSON.stringify(params) })) } catch(e:any){ setErr(e.message) } finally { setLoading(false) } }
  async function save(){ if(!result) return; await api('/scenarios', { method:'POST', body: JSON.stringify({ name, params, result }) }); await refresh() }
  async function del(id:number){ await api('/scenarios/'+id, { method:'DELETE' }); await refresh() }
  function update<K extends keyof Params>(key:K, value:Params[K]){ setParams(p => ({...p, [key]: value})) }
  const chart = useMemo(() => result?.series.filter((_,i) => i % Math.max(1, Math.floor(result.series.length/28)) === 0) || [], [result])

  return <main>
    <header><div><p className="eyebrow">Cloudflare Pages + Workers + D1 무료형</p><h1>CBDC 위기관리 시뮬레이터</h1><p>기존 Python/Node 3계층 구조를 무료 정적 배포 친화형으로 재구성한 MVP입니다.</p></div><Database size={42}/></header>
    {err && <div className="error"><AlertTriangle size={18}/>{err}</div>}
    <section className="grid">
      <div className="card controls">
        <h2>시나리오 입력</h2>
        <label>실험 ID<input value={params.experiment_id} onChange={e=>update('experiment_id', e.target.value)}/></label>
        <label>국가<select value={params.country} onChange={e=>update('country', e.target.value)}><option value="korea">한국</option><option value="us">미국</option><option value="eu">EU</option><option value="china">중국</option><option value="custom">사용자 정의</option></select></label>
        <label>구조<select value={params.arch} onChange={e=>update('arch', e.target.value)}><option value="two_tier">Two-tier</option><option value="account">Account</option><option value="token">Token</option></select></label>
        <Slider label="충격 강도" value={params.shock} set={v=>update('shock', v)} />
        <Slider label="디지털 결제율" value={params.digital} set={v=>update('digital', v)} />
        <Slider label="은행 집중도" value={params.concentration} set={v=>update('concentration', v)} />
        <Slider label="현금 완충비율" value={params.cash} set={v=>update('cash', v)} />
        <label>보유한도<input type="number" value={params.cap} onChange={e=>update('cap', Number(e.target.value))}/></label>
        <label>분석일수<input type="number" value={params.days} onChange={e=>update('days', Number(e.target.value))}/></label>
        <div className="checks"><label><input type="checkbox" checked={params.dynamic_cap} onChange={e=>update('dynamic_cap', e.target.checked)}/> Dynamic Cap</label><label><input type="checkbox" checked={params.lolr} onChange={e=>update('lolr', e.target.checked)}/> LOLR</label><label><input type="checkbox" checked={params.tiered} onChange={e=>update('tiered', e.target.checked)}/> Tiered Rate</label></div>
        <button className="primary" onClick={run} disabled={loading}><Play size={18}/>{loading ? '실행 중...' : '시뮬레이션 실행'}</button>
      </div>
      <div className="card result">
        <h2>결과 요약</h2>
        {!result ? <p className="muted">좌측 값을 입력하고 시뮬레이션을 실행하세요.</p> : <>
          <div className="kpis"><Kpi title="실패확률" value={pct(result.summary.fail_prob)} /><Kpi title="안정성" value={pct(result.summary.stability)} /><Kpi title="스트레스" value={pct(result.summary.stress)} /><Kpi title="후생지수" value={pct(result.summary.welfare)} /></div>
          <div className="bars">{chart.map(p => <span key={p.day} title={`Day ${p.day}: stress ${pct(p.stress)}`} style={{height: `${Math.max(4, p.stress*150)}px`}} />)}</div>
          <h3>주요 기여요인</h3><ul>{result.explain.map(x => <li key={x.name}><b>{x.name}</b><em>{pct(x.share)}</em></li>)}</ul>
          <div className="save"><input value={name} onChange={e=>setName(e.target.value)} /><button onClick={save}><Save size={17}/>저장</button><button onClick={()=>download(result)}><Download size={17}/>JSON</button></div>
          <p className="muted">엔진: {result.engine_version} / Fingerprint: {result.fingerprint.slice(0,16)}</p>
        </>}
      </div>
    </section>
    <section className="card"><h2>저장된 시나리오</h2>{scenarios.length===0 ? <p className="muted">저장된 시나리오가 없습니다.</p> : <div className="table">{scenarios.map(s => <div className="row" key={s.id}><div><b>{s.name}</b><small>{new Date(s.created_at).toLocaleString('ko-KR')} · {s.params.country} · {s.result ? pct(s.result.summary.fail_prob) : '결과 없음'}</small></div><button onClick={()=>{setParams(s.params); if(s.result) setResult(s.result)}}>불러오기</button><button className="danger" onClick={()=>del(s.id)}><Trash2 size={15}/></button></div>)}</div>}</section>
  </main>
}
function Slider({label,value,set}:{label:string; value:number; set:(n:number)=>void}){ return <label>{label} <b>{pct(value)}</b><input type="range" min="0" max="1" step="0.01" value={value} onChange={e=>set(Number(e.target.value))}/></label> }
function Kpi({title,value}:{title:string; value:string}){ return <div className="kpi"><span>{title}</span><strong>{value}</strong></div> }
function download(obj:any){ const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([JSON.stringify(obj,null,2)],{type:'application/json'})); a.download='cbdc-result.json'; a.click(); URL.revokeObjectURL(a.href) }
createRoot(document.getElementById('root')!).render(<App />)
