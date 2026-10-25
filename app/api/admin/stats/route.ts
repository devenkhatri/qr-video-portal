import { NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { getSheetsClient, SHEET_ID, RANGES } from '@/lib/sheets';
import { cookies } from 'next/headers';
import { getAllVideos } from '@/lib/videos';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Auth check
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
    if (!session.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allVideos = await getAllVideos();

    // Build reverse map to look up video title from youtubeId or slug
    const idToTitle: Record<string, string> = {};
    for (const [key, v] of Object.entries(allVideos)) {
      idToTitle[key] = v.title;
      if (v.youtubeId) {
        idToTitle[v.youtubeId] = v.title;
      }
    }

    // Fallback demo data if Google Sheets is not yet configured
    if (!SHEET_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
      return NextResponse.json({
        totalRegistrations: 14,
        totalViews: 42,
        genderBreakdown: { 'Male': 8, 'Female': 5, 'Prefer not to say': 1 },
        regionBreakdown: { 'Mumbai': 6, 'Delhi': 4, 'Bengaluru': 3, 'Pune': 1 },
        professionBreakdown: { 'Cardiologist': 7, 'General Physician': 5, 'Resident': 2 },
        viewsPerVideo: {
          'Introduction to Cardiac Health': 25,
          'Understanding Type 2 Diabetes': 12,
          'Managing Hypertension Daily': 5,
        },
        recentRegistrations: [
          { userId: 'demo-1', name: 'Dr. A. Sharma', gender: 'Male', region: 'Mumbai', profession: 'Cardiologist', registeredAt: new Date().toISOString() },
          { userId: 'demo-2', name: 'Dr. P. Patel', gender: 'Female', region: 'Delhi', profession: 'General Physician', registeredAt: new Date(Date.now() - 3600000).toISOString() },
          { userId: 'demo-3', name: 'Dr. R. Verma', gender: 'Male', region: 'Bengaluru', profession: 'Cardiologist', registeredAt: new Date(Date.now() - 7200000).toISOString() },
        ],
        isDemoData: true,
      });
    }

    const sheets = getSheetsClient();

    // Fetch both sheets in parallel
    const [regResponse, analyticsResponse] = await Promise.all([
      sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: RANGES.registrations,
      }),
      sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: RANGES.analytics,
      }),
    ]);

    const regRows = regResponse.data.values || [];
    const analyticsRows = analyticsResponse.data.values || [];

    // Skip header row if it exists
    const registrations = regRows.filter(row => row[0] !== 'user_id' && row[0]);
    const analytics = analyticsRows.filter(row => row[0] !== 'event_id' && row[0]);

    // --- Aggregate registrations ---
    const totalRegistrations = registrations.length;

    // Gender breakdown
    const genderBreakdown: Record<string, number> = {};
    // Profession breakdown
    const professionBreakdown: Record<string, number> = {};
    // Region breakdown
    const regionBreakdown: Record<string, number> = {};

    for (const row of registrations) {
      // [userId, name, gender, phone, region, profession, registered_at]
      const gender = row[2] || 'Not specified';
      const region = row[4] || 'Not specified';
      const profession = row[5] || 'Not specified';

      genderBreakdown[gender] = (genderBreakdown[gender] || 0) + 1;
      regionBreakdown[region] = (regionBreakdown[region] || 0) + 1;
      professionBreakdown[profession] = (professionBreakdown[profession] || 0) + 1;
    }

    // --- Aggregate analytics ---
    const totalViews = analytics.length;
    const viewsPerVideo: Record<string, number> = {};

    for (const row of analytics) {
      // [eventId, videoId, userId, watched_at]
      const rawVid = row[1] || 'unknown';
      const label = idToTitle[rawVid] || rawVid;
      viewsPerVideo[label] = (viewsPerVideo[label] || 0) + 1;
    }

    // Recent registrations (last 10)
    const recentRegistrations = registrations
      .slice(-10)
      .reverse()
      .map(row => ({
        userId: row[0],
        name: row[1],
        gender: row[2],
        region: row[4],
        profession: row[5],
        registeredAt: row[6],
      }));

    return NextResponse.json({
      totalRegistrations,
      totalViews,
      genderBreakdown,
      regionBreakdown,
      professionBreakdown,
      viewsPerVideo,
      recentRegistrations,
      isDemoData: false,
    });
  } catch (error) {
    console.error('[admin/stats] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
