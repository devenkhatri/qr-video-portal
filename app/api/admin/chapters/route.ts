import { NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, SessionData } from '@/lib/session';
import { getSheetsClient, SHEET_ID, RANGES } from '@/lib/sheets';
import { getChapters, getChapterWithPoints, getPointChapterMap } from '@/lib/guide';
import { LANGUAGES, type Lang } from '@/lib/languages';

export const dynamic = 'force-dynamic';

export interface PointRow {
  pointId: string;
  order: number;
  /** Heading in every language, used for the QR card title */
  headings: Record<Lang, string>;
  views: number;
}

export interface ChapterRow {
  chapterId: string;
  order: number;
  title: string;
  titles: Record<Lang, string>;
  views: number;
  pointViews: number;
  points: PointRow[];
  uniqueViewers: number;
  lastViewed: string | null;
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
    if (!session.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const chapters = await getChapters('gu');
    const perLang = await Promise.all(
      LANGUAGES.map(async l => [l.code, await getChapters(l.code)] as const)
    );
    const titlesFor = (id: string) =>
      Object.fromEntries(
        perLang.map(([code, list]) => [code, list.find(c => c.id === id)?.title ?? id])
      ) as Record<Lang, string>;

    // Points of every chapter, with headings in all languages
    const pointsByChapter = Object.fromEntries(
      await Promise.all(
        chapters.map(async c => {
          const perLangPoints = await Promise.all(
            LANGUAGES.map(async l => [l.code, (await getChapterWithPoints(c.id, l.code))?.points ?? []] as const)
          );
          const base = perLangPoints.find(([code]) => code === 'gu')?.[1] ?? [];
          const rowsForChapter: PointRow[] = base.map((p, i) => ({
            pointId: p.id,
            order: p.order,
            headings: Object.fromEntries(
              perLangPoints.map(([code, list]) => [code, list[i]?.heading || p.heading || p.id])
            ) as Record<Lang, string>,
            views: 0,
          }));
          return [c.id, rowsForChapter] as const;
        })
      )
    ) as Record<string, PointRow[]>;

    const rows: Record<string, ChapterRow> = {};
    for (const c of chapters) {
      rows[c.id] = {
        chapterId: c.id,
        order: c.order,
        title: c.title,
        titles: titlesFor(c.id),
        views: 0,
        pointViews: 0,
        points: pointsByChapter[c.id] ?? [],
        uniqueViewers: 0,
        lastViewed: null,
      };
    }

    const isDemo = !SHEET_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    if (!isDemo) {
      const sheets = getSheetsClient();
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: RANGES.analytics,
      });
      // analytics columns: event_id, video_id (holds chapter_id), user_id, watched_at, language
      const events = (res.data.values || []).filter(r => r[0] && r[0] !== 'event_id');
      const viewers: Record<string, Set<string>> = {};
      // Point pages log the point id; roll those up to their chapter
      const pointToChapter = await getPointChapterMap();

      for (const row of events) {
        const logged = row[1];
        const isPointView = !rows[logged] && logged in pointToChapter;
        const id = isPointView ? pointToChapter[logged] : logged;
        const entry = rows[id];
        if (!entry) continue;

        if (isPointView) {
          entry.pointViews += 1;
          const pointRow = entry.points.find(p => p.pointId === logged);
          if (pointRow) pointRow.views += 1;
        } else {
          entry.views += 1;
        }

        (viewers[id] ||= new Set()).add(row[2] || 'anonymous');
        const watchedAt = row[3];
        if (watchedAt && (!entry.lastViewed || watchedAt > entry.lastViewed)) {
          entry.lastViewed = watchedAt;
        }
      }
      for (const [id, set] of Object.entries(viewers)) rows[id].uniqueViewers = set.size;
    }

    return NextResponse.json(
      { chapters: Object.values(rows), isDemoData: isDemo },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('[admin/chapters] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch chapter stats' }, { status: 500 });
  }
}
