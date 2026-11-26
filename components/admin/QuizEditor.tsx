'use client';

import { useEffect, useId, useState } from 'react';
import { LANGUAGES, type Lang } from '@/lib/languages';
import type { OptionKey } from '@/types/guide';
import type { AdminChapter, AdminPoint } from '@/types/guideAdmin';
import type { AdminQuestion } from '@/types/quizAdmin';
import { IconClose, IconPlus } from './icons';
import ui from '../ui.module.css';
import styles from './ContentEditor.module.css';
import quiz from './QuizEditor.module.css';

interface QuizEditorProps {
  point: AdminPoint;
  chapter: AdminChapter;
  readOnly?: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const KEYS: OptionKey[] = ['a', 'b', 'c', 'd'];
const blank = (lang: Lang): AdminQuestion => ({
  id: '', lang, question: '', options: { a: '', b: '', c: '', d: '' }, correct: 'a', explanation: '', active: true,
});

export default function QuizEditor({ point, chapter, readOnly = false, onClose, onSaved }: QuizEditorProps) {
  const uid = useId();
  const [all, setAll] = useState<AdminQuestion[] | null>(null);
  const [tab, setTab] = useState<Lang>('gu');
  const [drafts, setDrafts] = useState<Record<string, AdminQuestion[]>>({});
  const [dirty, setDirty] = useState<Set<Lang>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    fetch(`/api/admin/quiz?pointId=${encodeURIComponent(point.id)}`, { cache: 'no-store' })
      .then(async res => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || 'Could not load questions.');
        return body.questions as AdminQuestion[];
      })
      .then(qs => {
        if (!live) return;
        setAll(qs);
        setDrafts(Object.fromEntries(LANGUAGES.map(l => [l.code, qs.filter(q => q.lang === l.code)])));
        // Open on the first language that already has questions
        setTab(LANGUAGES.find(l => qs.some(q => q.lang === l.code))?.code ?? 'gu');
      })
      .catch(err => live && setError(err instanceof Error ? err.message : 'Could not load questions.'));
    return () => { live = false; };
  }, [point.id]);

  const list = drafts[tab] ?? [];
  const pointName = point.headings.en || point.headings.gu || point.headings.hi || point.id;

  const requestClose = () => {
    if (dirty.size > 0 && !window.confirm('Discard your changes?')) return;
    onClose();
  };

  const update = (index: number, patch: Partial<AdminQuestion>) => {
    setDrafts(prev => ({ ...prev, [tab]: prev[tab].map((q, i) => (i === index ? { ...q, ...patch } : q)) }));
    setDirty(prev => new Set(prev).add(tab));
  };
  const setOption = (index: number, key: OptionKey, value: string) =>
    update(index, { options: { ...list[index].options, [key]: value } });
  const add = () => {
    setDrafts(prev => ({ ...prev, [tab]: [...(prev[tab] ?? []), blank(tab)] }));
    setDirty(prev => new Set(prev).add(tab));
  };
  const remove = (index: number) => {
    if (!window.confirm('Delete this question?')) return;
    setDrafts(prev => ({ ...prev, [tab]: prev[tab].filter((_, i) => i !== index) }));
    setDirty(prev => new Set(prev).add(tab));
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      // Only languages that were edited are written back
      for (const lang of dirty) {
        const res = await fetch('/api/admin/quiz', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pointId: point.id, chapterId: chapter.id, lang, questions: drafts[lang] }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || 'Could not save. Please try again.');
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.');
      setSaving(false);
    }
  };

  return (
    <div className={styles.overlay} role="presentation">
      <form className={styles.editor} onSubmit={save} role="dialog" aria-modal="true" aria-labelledby={`${uid}-title`}>
        <header className={styles.editorHeader}>
          <h2 id={`${uid}-title`} className={styles.editorTitle}>Quiz: {pointName}</h2>
          <button type="button" className={`${ui.btn} ${ui.btnGhost} ${ui.btnIcon}`} onClick={requestClose} aria-label="Close"><IconClose size={20} /></button>
        </header>

        <div className={styles.editorBody}>
          <div role="tablist" aria-label="Language" className={styles.tabs}>
            {LANGUAGES.map(l => (
              <button
                key={l.code}
                type="button"
                role="tab"
                aria-selected={tab === l.code}
                className={`${styles.tab} ${tab === l.code ? styles.tabActive : ''}`}
                onClick={() => setTab(l.code)}
              >
                {l.label}
                {(drafts[l.code]?.length ?? 0) > 0 && <span className={styles.dot} aria-label="has questions" />}
              </button>
            ))}
          </div>

          {all === null && !error && <p className={styles.hint}>Loading questions…</p>}

          {all !== null && (
            <div className={styles.panel} lang={tab}>
              {list.length === 0 && <p className={styles.hint}>No questions in this language yet.</p>}

              {list.map((q, i) => (
                <fieldset key={i} className={quiz.card}>
                  <legend className={quiz.legend}>Question {i + 1}{!q.active && ' (hidden)'}</legend>

                  <div className={styles.field}>
                    <label htmlFor={`${uid}-q${i}`}>Question</label>
                    <textarea id={`${uid}-q${i}`} className={quiz.short} value={q.question} maxLength={500} onChange={e => update(i, { question: e.target.value })} />
                  </div>

                  {KEYS.map(k => (
                    <div key={k} className={quiz.optionRow}>
                      <input
                        type="radio"
                        name={`${uid}-correct-${i}`}
                        checked={q.correct === k}
                        onChange={() => update(i, { correct: k })}
                        aria-label={`Option ${k.toUpperCase()} is the correct answer`}
                      />
                      <span className={quiz.optKey} aria-hidden="true">{k.toUpperCase()}</span>
                      <input
                        value={q.options[k]}
                        maxLength={250}
                        onChange={e => setOption(i, k, e.target.value)}
                        placeholder={k === 'c' || k === 'd' ? 'Optional' : 'Required'}
                        aria-label={`Option ${k.toUpperCase()}`}
                      />
                    </div>
                  ))}
                  <p className={styles.hint}>The selected circle marks the correct answer.</p>

                  <div className={styles.field}>
                    <label htmlFor={`${uid}-e${i}`}>Explanation (shown after a correct answer)</label>
                    <textarea id={`${uid}-e${i}`} className={quiz.short} value={q.explanation} maxLength={800} onChange={e => update(i, { explanation: e.target.value })} />
                  </div>

                  <div className={quiz.cardActions}>
                    <label className={styles.check}>
                      <input type="checkbox" checked={q.active} onChange={e => update(i, { active: e.target.checked })} />
                      <span>Show to readers</span>
                    </label>
                    <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={() => remove(i)}>Delete</button>
                  </div>
                </fieldset>
              ))}

              <button type="button" className={`${ui.btn} ${ui.btnSecondary}`} onClick={add} disabled={list.length >= 10}>
                <IconPlus size={18} /> Add a question
              </button>
            </div>
          )}
        </div>

        <footer className={styles.editorFooter}>
          {readOnly && (
            <p className={`${ui.notice} ${ui.noticeInfo} ${styles.footNotice}`}>Sample data: connect Google Sheets to save questions.</p>
          )}
          {error && <p className={`${ui.notice} ${ui.noticeError} ${styles.footNotice}`} role="alert">{error}</p>}
          <div className={styles.footerActions}>
            <button type="button" className={`${ui.btn} ${ui.btnSecondary}`} onClick={requestClose} disabled={saving}>Cancel</button>
            <button type="submit" className={`${ui.btn} ${ui.btnPrimary}`} disabled={saving || readOnly || dirty.size === 0}>
              {saving ? 'Saving…' : 'Save questions'}
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
}
