'use client';

import { useEffect, type CSSProperties } from 'react';
import Link from 'next/link';
import RegistrationForm from '@/components/RegistrationForm';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { IconCheck, IconChevron, IconImage, IconPlay } from '@/components/admin/icons';
import { useRegistrationGate, trackView } from '@/lib/useRegistrationGate';
import { useProgress } from '@/lib/progress';
import { STRINGS } from '@/lib/strings';
import { accentFor } from '@/lib/accent';
import type { Chapter, Point, Lang } from '@/types/guide';
import styles from './chapter.module.css';

interface ChapterClientProps {
  chapter: Chapter;
  points: Point[];
  next: Chapter | null;
  lang: Lang;
  isAdmin?: boolean;
}

export default function ChapterClient({ chapter, points, next, lang, isAdmin }: ChapterClientProps) {
  const { state, userId, onRegistered } = useRegistrationGate();
  const { read } = useProgress();
  const t = STRINGS[lang];

  // One chapter view per visit, once the content is actually shown
  useEffect(() => {
    if (state === 'open') trackView(chapter.id, userId, lang);
  }, [state, chapter.id, lang, userId]);

  const header = (
    <SiteHeader lang={lang} isAdmin={isAdmin} back={{ href: `/guide?lang=${lang}`, label: t.chapters }} />
  );

  if (state === 'loading') {
    return (
      <>
        {header}
        <main id="main" className={styles.main}>
          <p className={styles.status} role="status">{t.loading}</p>
        </main>
      </>
    );
  }

  if (state === 'form') {
    return (
      <>
        {header}
        <RegistrationForm userId={userId} onSuccess={onRegistered} lang={lang} />
      </>
    );
  }

  const pointHref = (id: string) => `/guide/${encodeURIComponent(chapter.id)}/${encodeURIComponent(id)}?lang=${lang}`;

  const done = points.filter(p => read[p.id]).length;
  const total = points.length;
  const complete = total > 0 && done >= total;
  const resumeAt = points.find(p => !read[p.id]) ?? points[0];
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <>
      {header}
      <main id="main" className={styles.main} style={{ '--accent': accentFor(chapter.order) } as CSSProperties}>
        <article lang={lang} className={styles.article}>
          {/* Hero */}
          <header className={styles.hero}>
            <span className={styles.heroIcon} aria-hidden="true">{chapter.icon || chapter.order}</span>
            <p className={styles.eyebrow}>{t.chapters} · {String(chapter.order).padStart(2, '0')}</p>
            <h1 className={styles.chapterTitle}>{chapter.title}</h1>
            {chapter.description && <p className={styles.chapterDescription}>{chapter.description}</p>}

            <div className={styles.progressRow}>
              <p className={styles.chapterMeta}>
                {done > 0 ? `${done} / ${total}` : total} {total === 1 ? t.point : t.points}
              </p>
              {done > 0 && (
                <span
                  className={styles.bar}
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={total}
                  aria-valuenow={done}
                  aria-label={`${chapter.title}: ${done} / ${total}`}
                >
                  <span style={{ width: `${percent}%` }} />
                </span>
              )}
            </div>

            {resumeAt && (
              <Link href={pointHref(resumeAt.id)} className={styles.cta}>
                {done > 0 && !complete ? t.resume : t.startReading} <span aria-hidden="true">→</span>
              </Link>
            )}
            {complete && <p className={styles.allRead}><IconCheck size={16} /> {t.allRead}</p>}
          </header>

          {/* Point list: every point opens on its own page */}
          {total === 0 ? (
            <p className={styles.empty}>{t.noPoints}</p>
          ) : (
            <section aria-labelledby="chapter-contents">
              <h2 id="chapter-contents" className={styles.sectionTitle}>{t.inThisChapter}</h2>
              <ol className={styles.points}>
                {points.map((p, i) => {
                  const isRead = Boolean(read[p.id]);
                  return (
                    <li key={p.id}>
                      <Link href={pointHref(p.id)} className={`${styles.pointCard} ${isRead ? styles.pointRead : ''}`}>
                        <span className={styles.pointIndex} aria-hidden="true">
                          {isRead ? <IconCheck size={18} /> : i + 1}
                        </span>
                        <span className={styles.pointBody}>
                          <span className={styles.pointHeading}>{p.heading}</span>
                          {p.text && <span className={styles.pointSnippet}>{p.text}</span>}
                          {(p.images.length > 0 || p.youtubeId) && (
                            <span className={styles.chips}>
                              {p.youtubeId && <span className={styles.chip}><IconPlay size={13} /> {t.hasVideo}</span>}
                              {p.images.length > 0 && <span className={styles.chip}><IconImage size={13} /> {t.hasImages} · {p.images.length}</span>}
                            </span>
                          )}
                        </span>
                        <IconChevron size={20} className={styles.chevron} />
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </section>
          )}

          <nav className={styles.footerNav} aria-label="Chapter navigation">
            <Link href={`/guide?lang=${lang}`} className={styles.navLink}>
              ← {t.backToChapters}
            </Link>
            {next && (
              <Link
                href={`/guide/${encodeURIComponent(next.id)}?lang=${lang}`}
                className={`${styles.navLink} ${styles.navLinkPrimary}`}
              >
                <span className={styles.navLabel}>
                  <span className={styles.navHint}>{t.nextChapter}</span>
                  <span>{next.order}. {next.title}</span>
                </span>
                <span aria-hidden="true"> →</span>
              </Link>
            )}
          </nav>
        </article>
      </main>

      <SiteFooter lang={lang} />
    </>
  );
}
