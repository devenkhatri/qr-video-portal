'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SITE_NAME } from '@/lib/site';
import { IconQr } from '@/components/admin/icons';
import styles from './login.module.css';

export default function AdminLoginPage() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        setError('Incorrect password. Please try again.');
        return;
      }

      router.push('/admin');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.main}>
      <div className={styles.card}>
        <span className={styles.mark} aria-hidden="true">
          <IconQr size={26} />
        </span>
        <p className={styles.eyebrow}>{SITE_NAME}</p>
        <h1 className={styles.title}>Admin sign in</h1>
        <p className={styles.subtitle}>Manage chapters and points, print QR codes and see how the guidebook is being read.</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="admin-password" className={styles.label}>Password</label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter admin password"
              className={styles.input}
              autoComplete="current-password"
              autoFocus
              required
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'login-error' : undefined}
            />
          </div>

          {error && <p id="login-error" className={styles.error} role="alert">{error}</p>}

          <button type="submit" className={styles.btn} disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <Link href="/" className={styles.backLink}>
          ← Back to the guidebook
        </Link>
      </div>
    </main>
  );
}
