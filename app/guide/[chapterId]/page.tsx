import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { getChapterWithPoints } from '@/lib/guide';
import { resolveLang } from '@/lib/languages';
import { STRINGS } from '@/lib/strings';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import ChapterClient from './ChapterClient';
import styles from './chapter.module.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Chapter',
  robots: { index: false },
};

interface ChapterPageProps {
  params: Promise<{ chapterId: string }>;
  searchParams: Promise<{ lang?: string }>;
}

export default async function ChapterPage({ params, searchParams }: ChapterPageProps) {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  const isAdmin = Boolean(session.isAdmin);

  const { chapterId } = await params;
  const { lang: langParam } = await searchParams;
  const lang = resolveLang(langParam);
  const t = STRINGS[lang];
  const data = await getChapterWithPoints(decodeURIComponent(chapterId), lang);

  if (!data) {
    return (
      <>
        <SiteHeader lang={lang} isAdmin={isAdmin} back={{ href: `/guide?lang=${lang}`, label: t.chapters }} />
        <main id="main" className={styles.main}>
          <div className={styles.status} lang={lang}>
            <h1>{t.chapterNotFound}</h1>
            <p><Link href={`/guide?lang=${lang}`}>← {t.backToChapters}</Link></p>
          </div>
        </main>
        <SiteFooter lang={lang} />
      </>
    );
  }

  return (
    <ChapterClient
      chapter={data.chapter}
      points={data.points}
      next={data.next}
      lang={lang}
      isAdmin={isAdmin}
    />
  );
}
