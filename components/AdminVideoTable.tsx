'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import QRCode from 'qrcode';
import styles from './AdminVideoTable.module.css';

interface VideoRow {
  videoId: string;
  youtubeId: string;
  title: string;
  language: string;
  category: string;
  tags: string[];
  description: string;
  views: number;
  uniqueViewers: number;
  lastViewed: string | null;
}

type SortKey = 'title' | 'views' | 'uniqueViewers' | 'lastViewed' | 'category' | 'language';
type SortDir = 'asc' | 'desc';

interface Props {
  baseUrl: string; // e.g. "https://your-domain.com"
}

function buildWatchUrl(baseUrl: string, youtubeId: string, language: string): string {
  return `${baseUrl}/watch?video=${encodeURIComponent(youtubeId)}&lang=${encodeURIComponent(language)}`;
}

export default function AdminVideoTable({ baseUrl }: Props) {
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDemoData, setIsDemoData] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [langFilter, setLangFilter] = useState('');

  // Sort
  const [sortKey, setSortKey] = useState<SortKey>('views');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // QR modal state
  const [qrModal, setQrModal] = useState<{ videoId: string; title: string; url: string } | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    fetch('/api/admin/videos')
      .then(r => { if (!r.ok) throw new Error('Failed'); return r.json(); })
      .then(data => { setVideos(data.videos); setIsDemoData(data.isDemoData); setLoading(false); })
      .catch(() => { setError('Failed to load video data.'); setLoading(false); });
  }, []);

  // Generate QR whenever modal opens
  useEffect(() => {
    if (!qrModal) { setQrDataUrl(''); return; }
    QRCode.toDataURL(qrModal.url, {
      width: 320,
      margin: 2,
      color: { dark: '#111827', light: '#FFFFFF' },
    }).then(setQrDataUrl).catch(() => setQrDataUrl(''));
  }, [qrModal]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const openQr = useCallback((video: VideoRow) => {
    const url = buildWatchUrl(baseUrl, video.youtubeId, video.language);
    setQrModal({ videoId: video.youtubeId, title: video.title, url });
  }, [baseUrl]);

  const closeQr = () => setQrModal(null);

  const downloadQr = () => {
    if (!qrDataUrl || !qrModal) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `qr-${qrModal.videoId}.png`;
    a.click();
  };

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // fallback
      const el = document.createElement('textarea');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
  };

  // Derived data
  const categories = Array.from(new Set(videos.map(v => v.category))).sort();
  const languages = Array.from(new Set(videos.map(v => v.language))).sort();

  const filtered = videos
    .filter(v => {
      const q = search.toLowerCase();
      if (q && !v.title.toLowerCase().includes(q) && !v.videoId.toLowerCase().includes(q) && !v.tags.join(' ').toLowerCase().includes(q)) return false;
      if (categoryFilter && v.category !== categoryFilter) return false;
      if (langFilter && v.language !== langFilter) return false;
      return true;
    })
    .sort((a, b) => {
      let av: string | number = a[sortKey] ?? '';
      let bv: string | number = b[sortKey] ?? '';
      if (typeof av === 'string' && typeof bv === 'string') {
        av = av.toLowerCase(); bv = bv.toLowerCase();
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <span className={styles.sortNeutral}>⇅</span>;
    return <span className={styles.sortActive}>{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  if (loading) return <div className={styles.loadState}><div className={styles.spinner} />Loading video data...</div>;
  if (error) return <div className={styles.errorState}>{error}</div>;

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>📹 All Videos</h2>
          <p className={styles.sectionSub}>Per-video analytics · sortable &amp; filterable · QR code generator</p>
        </div>
        {isDemoData && <span className={styles.demoBadge}>Demo Data</span>}
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <input
          id="video-search"
          className={styles.searchInput}
          type="search"
          placeholder="Search by title, ID, or tag…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          id="category-filter"
          className={styles.select}
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          id="lang-filter"
          className={styles.select}
          value={langFilter}
          onChange={e => setLangFilter(e.target.value)}
        >
          <option value="">All Languages</option>
          {languages.map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
        </select>
        <span className={styles.resultCount}>{filtered.length} video{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.thSortable} onClick={() => handleSort('title')}>
                Title <SortIcon col="title" />
              </th>
              <th className={styles.thSortable} onClick={() => handleSort('category')}>
                Category <SortIcon col="category" />
              </th>
              <th className={styles.thSortable} onClick={() => handleSort('language')}>
                Lang <SortIcon col="language" />
              </th>
              <th className={`${styles.thSortable} ${styles.thNum}`} onClick={() => handleSort('views')}>
                Views <SortIcon col="views" />
              </th>
              <th className={`${styles.thSortable} ${styles.thNum}`} onClick={() => handleSort('uniqueViewers')}>
                Unique <SortIcon col="uniqueViewers" />
              </th>
              <th className={`${styles.thSortable} ${styles.thDate}`} onClick={() => handleSort('lastViewed')}>
                Last Viewed <SortIcon col="lastViewed" />
              </th>
              <th className={styles.thActions}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className={styles.emptyRow}>No videos match your filters</td></tr>
            ) : filtered.map(v => {
              const watchUrl = buildWatchUrl(baseUrl, v.youtubeId, v.language);
              return (
                <tr key={v.videoId} className={styles.row}>
                  <td className={styles.tdTitle}>
                    <div className={styles.titleMain}>{v.title}</div>
                    <div className={styles.titleSub}>ID: {v.videoId} • YouTube: <code>{v.youtubeId}</code></div>
                    <div className={styles.tagList}>
                      {v.tags.map(t => <span key={t} className={styles.tag}>{t}</span>)}
                    </div>
                  </td>
                  <td><span className={styles.categoryBadge}>{v.category}</span></td>
                  <td><span className={styles.langBadge}>{v.language.toUpperCase()}</span></td>
                  <td className={styles.tdNum}>
                    <span className={styles.numBig}>{v.views}</span>
                  </td>
                  <td className={styles.tdNum}>
                    <span className={styles.numMuted}>{v.uniqueViewers}</span>
                  </td>
                  <td className={styles.tdDate}>
                    {v.lastViewed
                      ? new Date(v.lastViewed).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                      : <span className={styles.never}>Never</span>}
                  </td>
                  <td className={styles.tdActions}>
                    <button
                      id={`qr-btn-${v.videoId}`}
                      className={styles.btnQr}
                      onClick={() => openQr(v)}
                      title="View QR Code"
                    >
                      📱 QR
                    </button>
                    <button
                      id={`copy-btn-${v.videoId}`}
                      className={styles.btnCopy}
                      onClick={() => copyUrl(watchUrl)}
                      title="Copy watch URL"
                    >
                      📋 Copy URL
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* QR Modal */}
      {qrModal && (
        <div className={styles.modalOverlay} onClick={closeQr}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h3 className={styles.modalTitle}>QR Code</h3>
                <p className={styles.modalSub}>{qrModal.title}</p>
              </div>
              <button className={styles.closeBtn} onClick={closeQr} id="qr-modal-close">✕</button>
            </div>

            <div className={styles.qrWrap}>
              {qrDataUrl
                ? <Image src={qrDataUrl} alt={`QR code for ${qrModal.title}`} className={styles.qrImage} width={240} height={240} unoptimized />
                : <div className={styles.qrLoading}>Generating…</div>
              }
            </div>

            <div className={styles.urlBox}>
              <span className={styles.urlText}>{qrModal.url}</span>
            </div>

            <div className={styles.modalActions}>
              <button
                id="qr-download-btn"
                className={styles.btnDownload}
                onClick={downloadQr}
                disabled={!qrDataUrl}
              >
                ⬇️ Download PNG
              </button>
              <button
                id="qr-copy-url-btn"
                className={styles.btnCopyUrl}
                onClick={() => copyUrl(qrModal.url)}
              >
                📋 Copy URL
              </button>
            </div>

            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </div>
        </div>
      )}
    </div>
  );
}
