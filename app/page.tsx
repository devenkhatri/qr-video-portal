import type { Metadata } from 'next';
import Link from 'next/link';
import styles from './home.module.css';

export const metadata: Metadata = {
  title: 'Medical Video Portal',
  description: 'Scan a QR code from your guidebook to watch educational medical videos.',
};

export default function HomePage() {
  return (
    <main className={styles.main}>
      <div className={styles.hero}>
        <div className={styles.badge}>Medical Education</div>
        <div className={styles.qrIcon}>
          <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
            <rect x="2" y="2" width="8" height="8" rx="1.5" />
            <rect x="3.5" y="3.5" width="5" height="5" rx="0.5" fill="currentColor" opacity="0.3" />
            <rect x="14" y="2" width="8" height="8" rx="1.5" />
            <rect x="15.5" y="3.5" width="5" height="5" rx="0.5" fill="currentColor" opacity="0.3" />
            <rect x="2" y="14" width="8" height="8" rx="1.5" />
            <rect x="3.5" y="15.5" width="5" height="5" rx="0.5" fill="currentColor" opacity="0.3" />
            <path d="M14 14h2v2h-2zM16 16h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z" fill="currentColor" />
          </svg>
        </div>
        <h1 className={styles.title}>Medical Video Portal</h1>
        <p className={styles.subtitle}>
          Welcome! To watch your educational video, please scan the QR code provided in your guidebook using your phone&apos;s camera.
        </p>
        <div className={styles.steps}>
          <div className={styles.step}>
            <span className={styles.stepNum}>1</span>
            <span>Open your guidebook</span>
          </div>
          <div className={styles.stepArrow}>→</div>
          <div className={styles.step}>
            <span className={styles.stepNum}>2</span>
            <span>Scan the QR code</span>
          </div>
          <div className={styles.stepArrow}>→</div>
          <div className={styles.step}>
            <span className={styles.stepNum}>3</span>
            <span>Watch your video</span>
          </div>
        </div>
      </div>
      <div className={styles.adminLink}>
        <Link href="/admin/login" className={styles.adminAnchor}>
          Admin Access
        </Link>
      </div>
    </main>
  );
}
