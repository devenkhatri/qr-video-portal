'use client';

import Link from 'next/link';
import { isLang, DEFAULT_LANG } from '@/lib/languages';
import { useProgress } from '@/lib/progress';
import { STRINGS } from '@/lib/strings';
import { IconChevron } from './admin/icons';
import styles from './ContinueReading.module.css';

/** "Pick up where you left off": renders nothing for first-time readers. */
export default function ContinueReading() {
  const { last } = useProgress();
  if (!last) return null;

  const lang = isLang(last.lang) ? last.lang : DEFAULT_LANG;
  const t = STRINGS[lang];
  const href = last.pointId
    ? `/guide/${encodeURIComponent(last.chapterId)}/${encodeURIComponent(last.pointId)}?lang=${lang}`
    : `/guide/${encodeURIComponent(last.chapterId)}?lang=${lang}`;

  return (
    <Link href={href} className={styles.card} lang={lang}>
      <span className={styles.text}>
        <span className={styles.eyebrow}>{t.continueReading}</span>
        <span className={styles.title}>{last.pointHeading || last.chapterTitle}</span>
        {last.pointHeading && <span className={styles.sub}>{last.chapterTitle}</span>}
      </span>
      <span className={styles.go} aria-hidden="true">
        <IconChevron size={22} />
      </span>
    </Link>
  );
}
