import { getSheetsClient, SHEET_ID } from './sheets';
import { LANGUAGES, type Lang } from './languages';
import { invalidateGuideCache } from './guide';
import { ContentError, isDemoMode } from './guideAdmin';
import type { OptionKey } from '@/types/guide';
import type { AdminQuestion, QuizCounts } from '@/types/quizAdmin';

/**
 * Admin read/write access to the `quiz` tab.
 * Questions are saved one point + one language at a time: that set is replaced as a whole,
 * and rows for other points and languages are left exactly as they are.
 */

const HEADERS = [
  'question_id', 'chapter_id', 'point_id', 'lang', 'order', 'question',
  'opt_a', 'opt_b', 'opt_c', 'opt_d', 'correct', 'explanation', 'active',
];
const KEYS: OptionKey[] = ['a', 'b', 'c', 'd'];
const LIMITS = { question: 500, option: 250, explanation: 800, perSet: 10 };

type Row = Record<string, string>;

async function readTab(): Promise<Row[]> {
  if (isDemoMode()) return [];
  const res = await getSheetsClient()
    .spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: 'quiz!A:Z' })
    .catch(() => null);
  const values = (res?.data.values || []) as string[][];
  if (values.length < 2) return [];
  const headers = values[0].map(h => String(h).trim().toLowerCase());
  return values.slice(1)
    .filter(r => r.some(c => String(c ?? '').trim()))
    .map(r => Object.fromEntries(headers.map((h, i) => [h, String(r[i] ?? '').trim()])));
}

const isOn = (v: string | undefined) => !['false', 'no', '0'].includes((v ?? '').trim().toLowerCase());

export async function getQuestions(pointId: string): Promise<AdminQuestion[]> {
  const rows = await readTab();
  return rows
    .filter(r => r.point_id === pointId)
    .sort((a, b) => Number(a.order) - Number(b.order))
    .flatMap(r => {
      const lang = LANGUAGES.find(l => l.code === r.lang)?.code;
      if (!lang) return [];
      return [{
        id: r.question_id,
        lang,
        question: r.question,
        options: { a: r.opt_a || '', b: r.opt_b || '', c: r.opt_c || '', d: r.opt_d || '' },
        correct: (KEYS.includes(r.correct as OptionKey) ? r.correct : 'a') as OptionKey,
        explanation: r.explanation || '',
        active: isOn(r.active),
      }];
    });
}

export async function getQuizCounts(): Promise<QuizCounts> {
  const counts: QuizCounts = {};
  for (const r of await readTab()) {
    if (!r.point_id) continue;
    // Count questions, not language rows: the biggest language set is the number of questions
    counts[`${r.point_id}|${r.lang}`] = (counts[`${r.point_id}|${r.lang}`] ?? 0) + 1;
  }
  const byPoint: QuizCounts = {};
  for (const [k, n] of Object.entries(counts)) {
    const pid = k.split('|')[0];
    byPoint[pid] = Math.max(byPoint[pid] ?? 0, n);
  }
  return byPoint;
}

function cleanText(v: unknown, max: number, label: string): string {
  const s = typeof v === 'string' ? v.trim() : '';
  if (s.length > max) throw new ContentError(`${label} is too long (max ${max} characters).`);
  return s;
}

export function cleanQuestions(body: unknown): AdminQuestion[] {
  if (!Array.isArray(body)) throw new ContentError('Questions must be a list.');
  if (body.length > LIMITS.perSet) throw new ContentError(`At most ${LIMITS.perSet} questions per point and language.`);
  return body.map((raw, i): AdminQuestion => {
    const n = i + 1;
    const q = (raw ?? {}) as Record<string, unknown>;
    const opts = (q.options ?? {}) as Record<string, unknown>;
    const options = Object.fromEntries(
      KEYS.map(k => [k, cleanText(opts[k], LIMITS.option, `Question ${n}, option ${k.toUpperCase()}`)])
    ) as Record<OptionKey, string>;
    const question = cleanText(q.question, LIMITS.question, `Question ${n}`);
    const correct = String(q.correct ?? '').toLowerCase() as OptionKey;

    if (!question) throw new ContentError(`Question ${n} has no text.`);
    if (KEYS.filter(k => options[k]).length < 2) throw new ContentError(`Question ${n} needs at least two options.`);
    if (!KEYS.includes(correct) || !options[correct]) throw new ContentError(`Question ${n}: choose a correct answer that has text.`);

    return {
      id: typeof q.id === 'string' ? q.id.trim().slice(0, 80) : '',
      lang: 'gu',
      question,
      options,
      correct,
      explanation: cleanText(q.explanation, LIMITS.explanation, `Question ${n} explanation`),
      active: q.active !== false,
    };
  });
}

/** Replaces the question set for one point + language. */
export async function saveQuestions(pointId: string, chapterId: string, lang: Lang, questions: AdminQuestion[]) {
  if (isDemoMode()) {
    throw new ContentError('Google Sheets is not configured, so questions cannot be saved. Set the Google environment variables.', 503);
  }
  if (!LANGUAGES.some(l => l.code === lang)) throw new ContentError('Unknown language.');

  const sheets = getSheetsClient();
  const existing = await readTab();
  const kept = existing.filter(r => !(r.point_id === pointId && r.lang === lang));

  // New questions get an id that no row in any language is using, so translations can share ids later
  const taken = new Set(existing.map(r => r.question_id));
  let next = 1;
  const fresh = questions.map((q, i) => {
    let id = q.id;
    if (!id || (taken.has(id) && !existing.some(r => r.question_id === id && r.point_id === pointId && r.lang === lang))) {
      while (taken.has(`${pointId}-q${next}`)) next++;
      id = `${pointId}-q${next}`;
    }
    taken.add(id);
    return {
      question_id: id, chapter_id: chapterId, point_id: pointId, lang, order: String(i + 1),
      question: q.question,
      opt_a: q.options.a, opt_b: q.options.b, opt_c: q.options.c, opt_d: q.options.d,
      correct: q.correct, explanation: q.explanation, active: q.active ? 'TRUE' : 'FALSE',
    } as Row;
  });

  const all = [...kept, ...fresh];
  const values = all.map(r => HEADERS.map(h => (h === 'order' && r[h] !== undefined && r[h] !== '' ? Number(r[h]) : (r[h] ?? ''))));

  // Write the new rows first, then clear only the leftover tail: if the write fails, nothing has been wiped
  if (values.length > 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: 'quiz!A2',
      valueInputOption: 'RAW',
      requestBody: { values },
    });
  }
  await sheets.spreadsheets.values.clear({ spreadsheetId: SHEET_ID, range: `quiz!A${values.length + 2}:M` });
  invalidateGuideCache();
}
