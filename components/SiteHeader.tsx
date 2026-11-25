'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LANGUAGES, type Lang } from '@/lib/languages';
import { STRINGS } from '@/lib/strings';
import { SITE_NAME } from '@/lib/site';
import { IconChevron, IconQr } from './admin/icons';
import styles from './SiteHeader.module.css';

interface SiteHeaderProps {
  /** When set, the language switcher is shown and keeps the reader on the same page. */
  lang?: Lang;
  /** Shows a back button (a chevron on phones, with the label on larger screens). */
  back?: { href: string; label: string };
  /** Show a discreet link to the admin dashboard for signed-in admins. */
  isAdmin?: boolean;
}

// Short labels keep the switcher compact on small phones; the full name is the accessible label.
const SHORT: Record<Lang, string> = { gu: 'ગુ', hi: 'हि', en: 'EN' };

export default function SiteHeader({ lang, back, isAdmin }: SiteHeaderProps) {
  const pathname = usePathname();
  const t = lang ? STRINGS[lang] : null;

  return (
    <header className={styles.header}>
      <a href="#main" className={styles.skip}>{STRINGS[lang ?? 'en'].skipToContent}</a>

      <div className={styles.inner}>
        <Link href="/" className={styles.brand} aria-label={`${SITE_NAME} home`}>
          <span className={styles.mark} aria-hidden="true">
            <IconQr size={18} />
          </span>
          <span className={styles.brandName}>{SITE_NAME}</span>
        </Link>

        <div className={styles.right}>
          {back && (
            <Link href={back.href} className={styles.back} aria-label={back.label}>
              <IconChevron size={20} className={styles.backIcon} />
              <span className={styles.backLabel}>{back.label}</span>
            </Link>
          )}

          {isAdmin && (
            <Link href="/admin" className={styles.adminPill}>Admin</Link>
          )}

          {lang && (
            <nav className={styles.langs} aria-label={t?.switchLanguage}>
              {LANGUAGES.map(l => (
                <Link
                  key={l.code}
                  href={`${pathname}?lang=${l.code}`}
                  className={`${styles.lang} ${l.code === lang ? styles.langActive : ''}`}
                  aria-current={l.code === lang ? 'true' : undefined}
                  aria-label={l.english}
                  title={l.english}
                  lang={l.code}
                  scroll={false}
                >
                  {SHORT[l.code]}
                </Link>
              ))}
            </nav>
          )}
        </div>
      </div>
    </header>
  );
}
