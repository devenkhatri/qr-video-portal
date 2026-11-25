'use client';

import { useEffect, useRef, useState } from 'react';
import type { Lang } from '@/lib/languages';
import { getClientCookie } from '@/lib/mobile';
import styles from './UserChip.module.css';

const TEXT: Record<Lang, { hi: (n: string) => string; notYou: string; account: string }> = {
  gu: { hi: n => `નમસ્તે, ${n}`, notYou: 'તમે નથી? સાઇન આઉટ', account: 'તમારું ખાતું' },
  hi: { hi: n => `नमस्ते, ${n}`, notYou: 'आप नहीं हैं? साइन आउट', account: 'आपका खाता' },
  en: { hi: n => `Hi, ${n}`, notYou: 'Not you? Sign out', account: 'Your account' },
};

const STORAGE_KEYS = ['user_registered', 'user_id', 'user_mobile', 'user_name'];
const COOKIE_KEYS = ['qr_user_registered', 'qr_user_id', 'qr_user_mobile', 'qr_user_name'];

/** Shows who is signed in on this device, with a way out for shared phones. */
export default function UserChip({ lang = 'en' }: { lang?: Lang }) {
  const [name, setName] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const t = TEXT[lang];

  useEffect(() => {
    const registered =
      getClientCookie('qr_user_registered') === 'true' ||
      localStorage.getItem('user_registered') === 'true';
    const saved = getClientCookie('qr_user_name') || localStorage.getItem('user_name') || '';
    setName(registered && saved.trim() ? saved.trim() : null);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!name) return null;

  // Reading progress and text size are left alone; only the identity is cleared.
  const signOut = () => {
    STORAGE_KEYS.forEach(k => localStorage.removeItem(k));
    COOKIE_KEYS.forEach(n => {
      document.cookie = `${n}=; path=/; max-age=0; SameSite=Lax`;
    });
    window.location.reload();
  };

  const initial = Array.from(name)[0]?.toUpperCase() ?? '?';

  return (
    <div className={styles.wrap} ref={ref}>
      <button
        type="button"
        className={styles.avatar}
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${t.account}: ${name}`}
        title={name}
      >
        {initial}
      </button>
      {open && (
        <div className={styles.menu} role="menu">
          <p className={styles.hello}>{t.hi(name)}</p>
          <button type="button" role="menuitem" className={styles.signOut} onClick={signOut}>
            {t.notYou}
          </button>
        </div>
      )}
    </div>
  );
}
