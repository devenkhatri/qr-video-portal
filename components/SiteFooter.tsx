import Link from 'next/link';
import type { Lang } from '@/lib/languages';
import { STRINGS } from '@/lib/strings';
import { SITE_NAME } from '@/lib/site';
import styles from './SiteFooter.module.css';

interface SiteFooterProps {
  lang?: Lang;
}

/** Medical disclaimer on every reader page, plus a quiet way into the admin. */
export default function SiteFooter({ lang = 'gu' }: SiteFooterProps) {
  const t = STRINGS[lang];
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <p className={styles.disclaimer} lang={lang}>{t.disclaimer}</p>
        <div className={styles.meta}>
          <span>© {new Date().getFullYear()} {SITE_NAME}</span>
          <Link href="/admin/login" className={styles.admin} lang={lang}>{t.adminLogin}</Link>
        </div>
      </div>
    </footer>
  );
}
