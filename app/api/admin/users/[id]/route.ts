import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/adminAuth';
import { getGuideIndex } from '@/lib/guide';
import { buildUserDetail, loadAnalyticsData } from '@/lib/userAnalytics';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!(await isAdminRequest())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = params;
    const [data, guide] = await Promise.all([loadAnalyticsData(), getGuideIndex()]);
    const detail = buildUserDetail(data, guide, id);
    if (!detail) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    return NextResponse.json(detail, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[admin/users/:id] Error:', error);
    return NextResponse.json({ error: 'Failed to load user' }, { status: 500 });
  }
}
