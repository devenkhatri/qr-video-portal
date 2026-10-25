import { NextRequest, NextResponse } from 'next/server';
import { getSheetsClient, SHEET_ID, RANGES } from '@/lib/sheets';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { videoId, userId, language } = body;

    if (!videoId) {
      return NextResponse.json({ error: 'Missing videoId' }, { status: 400 });
    }

    if (!SHEET_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
      return NextResponse.json({ success: true, simulated: true });
    }

    const sheets = getSheetsClient();
    const eventId = crypto.randomUUID();

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: RANGES.analytics,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          eventId,
          videoId,
          userId || 'anonymous',
          new Date().toISOString(),
          language || '',
        ]],
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[track-view] Error:', error);
    // Don't fail silently — but return 200 so video still plays
    return NextResponse.json({ success: false, error: 'Tracking failed' });
  }
}
