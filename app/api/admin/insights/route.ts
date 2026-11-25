import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/adminAuth';
import { getGuideIndex } from '@/lib/guide';
import { buildInsights, loadAnalyticsData } from '@/lib/userAnalytics';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    if (!(await isAdminRequest())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const [data, guide] = await Promise.all([loadAnalyticsData(), getGuideIndex()]);
    return NextResponse.json(buildInsights(data, guide), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[admin/insights] Error:', error);
    return NextResponse.json({ error: 'Failed to build insights' }, { status: 500 });
  }
}
