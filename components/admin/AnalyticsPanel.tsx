'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  type ChartOptions,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { IconBook, IconMap, IconPin, IconUsers } from './icons';
import InsightsPanel from './InsightsPanel';
import ui from '../ui.module.css';
import styles from './AnalyticsPanel.module.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);
ChartJS.defaults.color = '#9CA3AF';
ChartJS.defaults.font.family = 'Inter, "Noto Sans Gujarati", "Noto Sans Devanagari", system-ui, sans-serif';
ChartJS.defaults.borderColor = 'rgba(255,255,255,0.06)';

interface Registration {
  userId: string;
  name: string;
  age?: string;
  gender?: string;
  state?: string;
  district?: string;
  userType?: string;
  registeredAt: string;
}

interface StatsData {
  totalRegistrations: number;
  totalViews: number;
  genderBreakdown: Record<string, number>;
  stateBreakdown: Record<string, number>;
  districtBreakdown: Record<string, number>;
  userTypeBreakdown: Record<string, number>;
  viewsPerChapter: Record<string, number>;
  recentRegistrations: Registration[];
  isDemoData?: boolean;
}

const PALETTE = ['#4F9CF9', '#2ECC71', '#9B59B6', '#F39C12', '#1ABC9C', '#E67E8A', '#7C8CF8', '#E67E22', '#00BCD4', '#8BC34A'];

const sortedTop = (data: Record<string, number>, n = 10) =>
  Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, n);

function timeAgo(date: Date, now: number): string {
  const s = Math.max(0, Math.round((now - date.getTime()) / 1000));
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return `${h} h ago`;
}

function formatDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

const barOptions = (color: string): ChartOptions<'bar'> => ({
  indexAxis: 'y',
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { padding: 10, cornerRadius: 8 } },
  scales: {
    x: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: 'rgba(255,255,255,0.05)' }, border: { display: false } },
    y: { grid: { display: false }, border: { display: false }, ticks: { autoSkip: false } },
  },
  datasets: { bar: { backgroundColor: color, borderRadius: 6, borderSkipped: false, barThickness: 18 } },
});

const doughnutOptions: ChartOptions<'doughnut'> = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '62%',
  plugins: {
    legend: { position: 'bottom', labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true, padding: 14, font: { size: 12 } } },
    tooltip: { padding: 10, cornerRadius: 8 },
  },
};

/** Bar chart whose height grows with the number of rows, so labels stay readable on phones. */
function HBar({ entries, label, color }: { entries: [string, number][]; label: string; color: string }) {
  const height = Math.max(180, entries.length * 38 + 36);
  return (
    <div style={{ height }} role="img" aria-label={`${label}: ${entries.map(([k, v]) => `${k} ${v}`).join(', ')}`}>
      <Bar
        data={{ labels: entries.map(([k]) => k), datasets: [{ label, data: entries.map(([, v]) => v) }] }}
        options={barOptions(color)}
      />
    </div>
  );
}

function ChartCard({ title, sub, children, wide }: { title: string; sub?: string; children: ReactNode; wide?: boolean }) {
  return (
    <section className={`${ui.card} ${styles.chartCard} ${wide ? styles.wide : ''}`}>
      <h3 className={ui.cardTitle}>{title}</h3>
      {sub && <p className={ui.cardSub}>{sub}</p>}
      <div className={styles.chartBody}>{children}</div>
    </section>
  );
}

const NoData = ({ text }: { text: string }) => <p className={ui.empty}>{text}</p>;

interface AnalyticsPanelProps {
  refreshKey: number;
  onFetchingChange: (busy: boolean) => void;
}

export default function AnalyticsPanel({ refreshKey, onFetchingChange }: AnalyticsPanelProps) {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    onFetchingChange(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/stats?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load analytics.');
      setStats(await res.json());
      setUpdatedAt(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load analytics.');
    } finally {
      setLoading(false);
      onFetchingChange(false);
    }
  }, [onFetchingChange]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  // Keep the "updated x min ago" label fresh
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  if (loading) {
    return (
      <div aria-busy="true" aria-live="polite">
        <div className={styles.kpis}>
          {[0, 1, 2, 3].map(i => <div key={i} className={`${ui.skeleton} ${styles.kpiSkeleton}`} />)}
        </div>
        <div className={`${ui.skeleton} ${styles.chartSkeleton}`} />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className={`${ui.notice} ${ui.noticeError}`} role="alert">
        <span>{error || 'Could not load analytics.'}</span>
        <button type="button" className={`${ui.btn} ${ui.btnSecondary} ${ui.btnSm}`} onClick={load}>Try again</button>
      </div>
    );
  }

  const chapterViews = sortedTop(stats.viewsPerChapter, 12);
  const states = sortedTop(stats.stateBreakdown);
  const districts = sortedTop(stats.districtBreakdown);
  const gender = Object.entries(stats.genderBreakdown);
  const userTypes = sortedTop(stats.userTypeBreakdown, 10);

  const kpis = [
    { label: 'Registrations', value: stats.totalRegistrations, Icon: IconUsers, tone: '#4F9CF9' },
    { label: 'Page views', value: stats.totalViews, Icon: IconBook, tone: '#2ECC71' },
    { label: 'States reached', value: Object.keys(stats.stateBreakdown).length, Icon: IconMap, tone: '#9B59B6' },
    { label: 'Districts reached', value: Object.keys(stats.districtBreakdown).length, Icon: IconPin, tone: '#F39C12' },
  ];

  return (
    <div className={ui.fadeUp}>
      <div className={styles.pageHead}>
        <div>
          <h1 className={styles.pageTitle}>Analytics</h1>
          <p className={styles.pageSub}>Who is reading the guidebook, and what they read.</p>
        </div>
        {updatedAt && <span className={ui.pill}>Updated {timeAgo(updatedAt, now)}</span>}
      </div>

      {stats.isDemoData && (
        <div className={`${ui.notice} ${ui.noticeInfo} ${styles.demo}`}>
          <span><strong>Demo preview.</strong> Google Sheets isn&apos;t configured here, so these are sample numbers.</span>
        </div>
      )}

      <div className={styles.kpis}>
        {kpis.map(({ label, value, Icon, tone }, i) => (
          <div key={label} className={`${ui.card} ${styles.kpi}`} style={{ ['--tone' as string]: tone, animationDelay: `${i * 60}ms` }}>
            <span className={styles.kpiIcon}><Icon size={20} /></span>
            <span className={styles.kpiValue}>{value.toLocaleString('en-IN')}</span>
            <span className={styles.kpiLabel}>{label}</span>
          </div>
        ))}
      </div>

      <div className={styles.grid}>
        <ChartCard title="Views per chapter" sub="Chapter and point pages combined" wide>
          {chapterViews.length > 0 ? <HBar entries={chapterViews} label="Views" color="#4F9CF9" /> : <NoData text="No views yet." />}
        </ChartCard>

        <ChartCard title="Gender">
          {gender.length > 0 ? (
            <div className={styles.donut}>
              <Doughnut
                data={{ labels: gender.map(([k]) => k), datasets: [{ data: gender.map(([, v]) => v), backgroundColor: PALETTE, borderWidth: 0 }] }}
                options={doughnutOptions}
              />
            </div>
          ) : <NoData text="No registrations yet." />}
        </ChartCard>

        <ChartCard title="Who is registering">
          {userTypes.length > 0 ? (
            <div className={styles.donut}>
              <Doughnut
                data={{ labels: userTypes.map(([k]) => k), datasets: [{ data: userTypes.map(([, v]) => v), backgroundColor: PALETTE, borderWidth: 0 }] }}
                options={doughnutOptions}
              />
            </div>
          ) : <NoData text="No registrations yet." />}
        </ChartCard>

        <ChartCard title="Top states">
          {states.length > 0 ? <HBar entries={states} label="Users" color="#9B59B6" /> : <NoData text="No data yet." />}
        </ChartCard>

        <ChartCard title="Top districts">
          {districts.length > 0 ? <HBar entries={districts} label="Users" color="#2ECC71" /> : <NoData text="No data yet." />}
        </ChartCard>
      </div>

      <section className={`${ui.card} ${styles.recent}`}>
        <h3 className={ui.cardTitle}>Recent registrations</h3>
        <p className={ui.cardSub}>The latest 10 people to sign up</p>

        {stats.recentRegistrations.length === 0 ? (
          <NoData text="No registrations yet." />
        ) : (
          <>
            {/* Phones: one card per person */}
            <ul className={styles.people}>
              {stats.recentRegistrations.map(r => (
                <li key={r.userId + r.registeredAt} className={styles.person}>
                  <div className={styles.personTop}>
                    <strong>{r.name || '—'}</strong>
                    <time className={styles.personTime}>{formatDate(r.registeredAt)}</time>
                  </div>
                  <div className={styles.personMeta}>
                    {[r.age && `${r.age} yrs`, r.gender, [r.district, r.state].filter(Boolean).join(', ')].filter(Boolean).join(' · ') || '—'}
                  </div>
                  {r.userType && <span className={ui.pill}>{r.userType}</span>}
                </li>
              ))}
            </ul>

            {/* Tablet and up: compact table */}
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Age</th>
                    <th scope="col">Gender</th>
                    <th scope="col">Location</th>
                    <th scope="col">Category</th>
                    <th scope="col">Registered</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentRegistrations.map(r => (
                    <tr key={r.userId + r.registeredAt}>
                      <td>{r.name || '—'}</td>
                      <td>{r.age || '—'}</td>
                      <td>{r.gender || '—'}</td>
                      <td>{[r.district, r.state].filter(Boolean).join(', ') || '—'}</td>
                      <td>{r.userType || '—'}</td>
                      <td>{formatDate(r.registeredAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <InsightsPanel refreshKey={refreshKey} />
    </div>
  );
}
