import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { getChapters } from '@/lib/guide';
import { resolveLang } from '@/lib/languages';
import { STRINGS } from '@/lib/strings';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import ChapterCards from '@/components/ChapterCards';
import ContinueReading from '@/components/ContinueReading';
import styles from './guide.module.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Chapters',
  robots: { index: false },
};

interface GuidePageProps {
  searchParams: Promise<{ lang?: string }>;
}

export default async function GuidePage({ searchParams }: GuidePageProps) {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  const { lang: langParam } = await searchParams;
  const lang = resolveLang(langParam);
  const t = STRINGS[lang];
  const chapters = await getChapters(lang);

  return (
    <>
      <SiteHeader lang={lang} isAdmin={Boolean(session.isAdmin)} back={{ href: '/', label: t.language }} />

      <main id="main" className={styles.main}>
        <div className={styles.wrap} lang={lang}>
          <div className={styles.heading}>
            <h1 className={styles.title}>{t.chapters}</h1>
            <p className={styles.hint}>{t.chaptersHint}</p>
          </div>

          <div className={styles.continue}>
            <ContinueReading />
          </div>

          <ChapterCards chapters={chapters} lang={lang} />
        </div>
      </main>

      <SiteFooter lang={lang} />
    </>
  );
}
