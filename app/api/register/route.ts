import { NextRequest, NextResponse } from 'next/server';
import { getSheetsClient, SHEET_ID, RANGES } from '@/lib/sheets';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId,
      name,
      age,
      gender,
      mobile,
      email,
      country,
      state,
      district,
      userType,
      userTypeOther,
    } = body;

    if (!userId || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Resolve effective user type label (handle "Other" with specify text)
    const effectiveUserType =
      userType === 'Other' && userTypeOther?.trim()
        ? `Other: ${userTypeOther.trim()}`
        : userType || '';

    if (!SHEET_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
      console.warn('[register] Google Sheets credentials not configured; simulated success');
      return NextResponse.json({ success: true, simulated: true });
    }

    const sheets = getSheetsClient();

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: RANGES.registrations,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          userId,
          name || '',
          age || '',
          gender || '',
          mobile || '',
          email || '',
          country || 'India',
          state || 'Gujarat',
          district || '',
          effectiveUserType,
          new Date().toISOString(),
        ]],
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[register] Error:', error);
    return NextResponse.json({ error: 'Failed to register' }, { status: 500 });
  }
}
