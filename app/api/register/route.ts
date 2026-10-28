import { NextRequest, NextResponse } from 'next/server';
import { getSheetsClient, SHEET_ID, RANGES } from '@/lib/sheets';
import { normalizeMobile } from '@/lib/mobile';

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

    const cleanMobile = normalizeMobile(mobile);

    // Resolve effective user type label (handle "Other" with specify text)
    const effectiveUserType =
      userType === 'Other' && userTypeOther?.trim()
        ? `Other: ${userTypeOther.trim()}`
        : userType || '';

    // Demo mode preview if Google Sheets credentials not configured
    if (!SHEET_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
      console.warn('[register] Google Sheets credentials not configured; simulated success');
      const res = NextResponse.json({ success: true, simulated: true, userId, name });
      res.cookies.set('qr_user_registered', 'true', {
        maxAge: 31536000,
        path: '/',
        sameSite: 'lax',
      });
      res.cookies.set('qr_user_id', userId, {
        maxAge: 31536000,
        path: '/',
        sameSite: 'lax',
      });
      res.cookies.set('qr_user_mobile', cleanMobile, {
        maxAge: 31536000,
        path: '/',
        sameSite: 'lax',
      });
      res.cookies.set('qr_user_name', encodeURIComponent(name || ''), {
        maxAge: 31536000,
        path: '/',
        sameSite: 'lax',
      });
      return res;
    }

    const sheets = getSheetsClient();

    // Check for existing registration with the same mobile number to avoid duplicate entries
    let existingRowIndex = -1;
    let effectiveUserId = userId;

    if (cleanMobile) {
      try {
        const existingData = await sheets.spreadsheets.values.get({
          spreadsheetId: SHEET_ID,
          range: RANGES.registrations,
        });

        const rows = existingData.data.values || [];
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          if (row[0] === 'user_id') continue;
          if (normalizeMobile(row[4]) === cleanMobile) {
            existingRowIndex = i + 1; // 1-based index for Google Sheets row
            if (row[0]) effectiveUserId = row[0];
            break;
          }
        }
      } catch (checkErr) {
        console.warn('[register] Error checking existing mobile; proceeding with append:', checkErr);
      }
    }

    const rowValues = [
      effectiveUserId,
      name || '',
      age || '',
      gender || '',
      cleanMobile || mobile || '',
      email || '',
      country || 'India',
      state || 'Gujarat',
      district || '',
      effectiveUserType,
      new Date().toISOString(),
    ];

    if (existingRowIndex > 0) {
      // Update existing row rather than appending duplicate
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `registrations!A${existingRowIndex}:K${existingRowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [rowValues],
        },
      });
    } else {
      // Append new registration row
      await sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: RANGES.registrations,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [rowValues],
        },
      });
    }

    const res = NextResponse.json({ success: true, userId: effectiveUserId, name });
    res.cookies.set('qr_user_registered', 'true', {
      maxAge: 31536000,
      path: '/',
      sameSite: 'lax',
    });
    res.cookies.set('qr_user_id', effectiveUserId, {
      maxAge: 31536000,
      path: '/',
      sameSite: 'lax',
    });
    res.cookies.set('qr_user_mobile', cleanMobile, {
      maxAge: 31536000,
      path: '/',
      sameSite: 'lax',
    });
    res.cookies.set('qr_user_name', encodeURIComponent(name || ''), {
      maxAge: 31536000,
      path: '/',
      sameSite: 'lax',
    });

    return res;
  } catch (error) {
    console.error('[register] Error:', error);
    return NextResponse.json({ error: 'Failed to register' }, { status: 500 });
  }
}
