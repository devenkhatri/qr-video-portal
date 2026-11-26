import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/adminAuth';
import { buildQuizStats } from '@/lib/quizStats';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    if (!(await isAdminRequest())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(await buildQuizStats(), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[admin/quiz-stats] Error:', error);
    return NextResponse.json({ error: 'Failed to build quiz stats' }, { status: 500 });
  }
}
