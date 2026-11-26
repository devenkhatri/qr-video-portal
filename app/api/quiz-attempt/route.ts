import { NextRequest, NextResponse } from 'next/server';
import { getSheetsClient, SHEET_ID, RANGES } from '@/lib/sheets';
import { getAnswerKey, getPointChapterMap } from '@/lib/guide';

/**
 * Logs a reader's answers to a quiz question: ONE row per reader and question.
 * Columns: timestamp, user_id, chapter_id, point_id, question_id, lang,
 *          answers (taps in order, e.g. "b,c,a"), attempts, first_try_correct, solved, updated
 * Each tap adds to the answers list on the same row. If the reader opens the quiz again later,
 * their new taps are added after a " | " so the original first try is never overwritten.
 * Correctness is decided here from the sheet, never trusted from the browser.
 */
export async function POST(req: NextRequest) {
  try {
    const { questionId, selected, userId, language } = await req.json();
    const key = typeof selected === 'string' ? selected.toLowerCase() : '';

    if (typeof questionId !== 'string' || !['a', 'b', 'c', 'd'].includes(key)) {
      return NextResponse.json({ error: 'Invalid attempt' }, { status: 400 });
    }

    if (!SHEET_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
      return NextResponse.json({ success: true, simulated: true });
    }

    const uid = String(userId || 'anonymous').slice(0, 64);
    const lang = String(language || '').slice(0, 8);
    const [answers, chapterOf] = await Promise.all([getAnswerKey(), getPointChapterMap()]);
    const q = answers[questionId];
    if (!q) return NextResponse.json({ error: 'Unknown question' }, { status: 404 });

    const isRight = q.correct === key;
    const now = new Date().toISOString();
    const sheets = getSheetsClient();

    // Find this reader's existing row for this question (user_id is column B, question_id is column E)
    const found = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'quiz_attempts!A:K',
    });
    const rows = (found.data.values || []) as string[][];
    const index = rows.findIndex((r, i) => i > 0 && r[1] === uid && r[4] === questionId);

    if (index === -1) {
      await sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: RANGES.quizAttempts,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[now, uid, chapterOf[q.pointId] ?? '', q.pointId, questionId, lang, key, 1, isRight ? 'TRUE' : 'FALSE', isRight ? 'TRUE' : 'FALSE', now]],
        },
      });
    } else {
      const row = rows[index];
      const previous = row[6] || '';
      // A fresh visit starts a new run, shown after " | "; taps within a run are comma-separated
      const newRun = req.headers.get('x-quiz-new-run') === '1';
      const answersCell = !previous ? key : newRun ? `${previous} | ${key}` : `${previous},${key}`;
      const attempts = (parseInt(row[7], 10) || 0) + 1;
      const solved = row[9] === 'TRUE' || isRight;

      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `quiz_attempts!G${index + 1}:K${index + 1}`,
        valueInputOption: 'RAW',
        requestBody: { values: [[answersCell, attempts, row[8] || 'FALSE', solved ? 'TRUE' : 'FALSE', now]] },
      });
    }

    return NextResponse.json({ success: true, correct: isRight });
  } catch (error) {
    console.error('[quiz-attempt] Error:', error);
    // Never block the patient's self-test because logging failed
    return NextResponse.json({ success: false });
  }
}
