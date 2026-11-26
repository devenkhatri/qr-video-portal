'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import RegistrationForm from '@/components/RegistrationForm';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import QrModal, { type QrTarget } from '@/components/QrModal';
import ImageLightbox from '@/components/ImageLightbox';
import QuizCard from '@/components/QuizCard';
import { IconCheck, IconChevron, IconQr } from '@/components/admin/icons';
import { useRegistrationGate, trackView } from '@/lib/useRegistrationGate';
import { markPointRead, setLastVisited } from '@/lib/progress';
import { useReadingSize } from '@/lib/useReadingSize';
import { LANGUAGES } from '@/lib/languages';
import { STRINGS } from '@/lib/strings';
import { accentFor } from '@/lib/accent';
import type { Chapter, Point, PointRef, Lang } from '@/types/guide';
import styles from './point.module.css';

interface PointClientProps {
  chapter: Chapter;
  point: Point;
  index: number;
  total: number;
  prev: PointRef | null;
  next: PointRef | null;
  nextChapter: Chapter | null;
  lang: Lang;
  isAdmin?: boolean;
}

export default function PointClient({
  chapter,
  point,
  index,
  total,
  prev,
  next,
  nextChapter,
  lang,
  isAdmin,
}: PointClientProps) {
  const { state, userId, onRegistered } = useRegistrationGate();
  const size = useReadingSize();
  const t = STRINGS[lang];
  const [qrTarget, setQrTarget] = useState<QrTarget | null>(null);
  const [zoom, setZoom] = useState<string | null>(null);

  // Once the content is actually shown: count the view, and remember it on this device for "Continue reading"
  useEffect(() => {
    if (state !== 'open') return;
    trackView(point.id, userId, lang);
    markPointRead(point.id);
    setLastVisited({
      chapterId: chapter.id,
      chapterTitle: chapter.title,
      pointId: point.id,
      pointHeading: point.heading,
      lang,
    });
  }, [state, point.id, point.heading, chapter.id, chapter.title, userId, lang]);

  const chapterHref = `/guide/${encodeURIComponent(chapter.id)}?lang=${lang}`;
  const pointHref = (id: string) => `/guide/${encodeURIComponent(chapter.id)}/${encodeURIComponent(id)}?lang=${lang}`;

  const header = (
    <SiteHeader lang={lang} isAdmin={isAdmin} back={{ href: chapterHref, label: chapter.title }} />
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

  const openQr = () => {
    const langInfo = LANGUAGES.find(l => l.code === lang);
    setQrTarget({
      key: `${chapter.id}-${point.id}-${lang}`,
      title: point.heading,
      url: `${window.location.origin}${pointHref(point.id)}`,
      subtext: `${chapter.title} • ${langInfo?.english ?? lang.toUpperCase()}`,
    });
  };

  const isLast = !next;
  const progress = Math.round(((index + 1) / total) * 100);

  // Where "forward" leads: the next point, else the next chapter, else back to this chapter
  const forward = next
    ? { href: pointHref(next.id), hint: t.nextPoint, label: next.heading }
    : nextChapter
      ? { href: `/guide/${encodeURIComponent(nextChapter.id)}?lang=${lang}`, hint: t.nextChapter, label: `${nextChapter.order}. ${nextChapter.title}` }
      : { href: chapterHref, hint: t.backToChapter, label: chapter.title };

  return (
    <>
      {header}
      <main id="main" className={styles.main} style={{ '--accent': accentFor(chapter.order) } as CSSProperties}>
        <article lang={lang} className={styles.article}>
          {/* Where am I, plus reader tools */}
          <div className={styles.topRow}>
            <Link href={chapterHref} className={styles.chapterChip}>
              <span aria-hidden="true">{chapter.icon}</span>
              <span className={styles.chapterChipText}>{chapter.title}</span>
            </Link>

            <div className={styles.tools}>
              <div className={styles.sizeControl} role="group" aria-label={t.textSize}>
                <button type="button" className={styles.sizeBtn} onClick={size.decrease} disabled={!size.canDecrease} aria-label={t.smaller}>
                  <span className={styles.aSmall} aria-hidden="true">A</span>
                </button>
                <button type="button" className={styles.sizeBtn} onClick={size.increase} disabled={!size.canIncrease} aria-label={t.larger}>
                  <span className={styles.aLarge} aria-hidden="true">A</span>
                </button>
              </div>
              <button type="button" className={styles.toolBtn} onClick={openQr} aria-label={t.qrCode} title={t.qrCode}>
                <IconQr size={18} />
              </button>
            </div>
          </div>

          <div className={styles.progress}>
            <div
              className={styles.progressBar}
              role="progressbar"
              aria-label={t.progress}
              aria-valuemin={1}
              aria-valuemax={total}
              aria-valuenow={index + 1}
            >
              <span style={{ width: `${progress}%` }} />
            </div>
            <span className={styles.progressLabel}>{index + 1} / {total}</span>
          </div>

          {/* The point itself */}
          <h1 className={styles.heading}>{point.heading}</h1>

          {point.text && <p className={styles.text}>{point.text}</p>}

          {point.images.length > 0 && (
            <div className={`${styles.gallery} ${point.images.length > 1 ? styles.galleryMulti : ''}`}>
              {point.images.map((src, n) => (
                <figure key={`${point.id}-${n}`} className={styles.figure}>
                  <button type="button" className={styles.zoomBtn} onClick={() => setZoom(src)} aria-label={`${t.enlarge}: ${point.heading}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={point.heading} loading="lazy" className={styles.image} />
                  </button>
                </figure>
              ))}
            </div>
          )}

          {point.youtubeId && (
            <div className={styles.video}>
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${point.youtubeId}?rel=0&modestbranding=1&playsinline=1`}
                title={point.heading}
                loading="lazy"
                allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          )}

          {point.questions.length > 0 && (
            <QuizCard key={`${point.id}-${lang}`} pointId={point.id} questions={point.questions} lang={lang} userId={userId} />
          )}

          {/* End of chapter: acknowledge it */}
          {isLast && (
            <section className={styles.complete} aria-live="polite">
              <span className={styles.completeIcon}><IconCheck size={20} /></span>
              <p className={styles.completeText}>{t.chapterComplete}</p>
              <Link href={chapterHref} className={styles.completeLink}>{t.backToChapter}</Link>
            </section>
          )}

          {/* Previous / next. A bar fixed to the bottom on phones (where the thumb is), inline on larger screens. */}
          <nav className={styles.pager} aria-label="Point navigation">
            <div className={styles.pagerInner}>
              {prev ? (
                <Link href={pointHref(prev.id)} className={styles.prev} rel="prev" aria-label={`${t.previousPoint}: ${prev.heading}`}>
                  <IconChevron size={22} className={styles.prevIcon} />
                  <span className={styles.navLabel}>
                    <span className={styles.navHint}>{t.previousPoint}</span>
                    <span className={styles.navTitle}>{prev.heading}</span>
                  </span>
                </Link>
              ) : (
                <span className={styles.prevSpacer} />
              )}

              <Link href={forward.href} className={styles.forward} rel={next ? 'next' : undefined}>
                <span className={styles.navLabel}>
                  <span className={styles.navHint}>{forward.hint}</span>
                  <span className={styles.navTitle}>{forward.label}</span>
                </span>
                <IconChevron size={22} />
              </Link>
            </div>
          </nav>
        </article>

        {qrTarget && <QrModal target={qrTarget} onClose={() => setQrTarget(null)} />}
        {zoom && <ImageLightbox src={zoom} alt={point.heading} closeLabel={t.close} onClose={() => setZoom(null)} />}
      </main>

      <SiteFooter lang={lang} />
    </>
  );
}
