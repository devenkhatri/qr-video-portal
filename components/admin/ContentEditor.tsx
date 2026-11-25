'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { LANGUAGES, type Lang } from '@/lib/languages';
import { normalizeImageUrl } from '@/lib/imageUrl';
import type { AdminChapter, AdminPoint, LangStrings } from '@/types/guideAdmin';
import { IconClose, IconPlus } from './icons';
import ui from '../ui.module.css';
import styles from './ContentEditor.module.css';

export type EditorTarget =
  | { kind: 'chapter'; chapter?: AdminChapter }
  | { kind: 'point'; point?: AdminPoint; chapterId: string };

interface ContentEditorProps {
  target: EditorTarget;
  chapters: AdminChapter[];
  /** Demo mode: the form can be explored but not saved. */
  readOnly?: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const EMPTY: LangStrings = { gu: '', hi: '', en: '' };
const ICON_SUGGESTIONS = ['🔬', '🏥', '⚡', '💊', '🌱', '🤝', '🎗️', '🩺', '📖', '❤️'];

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export default function ContentEditor({ target, chapters, readOnly = false, onClose, onSaved }: ContentEditorProps) {
  const uid = useId();
  const isChapter = target.kind === 'chapter';
  const existing = target.kind === 'chapter' ? target.chapter : target.point;

  // ----- form state, seeded from the item being edited -----
  const initial = useRef({
    active: existing?.active ?? true,
    icon: target.kind === 'chapter' ? (target.chapter?.icon ?? '') : '',
    titles: target.kind === 'chapter' ? { ...EMPTY, ...target.chapter?.titles } : EMPTY,
    descriptions: target.kind === 'chapter' ? { ...EMPTY, ...target.chapter?.descriptions } : EMPTY,
    headings: target.kind === 'point' ? { ...EMPTY, ...target.point?.headings } : EMPTY,
    texts: target.kind === 'point' ? { ...EMPTY, ...target.point?.texts } : EMPTY,
    videoUrls: target.kind === 'point' ? { ...EMPTY, ...target.point?.videoUrls } : EMPTY,
    imageUrls: target.kind === 'point' ? [...(target.point?.imageUrls ?? [])] : ([] as string[]),
    chapterId: target.kind === 'point' ? target.chapterId : '',
  }).current;

  const [active, setActive] = useState(initial.active);
  const [icon, setIcon] = useState(initial.icon);
  const [titles, setTitles] = useState<LangStrings>(initial.titles);
  const [descriptions, setDescriptions] = useState<LangStrings>(initial.descriptions);
  const [headings, setHeadings] = useState<LangStrings>(initial.headings);
  const [texts, setTexts] = useState<LangStrings>(initial.texts);
  const [videoUrls, setVideoUrls] = useState<LangStrings>(initial.videoUrls);
  const [imageUrls, setImageUrls] = useState<string[]>(initial.imageUrls);
  const [chapterId, setChapterId] = useState(initial.chapterId);
  // Open on the first language that already has content, so an English-only point doesn't open on an empty Gujarati tab
  const [tab, setTab] = useState<Lang>(
    () =>
      LANGUAGES.find(l =>
        target.kind === 'chapter'
          ? target.chapter?.titles[l.code]
          : target.point?.headings[l.code] || target.point?.texts[l.code]
      )?.code ?? 'gu'
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const dirty = !same(
    { active, icon, titles, descriptions, headings, texts, videoUrls, imageUrls, chapterId },
    initial
  );

  const requestClose = () => {
    if (dirty && !window.confirm('Discard your changes?')) return;
    onClose();
  };

  // Escape closes (with the same unsaved-changes guard)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && requestClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const setLang = (setter: (fn: (v: LangStrings) => LangStrings) => void, lang: Lang, value: string) =>
    setter(prev => ({ ...prev, [lang]: value }));

  // A dot on a tab means that language already has content
  const filled = (lang: Lang) =>
    isChapter ? Boolean(titles[lang]) : Boolean(headings[lang] || texts[lang]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const data = isChapter
        ? { icon, titles, descriptions, active }
        : { chapterId, headings, texts, videoUrls, imageUrls, active };
      const res = await fetch('/api/admin/content', {
        method: existing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: target.kind, id: existing?.id, data }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Could not save. Please try again.');
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.');
      setSaving(false);
    }
  };

  const heading = `${existing ? 'Edit' : 'Add'} ${isChapter ? 'chapter' : 'point'}`;
  const chapterName = (c: AdminChapter) => c.titles.en || c.titles.gu || c.titles.hi || c.id;

  return (
    <div className={styles.overlay} role="presentation">
      <form className={styles.editor} onSubmit={save} role="dialog" aria-modal="true" aria-labelledby={`${uid}-title`}>
        <header className={styles.editorHeader}>
          <h2 id={`${uid}-title`} className={styles.editorTitle}>{heading}</h2>
          <button type="button" className={`${ui.btn} ${ui.btnGhost} ${ui.btnIcon}`} onClick={requestClose} aria-label="Close"><IconClose size={20} /></button>
        </header>

        <div className={styles.editorBody}>
          {/* Which chapter does a point belong to? Fixed after creation, because links and QR codes include it. */}
          {!isChapter && (
            <div className={styles.field}>
              <label htmlFor={`${uid}-chapter`}>Chapter</label>
              <select
                id={`${uid}-chapter`}
                value={chapterId}
                onChange={e => setChapterId(e.target.value)}
                disabled={Boolean(existing)}
                required
              >
                <option value="" disabled>Choose a chapter…</option>
                {chapters.map(c => (
                  <option key={c.id} value={c.id}>{c.order}. {chapterName(c)}</option>
                ))}
              </select>
              {existing && <p className={styles.hint}>A point stays in its chapter so printed QR codes keep working.</p>}
            </div>
          )}

          {isChapter && (
            <div className={styles.field}>
              <label htmlFor={`${uid}-icon`}>Icon (emoji)</label>
              <input
                id={`${uid}-icon`}
                value={icon}
                onChange={e => setIcon(e.target.value)}
                maxLength={16}
                placeholder="🔬"
                className={styles.iconInput}
              />
              <div className={styles.suggestions} aria-label="Icon suggestions">
                {ICON_SUGGESTIONS.map(i => (
                  <button type="button" key={i} className={styles.suggestion} onClick={() => setIcon(i)} aria-label={`Use ${i}`}>
                    {i}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Language tabs */}
          <div role="tablist" aria-label="Language" className={styles.tabs}>
            {LANGUAGES.map(l => (
              <button
                key={l.code}
                type="button"
                role="tab"
                id={`${uid}-tab-${l.code}`}
                aria-selected={tab === l.code}
                aria-controls={`${uid}-panel`}
                className={`${styles.tab} ${tab === l.code ? styles.tabActive : ''}`}
                onClick={() => setTab(l.code)}
              >
                {l.label}
                {filled(l.code) && <span className={styles.dot} aria-label="has content" />}
              </button>
            ))}
          </div>

          <div role="tabpanel" id={`${uid}-panel`} aria-labelledby={`${uid}-tab-${tab}`} className={styles.panel} lang={tab}>
            {isChapter ? (
              <>
                <div className={styles.field}>
                  <label htmlFor={`${uid}-title-f`}>Title</label>
                  <input
                    id={`${uid}-title-f`}
                    value={titles[tab]}
                    onChange={e => setLang(setTitles, tab, e.target.value)}
                    maxLength={150}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor={`${uid}-desc`}>Short description</label>
                  <textarea
                    id={`${uid}-desc`}
                    rows={3}
                    value={descriptions[tab]}
                    onChange={e => setLang(setDescriptions, tab, e.target.value)}
                    maxLength={500}
                  />
                </div>
              </>
            ) : (
              <>
                <div className={styles.field}>
                  <label htmlFor={`${uid}-head`}>Heading</label>
                  <input
                    id={`${uid}-head`}
                    value={headings[tab]}
                    onChange={e => setLang(setHeadings, tab, e.target.value)}
                    maxLength={300}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor={`${uid}-text`}>Text</label>
                  <textarea
                    id={`${uid}-text`}
                    rows={9}
                    value={texts[tab]}
                    onChange={e => setLang(setTexts, tab, e.target.value)}
                    maxLength={10000}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor={`${uid}-video`}>YouTube video link for this language (optional)</label>
                  <input
                    id={`${uid}-video`}
                    value={videoUrls[tab]}
                    onChange={e => setLang(setVideoUrls, tab, e.target.value)}
                    placeholder="https://youtu.be/…"
                    inputMode="url"
                  />
                  <p className={styles.hint}>Readers only see the video that matches their language.</p>
                </div>
              </>
            )}
            {!filled(tab) && (
              <p className={styles.hint}>
                Empty here? Readers of this language will see the first language that has content.
              </p>
            )}
          </div>

          {/* Images are shared across languages */}
          {!isChapter && (
            <fieldset className={styles.images}>
              <legend>Images (shown in every language)</legend>
              {imageUrls.map((url, i) => (
                <div key={i} className={styles.imageRow}>
                  {url.trim() && /^https?:\/\//i.test(url.trim()) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={normalizeImageUrl(url.trim())}
                      alt=""
                      className={styles.thumb}
                      onError={e => (e.currentTarget.style.visibility = 'hidden')}
                      onLoad={e => (e.currentTarget.style.visibility = 'visible')}
                    />
                  ) : (
                    <span className={styles.thumb} aria-hidden="true" />
                  )}
                  <input
                    value={url}
                    onChange={e => setImageUrls(prev => prev.map((u, n) => (n === i ? e.target.value : u)))}
                    placeholder="https://… (Google Drive share links work)"
                    aria-label={`Image link ${i + 1}`}
                    inputMode="url"
                  />
                  <button
                    type="button"
                    className={`${ui.btn} ${ui.btnGhost} ${ui.btnIcon}`}
                    onClick={() => setImageUrls(prev => prev.filter((_, n) => n !== i))}
                    aria-label={`Remove image ${i + 1}`}
                  >
                    <IconClose size={18} />
                  </button>
                </div>
              ))}
              <button type="button" className={`${ui.btn} ${ui.btnSecondary}`} onClick={() => setImageUrls(prev => [...prev, ''])}>
                <IconPlus size={18} /> Add image link
              </button>
            </fieldset>
          )}

          <label className={styles.check}>
            <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} />
            <span>
              Visible to readers
              {!active && <em className={styles.hint}> — hidden items stay in the Sheet but are not shown</em>}
            </span>
          </label>
        </div>

        <footer className={styles.editorFooter}>
          {readOnly && (
            <p className={`${ui.notice} ${ui.noticeInfo} ${styles.footNotice}`}>
              Demo preview: connect Google Sheets to save changes.
            </p>
          )}
          {error && <p className={`${ui.notice} ${ui.noticeError} ${styles.footNotice}`} role="alert">{error}</p>}
          <div className={styles.footerActions}>
            <button type="button" className={`${ui.btn} ${ui.btnSecondary}`} onClick={requestClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className={`${ui.btn} ${ui.btnPrimary}`} disabled={saving || readOnly || (!isChapter && !chapterId)}>
              {saving ? 'Saving…' : existing ? 'Save changes' : `Add ${isChapter ? 'chapter' : 'point'}`}
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
}
