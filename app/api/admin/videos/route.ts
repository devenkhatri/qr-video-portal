import { NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { getSheetsClient, SHEET_ID, RANGES } from '@/lib/sheets';
import { cookies } from 'next/headers';
import videos from '@/data/videos.json';
import { VideoConfig } from '@/types/video';

export const dynamic = 'force-dynamic';

export interface VideoRow {
  videoId: string;
  title: string;
  language: string;
  category: string;
  tags: string[];
  description: string;
  views: number;
  uniqueViewers: number;
  lastViewed: string | null;
}

const allVideos = videos as Record<string, VideoConfig>;

export async function GET() {
  try {
    // Auth check
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
    if (!session.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Build base rows from videos.json config
    const videoRows: Record<string, VideoRow> = {};
    for (const [videoId, v] of Object.entries(allVideos)) {
      videoRows[videoId] = {
        videoId,
        title: v.title,
        language: v.language,
        category: v.category,
        tags: v.tags,
        description: v.description,
        views: 0,
        uniqueViewers: 0,
        lastViewed: null,
      };
    }

    // Demo mode — no Sheets credentials
    if (!SHEET_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
      // Inject some demo view counts
      const ids = Object.keys(videoRows);
      if (ids[0]) { videoRows[ids[0]].views = 25; videoRows[ids[0]].uniqueViewers = 18; videoRows[ids[0]].lastViewed = new Date().toISOString(); }
      if (ids[1]) { videoRows[ids[1]].views = 12; videoRows[ids[1]].uniqueViewers = 9;  videoRows[ids[1]].lastViewed = new Date(Date.now() - 3600000).toISOString(); }
      if (ids[2]) { videoRows[ids[2]].views = 5;  videoRows[ids[2]].uniqueViewers = 4;  videoRows[ids[2]].lastViewed = new Date(Date.now() - 86400000).toISOString(); }
      return NextResponse.json({ videos: Object.values(videoRows), isDemoData: true });
    }

    const sheets = getSheetsClient();
    const analyticsResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: RANGES.analytics,
    });

    const analyticsRows = analyticsResponse.data.values || [];
    // Skip header: [eventId, videoId, userId, watched_at, language?]
    const events = analyticsRows.filter(r => r[0] !== 'event_id' && r[0]);

    for (const row of events) {
      const vid = row[1];
      if (!vid || !videoRows[vid]) continue;
      const watchedAt = row[3];

      videoRows[vid].views += 1;

      // Track last viewed timestamp (unique viewers counted in the second pass below)
      if (watchedAt && (!videoRows[vid].lastViewed || watchedAt > videoRows[vid].lastViewed!)) {
        videoRows[vid].lastViewed = watchedAt;
      }
    }

    // Count unique viewers per video
    const uniqueViewerSets: Record<string, Set<string>> = {};
    for (const [id] of Object.entries(videoRows)) {
      uniqueViewerSets[id] = new Set();
    }
    for (const row of events) {
      const vid = row[1];
      const uid = row[2];
      if (vid && uid && uniqueViewerSets[vid]) {
        uniqueViewerSets[vid].add(uid);
      }
    }
    for (const [id, set] of Object.entries(uniqueViewerSets)) {
      if (videoRows[id]) videoRows[id].uniqueViewers = set.size;
    }

    return NextResponse.json({ videos: Object.values(videoRows), isDemoData: false });
  } catch (error) {
    console.error('[admin/videos] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch video stats' }, { status: 500 });
  }
}
