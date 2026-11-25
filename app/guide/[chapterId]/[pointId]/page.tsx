import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { getPointPage } from '@/lib/guide';
import { resolveLang } from '@/lib/languages';
import { STRINGS } from '@/lib/strings';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import PointClient from './PointClient';
import styles from './point.module.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Guide',
  robots: { index: false },
};

interface PointPageProps {
  params: Promise<{ chapterId: string; pointId: string }>;
  searchParams: Promise<{ lang?: string }>;
}

export default async function PointPage({ params, searchParams }: PointPageProps) {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  const isAdmin = Boolean(session.isAdmin);

  const { chapterId, pointId } = await params;
  const { lang: langParam } = await searchParams;
  const lang = resolveLang(langParam);
  const t = STRINGS[lang];

  const chapterKey = decodeURIComponent(chapterId);
  const data = await getPointPage(chapterKey, decodeURIComponent(pointId), lang);

  if (!data) {
    const back = `/guide/${encodeURIComponent(chapterKey)}?lang=${lang}`;
    return (
      <>
        <SiteHeader lang={lang} isAdmin={isAdmin} back={{ href: back, label: t.backToChapter }} />
        <main id="main" className={styles.main}>
          <div className={styles.status} lang={lang}>
            <h1>{t.pointNotFound}</h1>
            <p><Link href={back}>← {t.backToChapter}</Link></p>
          </div>
        </main>
        <SiteFooter lang={lang} />
      </>
    );
  }

  return <PointClient {...data} lang={lang} isAdmin={isAdmin} />;
}
