'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import AdminShell, { type AdminTab } from './AdminShell';
import AnalyticsPanel from './AnalyticsPanel';
import ChaptersPanel from './ChaptersPanel';
import ContentPanel from './ContentPanel';

const TABS: AdminTab[] = ['analytics', 'chapters', 'content'];

/**
 * Admin entry point. The active section lives in the URL (?tab=content), so a refresh or a shared
 * link lands on the same screen, and the browser back button behaves as people expect.
 */
export default function AdminDashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const requested = params.get('tab');
  const active: AdminTab = TABS.includes(requested as AdminTab) ? (requested as AdminTab) : 'analytics';

  const [refreshKey, setRefreshKey] = useState(0);
  const [fetching, setFetching] = useState(false);
  const [baseUrl, setBaseUrl] = useState('');

  // Needed for QR codes and links; only known in the browser
  useEffect(() => {
    setBaseUrl(window.location.origin);
  }, []);

  const onTabChange = useCallback(
    (tab: AdminTab) => {
      router.replace(`${pathname}?tab=${tab}`, { scroll: false });
      window.scrollTo({ top: 0 });
    },
    [router, pathname]
  );

  const onLogout = useCallback(async () => {
    await fetch('/api/admin/login', { method: 'DELETE' });
    window.location.href = '/';
  }, []);

  return (
    <AdminShell
      active={active}
      onTabChange={onTabChange}
      onRefresh={() => setRefreshKey(k => k + 1)}
      refreshing={fetching}
      onLogout={onLogout}
    >
      {active === 'analytics' && <AnalyticsPanel refreshKey={refreshKey} onFetchingChange={setFetching} />}
      {active === 'chapters' && baseUrl && (
        <ChaptersPanel baseUrl={baseUrl} refreshKey={refreshKey} onFetchingChange={setFetching} />
      )}
      {active === 'content' && <ContentPanel refreshKey={refreshKey} onFetchingChange={setFetching} />}
    </AdminShell>
  );
}
