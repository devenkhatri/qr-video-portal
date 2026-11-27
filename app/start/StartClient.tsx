'use client';

import Link from 'next/link';
import type { Lang } from '@/lib/languages';
import { accentFor } from '@/lib/accent';
import { STRINGS } from '@/lib/strings';
import { useRegistrationGate } from '@/lib/useRegistrationGate';
import SiteHeader from '@/components/SiteHeader';
import RegistrationForm from '@/components/RegistrationForm';
import ContinueReading from '@/components/ContinueReading';
import { IconChevron } from '@/components/admin/icons';
import styles from '../page.module.css';

interface StartClientProps {
  isAdmin: boolean;
  languages: { code: Lang; label: string; english: string }[];
  chapters: { id: string; order: number; icon: string; title: string }[];
  lang: Lang;
  hint: string;
}

/**
 * Starting point of the guidebook. Registered visitors see the language choice straight away;
 * everyone else registers first (same gate as the chapter pages) and then lands here.
 */
export default function StartClient({ isAdmin, languages, chapters, lang, hint }: StartClientProps) {
  const { state, userId, onRegistered } = useRegistrationGate();

  const header = <SiteHeader lang={lang} isAdmin={isAdmin} back={{ href: '/', label: 'Home' }} />;

  if (state === 'loading') {
    return (
      <>
        {header}
        <main id="main" className={styles.main}>
          <p className={styles.lead} style={{ textAlign: 'center', padding: 'var(--space-12) 0' }} role="status" lang={lang}>
            {STRINGS[lang].loading}
          </p>
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

  return (
    <>
      {header}
      <main id="main" className={styles.main}>
        <section className={`${styles.container} ${styles.start}`} aria-labelledby="start-title" style={{ paddingTop: 'var(--space-10)' }}>
          <div className={styles.sectionHead}>
            <h1 id="start-title" className={styles.h2}>Read the guidebook in your language</h1>
            <p className={styles.lead} lang={lang}>{hint}</p>
          </div>

          <div className={styles.continue}>
            <ContinueReading />
          </div>

          <ul className={styles.langList}>
            {languages.map(l => (
              <li key={l.code}>
                <Link href={`/guide?lang=${l.code}`} className={styles.langCard} lang={l.code}>
                  <span className={styles.langBadge} aria-hidden="true">{l.code.toUpperCase()}</span>
                  <span className={styles.langText}>
                    <span className={styles.langNative}>{l.label}</span>
                    <span className={styles.langEnglish}>{l.english}</span>
                  </span>
                  <span className={styles.arrow} aria-hidden="true"><IconChevron size={22} /></span>
                </Link>
              </li>
            ))}
          </ul>

          {chapters.length > 0 && (
            <ul className={styles.chips} aria-label="Chapters in the guidebook">
              {chapters.map(c => (
                <li key={c.id}>
                  <Link
                    href={`/guide/${encodeURIComponent(c.id)}?lang=${lang}`}
                    className={styles.chip}
                    style={{ ['--accent' as string]: accentFor(c.order) }}
                    lang={lang}
                  >
                    <span aria-hidden="true">{c.icon}</span>
                    <span>{c.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
