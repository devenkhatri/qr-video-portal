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

    const allVideos = await getAllVideos(true);

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
        genderBreakdown: { 'Male': 8, 'Female': 5, 'Other': 1 },
        countryBreakdown: { 'India': 14 },
        stateBreakdown: { 'Gujarat': 8, 'Maharashtra': 4, 'Rajasthan': 2 },
        districtBreakdown: { 'Ahmedabad': 5, 'Surat': 3, 'Mumbai': 4, 'Jaipur': 2 },
        userTypeBreakdown: {
          'Oncologist': 4,
          'Non-cancer Doctor': 3,
          'Cancer Patient': 3,
          'ASHA': 2,
          'Nurse - Coordinator': 2,
        },
        viewsPerVideo: {
          'Introduction to Cancer Awareness': 25,
          'Understanding Chemotherapy': 12,
          'Palliative Care Basics': 5,
        },
        recentRegistrations: [
          { userId: 'demo-1', name: 'Dr. A. Sharma', gender: 'Male', state: 'Gujarat', district: 'Ahmedabad', userType: 'Oncologist', registeredAt: new Date().toISOString() },
          { userId: 'demo-2', name: 'Priya Patel', gender: 'Female', state: 'Maharashtra', district: 'Mumbai', userType: 'Nurse - Coordinator', registeredAt: new Date(Date.now() - 3600000).toISOString() },
          { userId: 'demo-3', name: 'Ramesh Verma', gender: 'Male', state: 'Rajasthan', district: 'Jaipur', userType: 'Cancer Patient', registeredAt: new Date(Date.now() - 7200000).toISOString() },
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
    // New column layout:
    // [0] userId, [1] name, [2] age, [3] gender, [4] mobile, [5] email,
    // [6] country, [7] state, [8] district, [9] userType, [10] registered_at
    const totalRegistrations = registrations.length;

    const genderBreakdown: Record<string, number> = {};
    const countryBreakdown: Record<string, number> = {};
    const stateBreakdown: Record<string, number> = {};
    const districtBreakdown: Record<string, number> = {};
    const userTypeBreakdown: Record<string, number> = {};

    for (const row of registrations) {
      const gender  = row[3]  || 'Not specified';
      const country  = row[6]  || 'Not specified';
      const state    = row[7]  || 'Not specified';
      const district = row[8]  || 'Not specified';
      const userType = row[9]  || 'Not specified';

      genderBreakdown[gender]       = (genderBreakdown[gender] || 0) + 1;
      countryBreakdown[country]   = (countryBreakdown[country] || 0) + 1;
      stateBreakdown[state]       = (stateBreakdown[state] || 0) + 1;
      districtBreakdown[district] = (districtBreakdown[district] || 0) + 1;
      userTypeBreakdown[userType] = (userTypeBreakdown[userType] || 0) + 1;
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
        age: row[2],
        gender: row[3],
        mobile: row[4],
        email: row[5],
        country: row[6],
        state: row[7],
        district: row[8],
        userType: row[9],
        registeredAt: row[10],
      }));

    return NextResponse.json(
      {
        totalRegistrations,
        totalViews,
        genderBreakdown,
        countryBreakdown,
        stateBreakdown,
        districtBreakdown,
        userTypeBreakdown,
        viewsPerVideo,
        recentRegistrations,
        isDemoData: false,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('[admin/stats] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
