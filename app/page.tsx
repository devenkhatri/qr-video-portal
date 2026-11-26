import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { getAvailableLanguages, getChapters } from '@/lib/guide';
import { LANGUAGES } from '@/lib/languages';
import { STRINGS } from '@/lib/strings';
import { accentFor } from '@/lib/accent';
import { HOME } from '@/lib/homeContent';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import ContinueReading from '@/components/ContinueReading';
import { IconCheck, IconChevron } from '@/components/admin/icons';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Community Oncology: Education & Support for Everyone, Anywhere',
  description:
    'A free, multilingual cancer education and support program for patients, families, health workers, hospitals and districts. Read the guidebook in Gujarati, Hindi or English.',
};

export default async function HomePage() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  const [available, chapters] = await Promise.all([getAvailableLanguages(), getChapters('gu')]);
  const languages = LANGUAGES.filter(l => available.includes(l.code));
  const t = STRINGS.gu;

  return (
    <>
      <SiteHeader isAdmin={Boolean(session.isAdmin)} />

      <main id="main" className={styles.main}>
        {/* 1. Hero: what this is, and the two things most visitors need */}
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.container}>
            <span className={styles.eyebrow}>{HOME.eyebrow}</span>
            <h1 id="hero-title" className={styles.title}>{HOME.title}</h1>
            <p className={styles.tagline}>&ldquo;{HOME.tagline}&rdquo;</p>

            <div className={styles.heroActions}>
              <a href="#start" className={styles.primaryBtn}>
                Start reading the guidebook <IconChevron size={18} />
              </a>
              <a href={`tel:${HOME.helpline.tel}`} className={styles.secondaryBtn}>
                <span aria-hidden="true">📞</span> {HOME.helpline.label}: {HOME.helpline.number}
              </a>
            </div>
          </div>
        </section>

        {/* 2. Proof */}
        <section className={styles.container} aria-label="Our impact">
          <ul className={styles.stats}>
            {HOME.stats.map(s => (
              <li key={s.label} className={styles.stat}>
                <strong>{s.value}</strong>
                <span>{s.label}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* 3. The guidebook itself: language choice is the primary action */}
        <section id="start" className={`${styles.container} ${styles.start}`} aria-labelledby="start-title">
          <div className={styles.sectionHead}>
            <h2 id="start-title" className={styles.h2}>Read the guidebook in your language</h2>
            <p className={styles.lead} lang="gu">{t.chooseLanguageHint}</p>
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
                    href={`/guide/${encodeURIComponent(c.id)}?lang=gu`}
                    className={styles.chip}
                    style={{ ['--accent' as string]: accentFor(c.order) }}
                    lang="gu"
                  >
                    <span aria-hidden="true">{c.icon}</span>
                    <span>{c.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 4. Who it is for */}
        <section className={styles.container} aria-labelledby="who-title">
          <div className={styles.sectionHead}>
            <h2 id="who-title" className={styles.h2}>Who can benefit?</h2>
            <p className={styles.lead}>One program, with a path for everyone: self-learn and self-help, or personalised assistance.</p>
          </div>

          <ul className={styles.audiences}>
            {HOME.audiences.map(a => (
              <li key={a.title} className={styles.audience} style={{ ['--accent' as string]: a.accent }}>
                <span className={styles.audienceIcon} aria-hidden="true">{a.icon}</span>
                <h3 className={styles.audienceTitle}>{a.title}</h3>
                <p className={styles.audienceProgram}>{a.program}</p>
                <p className={styles.audienceText}>{a.text}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* 5. What the program offers */}
        <section className={styles.container} aria-labelledby="offer-title">
          <div className={styles.sectionHead}>
            <h2 id="offer-title" className={styles.h2}>{HOME.highlightsTitle}</h2>
          </div>
          <ul className={styles.highlights}>
            {HOME.highlights.map(h => (
              <li key={h}>
                <span className={styles.tick} aria-hidden="true"><IconCheck size={14} /></span>
                <span>{h}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* 6. Get help now */}
        <section className={styles.container} aria-labelledby="help-title">
          <div className={styles.helpBand}>
            <div>
              <h2 id="help-title" className={styles.helpTitle}>Need help right now?</h2>
              <p className={styles.helpText}>
                Register to get started, or call our helpline and speak to someone who understands.
              </p>
            </div>
            <div className={styles.helpActions}>
              <a href={`tel:${HOME.helpline.tel}`} className={styles.primaryBtn}>
                <span aria-hidden="true">📞</span> {HOME.helpline.number}
              </a>
              <a href="#start" className={styles.secondaryBtn}>Register &amp; start reading</a>
            </div>
          </div>
        </section>

        {/* 7. Credits */}
        <section className={`${styles.container} ${styles.supporters}`} aria-labelledby="support-title">
          <h2 id="support-title" className={styles.supportTitle}>Supported by</h2>
          <ul className={styles.supportList}>
            {HOME.supportedBy.map(s => <li key={s}>{s}</li>)}
          </ul>
        </section>
      </main>

      <SiteFooter lang="gu" />
    </>
  );
}
