import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/adminAuth';
import { getGuideIndex } from '@/lib/guide';
import { buildUserRows, buildUsersCsv, loadAnalyticsData } from '@/lib/userAnalytics';

export const dynamic = 'force-dynamic';

/** GET /api/admin/users            -> directory rows (mobile numbers masked)
 *  GET /api/admin/users?format=csv -> full export for the admin (unmasked) */
export async function GET(req: NextRequest) {
  try {
    if (!(await isAdminRequest())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const [data, guide] = await Promise.all([loadAnalyticsData(), getGuideIndex()]);

    if (req.nextUrl.searchParams.get('format') === 'csv') {
      const stamp = new Date().toISOString().slice(0, 10);
      return new NextResponse('\uFEFF' + buildUsersCsv(data, guide), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="users-${stamp}.csv"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    return NextResponse.json(
      { users: buildUserRows(data, guide), isDemoData: data.isDemo },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('[admin/users] Error:', error);
    return NextResponse.json({ error: 'Failed to load users' }, { status: 500 });
  }
}
