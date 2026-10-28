import { NextRequest, NextResponse } from 'next/server';
import { getSheetsClient, SHEET_ID, RANGES } from '@/lib/sheets';
import { normalizeMobile, isValidMobile } from '@/lib/mobile';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mobile } = body;

    const cleanMobile = normalizeMobile(mobile);
    if (!cleanMobile || !isValidMobile(cleanMobile)) {
      return NextResponse.json(
        { error: 'Please enter a valid 10-digit mobile number' },
        { status: 400 }
      );
    }

    // Demo mode preview if credentials are not configured
    if (!SHEET_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
      if (cleanMobile === '9876543210' || cleanMobile === '9999999999') {
        const response = NextResponse.json({
          exists: true,
          user: {
            userId: 'demo-user-1',
            name: 'Dr. Sharma',
            mobile: cleanMobile,
          },
          isDemoData: true,
        });
        response.cookies.set('qr_user_registered', 'true', {
          maxAge: 31536000,
          path: '/',
          sameSite: 'lax',
        });
        response.cookies.set('qr_user_id', 'demo-user-1', {
          maxAge: 31536000,
          path: '/',
          sameSite: 'lax',
        });
        response.cookies.set('qr_user_mobile', cleanMobile, {
          maxAge: 31536000,
          path: '/',
          sameSite: 'lax',
        });
        response.cookies.set('qr_user_name', encodeURIComponent('Dr. Sharma'), {
          maxAge: 31536000,
          path: '/',
          sameSite: 'lax',
        });
        return response;
      }
      return NextResponse.json({ exists: false, isDemoData: true });
    }

    const sheets = getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: RANGES.registrations,
    });

    const rows = response.data.values || [];
    // Skip header row: [0] userId, [1] name, [2] age, [3] gender, [4] mobile, ...
    const registrationRows = rows.filter(r => r[0] !== 'user_id' && r[0]);

    // Find the latest matching row for this mobile number (reverse order)
    const match = [...registrationRows].reverse().find(r => {
      const rowMobile = normalizeMobile(r[4]);
      return rowMobile && rowMobile === cleanMobile;
    });

    if (match) {
      const userId = match[0];
      const name = match[1] || 'User';

      const res = NextResponse.json({
        exists: true,
        user: {
          userId,
          name,
          mobile: match[4] || cleanMobile,
        },
      });

      // Set long-lived cookie for 1 year
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
      res.cookies.set('qr_user_name', encodeURIComponent(name), {
        maxAge: 31536000,
        path: '/',
        sameSite: 'lax',
      });

      return res;
    }

    return NextResponse.json({ exists: false });
  } catch (error) {
    console.error('[check-user] Error:', error);
    return NextResponse.json({ error: 'Failed to check mobile number' }, { status: 500 });
  }
}

