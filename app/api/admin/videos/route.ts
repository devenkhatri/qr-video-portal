import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { getSheetsClient, SHEET_ID, RANGES } from '@/lib/sheets';
import { cookies } from 'next/headers';
import { getAllVideos, addVideo } from '@/lib/videos';
import { extractYouTubeId } from '@/lib/youtube';

export const dynamic = 'force-dynamic';

export interface VideoRow {
  videoId: string;
  youtubeId: string;
  title: string;
  language: string;
  category: string;
  tags: string[];
  description: string;
  views: number;
  uniqueViewers: number;
  lastViewed: string | null;
}

export async function GET() {
  try {
    // Auth check
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
    if (!session.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Load videos from Google Sheets (or fallback to videos.json)
    const allVideos = await getAllVideos(true);

    // Map both JSON keys and youtubeIds to the canonical videoRow key
    const idToKey: Record<string, string> = {};

    // Build base rows
    const videoRows: Record<string, VideoRow> = {};
    for (const [videoId, v] of Object.entries(allVideos)) {
      idToKey[videoId] = videoId;
      if (v.youtubeId) {
        idToKey[v.youtubeId] = videoId;
      }

      videoRows[videoId] = {
        videoId,
        youtubeId: v.youtubeId,
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
      const rawVid = row[1];
      const vidKey = idToKey[rawVid];
      if (!vidKey || !videoRows[vidKey]) continue;
      const watchedAt = row[3];

      videoRows[vidKey].views += 1;

      // Track last viewed timestamp
      if (watchedAt && (!videoRows[vidKey].lastViewed || watchedAt > videoRows[vidKey].lastViewed!)) {
        videoRows[vidKey].lastViewed = watchedAt;
      }
    }

    // Count unique viewers per video
    const uniqueViewerSets: Record<string, Set<string>> = {};
    for (const [id] of Object.entries(videoRows)) {
      uniqueViewerSets[id] = new Set();
    }
    for (const row of events) {
      const rawVid = row[1];
      const vidKey = idToKey[rawVid];
      const uid = row[2];
      if (vidKey && uid && uniqueViewerSets[vidKey]) {
        uniqueViewerSets[vidKey].add(uid);
      }
    }
    for (const [id, set] of Object.entries(uniqueViewerSets)) {
      if (videoRows[id]) videoRows[id].uniqueViewers = set.size;
    }

    return NextResponse.json(
      { videos: Object.values(videoRows), isDemoData: false },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('[admin/videos] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch video stats' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
    if (!session.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { urlOrId, title, videoId, language, category, tags, description } = body;

    // Validate YouTube URL or ID
    if (!urlOrId || typeof urlOrId !== 'string' || !urlOrId.trim()) {
      return NextResponse.json(
        { error: 'YouTube URL or Video ID is required.' },
        { status: 400 }
      );
    }

    // Extract YouTube ID from full URL (or clean up ID)
    const youtubeId = extractYouTubeId(urlOrId);
    if (!youtubeId) {
      return NextResponse.json(
        {
          error:
            'Invalid YouTube URL or ID. Please provide a full YouTube link (e.g., https://www.youtube.com/watch?v=... or https://youtu.be/...) or a valid 11-character video ID.',
        },
        { status: 400 }
      );
    }

    // Validate Title
    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'Video title is required.' }, { status: 400 });
    }

    // Process tags
    let tagsList: string[] = [];
    if (Array.isArray(tags)) {
      tagsList = tags.map(t => String(t).trim()).filter(Boolean);
    } else if (typeof tags === 'string') {
      tagsList = tags.split(',').map(t => t.trim()).filter(Boolean);
    }

    const result = await addVideo({
      videoId: videoId?.trim(),
      youtubeId,
      title: title.trim(),
      language: language?.trim() || 'en',
      category: category?.trim() || 'Oncology',
      tags: tagsList,
      description: description?.trim() || '',
    });


    return NextResponse.json({
      success: true,
      video: result.video,
      sheetAppended: result.sheetAppended,
      message: result.sheetAppended
        ? 'Video added and saved to Google Sheet successfully!'
        : 'Video added (Demo mode: Google Sheet credentials not set, saved to memory)',
    });
  } catch (error: unknown) {
    console.error('[admin/videos] POST Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to add video';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}


