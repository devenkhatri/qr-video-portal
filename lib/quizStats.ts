import { getSheetsClient, SHEET_ID, RANGES } from './sheets';
import { getAnswerKey, getGuideIndex } from './guide';

export interface QuizStats {
  attempts: number;
  readers: number;
  accuracy: number; // 0-1, first-try
  /** Lowest first-try accuracy first (questions with at least 3 attempts). */
  hardest: { id: string; question: string; point: string; attempts: number; accuracy: number }[];
  chapters: { id: string; title: string; attempts: number; accuracy: number }[];
}

/** First-try quiz results from the `quiz_attempts` tab. A missing tab just means "no attempts yet". */
export async function buildQuizStats(): Promise<QuizStats> {
  let values: string[][] = [];
  if (SHEET_ID && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
    const res = await getSheetsClient()
      .spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: RANGES.quizAttempts })
      .catch(() => null);
    values = (res?.data.values as string[][]) ?? [];
  }

  // One row per reader and question. columns: timestamp, user_id, chapter_id, point_id, question_id, lang,
  // answers, attempts, first_try_correct, solved, updated
  const rows = values.slice(1).filter(r => r[4]);
  const [key, guide] = await Promise.all([getAnswerKey(), getGuideIndex()]);

  const byQuestion = new Map<string, { n: number; ok: number; point: string; chapter: string }>();
  const byChapter = new Map<string, { n: number; ok: number }>();
  const readers = new Set<string>();
  let ok = 0;

  for (const r of rows) {
    const correct = String(r[8]).toUpperCase() === 'TRUE'; // first try
    readers.add(r[1]);
    ok += correct ? 1 : 0;
    const q = byQuestion.get(r[4]) ?? { n: 0, ok: 0, point: r[3], chapter: r[2] };
    q.n++; q.ok += correct ? 1 : 0;
    byQuestion.set(r[4], q);
    const c = byChapter.get(r[2]) ?? { n: 0, ok: 0 };
    c.n++; c.ok += correct ? 1 : 0;
    byChapter.set(r[2], c);
  }

  return {
    attempts: rows.length,
    readers: readers.size,
    accuracy: rows.length ? ok / rows.length : 0,
    hardest: [...byQuestion.entries()]
      .filter(([, q]) => q.n >= 3)
      .map(([id, q]) => ({
        id,
        question: key[id]?.question ?? id,
        point: guide.points[q.point]?.heading || q.point,
        attempts: q.n,
        accuracy: q.ok / q.n,
      }))
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 8),
    chapters: guide.chapters
      .filter(c => byChapter.has(c.id))
      .map(c => ({ id: c.id, title: c.title, attempts: byChapter.get(c.id)!.n, accuracy: byChapter.get(c.id)!.ok / byChapter.get(c.id)!.n })),
  };
}
