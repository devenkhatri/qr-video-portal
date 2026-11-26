'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Filler,
  Tooltip,
  Legend,
  type ChartOptions,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { IconBook, IconChart, IconUsers } from './icons';
import ui from '../ui.module.css';
import base from './AnalyticsPanel.module.css';
import styles from './InsightsPanel.module.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Filler, Tooltip, Legend);

interface Insights {
  daily: { date: string; registrations: number; views: number; activeUsers: number }[];
  engagement: {
    registered: number;
    activated: number;
    neverViewed: number;
    activationRate: number;
    active7: number;
    active30: number;
    avgPointsPerReader: number;
    avgViewsPerReader: number;
    returningReaders: number;
    returningRate: number;
    topUsers: { userId: string; name: string; userType: string; district: string; points: number; views: number }[];
  };
  segments: {
    userTypes: { type: string; readers: number }[];
    chapters: { id: string; title: string }[];
    cells: number[][];
  };
  languageMix: {
    byUserType: { label: string; total: number; langs: Record<string, number> }[];
    byState: { label: string; total: number; langs: Record<string, number> }[];
  };
  funnel: { id: string; title: string; points: number; opened: number; half: number; completed: number }[];
  sources: { source: string; registrations: number; activated: number; views: number; avgPoints: number }[];
}

const LANG_META: Record<string, { label: string; color: string }> = {
  gu: { label: 'Gujarati', color: '#4F9CF9' },
  hi: { label: 'Hindi', color: '#F39C12' },
  en: { label: 'English', color: '#2ECC71' },
  unknown: { label: 'Unknown', color: '#6B7280' },
};

const pct = (n: number) => `${Math.round(n * 100)}%`;
const shortDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
const GRID = 'rgba(255,255,255,0.05)';

function Card({ title, sub, children, wide }: { title: string; sub?: string; children: ReactNode; wide?: boolean }) {
  return (
    <section className={`${ui.card} ${base.chartCard} ${wide ? base.wide : ''}`}>
      <h3 className={ui.cardTitle}>{title}</h3>
      {sub && <p className={ui.cardSub}>{sub}</p>}
      <div className={base.chartBody}>{children}</div>
    </section>
  );
}

const Empty = ({ text }: { text: string }) => <p className={ui.empty}>{text}</p>;

/* ---- Growth (option 4) ---- */
function Growth({ daily }: { daily: Insights['daily'] }) {
  const [range, setRange] = useState<7 | 30 | 90>(30);
  const rows = daily.slice(-range);
  const totals = useMemo(
    () => ({ reg: rows.reduce((t, r) => t + r.registrations, 0), views: rows.reduce((t, r) => t + r.views, 0) }),
    [rows]
  );

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, boxHeight: 8, padding: 14 } },
      tooltip: { padding: 10, cornerRadius: 8 },
    },
    scales: {
      x: { grid: { display: false }, border: { display: false }, ticks: { maxTicksLimit: 6, maxRotation: 0 } },
      y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: GRID }, border: { display: false } },
    },
  };

  const line = (label: string, key: 'registrations' | 'views' | 'activeUsers', color: string, fill = false) => ({
    label,
    data: rows.map(r => r[key]),
    borderColor: color,
    backgroundColor: `${color}22`,
    fill,
    tension: 0.3,
    borderWidth: 2,
    pointRadius: range === 7 ? 3 : 0,
    pointHoverRadius: 4,
  });

  return (
    <Card title="Growth" sub={`${totals.reg} new registrations · ${totals.views} page views in the last ${range} days`} wide>
      <div className={ui.segmented} role="group" aria-label="Date range" style={{ marginBottom: 'var(--space-4)' }}>
        {([7, 30, 90] as const).map(r => (
          <button key={r} type="button" className={`${ui.segment} ${range === r ? ui.segmentActive : ''}`} aria-pressed={range === r} onClick={() => setRange(r)}>
            {r} days
          </button>
        ))}
      </div>
      <div className={styles.lineWrap} role="img" aria-label={`Daily registrations, views and active users for the last ${range} days`}>
        <Line
          data={{
            labels: rows.map(r => shortDate(r.date)),
            datasets: [line('Registrations', 'registrations', '#2ECC71', true), line('Views', 'views', '#4F9CF9'), line('Active users', 'activeUsers', '#F39C12')],
          }}
          options={options}
        />
      </div>
    </Card>
  );
}

/* ---- Engagement (option 3) ---- */
function Engagement({ e }: { e: Insights['engagement'] }) {
  const tiles = [
    { label: 'Activation rate', value: pct(e.activationRate), hint: `${e.activated} of ${e.registered} registered users opened something`, tone: '#2ECC71' },
    { label: 'Active, last 7 days', value: String(e.active7), hint: 'Readers with any view this week', tone: '#4F9CF9' },
    { label: 'Active, last 30 days', value: String(e.active30), hint: 'Readers with any view this month', tone: '#7C8CF8' },
    { label: 'Never viewed', value: String(e.neverViewed), hint: 'Registered, but never read a page', tone: '#E67E8A' },
    { label: 'Avg points read', value: String(e.avgPointsPerReader), hint: `${e.avgViewsPerReader} views per reader on average`, tone: '#F39C12' },
    { label: 'Came back', value: pct(e.returningRate), hint: `${e.returningReaders} readers on 2+ different days`, tone: '#9B59B6' },
  ];
  return (
    <>
      <div className={styles.metrics}>
        {tiles.map(t => (
          <div key={t.label} className={`${ui.card} ${styles.metric}`} style={{ ['--tone' as string]: t.tone }}>
            <span className={base.kpiLabel}>{t.label}</span>
            <span className={styles.metricValue}>{t.value}</span>
            <span className={styles.metricHint}>{t.hint}</span>
          </div>
        ))}
      </div>
      <Card title="Most engaged readers" sub="By distinct points read">
        {e.topUsers.length === 0 ? (
          <Empty text="No reading activity yet." />
        ) : (
          <ol className={styles.top}>
            {e.topUsers.map((u, i) => (
              <li key={u.userId}>
                <span className={styles.rank}>{i + 1}</span>
                <span className={styles.topName}>
                  <strong>{u.name || '—'}</strong>
                  <small>{[u.userType, u.district].filter(Boolean).join(' · ')}</small>
                </span>
                <span className={styles.topNum}>{u.points} <small>points</small></span>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </>
  );
}

/* ---- Funnel (option 6) ---- */
function Funnel({ funnel }: { funnel: Insights['funnel'] }) {
  const rows = funnel.filter(f => f.opened > 0);
  if (rows.length === 0) return <Empty text="No chapter reading yet." />;
  const height = Math.max(220, rows.length * 62 + 60);
  const options: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, boxHeight: 8, padding: 14 } }, tooltip: { padding: 10, cornerRadius: 8 } },
    scales: {
      x: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: GRID }, border: { display: false } },
      y: { grid: { display: false }, border: { display: false }, ticks: { autoSkip: false } },
    },
  };
  const ds = (label: string, key: 'opened' | 'half' | 'completed', color: string) => ({
    label, data: rows.map(r => r[key]), backgroundColor: color, borderRadius: 4, borderSkipped: false as const, barThickness: 12,
  });
  return (
    <>
      <div style={{ height }} role="img" aria-label="Readers who opened, half-read and finished each chapter">
        <Bar data={{ labels: rows.map(r => r.title), datasets: [ds('Opened', 'opened', '#4F9CF9'), ds('Read half or more', 'half', '#F39C12'), ds('Finished', 'completed', '#2ECC71')] }} options={options} />
      </div>
      <p className={ui.cardSub} style={{ marginTop: 'var(--space-3)' }}>
        Finished = viewed every point of the chapter. Chapters nobody opened are hidden.
      </p>
    </>
  );
}

/* ---- Segments (option 5) ---- */
function Segments({ seg }: { seg: Insights['segments'] }) {
  if (seg.userTypes.length === 0) return <Empty text="No reading activity yet." />;
  return (
    <>
      <p className={ui.cardSub}>Share of each group&apos;s readers who opened the chapter. Darker means more.</p>
      <div className={styles.heatWrap}>
        <table className={styles.heat}>
          <thead>
            <tr>
              <th scope="col">Chapter</th>
              {seg.userTypes.map(t => (
                <th key={t.type} scope="col">
                  <span>{t.type}</span>
                  <small>{t.readers} readers</small>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {seg.chapters.map((c, ci) => (
              <tr key={c.id}>
                <th scope="row">{c.title}</th>
                {seg.userTypes.map((t, ti) => {
                  const n = seg.cells[ci][ti];
                  const share = t.readers ? n / t.readers : 0;
                  return (
                    <td key={t.type} style={{ background: `rgba(79,156,249,${(share * 0.75).toFixed(2)})` }} title={`${n} of ${t.readers} readers`}>
                      {n > 0 ? pct(share) : '·'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ---- Language mix (option 5) ---- */
function LanguageMix({ mix }: { mix: Insights['languageMix'] }) {
  const [by, setBy] = useState<'byUserType' | 'byState'>('byUserType');
  const rows = mix[by];
  const langs = Array.from(new Set(rows.flatMap(r => Object.keys(r.langs))));
  const options: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, boxHeight: 8, padding: 14 } }, tooltip: { padding: 10, cornerRadius: 8 } },
    scales: {
      x: { stacked: true, beginAtZero: true, ticks: { precision: 0 }, grid: { color: GRID }, border: { display: false } },
      y: { stacked: true, grid: { display: false }, border: { display: false }, ticks: { autoSkip: false } },
    },
  };
  return (
    <>
      <div className={ui.segmented} role="group" aria-label="Group by" style={{ marginBottom: 'var(--space-4)' }}>
        <button type="button" className={`${ui.segment} ${by === 'byUserType' ? ui.segmentActive : ''}`} aria-pressed={by === 'byUserType'} onClick={() => setBy('byUserType')}>User type</button>
        <button type="button" className={`${ui.segment} ${by === 'byState' ? ui.segmentActive : ''}`} aria-pressed={by === 'byState'} onClick={() => setBy('byState')}>State</button>
      </div>
      {rows.length === 0 ? (
        <Empty text="No reading activity yet." />
      ) : (
        <div style={{ height: Math.max(200, rows.length * 44 + 70) }} role="img" aria-label="Page views by language">
          <Bar
            data={{
              labels: rows.map(r => r.label),
              datasets: langs.map(l => ({
                label: LANG_META[l]?.label ?? l,
                data: rows.map(r => r.langs[l] || 0),
                backgroundColor: LANG_META[l]?.color ?? '#6B7280',
                borderSkipped: false as const,
                barThickness: 18,
              })),
            }}
            options={options}
          />
        </div>
      )}
    </>
  );
}

/* ---- Sources (option 7) ---- */
function Sources({ sources }: { sources: Insights['sources'] }) {
  const tagged = sources.filter(s => s.source !== '(direct)').length;
  return (
    <>
      {tagged === 0 && (
        <div className={`${ui.notice} ${ui.noticeInfo}`} style={{ marginBottom: 'var(--space-4)' }}>
          <span>
            No tagged QR codes yet. In <strong>Chapters</strong>, open a QR code and add a <strong>campaign tag</strong> (for example a clinic or camp name) before printing.
          </span>
        </div>
      )}
      <div className={styles.heatWrap}>
        <table className={styles.plain}>
          <thead>
            <tr>
              <th scope="col">Source</th>
              <th scope="col">Registered</th>
              <th scope="col">Started reading</th>
              <th scope="col">Views</th>
              <th scope="col">Avg points</th>
            </tr>
          </thead>
          <tbody>
            {sources.map(s => (
              <tr key={s.source}>
                <th scope="row">{s.source}</th>
                <td>{s.registrations}</td>
                <td>{s.activated} <small>({s.registrations ? pct(s.activated / s.registrations) : '0%'})</small></td>
                <td>{s.views}</td>
                <td>{s.avgPoints}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

interface InsightsPanelProps {
  refreshKey: number;
}

interface QuizStats {
  attempts: number;
  readers: number;
  accuracy: number;
  hardest: { id: string; question: string; point: string; attempts: number; accuracy: number }[];
  chapters: { id: string; title: string; attempts: number; accuracy: number }[];
}

/* ---- Quiz results ---- */
function QuizResults({ stats }: { stats: QuizStats | null }) {
  if (!stats) return <Empty text="Quiz results could not be loaded." />;
  if (stats.attempts === 0) return <Empty text="No quiz answers yet. Results appear once readers start answering." />;
  return (
    <>
      <div className={styles.metrics}>
        <div className={`${ui.card} ${styles.metric}`} style={{ ['--tone' as string]: '#4F9CF9' }}>
          <span className={base.kpiLabel}>Answers</span>
          <span className={styles.metricValue}>{stats.attempts}</span>
          <span className={styles.metricHint}>First answer to each question</span>
        </div>
        <div className={`${ui.card} ${styles.metric}`} style={{ ['--tone' as string]: '#9B59B6' }}>
          <span className={base.kpiLabel}>Readers who tried</span>
          <span className={styles.metricValue}>{stats.readers}</span>
          <span className={styles.metricHint}>Distinct readers</span>
        </div>
        <div className={`${ui.card} ${styles.metric}`} style={{ ['--tone' as string]: '#2ECC71' }}>
          <span className={base.kpiLabel}>Right first time</span>
          <span className={styles.metricValue}>{pct(stats.accuracy)}</span>
          <span className={styles.metricHint}>Across all questions</span>
        </div>
      </div>
      <Card title="Hardest questions" sub="Lowest first-try accuracy, questions with 3+ answers" wide>
        {stats.hardest.length === 0 ? (
          <Empty text="Not enough answers yet (3 per question needed)." />
        ) : (
          <div className={styles.heatWrap}>
            <table className={styles.plain}>
              <thead><tr><th>Question</th><th>Point</th><th>Answers</th><th>Right first time</th></tr></thead>
              <tbody>
                {stats.hardest.map(q => (
                  <tr key={q.id}>
                    <th scope="row" style={{ whiteSpace: 'normal', minWidth: 200 }}>{q.question}</th>
                    <td style={{ whiteSpace: 'normal' }}><small>{q.point}</small></td>
                    <td>{q.attempts}</td>
                    <td>{pct(q.accuracy)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

export default function InsightsPanel({ refreshKey }: InsightsPanelProps) {
  const [data, setData] = useState<Insights | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState<QuizStats | null>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await fetch(`/api/admin/insights?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Could not load reader insights.');
      setData(await res.json());
      // Quiz results are an extra: a failure here must not hide the rest of the insights
      const q = await fetch(`/api/admin/quiz-stats?t=${Date.now()}`, { cache: 'no-store' }).catch(() => null);
      setQuiz(q?.ok ? await q.json() : null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load reader insights.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  if (loading) return <div className={`${ui.skeleton} ${base.chartSkeleton}`} aria-busy="true" />;
  if (error || !data) {
    return (
      <div className={`${ui.notice} ${ui.noticeError}`} role="alert" style={{ marginTop: 'var(--space-4)' }}>
        <span>{error || 'Could not load reader insights.'}</span>
        <button type="button" className={`${ui.btn} ${ui.btnSecondary} ${ui.btnSm}`} onClick={load}>Try again</button>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <h2 className={styles.sectionTitle}><IconUsers size={18} /> Reader engagement</h2>
      <Engagement e={data.engagement} />

      <h2 className={styles.sectionTitle}><IconChart size={18} /> Trends</h2>
      <div className={base.grid}>
        <Growth daily={data.daily} />
      </div>

      <h2 className={styles.sectionTitle}><IconBook size={18} /> Chapter completion</h2>
      <div className={base.grid}>
        <Card title="Opened, half-read, finished" sub="How far readers get in each chapter" wide>
          <Funnel funnel={data.funnel} />
        </Card>
      </div>

      <h2 className={styles.sectionTitle}><IconUsers size={18} /> Segments</h2>
      <div className={base.grid}>
        <Card title="What each group reads" wide>
          <Segments seg={data.segments} />
        </Card>
        <Card title="Language mix" sub="Page views by language" wide>
          <LanguageMix mix={data.languageMix} />
        </Card>
      </div>

      <h2 className={styles.sectionTitle}><IconBook size={18} /> Quiz results</h2>
      <QuizResults stats={quiz} />

      <h2 className={styles.sectionTitle}><IconChart size={18} /> Campaigns &amp; QR sources</h2>
      <div className={base.grid}>
        <Card title="Where registrations come from" wide>
          <Sources sources={data.sources} />
        </Card>
      </div>
    </div>
  );
}
