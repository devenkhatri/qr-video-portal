import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';
import { Suspense } from 'react';
import AdminDashboard from '@/components/admin/AdminDashboard';

export const metadata: Metadata = {
  title: 'Admin', // site name is added by the layout title template
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  if (!session.isAdmin) {
    redirect('/admin/login');
  }

  // useSearchParams (the active tab) needs a Suspense boundary
  return (
    <Suspense fallback={null}>
      <AdminDashboard />
    </Suspense>
  );
}
