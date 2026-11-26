import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, SessionData } from '@/lib/session';
import { ContentError } from '@/lib/guideAdmin';
import { cleanQuestions, getQuestions, saveQuestions } from '@/lib/quizAdmin';
import { LANGUAGES } from '@/lib/languages';

export const dynamic = 'force-dynamic';

async function requireAdmin(): Promise<NextResponse | null> {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  return session.isAdmin ? null : NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

function fail(error: unknown, where: string) {
  if (error instanceof ContentError) return NextResponse.json({ error: error.message }, { status: error.status });
  console.error(`[admin/quiz] ${where}:`, error);
  return NextResponse.json({ error: 'Something went wrong while talking to Google Sheets.' }, { status: 500 });
}

/** All questions (every language, including hidden) for one point. */
export async function GET(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const pointId = req.nextUrl.searchParams.get('pointId')?.trim();
    if (!pointId) throw new ContentError('Missing pointId.');
    return NextResponse.json({ questions: await getQuestions(pointId) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return fail(error, 'GET');
  }
}

/** Replace one language's questions for a point. Body: { pointId, chapterId, lang, questions } */
export async function PUT(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const body = await req.json();
    const pointId = typeof body.pointId === 'string' ? body.pointId.trim() : '';
    const chapterId = typeof body.chapterId === 'string' ? body.chapterId.trim() : '';
    const lang = LANGUAGES.find(l => l.code === body.lang)?.code;
    if (!pointId || !chapterId || !lang) throw new ContentError('Missing point, chapter or language.');
    await saveQuestions(pointId, chapterId, lang, cleanQuestions(body.questions));
    return NextResponse.json({ success: true });
  } catch (error) {
    return fail(error, 'PUT');
  }
}
