'use client';

import { useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { LANGUAGES, type Lang } from '@/lib/languages';
import { STRINGS } from '@/lib/strings';
import { accentFor } from '@/lib/accent';
import { useProgress } from '@/lib/progress';
import type { Chapter } from '@/types/guide';
import QrModal, { type QrTarget } from './QrModal';
import { IconCheck, IconQr } from './admin/icons';
import styles from './ChapterCards.module.css';

interface ChapterCardsProps {
  chapters: Chapter[];
  lang: Lang;
}

export default function ChapterCards({ chapters, lang }: ChapterCardsProps) {
  const [qrTarget, setQrTarget] = useState<QrTarget | null>(null);
  const { read } = useProgress();
  const langInfo = LANGUAGES.find(l => l.code === lang);
  const t = STRINGS[lang];

  const openQr = (c: Chapter) => {
    // Built on click so window.origin is always available (client only)
    setQrTarget({
      key: `${c.id}-${lang}`,
      title: c.title,
      url: `${window.location.origin}/guide/${encodeURIComponent(c.id)}?lang=${lang}`,
      subtext: `Guidebook • ${langInfo?.english ?? lang.toUpperCase()}`,
    });
  };

  if (chapters.length === 0) {
    return <p className={styles.empty}>—</p>;
  }

  const total = chapters.reduce((n, c) => n + c.pointCount, 0);
  const doneTotal = chapters.reduce((n, c) => n + c.pointIds.filter(id => read[id]).length, 0);
  const overallPercent = total > 0 ? Math.round((doneTotal / total) * 100) : 0;

  return (
    <>
      {doneTotal > 0 && (
        <div className={styles.overall} lang={lang}>
          <div className={styles.overallHead}>
            <span className={styles.overallLabel}>{t.overallProgress}</span>
            <span className={styles.overallValue}>{doneTotal} / {total} · {overallPercent}%</span>
          </div>
          <div
            className={styles.overallBar}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={doneTotal}
            aria-label={t.overallProgress}
          >
            <span style={{ width: `${overallPercent}%` }} />
          </div>
        </div>
      )}

      <ol className={styles.grid}>
        {chapters.map((c, i) => {
          const done = c.pointIds.filter(id => read[id]).length;
          const complete = c.pointCount > 0 && done >= c.pointCount;
          const percent = c.pointCount > 0 ? Math.round((done / c.pointCount) * 100) : 0;

          return (
            <li
              key={c.id}
              className={styles.card}
              style={{ '--accent': accentFor(c.order), animationDelay: `${i * 50}ms` } as CSSProperties}
            >
              <Link href={`/guide/${encodeURIComponent(c.id)}?lang=${lang}`} className={styles.cardLink}>
                <span className={styles.top}>
                  <span className={styles.iconTile} aria-hidden="true">{c.icon || c.order}</span>
                  <span className={styles.number} aria-hidden="true">{String(c.order).padStart(2, '0')}</span>
                </span>

                <span className={styles.title} lang={lang}>{c.title}</span>
                {c.description && <span className={styles.description} lang={lang}>{c.description}</span>}

                <span className={styles.footer}>
                  {done > 0 && c.pointCount > 0 && (
                    <span
                      className={styles.bar}
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={c.pointCount}
                      aria-valuenow={done}
                      aria-label={`${c.title}: ${done} / ${c.pointCount}`}
                    >
                      <span style={{ width: `${percent}%` }} />
                    </span>
                  )}
                  <span className={styles.meta}>
                    {complete ? (
                      <span className={styles.doneBadge} lang={lang}><IconCheck size={14} /> {t.completed}</span>
                    ) : (
                      <span lang={lang}>
                        {done > 0 ? `${done} / ${c.pointCount}` : c.pointCount} {c.pointCount === 1 ? t.point : t.points}
                      </span>
                    )}
                    <span className={styles.open} lang={lang}>
                      {done > 0 && !complete ? t.resume : t.openChapter} <span aria-hidden="true">→</span>
                    </span>
                  </span>
                </span>
              </Link>

              <button
                type="button"
                className={styles.qrBtn}
                onClick={() => openQr(c)}
                aria-label={`${t.qrCode}: ${c.title}`}
                title={t.qrCode}
              >
                <IconQr size={18} />
              </button>
            </li>
          );
        })}
      </ol>

      {qrTarget && <QrModal target={qrTarget} onClose={() => setQrTarget(null)} shareLang={lang} />}
    </>
  );
}
