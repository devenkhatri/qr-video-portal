'use client';

import { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import AdminVideoTable from './AdminVideoTable';
import styles from './AdminCharts.module.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

interface StatsData {
  totalRegistrations: number;
  totalViews: number;
  genderBreakdown: Record<string, number>;
  countryBreakdown: Record<string, number>;
  stateBreakdown: Record<string, number>;
  districtBreakdown: Record<string, number>;
  userTypeBreakdown: Record<string, number>;
  viewsPerVideo: Record<string, number>;
  recentRegistrations: Array<{
    userId: string;
    name: string;
    age?: string;
    gender?: string;
    mobile?: string;
    email?: string;
    country?: string;
    state?: string;
    district?: string;
    userType?: string;
    registeredAt: string;
  }>;
  isDemoData?: boolean;
}

const CHART_COLORS = [
  '#4F9CF9', '#9B59B6', '#2ECC71', '#E74C3C',
  '#F39C12', '#1ABC9C', '#3498DB', '#E67E22',
  '#E91E63', '#00BCD4', '#8BC34A', '#FF5722',
];

function sortedTop(data: Record<string, number>, n = 10) {
  return Object.entries(data)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
}

export default function AdminCharts() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [activeTab, setActiveTab] = useState<'charts' | 'videos'>('charts');

  useEffect(() => {
    setBaseUrl(window.location.origin);
  }, []);

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => {
        if (!r.ok) throw new Error('Failed to load stats');
        return r.json();
      })
      .then(data => { setStats(data); setLoading(false); })
      .catch(() => { setError('Failed to load analytics. Please refresh.'); setLoading(false); });
  }, []);

  const handleLogout = async () => {
    await fetch('/api/admin/login', { method: 'DELETE' });
    window.location.href = '/admin/login';
  };

  if (loading) {
    return (
      <div className={styles.loadingState}>
        <div className={styles.spinner} />
        <p>Loading analytics...</p>
      </div>
    );
  }

  if (error) {
    return <div className={styles.errorState}>{error}</div>;
  }

  if (!stats) return null;

  // --- Chart data builders ---
  const genderChartData = {
    labels: Object.keys(stats.genderBreakdown),
    datasets: [{
      data: Object.values(stats.genderBreakdown),
      backgroundColor: CHART_COLORS,
      borderWidth: 0,
    }],
  };

  const userTypeEntries = sortedTop(stats.userTypeBreakdown, 12);
  const userTypeChartData = {
    labels: userTypeEntries.map(([k]) => k),
    datasets: [{
      data: userTypeEntries.map(([, v]) => v),
      backgroundColor: CHART_COLORS,
      borderWidth: 0,
    }],
  };

  const viewsChartData = {
    labels: Object.keys(stats.viewsPerVideo),
    datasets: [{
      label: 'Views',
      data: Object.values(stats.viewsPerVideo),
      backgroundColor: '#4F9CF9',
      borderRadius: 6,
      borderSkipped: false,
    }],
  };

  const stateEntries = sortedTop(stats.stateBreakdown, 10);
  const stateChartData = {
    labels: stateEntries.map(([k]) => k),
    datasets: [{
      label: 'Users',
      data: stateEntries.map(([, v]) => v),
      backgroundColor: '#9B59B6',
      borderRadius: 6,
      borderSkipped: false,
    }],
  };

  const districtEntries = sortedTop(stats.districtBreakdown, 10);
  const districtChartData = {
    labels: districtEntries.map(([k]) => k),
    datasets: [{
      label: 'Users',
      data: districtEntries.map(([, v]) => v),
      backgroundColor: '#2ECC71',
      borderRadius: 6,
      borderSkipped: false,
    }],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9CA3AF', maxRotation: 40 } },
      y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9CA3AF', stepSize: 1 } },
    },
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: { color: '#9CA3AF', padding: 14, font: { size: 12 } },
      },
    },
  };

  return (
    <div className={styles.dashboard}>
      {/* Header */}
      <div className={styles.dashHeader}>
        <div>
          <h1 className={styles.dashTitle}>📊 Analytics Dashboard</h1>
          <p className={styles.dashSub}>QR Video Portal — Live Statistics</p>
        </div>
        <button className={styles.logoutBtn} onClick={handleLogout}>
          Sign Out
        </button>
      </div>

      {stats.isDemoData && (
        <div className={styles.demoBanner}>
          <span>ℹ️</span>
          <span>
            <strong>Demo Preview Mode:</strong> Google Sheets credentials are not configured in <code>.env.local</code>. Showing sample analytics data.
          </span>
        </div>
      )}

      {/* Tab Navigation */}
      <div className={styles.tabNav}>
        <button
          id="tab-btn-charts"
          className={`${styles.tabBtn} ${activeTab === 'charts' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('charts')}
        >
          <span>📊</span>
          <span>Analytics &amp; Charts</span>
        </button>
        <button
          id="tab-btn-videos"
          className={`${styles.tabBtn} ${activeTab === 'videos' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('videos')}
        >
          <span>🎥</span>
          <span>Video List &amp; QR Codes</span>
        </button>
      </div>

      {activeTab === 'charts' ? (
        <>
          {/* KPI Cards */}
          <div className={styles.kpiGrid}>
            <div className={styles.kpiCard}>
              <div className={styles.kpiIcon}>👥</div>
              <div className={styles.kpiValue}>{stats.totalRegistrations.toLocaleString()}</div>
              <div className={styles.kpiLabel}>Total Registrations</div>
            </div>
            <div className={styles.kpiCard}>
              <div className={styles.kpiIcon}>▶️</div>
              <div className={styles.kpiValue}>{stats.totalViews.toLocaleString()}</div>
              <div className={styles.kpiLabel}>Total Video Views</div>
            </div>
            <div className={styles.kpiCard}>
              <div className={styles.kpiIcon}>🗺️</div>
              <div className={styles.kpiValue}>{Object.keys(stats.stateBreakdown).length}</div>
              <div className={styles.kpiLabel}>States Reached</div>
            </div>
            <div className={styles.kpiCard}>
              <div className={styles.kpiIcon}>📍</div>
              <div className={styles.kpiValue}>{Object.keys(stats.districtBreakdown).length}</div>
              <div className={styles.kpiLabel}>Districts Reached</div>
            </div>
          </div>

          {/* Row 1: Views per Video + Sex Breakdown */}
          <div className={styles.chartsRow}>
            <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}>Views per Video</h3>
              <div className={styles.chartWrap}>
                {Object.keys(stats.viewsPerVideo).length > 0
                  ? <Bar data={viewsChartData} options={barOptions} />
                  : <p className={styles.emptyChart}>No view data yet</p>
                }
              </div>
            </div>
            <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}>Gender Breakdown</h3>
              <div className={styles.chartWrap}>
                {Object.keys(stats.genderBreakdown).length > 0
                  ? <Pie data={genderChartData} options={pieOptions} />
                  : <p className={styles.emptyChart}>No registration data yet</p>
                }
              </div>
            </div>
          </div>

          {/* Row 2: User Type — full-width pie */}
          <div className={styles.chartsRowWide}>
            <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}>User Type Breakdown</h3>
              <div className={styles.chartWrapTall}>
                {Object.keys(stats.userTypeBreakdown).length > 0
                  ? <Pie data={userTypeChartData} options={pieOptions} />
                  : <p className={styles.emptyChart}>No registration data yet</p>
                }
              </div>
            </div>
          </div>

          {/* Row 3: Geography — State + District */}
          <div className={styles.chartsRow}>
            <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}>Top States (up to 10)</h3>
              <div className={styles.chartWrap}>
                {stateEntries.length > 0
                  ? <Bar data={stateChartData} options={barOptions} />
                  : <p className={styles.emptyChart}>No state data yet</p>
                }
              </div>
            </div>
            <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}>Top Districts (up to 10)</h3>
              <div className={styles.chartWrap}>
                {districtEntries.length > 0
                  ? <Bar data={districtChartData} options={barOptions} />
                  : <p className={styles.emptyChart}>No district data yet</p>
                }
              </div>
            </div>
          </div>

          {/* Recent Registrations Table */}
          <div className={styles.tableCard}>
            <h3 className={styles.chartTitle}>Recent Registrations (Last 10)</h3>
            {stats.recentRegistrations.length === 0 ? (
              <p className={styles.emptyChart}>No registrations yet</p>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Age</th>
                      <th>Gender</th>
                      <th>State</th>
                      <th>District</th>
                      <th>Who</th>
                      <th>Registered At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentRegistrations.map((reg, idx) => (
                      <tr key={idx}>
                        <td>{reg.name}</td>
                        <td>{reg.age || '—'}</td>
                        <td>{reg.gender || '—'}</td>
                        <td>{reg.state || '—'}</td>
                        <td>{reg.district || '—'}</td>
                        <td>{reg.userType || '—'}</td>
                        <td>{reg.registeredAt ? new Date(reg.registeredAt).toLocaleString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Video List & QR Codes Tab */
        baseUrl && <AdminVideoTable baseUrl={baseUrl} />
      )}
    </div>
  );
}
