import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, SessionData } from '@/lib/session';
import { getQuizCounts } from '@/lib/quizAdmin';
import {
  ContentError,
  cleanChapterInput,
  cleanPointInput,
  createChapter,
  createPoint,
  getAdminContent,
  isDemoMode,
  moveItem,
  setActive,
  updateChapter,
  updatePoint,
} from '@/lib/guideAdmin';

export const dynamic = 'force-dynamic';

type Kind = 'chapter' | 'point';

async function requireAdmin(): Promise<NextResponse | null> {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  return session.isAdmin ? null : NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

function asKind(v: unknown): Kind {
  if (v === 'chapter' || v === 'point') return v;
  throw new ContentError('Unknown content type.');
}

function asId(v: unknown): string {
  if (typeof v !== 'string' || !v.trim()) throw new ContentError('Missing id.');
  return v.trim();
}

function fail(error: unknown, where: string) {
  if (error instanceof ContentError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error(`[admin/content] ${where}:`, error);
  return NextResponse.json({ error: 'Something went wrong while talking to Google Sheets.' }, { status: 500 });
}

/** Everything the content editor needs, including hidden items. Always read fresh from the sheet. */
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    return NextResponse.json(
      { ...(await getAdminContent()), quizCounts: await getQuizCounts(), isDemoData: isDemoMode() },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return fail(error, 'GET');
  }
}

/** Create a chapter or point. Body: { kind, data } */
export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const body = await req.json();
    const kind = asKind(body.kind);
    const created =
      kind === 'chapter'
        ? await createChapter(cleanChapterInput(body.data))
        : await createPoint(cleanPointInput(body.data));
    return NextResponse.json({ success: true, item: created });
  } catch (error) {
    return fail(error, 'POST');
  }
}

/** Edit a chapter or point. Body: { kind, id, data } */
export async function PUT(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const body = await req.json();
    const kind = asKind(body.kind);
    const id = asId(body.id);
    if (kind === 'chapter') await updateChapter(id, cleanChapterInput(body.data));
    else await updatePoint(id, cleanPointInput(body.data));
    return NextResponse.json({ success: true });
  } catch (error) {
    return fail(error, 'PUT');
  }
}

/** Quick actions. Body: { kind, id, direction: 'up' | 'down' } or { kind, id, active: boolean } */
export async function PATCH(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const body = await req.json();
    const kind = asKind(body.kind);
    const id = asId(body.id);

    if (body.direction === 'up' || body.direction === 'down') {
      await moveItem(kind, id, body.direction);
    } else if (typeof body.active === 'boolean') {
      await setActive(kind, id, body.active);
    } else {
      throw new ContentError('Nothing to change.');
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return fail(error, 'PATCH');
  }
}
