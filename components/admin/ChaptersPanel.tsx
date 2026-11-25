'use client';

import { useCallback, useEffect, useState } from 'react';
import { LANGUAGES, DEFAULT_LANG, type Lang } from '@/lib/languages';
import type { ChapterRow, PointRow } from '@/app/api/admin/chapters/route';
import QrModal, { type QrTarget } from '@/components/QrModal';
import { IconCheck, IconChevron, IconCopy, IconQr } from './icons';
import ui from '../ui.module.css';
import styles from './ChaptersPanel.module.css';

interface ChaptersPanelProps {
  baseUrl: string;
  refreshKey: number;
  onFetchingChange: (busy: boolean) => void;
}

export default function ChaptersPanel({ baseUrl, refreshKey, onFetchingChange }: ChaptersPanelProps) {
  const [chapters, setChapters] = useState<ChapterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDemo, setIsDemo] = useState(false);
  const [lang, setLang] = useState<Lang>(DEFAULT_LANG);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [qr, setQr] = useState<QrTarget | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    onFetchingChange(true);
    try {
      const res = await fetch(`/api/admin/chapters?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Could not load chapters.');
      const data = await res.json();
      setChapters(data.chapters || []);
      setIsDemo(Boolean(data.isDemoData));
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load chapters.');
    } finally {
      setLoading(false);
      onFetchingChange(false);
    }
  }, [onFetchingChange]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const langInfo = LANGUAGES.find(l => l.code === lang);
  const chapterUrl = (id: string) => `${baseUrl}/guide/${encodeURIComponent(id)}?lang=${lang}`;
  const pointUrl = (cid: string, pid: string) => `${baseUrl}/guide/${encodeURIComponent(cid)}/${encodeURIComponent(pid)}?lang=${lang}`;

  const openChapterQr = (c: ChapterRow) =>
    setQr({
      key: `${c.chapterId}-${lang}`,
      title: c.titles[lang] || c.title,
      url: chapterUrl(c.chapterId),
      subtext: `Guidebook • ${langInfo?.english ?? lang.toUpperCase()}`,
    });

  const openPointQr = (c: ChapterRow, p: PointRow) =>
    setQr({
      key: `${c.chapterId}-${p.pointId}-${lang}`,
      title: p.headings[lang] || p.pointId,
      url: pointUrl(c.chapterId, p.pointId),
      subtext: `${c.titles[lang] || c.title} • ${langInfo?.english ?? lang.toUpperCase()}`,
    });

  const openGuidebookQr = () =>
    setQr({ key: 'guidebook', title: 'Guidebook', url: `${baseUrl}/`, subtext: 'Scan to choose your language' });

  const copy = async (id: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const el = document.createElement('textarea');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(id);
    setTimeout(() => setCopied(c => (c === id ? null : c)), 1800);
  };

  const toggle = (id: string) =>
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (loading) {
    return (
      <div aria-busy="true">
        <div className={`${ui.skeleton} ${styles.skelHead}`} />
        {[0, 1, 2].map(i => <div key={i} className={`${ui.skeleton} ${styles.skelRow}`} />)}
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

  return (
    <div className={ui.fadeUp}>
      <div className={styles.pageHead}>
        <div>
          <h1 className={styles.pageTitle}>Chapters &amp; QR codes</h1>
          <p className={styles.pageSub}>Print-ready QR cards and reading stats for every page.</p>
        </div>
        <div className={ui.segmented} role="group" aria-label="Language for links and QR codes">
          {LANGUAGES.map(l => (
            <button
              key={l.code}
              type="button"
              className={`${ui.segment} ${lang === l.code ? ui.segmentActive : ''}`}
              aria-pressed={lang === l.code}
              aria-label={l.english}
              title={l.english}
              onClick={() => setLang(l.code)}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {isDemo && (
        <div className={`${ui.notice} ${ui.noticeInfo} ${styles.demo}`}>
          <span><strong>Demo preview.</strong> View counts are sample data until Google Sheets is connected.</span>
        </div>
      )}

      {/* The one QR that covers the whole guidebook */}
      <section className={`${ui.card} ${styles.hero}`}>
        <span className={styles.heroIcon}><IconQr size={22} /></span>
        <div className={styles.heroText}>
          <h2 className={ui.cardTitle}>Whole guidebook</h2>
          <p className={ui.cardSub}>One code that opens the language chooser. Good for posters and brochure covers.</p>
        </div>
        <button type="button" id="qr-btn-guidebook" className={`${ui.btn} ${ui.btnPrimary}`} onClick={openGuidebookQr}>
          <IconQr size={18} /> Guidebook QR
        </button>
      </section>

      {chapters.length === 0 ? (
        <p className={ui.empty}>No chapters yet. Add one in the Content tab.</p>
      ) : (
        <ol className={styles.list}>
          {chapters.map(c => {
            const open = expanded.has(c.chapterId);
            return (
              <li key={c.chapterId} className={`${ui.card} ${styles.chapter}`}>
                <div className={styles.row}>
                  <div className={styles.rowTitle}>
                    <span className={styles.num}>{c.order}</span>
                    <span className={styles.name} lang={lang}>{c.titles[lang] || c.title}</span>
                  </div>

                  <dl className={styles.stats}>
                    <div><dt>Views</dt><dd>{c.views}</dd></div>
                    <div><dt>Point views</dt><dd>{c.pointViews}</dd></div>
                    <div><dt>Readers</dt><dd>{c.uniqueViewers}</dd></div>
                  </dl>

                  <div className={styles.rowActions}>
                    <button type="button" id={`qr-btn-${c.chapterId}`} className={`${ui.btn} ${ui.btnSecondary} ${ui.btnSm}`} onClick={() => openChapterQr(c)}>
                      <IconQr size={16} /> QR
                    </button>
                    <button
                      type="button"
                      className={`${ui.btn} ${ui.btnGhost} ${ui.btnSm} ${ui.btnIcon}`}
                      onClick={() => copy(c.chapterId, chapterUrl(c.chapterId))}
                      aria-label={`Copy link to ${c.title}`}
                      title="Copy link"
                    >
                      {copied === c.chapterId ? <IconCheck size={16} /> : <IconCopy size={16} />}
                    </button>
                    {c.points.length > 0 && (
                      <button
                        type="button"
                        className={`${ui.btn} ${ui.btnGhost} ${ui.btnSm}`}
                        onClick={() => toggle(c.chapterId)}
                        aria-expanded={open}
                      >
                        {c.points.length} {c.points.length === 1 ? 'point' : 'points'}
                        <IconChevron size={16} className={open ? styles.chevOpen : styles.chev} />
                      </button>
                    )}
                  </div>
                </div>

                {open && (
                  <ul className={styles.points}>
                    {c.points.map(p => (
                      <li key={p.pointId} className={styles.point}>
                        <span className={styles.pointNum}>{c.order}.{p.order}</span>
                        <span className={styles.pointName} lang={lang}>{p.headings[lang] || p.pointId}</span>
                        <span className={ui.pill}>{p.views} {p.views === 1 ? 'view' : 'views'}</span>
                        <span className={styles.pointActions}>
                          <button type="button" className={`${ui.btn} ${ui.btnSecondary} ${ui.btnSm}`} onClick={() => openPointQr(c, p)}>
                            <IconQr size={16} /> QR
                          </button>
                          <button
                            type="button"
                            className={`${ui.btn} ${ui.btnGhost} ${ui.btnSm} ${ui.btnIcon}`}
                            onClick={() => copy(p.pointId, pointUrl(c.chapterId, p.pointId))}
                            aria-label={`Copy link to ${p.headings[lang] || p.pointId}`}
                            title="Copy link"
                          >
                            {copied === p.pointId ? <IconCheck size={16} /> : <IconCopy size={16} />}
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {qr && <QrModal target={qr} onClose={() => setQr(null)} />}
    </div>
  );
}
