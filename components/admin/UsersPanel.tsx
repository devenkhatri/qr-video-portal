'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { IconClose, IconUsers } from './icons';
import ui from '../ui.module.css';
import base from './AnalyticsPanel.module.css';
import styles from './UsersPanel.module.css';

interface UserRow {
  userId: string;
  name: string;
  age: string;
  gender: string;
  maskedMobile: string;
  state: string;
  district: string;
  userType: string;
  source: string;
  registeredAt: number;
  views: number;
  distinctPoints: number;
  chaptersOpened: number;
  chaptersCompleted: number;
  firstActive: number;
  lastActive: number;
}

interface UserDetail {
  profile: {
    userId: string; name: string; age: string; gender: string; mobile: string; email: string;
    country: string; state: string; district: string; userType: string; registeredAt: number; source: string;
  };
  totals: { views: number; distinctPoints: number; activeDays: number; firstActive: number; lastActive: number };
  languages: Record<string, number>;
  chapters: { id: string; title: string; viewed: number; total: number; opened: boolean }[];
  timeline: { at: number; chapterTitle: string; pointHeading: string; lang: string }[];
}

const PAGE_SIZE = 25;
const DAY_MS = 86_400_000;
const LANG_LABEL: Record<string, string> = { gu: 'Gujarati', hi: 'Hindi', en: 'English', unknown: 'Unknown' };

const fmtDate = (ms: number) =>
  ms ? new Date(ms).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : '—';
const fmtDateTime = (ms: number) =>
  ms ? new Date(ms).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—';

function ago(ms: number, now: number): string {
  if (!ms) return 'Never';
  const d = Math.floor((now - ms) / DAY_MS);
  if (d <= 0) return 'Today';
  if (d === 1) return 'Yesterday';
  if (d < 30) return `${d} days ago`;
  return fmtDate(ms);
}

type Activity = 'all' | 'active30' | 'inactive' | 'never';
type Sort = 'newest' | 'recent' | 'points' | 'name';

const uniq = (list: string[]) => Array.from(new Set(list.filter(Boolean))).sort((a, b) => a.localeCompare(b));
const typeGroup = (t: string) => (t.startsWith('Other') ? 'Other' : t);

interface UsersPanelProps {
  refreshKey: number;
  onFetchingChange: (busy: boolean) => void;
}

export default function UsersPanel({ refreshKey, onFetchingChange }: UsersPanelProps) {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [isDemo, setIsDemo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [now, setNow] = useState(() => Date.now());

  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [state, setState] = useState('');
  const [activity, setActivity] = useState<Activity>('all');
  const [sort, setSort] = useState<Sort>('newest');
  const [page, setPage] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    onFetchingChange(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/users?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load users.');
      const json = await res.json();
      setRows(json.users);
      setIsDemo(Boolean(json.isDemoData));
      setNow(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load users.');
    } finally {
      setLoading(false);
      onFetchingChange(false);
    }
  }, [onFetchingChange]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const types = useMemo(() => uniq(rows.map(r => typeGroup(r.userType))), [rows]);
  const states = useMemo(() => uniq(rows.map(r => r.state)), [rows]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = rows.filter(r => {
      if (type && typeGroup(r.userType) !== type) return false;
      if (state && r.state !== state) return false;
      if (activity === 'never' && r.views > 0) return false;
      if (activity === 'active30' && !(r.lastActive && now - r.lastActive <= 30 * DAY_MS)) return false;
      if (activity === 'inactive' && !(r.views > 0 && now - r.lastActive > 30 * DAY_MS)) return false;
      if (!needle) return true;
      return [r.name, r.district, r.state, r.userType, r.source, r.maskedMobile.replace(/•/g, '')]
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });
    const by: Record<Sort, (a: UserRow, b: UserRow) => number> = {
      newest: (a, b) => b.registeredAt - a.registeredAt,
      recent: (a, b) => b.lastActive - a.lastActive,
      points: (a, b) => b.distinctPoints - a.distinctPoints || b.views - a.views,
      name: (a, b) => a.name.localeCompare(b.name),
    };
    return [...list].sort(by[sort]);
  }, [rows, q, type, state, activity, sort, now]);

  // Any filter change returns to the first page
  useEffect(() => setPage(0), [q, type, state, activity, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const visible = filtered.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);

  if (loading) {
    return (
      <div aria-busy="true">
        <div className={`${ui.skeleton} ${base.chartSkeleton}`} />
      </div>
    );
  }
  if (error) {
    return (
      <div className={`${ui.notice} ${ui.noticeError}`} role="alert">
        <span>{error}</span>
        <button type="button" className={`${ui.btn} ${ui.btnSecondary} ${ui.btnSm}`} onClick={load}>Try again</button>
      </div>
    );
  }

  const filtersOn = Boolean(q || type || state || activity !== 'all');

  return (
    <div className={ui.fadeUp}>
      <div className={base.pageHead}>
        <div>
          <h1 className={base.pageTitle}>Users</h1>
          <p className={base.pageSub}>Everyone who registered, and how much they have read.</p>
        </div>
        <a className={`${ui.btn} ${ui.btnSecondary} ${ui.btnSm}`} href="/api/admin/users?format=csv" download id="export-users-btn">
          Export all (CSV)
        </a>
      </div>

      {isDemo && (
        <div className={`${ui.notice} ${ui.noticeInfo} ${base.demo}`}>
          <span><strong>Demo preview.</strong> Google Sheets isn&apos;t configured here, so these are sample people.</span>
        </div>
      )}

      <section className={`${ui.card} ${styles.filters}`} aria-label="Filter users">
        <input
          type="search"
          className={styles.input}
          placeholder="Search name, place, last 4 digits…"
          aria-label="Search users"
          value={q}
          onChange={e => setQ(e.target.value)}
        />
        <div className={styles.selects}>
          <select className={styles.input} aria-label="User type" value={type} onChange={e => setType(e.target.value)}>
            <option value="">All user types</option>
            {types.map(t => <option key={t}>{t}</option>)}
          </select>
          <select className={styles.input} aria-label="State" value={state} onChange={e => setState(e.target.value)}>
            <option value="">All states</option>
            {states.map(s => <option key={s}>{s}</option>)}
          </select>
          <select className={styles.input} aria-label="Activity" value={activity} onChange={e => setActivity(e.target.value as Activity)}>
            <option value="all">Any activity</option>
            <option value="active30">Active in last 30 days</option>
            <option value="inactive">Inactive 30+ days</option>
            <option value="never">Never viewed</option>
          </select>
          <select className={styles.input} aria-label="Sort by" value={sort} onChange={e => setSort(e.target.value as Sort)}>
            <option value="newest">Newest first</option>
            <option value="recent">Recently active</option>
            <option value="points">Most points read</option>
            <option value="name">Name A–Z</option>
          </select>
        </div>
        <div className={styles.summary}>
          <span><IconUsers size={14} /> {filtered.length} of {rows.length} users</span>
          {filtersOn && (
            <button type="button" className={styles.clear} onClick={() => { setQ(''); setType(''); setState(''); setActivity('all'); }}>
              Clear filters
            </button>
          )}
        </div>
      </section>

      {filtered.length === 0 ? (
        <p className={ui.empty}>{rows.length === 0 ? 'No registrations yet.' : 'No users match these filters.'}</p>
      ) : (
        <>
          {/* Phones: one card per person */}
          <ul className={styles.cards}>
            {visible.map(r => (
              <li key={r.userId}>
                <button type="button" className={`${ui.card} ${styles.cardBtn}`} onClick={() => setOpenId(r.userId)}>
                  <span className={styles.cardTop}>
                    <strong>{r.name || '—'}</strong>
                    <span className={styles.points}>{r.distinctPoints} pts</span>
                  </span>
                  <span className={styles.meta}>
                    {[r.userType, [r.district, r.state].filter(Boolean).join(', ')].filter(Boolean).join(' · ') || '—'}
                  </span>
                  <span className={styles.meta}>
                    Joined {fmtDate(r.registeredAt)} · Last active {ago(r.lastActive, now)}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {/* Tablet and up: table */}
          <div className={`${ui.card} ${styles.tableCard}`}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Type</th>
                  <th scope="col">Location</th>
                  <th scope="col">Mobile</th>
                  <th scope="col">Joined</th>
                  <th scope="col" className={styles.num}>Views</th>
                  <th scope="col" className={styles.num}>Points</th>
                  <th scope="col">Last active</th>
                </tr>
              </thead>
              <tbody>
                {visible.map(r => (
                  <tr key={r.userId} onClick={() => setOpenId(r.userId)} className={styles.row}>
                    <td>
                      <button type="button" className={styles.nameBtn} onClick={e => { e.stopPropagation(); setOpenId(r.userId); }}>
                        {r.name || '—'}
                      </button>
                    </td>
                    <td>{r.userType || '—'}</td>
                    <td>{[r.district, r.state].filter(Boolean).join(', ') || '—'}</td>
                    <td className={styles.mono}>{r.maskedMobile || '—'}</td>
                    <td>{fmtDate(r.registeredAt)}</td>
                    <td className={styles.num}>{r.views}</td>
                    <td className={styles.num}>{r.distinctPoints}</td>
                    <td>{ago(r.lastActive, now)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pages > 1 && (
            <nav className={styles.pager} aria-label="Pagination">
              <button type="button" className={`${ui.btn} ${ui.btnSecondary} ${ui.btnSm}`} disabled={current === 0} onClick={() => setPage(current - 1)}>Previous</button>
              <span>Page {current + 1} of {pages}</span>
              <button type="button" className={`${ui.btn} ${ui.btnSecondary} ${ui.btnSm}`} disabled={current >= pages - 1} onClick={() => setPage(current + 1)}>Next</button>
            </nav>
          )}
        </>
      )}

      {openId && <UserDrawer userId={openId} now={now} onClose={() => setOpenId(null)} />}
    </div>
  );
}

/* ---- Per-user detail (option 2) ---- */
function UserDrawer({ userId, now, onClose }: { userId: string; now: number; onClose: () => void }) {
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let current = true;
    setDetail(null);
    setError('');
    fetch(`/api/admin/users/${encodeURIComponent(userId)}`, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error('Could not load this user.'))))
      .then(d => current && setDetail(d))
      .catch(e => current && setError(e instanceof Error ? e.message : 'Could not load this user.'));
    return () => {
      current = false;
    };
  }, [userId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const p = detail?.profile;
  const langs = detail ? Object.entries(detail.languages).sort((a, b) => b[1] - a[1]) : [];

  return (
    <div className={styles.overlay} onClick={onClose}>
      <aside className={styles.drawer} role="dialog" aria-modal="true" aria-label="User details" onClick={e => e.stopPropagation()}>
        <header className={styles.drawerHead}>
          <div>
            <h2 className={styles.drawerTitle}>{p?.name || 'User'}</h2>
            {p && <p className={styles.meta}>{[p.userType, [p.district, p.state].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}</p>}
          </div>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close"><IconClose size={20} /></button>
        </header>

        {error && <div className={`${ui.notice} ${ui.noticeError}`} role="alert">{error}</div>}
        {!detail && !error && <div className={`${ui.skeleton} ${base.chartSkeleton}`} aria-busy="true" />}

        {detail && p && (
          <div className={styles.drawerBody}>
            <dl className={styles.facts}>
              <div><dt>Mobile</dt><dd className={styles.mono}>{p.mobile || '—'}</dd></div>
              <div><dt>Email</dt><dd>{p.email || '—'}</dd></div>
              <div><dt>Age · Gender</dt><dd>{[p.age, p.gender].filter(Boolean).join(' · ') || '—'}</dd></div>
              <div><dt>Registered</dt><dd>{fmtDate(p.registeredAt)}</dd></div>
              <div><dt>Joined via</dt><dd>{p.source || 'Direct'}</dd></div>
              <div><dt>Languages</dt><dd>{langs.length ? langs.map(([l, n]) => `${LANG_LABEL[l] ?? l} (${n})`).join(', ') : '—'}</dd></div>
            </dl>

            <div className={styles.stats}>
              <div><strong>{detail.totals.views}</strong><span>Views</span></div>
              <div><strong>{detail.totals.distinctPoints}</strong><span>Points read</span></div>
              <div><strong>{detail.totals.activeDays}</strong><span>Active days</span></div>
              <div><strong>{ago(detail.totals.lastActive, now)}</strong><span>Last active</span></div>
            </div>

            <h3 className={styles.sub}>Chapter progress</h3>
            <ul className={styles.progress}>
              {detail.chapters.map(c => {
                const share = c.total ? Math.min(1, c.viewed / c.total) : 0;
                return (
                  <li key={c.id}>
                    <span className={styles.progLabel}>
                      <span>{c.title}</span>
                      <small>{c.total ? `${c.viewed}/${c.total}` : c.opened ? 'opened' : '—'}</small>
                    </span>
                    <span className={styles.bar} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(share * 100)} aria-label={`${c.title} progress`}>
                      <span className={`${styles.barFill} ${share >= 1 ? styles.barDone : ''}`} style={{ width: `${Math.max(share * 100, c.opened ? 4 : 0)}%` }} />
                    </span>
                  </li>
                );
              })}
            </ul>

            <h3 className={styles.sub}>Recent activity</h3>
            {detail.timeline.length === 0 ? (
              <p className={ui.empty}>This person has not opened anything yet.</p>
            ) : (
              <ul className={styles.timeline}>
                {detail.timeline.map((t, i) => (
                  <li key={`${t.at}-${i}`}>
                    <span>
                      <strong>{t.pointHeading || t.chapterTitle}</strong>
                      {t.pointHeading && <small>{t.chapterTitle}</small>}
                    </span>
                    <time>{fmtDateTime(t.at)}</time>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
