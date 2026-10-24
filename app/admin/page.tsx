import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';
import AdminCharts from '@/components/AdminCharts';
import styles from './admin.module.css';

export const metadata: Metadata = {
  title: 'Admin Dashboard | Medical Video Portal',
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  if (!session.isAdmin) {
    redirect('/admin/login');
  }

  return (
    <main className={styles.main}>
      <AdminCharts />
    </main>
  );
}
