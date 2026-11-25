import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { getAvailableLanguages, getChapters } from '@/lib/guide';
import { LANGUAGES } from '@/lib/languages';
import { STRINGS } from '@/lib/strings';
import { accentFor } from '@/lib/accent';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import ContinueReading from '@/components/ContinueReading';
import { IconChevron } from '@/components/admin/icons';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Choose your language',
  description: 'A guidebook about cancer care in Gujarati, Hindi and English. Choose your language to start reading.',
};

export default async function HomePage() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  const [available, chapters] = await Promise.all([getAvailableLanguages(), getChapters('gu')]);
  const languages = LANGUAGES.filter(l => available.includes(l.code));
  const t = STRINGS.gu; // Gujarati first

  return (
    <>
      <SiteHeader isAdmin={Boolean(session.isAdmin)} />

      <main id="main" className={styles.main}>
        <div className={styles.wrap}>
          <section className={styles.hero} aria-labelledby="hero-title">
            <span className={styles.eyebrow} lang="gu">{t.guidebook}</span>
            <h1 id="hero-title" className={styles.title} lang="gu">{t.chooseLanguage}</h1>
            <p className={styles.sub} lang="gu">{t.welcomeSub}</p>
            <p className={styles.hint}>{t.chooseLanguageHint}</p>
          </section>

          {/* Returning readers can jump straight back in */}
          <div className={styles.continue}>
            <ContinueReading />
          </div>

          <ul className={styles.list}>
            {languages.map((l, i) => (
              <li key={l.code} style={{ animationDelay: `${i * 70}ms` }} className={styles.item}>
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
            <section className={styles.inside} aria-labelledby="inside-title">
              <h2 id="inside-title" className={styles.insideTitle} lang="gu">{t.insideTitle}</h2>
              <ul className={styles.chips}>
                {chapters.map(c => (
                  <li key={c.id} className={styles.chip} style={{ ['--accent' as string]: accentFor(c.order) }} lang="gu">
                    <span aria-hidden="true">{c.icon}</span>
                    <span>{c.title}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </main>

      <SiteFooter lang="gu" />
    </>
  );
}
