import { useMemo, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { AlertTriangle, BarChart3, Database, MousePointerClick, RefreshCcw, Search, ShoppingBag, TrendingUp } from 'lucide-react';

type TopCount = { value: string; count: number };

type Summary = {
  generatedAt: string;
  totalEvents: number;
  eventCounts: Record<string, number>;
  funnel: {
    searchesOrRecommendations: number;
    productClicks: number;
    conversions: number;
    clickThroughRate: number;
    conversionRate: number;
  };
  topQueries: TopCount[];
  topProducts: TopCount[];
  topClickedProducts: TopCount[];
  topConvertedProducts: TopCount[];
  intentStats: { colors: TopCount[]; categories: TopCount[]; genders: TopCount[]; budgets: TopCount[] };
  lowConfidence: { count: number; rate: number; missingOntologyFields: TopCount[] };
  insights: { type: string; summary: string; evidence?: unknown }[];
};

const SAMPLE_EVENTS = [
  {
    eventId: 'seed-reco-1', eventType: 'recommendation', occurredAt: '2026-06-24T07:08:34.211Z', sessionHash: '147a1836ff126398dd86d621',
    userAgentFamily: 'unknown', query: '남성 차콜 후드집업 5만원 이하 추천 [phone]', parsedIntent: { budget: 50000, colors: ['차콜'], categories: ['후드집업'], seasons: [], gender: '남성' }, productIds: ['3783092', '3697526'], source: 'plugin', metadata: { surface: 'chatgpt', locale: 'ko-KR', result_count: 2 }
  },
  {
    eventId: 'seed-click-1', eventType: 'product_click', occurredAt: '2026-06-24T07:08:35.211Z', sessionHash: '147a1836ff126398dd86d621',
    userAgentFamily: 'unknown', query: '남성 차콜 후드집업 5만원 이하 추천', parsedIntent: { colors: ['차콜'], categories: ['후드집업'], seasons: [], gender: '남성' }, productIds: ['3783092'], clickedProductId: '3783092', rank: 1, source: 'plugin', metadata: { surface: 'chatgpt' }
  },
  {
    eventId: 'seed-conv-1', eventType: 'conversion', occurredAt: '2026-06-24T07:08:36.211Z', sessionHash: '147a1836ff126398dd86d621',
    userAgentFamily: 'unknown', parsedIntent: { colors: [], categories: [], seasons: [] }, productIds: ['3783092'], convertedProductId: '3783092', source: 'plugin', metadata: { surface: 'chatgpt' }
  },
  {
    eventId: 'seed-gap-1', eventType: 'low_confidence_recommendation', occurredAt: '2026-06-24T11:20:43.976Z', sessionHash: '3274a3eba4aacaa0f9ded48b',
    userAgentFamily: 'unknown', query: '비 오는 날 남친룩 추천 [phone]', parsedIntent: { colors: [], categories: [], seasons: [] }, productIds: [], confidence: 0.2, missingOntologyFields: ['occasion_tags', 'weather_tags', 'style_tags'], source: 'plugin', metadata: { surface: 'api-verify', locale: 'ko-KR' }
  }
];

export function App() {
  const [range, setRange] = useState<'all' | '7d' | '24h'>('all');
  const summary = useQuery(api.analytics.summary, { range }) as Summary | undefined;
  const recentEvents = useQuery(api.analytics.recentEvents, { limit: 20 }) as any[] | undefined;
  const seedEvents = useMutation(api.analytics.seedEvents);
  const recordEvent = useMutation(api.analytics.recordEvent);
  const [status, setStatus] = useState('');

  const isEmpty = summary && summary.totalEvents === 0;
  const trendText = useMemo(() => {
    if (!summary) return 'Loading Convex data...';
    if (summary.totalEvents === 0) return 'Convex DB is live. Seed demo telemetry to populate charts.';
    return `${summary.totalEvents} sanitized events · CTR ${pct(summary.funnel.clickThroughRate)} · CVR ${pct(summary.funnel.conversionRate)}`;
  }, [summary]);

  async function seed() {
    setStatus('Seeding Convex...');
    const result = await seedEvents({ events: SAMPLE_EVENTS });
    setStatus(`Seed complete: ${result.inserted} inserted, ${result.skipped} skipped`);
  }

  async function addSyntheticClick() {
    setStatus('Recording demo click...');
    await recordEvent({ eventType: 'product_click', query: '오너 대시보드 데모 클릭', productIds: ['3783092'], clickedProductId: '3783092', rank: 1, metadata: { surface: 'owner-dashboard' } });
    setStatus('Demo click recorded in Convex');
  }

  return <div className="app-shell">
    <header className="hero">
      <div className="eyebrow"><Database size={16}/> Convex-backed owner intelligence</div>
      <h1>MUSINSA Personal Shopper Owner Dashboard</h1>
      <p>개인정보를 제외한 검색/추천/클릭/전환/low-confidence gap을 Convex DB에 저장하고, 오너가 바로 볼 수 있는 지표와 온톨로지 개선 신호로 보여줍니다.</p>
      <div className="hero-actions">
        <select value={range} onChange={e => setRange(e.target.value as any)}>
          <option value="all">All time</option>
          <option value="7d">Last 7 days</option>
          <option value="24h">Last 24h</option>
        </select>
        <button onClick={seed}><RefreshCcw size={16}/> Seed demo telemetry</button>
        <button onClick={addSyntheticClick}><MousePointerClick size={16}/> Add demo click</button>
      </div>
      <p className="status">{status || trendText}</p>
    </header>

    <main>
      {isEmpty && <section className="empty"><AlertTriangle/> Convex 배포는 연결됐지만 아직 이벤트가 없습니다. Seed demo telemetry 버튼으로 예시 데이터를 넣어 검증할 수 있습니다.</section>}
      <section className="metrics">
        <Metric icon={<BarChart3/>} label="Total events" value={summary?.totalEvents ?? '…'} />
        <Metric icon={<Search/>} label="Searches / recos" value={summary?.funnel.searchesOrRecommendations ?? '…'} />
        <Metric icon={<MousePointerClick/>} label="CTR" value={summary ? pct(summary.funnel.clickThroughRate) : '…'} tone="good" />
        <Metric icon={<ShoppingBag/>} label="CVR" value={summary ? pct(summary.funnel.conversionRate) : '…'} tone="good" />
        <Metric icon={<AlertTriangle/>} label="Ontology gaps" value={summary?.lowConfidence.count ?? '…'} tone={(summary?.lowConfidence.count ?? 0) ? 'warn' : 'good'} />
      </section>

      <section className="grid">
        <Panel title="Generated owner insights" className="span-8">
          <ul className="insights">{(summary?.insights ?? []).map((i, idx) => <li key={idx}><strong>{i.type}</strong><span>{i.summary}</span></li>)}</ul>
        </Panel>
        <Panel title="Ontology gap fields" className="span-4"><Pills items={summary?.lowConfidence.missingOntologyFields}/></Panel>
        <Panel title="Top queries"><TopTable items={summary?.topQueries}/></Panel>
        <Panel title="Top products"><TopTable items={summary?.topProducts}/></Panel>
        <Panel title="Intent demand"><h4>Colors</h4><Pills items={summary?.intentStats.colors}/><h4>Categories</h4><Pills items={summary?.intentStats.categories}/><h4>Budgets</h4><Pills items={summary?.intentStats.budgets}/></Panel>
        <Panel title="Recent sanitized event rows" className="span-12">
          <div className="events-table"><table><thead><tr><th>Time</th><th>Type</th><th>Query</th><th>Products</th></tr></thead><tbody>{(recentEvents ?? []).map(e => <tr key={e._id}><td>{new Date(e.occurredAt).toLocaleString('ko-KR')}</td><td>{e.eventType}</td><td>{e.query || '-'}</td><td>{(e.productIds ?? []).join(', ') || '-'}</td></tr>)}</tbody></table></div>
        </Panel>
      </section>
    </main>
  </div>;
}

function Metric({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: React.ReactNode; tone?: string }) {
  return <article className="metric-card"><div className="metric-icon">{icon}</div><div><div className="label">{label}</div><div className={`metric-value ${tone ?? ''}`}>{value}</div></div></article>;
}
function Panel({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) { return <section className={`panel ${className}`}><h2>{title}</h2>{children}</section>; }
function TopTable({ items = [] }: { items?: TopCount[] }) { return <table><thead><tr><th>Value</th><th>Count</th></tr></thead><tbody>{items.map(x => <tr key={x.value}><td>{x.value}</td><td>{x.count}</td></tr>)}</tbody></table>; }
function Pills({ items = [] }: { items?: TopCount[] }) { return <div className="pills">{items.map(x => <span className="pill" key={x.value}>{x.value} · {x.count}</span>)}</div>; }
function pct(value: number) { return `${Math.round(value * 100)}%`; }
