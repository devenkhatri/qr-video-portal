'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { LANGUAGES, DEFAULT_LANG, type Lang } from '@/lib/languages';
import type { AdminChapter, AdminContent, AdminPoint, LangStrings } from '@/types/guideAdmin';
import ContentEditor, { type EditorTarget } from './ContentEditor';
import QuizEditor from './QuizEditor';
import {
  IconChevron, IconDown, IconEdit, IconExternal, IconEye, IconEyeOff, IconImage, IconPlay, IconPlus, IconUp,
} from './icons';
import ui from '../ui.module.css';
import styles from './ContentPanel.module.css';

/** The first non-empty value, preferring the language being viewed. */
function pick(values: LangStrings, lang: Lang, fallback = ''): string {
  if (values[lang]) return values[lang];
  for (const { code } of LANGUAGES) if (values[code]) return values[code];
  return fallback;
}

interface ContentPanelProps {
  refreshKey: number;
  onFetchingChange: (busy: boolean) => void;
}

/** Toolbar shared by chapter and point rows. Labels collapse to icons on phones. */
function Toolbar({
  isFirst, isLast, busy, active, openHref, onUp, onDown, onEdit, onQuiz, onToggle, noun,
}: {
  isFirst: boolean; isLast: boolean; busy: boolean; active: boolean; openHref?: string;
  onUp: () => void; onDown: () => void; onEdit: () => void; onQuiz?: () => void; onToggle: () => void; noun: string;
}) {
  const icon = `${ui.btn} ${ui.btnGhost} ${ui.btnSm} ${ui.btnIcon}`;
  const text = `${ui.btn} ${ui.btnSecondary} ${ui.btnSm}`;
  return (
    <div className={styles.toolbar}>
      <div className={styles.order}>
        <button type="button" className={icon} disabled={busy || isFirst} onClick={onUp} aria-label={`Move ${noun} up`} title="Move up"><IconUp size={18} /></button>
        <button type="button" className={icon} disabled={busy || isLast} onClick={onDown} aria-label={`Move ${noun} down`} title="Move down"><IconDown size={18} /></button>
      </div>
      <button type="button" className={text} onClick={onEdit}><IconEdit size={16} /> Edit</button>
      {onQuiz && <button type="button" className={text} onClick={onQuiz}>Quiz</button>}
      <button type="button" className={text} disabled={busy} onClick={onToggle} aria-label={`${active ? 'Hide' : 'Show'} ${noun}`}>
        {active ? <IconEyeOff size={16} /> : <IconEye size={16} />}
        <span className={styles.hideOnPhone}>{active ? 'Hide' : 'Show'}</span>
      </button>
      {openHref && (
        <a className={text} href={openHref} target="_blank" rel="noreferrer" aria-label={`Open ${noun} in a new tab`}>
          <IconExternal size={16} /> <span className={styles.hideOnPhone}>Open</span>
        </a>
      )}
    </div>
  );
}

export default function ContentPanel({ refreshKey, onFetchingChange }: ContentPanelProps) {
  const [content, setContent] = useState<AdminContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [viewLang, setViewLang] = useState<Lang>(DEFAULT_LANG);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editor, setEditor] = useState<EditorTarget | null>(null);
  const [quizFor, setQuizFor] = useState<{ point: AdminPoint; chapter: AdminChapter } | null>(null);
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    onFetchingChange(true);
    try {
      const res = await fetch(`/api/admin/content?t=${Date.now()}`, { cache: 'no-store' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Could not load content.');
      setContent(body);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load content.');
    } finally {
      setLoading(false);
      onFetchingChange(false);
    }
  }, [onFetchingChange]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const pointsByChapter = useMemo(() => {
    const map = new Map<string, AdminPoint[]>();
    for (const p of content?.points ?? []) map.set(p.chapterId, [...(map.get(p.chapterId) ?? []), p]);
    return map;
  }, [content]);

  const toggleExpanded = (id: string) =>
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  /** Reorder or hide/show, then reload so the list always mirrors the Sheet. */
  const quickAction = async (kind: 'chapter' | 'point', id: string, change: Record<string, unknown>) => {
    setBusyId(id);
    setError('');
    try {
      const res = await fetch('/api/admin/content', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, id, ...change }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Could not update.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update.');
    } finally {
      setBusyId(null);
    }
  };

  const onSaved = async () => {
    setEditor(null);
    setToast('Saved. Readers will see the change within about a minute.');
    await load();
  };

  if (loading) {
    return (
      <div aria-busy="true">
        <div className={`${ui.skeleton} ${styles.skelHead}`} />
        {[0, 1, 2, 3].map(i => <div key={i} className={`${ui.skeleton} ${styles.skelRow}`} />)}
      </div>
    );
  }

  const chapters: AdminChapter[] = content?.chapters ?? [];
  const readOnly = Boolean(content?.isDemoData);

  return (
    <div className={ui.fadeUp}>
      <div className={styles.pageHead}>
        <div>
          <h1 className={styles.pageTitle}>Content</h1>
          <p className={styles.pageSub}>Add and edit chapters and points. Changes are saved to your Google Sheet.</p>
        </div>
        <div className={styles.headActions}>
          <div className={ui.segmented} role="group" aria-label="Language of the titles shown below">
            {LANGUAGES.map(l => (
              <button
                key={l.code}
                type="button"
                className={`${ui.segment} ${viewLang === l.code ? ui.segmentActive : ''}`}
                aria-pressed={viewLang === l.code}
                aria-label={l.english}
                title={l.english}
                onClick={() => setViewLang(l.code)}
              >
                {l.label}
              </button>
            ))}
          </div>
          <button type="button" className={`${ui.btn} ${ui.btnPrimary} ${styles.addDesktop}`} onClick={() => setEditor({ kind: 'chapter' })}>
            <IconPlus size={18} /> Add chapter
          </button>
        </div>
      </div>

      {readOnly && (
        <div className={`${ui.notice} ${ui.noticeInfo} ${styles.gap}`}>
          <span><strong>Demo preview.</strong> Google Sheets isn&apos;t configured, so this is sample content and changes can&apos;t be saved.</span>
        </div>
      )}
      {error && <div className={`${ui.notice} ${ui.noticeError} ${styles.gap}`} role="alert"><span>{error}</span></div>}

      {chapters.length === 0 && !error ? (
        <div className={ui.empty}>
          <p>No chapters yet.</p>
          <button type="button" className={`${ui.btn} ${ui.btnPrimary} ${styles.emptyBtn}`} onClick={() => setEditor({ kind: 'chapter' })}>
            <IconPlus size={18} /> Add your first chapter
          </button>
        </div>
      ) : (
        <ol className={styles.list}>
          {chapters.map((c, ci) => {
            const points = pointsByChapter.get(c.id) ?? [];
            const open = expanded.has(c.id);
            return (
              <li key={c.id} className={`${ui.card} ${styles.chapter} ${c.active ? '' : styles.dim}`}>
                <button
                  type="button"
                  className={styles.chapterHead}
                  onClick={() => toggleExpanded(c.id)}
                  aria-expanded={open}
                  aria-label={`${pick(c.titles, viewLang, c.id)}, ${points.length} points. ${open ? 'Collapse' : 'Expand'}`}
                >
                  <span className={styles.icon} aria-hidden="true">{c.icon || ci + 1}</span>
                  <span className={styles.headText}>
                    <span className={styles.title} lang={viewLang}>{pick(c.titles, viewLang, c.id)}</span>
                    <span className={styles.meta}>
                      Chapter {ci + 1} · {points.length} {points.length === 1 ? 'point' : 'points'}
                      {!c.active && <span className={`${ui.pill} ${ui.pillWarn}`}>Hidden</span>}
                    </span>
                  </span>
                  <IconChevron size={20} className={open ? styles.chevOpen : styles.chev} />
                </button>

                <Toolbar
                  noun="chapter"
                  isFirst={ci === 0}
                  isLast={ci === chapters.length - 1}
                  busy={busyId === c.id}
                  active={c.active}
                  openHref={c.active ? `/guide/${encodeURIComponent(c.id)}?lang=${viewLang}` : undefined}
                  onUp={() => quickAction('chapter', c.id, { direction: 'up' })}
                  onDown={() => quickAction('chapter', c.id, { direction: 'down' })}
                  onEdit={() => setEditor({ kind: 'chapter', chapter: c })}
                  onToggle={() => quickAction('chapter', c.id, { active: !c.active })}
                />

                {open && (
                  <div className={styles.points}>
                    {points.length === 0 && <p className={styles.noPoints}>No points in this chapter yet.</p>}
                    {points.map((p, pi) => (
                      <div key={p.id} className={`${styles.point} ${p.active ? '' : styles.dim}`}>
                        <div className={styles.pointMain}>
                          <span className={styles.pointNum}>{ci + 1}.{pi + 1}</span>
                          <div className={styles.pointText}>
                            <span className={styles.pointTitle} lang={viewLang}>{pick(p.headings, viewLang, p.id)}</span>
                            <span className={styles.chips}>
                              {p.imageUrls.length > 0 && <span className={ui.pill}><IconImage size={13} /> {p.imageUrls.length}</span>}
                              {LANGUAGES.some(l => p.videoUrls[l.code]) && <span className={ui.pill}><IconPlay size={13} /> video</span>}
                              <span className={styles.langs} aria-label="Languages with content">
                                {LANGUAGES.map(l => (
                                  <span key={l.code} className={p.headings[l.code] ? styles.langOn : styles.langOff} title={`${l.english}: ${p.headings[l.code] ? 'filled' : 'empty'}`}>
                                    {l.code.toUpperCase()}
                                  </span>
                                ))}
                              </span>
                              {(content?.quizCounts?.[p.id] ?? 0) > 0 && <span className={ui.pill}>Quiz · {content?.quizCounts?.[p.id]}</span>}
                              {!p.active && <span className={`${ui.pill} ${ui.pillWarn}`}>Hidden</span>}
                            </span>
                          </div>
                        </div>
                        <Toolbar
                          noun="point"
                          isFirst={pi === 0}
                          isLast={pi === points.length - 1}
                          busy={busyId === p.id}
                          active={p.active}
                          openHref={c.active && p.active ? `/guide/${encodeURIComponent(c.id)}/${encodeURIComponent(p.id)}?lang=${viewLang}` : undefined}
                          onUp={() => quickAction('point', p.id, { direction: 'up' })}
                          onDown={() => quickAction('point', p.id, { direction: 'down' })}
                          onEdit={() => setEditor({ kind: 'point', point: p, chapterId: c.id })}
                          onQuiz={() => setQuizFor({ point: p, chapter: c })}
                          onToggle={() => quickAction('point', p.id, { active: !p.active })}
                        />
                      </div>
                    ))}
                    <button type="button" className={`${ui.btn} ${ui.btnSecondary} ${styles.addPoint}`} onClick={() => setEditor({ kind: 'point', chapterId: c.id })}>
                      <IconPlus size={18} /> Add a point to this chapter
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {/* Floating add button for thumbs; the header button takes over on larger screens */}
      {chapters.length > 0 && (
        <button type="button" className={styles.fab} onClick={() => setEditor({ kind: 'chapter' })} aria-label="Add chapter">
          <IconPlus size={24} />
        </button>
      )}

      {toast && <div className={`${ui.notice} ${ui.noticeSuccess} ${styles.toast}`} role="status">{toast}</div>}

      {quizFor && (
        <QuizEditor
          key={quizFor.point.id}
          point={quizFor.point}
          chapter={quizFor.chapter}
          readOnly={readOnly}
          onClose={() => setQuizFor(null)}
          onSaved={() => { setQuizFor(null); onSaved(); }}
        />
      )}

      {editor && (
        <ContentEditor
          // A fresh form for every item, so state never leaks between edits
          key={editor.kind + (editor.kind === 'chapter' ? editor.chapter?.id ?? 'new' : editor.point?.id ?? `new-${editor.chapterId}`)}
          target={editor}
          chapters={chapters}
          readOnly={readOnly}
          onClose={() => setEditor(null)}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}
