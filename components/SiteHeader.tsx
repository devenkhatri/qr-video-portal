'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './SiteHeader.module.css';

interface SiteHeaderProps {
  isAdmin?: boolean;
  showHomeLink?: boolean;
  showGuidebookButton?: boolean;
  onGuidebookClick?: () => void;
  guidebookExpanded?: boolean;
  extraRight?: React.ReactNode;
  className?: string;
}

export default function SiteHeader({
  isAdmin,
  showHomeLink = false,
  showGuidebookButton = false,
  onGuidebookClick,
  guidebookExpanded = false,
  extraRight,
  className = '',
}: SiteHeaderProps) {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(Boolean(isAdmin));

  // Client-side verification to handle active session changes
  useEffect(() => {
    let isCurrent = true;
    fetch('/api/admin/login')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch session');
        return res.json();
      })
      .then((data) => {
        if (isCurrent && typeof data?.isAdmin === 'boolean') {
          setIsAdminLoggedIn(data.isAdmin);
        }
      })
      .catch(() => {
        // Fallback silently to initial isAdmin prop
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  return (
    <header className={`${styles.headerWrapper} ${className}`}>
      <div className={styles.inner}>
        {/* Site Logo & Title - Always points to homepage */}
        <Link href="/" className={styles.brand} title="Medical Video Portal — Home">
          <div className={styles.brandIcon} aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="2" width="8" height="8" rx="1.5" />
              <rect x="14" y="2" width="8" height="8" rx="1.5" />
              <rect x="2" y="14" width="8" height="8" rx="1.5" />
              <path d="M14 14h2v2h-2zM16 16h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z" fill="currentColor" />
            </svg>
          </div>
          <div className={styles.brandText}>
            <span className={styles.brandTitle}>Medical Video Portal</span>
            <span className={styles.brandSub}>Educational Health Library</span>
          </div>
        </Link>

        {/* Right-hand Navigation / Status Actions */}
        <div className={styles.navRight}>
          {showHomeLink && (
            <Link href="/" className={styles.homeLink}>
              <span>←</span>
              <span>All Videos</span>
            </Link>
          )}

          {extraRight}

          {showGuidebookButton && onGuidebookClick && (
            <button
              type="button"
              className={styles.guidebookBtn}
              onClick={onGuidebookClick}
              aria-expanded={guidebookExpanded}
            >
              <span>📖</span>
              <span>{guidebookExpanded ? 'Hide Guide' : 'Guidebook Help'}</span>
            </button>
          )}

          {/* Admin button: Login button is visible ONLY if admin is not already logged in */}
          {!isAdminLoggedIn ? (
            <Link href="/admin/login" className={styles.adminLink} title="Admin Login">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>Admin Login</span>
            </Link>
          ) : (
            <Link href="/admin" className={styles.adminDashboardLink} title="Open Admin Dashboard">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
              <span>Admin Dashboard</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
