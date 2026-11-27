import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { HOME } from '@/lib/homeContent';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { IconCheck, IconChevron } from '@/components/admin/icons';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Community Oncology: Capacity Building Program to Bridge Gaps in Cancer Care',
  description:
    'A free, multilingual cancer education and support program for patients, families, health workers, hospitals and districts. Read the guidebook in Gujarati, Hindi or English.',
};

export default async function HomePage() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  return (
    <>
      <SiteHeader isAdmin={Boolean(session.isAdmin)} />

      <main id="main" className={styles.main}>
        {/* 1. Hero: what this is, and the two things most visitors need */}
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.container}>
            <span className={styles.eyebrow}>
              <span aria-hidden="true">📞</span> {HOME.helpline.label}: {HOME.helpline.number}
            </span>
            <h1 id="hero-title" className={styles.title}>{HOME.title}</h1>
            <h2 className={styles.tagline}>{HOME.tagline}</h2>
          </div>
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

        {/* 6. Starting point: leads to /start (registration, then language choice) */}
        <section className={styles.container} aria-labelledby="help-title">
          <div className={styles.helpBand}>
            <div>
              <h2 id="help-title" className={styles.helpTitle}>Begin your self-support journey</h2>
              <p className={styles.helpText}>
                Register for free, choose your language and learn at your own pace, with simple guidance
                on every step of cancer care.
              </p>
            </div>
            <div className={styles.helpActions}>
              <Link href="/start" className={styles.primaryBtn}>
                Register and Self Support <IconChevron size={18} />
              </Link>
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
