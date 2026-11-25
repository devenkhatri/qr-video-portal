'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { SITE_NAME } from '@/lib/site';
import { IconChart, IconEdit, IconExternal, IconLogout, IconQr, IconRefresh, IconUsers } from './icons';
import styles from './AdminShell.module.css';

export type AdminTab = 'analytics' | 'users' | 'chapters' | 'content';

const TABS: { id: AdminTab; label: string; Icon: typeof IconChart }[] = [
  { id: 'analytics', label: 'Analytics', Icon: IconChart },
  { id: 'users', label: 'Users', Icon: IconUsers },
  { id: 'chapters', label: 'Chapters', Icon: IconQr },
  { id: 'content', label: 'Content', Icon: IconEdit },
];

interface AdminShellProps {
  active: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  onRefresh: () => void;
  refreshing: boolean;
  onLogout: () => void;
  children: ReactNode;
}

export default function AdminShell({ active, onTabChange, onRefresh, refreshing, onLogout, children }: AdminShellProps) {
  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <div className={styles.topInner}>
          <Link href="/admin" className={styles.brand} aria-label={`${SITE_NAME} admin`}>
            <span className={styles.mark} aria-hidden="true">
              <IconQr size={18} />
            </span>
            <span className={styles.brandText}>
              <span className={styles.brandName}>{SITE_NAME}</span>
              <span className={styles.brandRole}>Admin</span>
            </span>
          </Link>

          {/* Desktop section tabs */}
          <nav className={styles.tabs} aria-label="Admin sections">
            {TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                id={`tab-btn-${id}`}
                className={`${styles.tab} ${active === id ? styles.tabActive : ''}`}
                aria-current={active === id ? 'page' : undefined}
                onClick={() => onTabChange(id)}
              >
                <Icon size={18} />
                <span>{label}</span>
              </button>
            ))}
          </nav>

          <div className={styles.actions}>
            <button
              type="button"
              id="refresh-data-btn"
              className={styles.action}
              onClick={onRefresh}
              disabled={refreshing}
              aria-label="Refresh data"
              title="Refresh data"
            >
              <IconRefresh size={18} className={refreshing ? styles.spin : undefined} />
            </button>
            <Link href="/" className={`${styles.action} ${styles.viewSite}`} target="_blank" rel="noreferrer" aria-label="View the guidebook" title="View the guidebook">
              <IconExternal size={18} />
            </Link>
            <button type="button" className={`${styles.action} ${styles.signOut}`} onClick={onLogout} aria-label="Sign out" title="Sign out">
              <IconLogout size={18} />
              <span className={styles.signOutText}>Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <main className={styles.content}>{children}</main>

      {/* Mobile bottom tab bar: reachable with a thumb */}
      <nav className={styles.bottomNav} aria-label="Admin sections">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            className={`${styles.bottomItem} ${active === id ? styles.bottomActive : ''}`}
            aria-current={active === id ? 'page' : undefined}
            onClick={() => onTabChange(id)}
          >
            <Icon size={22} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
