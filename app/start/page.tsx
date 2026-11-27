import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { getAvailableLanguages, getChapters } from '@/lib/guide';
import { LANGUAGES, resolveLang } from '@/lib/languages';
import { STRINGS } from '@/lib/strings';
import SiteFooter from '@/components/SiteFooter';
import StartClient from './StartClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Read the guidebook',
  robots: { index: false },
};

interface StartPageProps {
  searchParams: Promise<{ lang?: string }>;
}

export default async function StartPage({ searchParams }: StartPageProps) {
  const { lang: langParam } = await searchParams;
  const lang = resolveLang(langParam);
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  const [available, chapters] = await Promise.all([getAvailableLanguages(), getChapters(lang)]);
  const languages = LANGUAGES.filter(l => available.includes(l.code));

  return (
    <>
      <StartClient
        isAdmin={Boolean(session.isAdmin)}
        languages={languages.map(({ code, label, english }) => ({ code, label, english }))}
        chapters={chapters.map(({ id, order, icon, title }) => ({ id, order, icon, title }))}
        lang={lang}
        hint={STRINGS[lang].chooseLanguageHint}
      />
      <SiteFooter lang={lang} />
    </>
  );
}
