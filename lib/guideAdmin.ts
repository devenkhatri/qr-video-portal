import { getSheetsClient, SHEET_ID } from './sheets';
import { extractYouTubeId } from './youtube';
import { LANGUAGES, type Lang } from './languages';
import { invalidateGuideCache, isActive } from './guide';
import fallbackGuide from '@/data/guide.json';
import type {
  AdminChapter,
  AdminContent,
  AdminPoint,
  ChapterInput,
  LangStrings,
  PointInput,
} from '@/types/guideAdmin';

/**
 * Admin-side read/write access to the `chapters` and `points` tabs.
 *
 * - Columns are matched by header name, so column order in the sheet doesn't matter and
 *   columns we don't know about are preserved on update.
 * - Writes use RAW so a value starting with "=" can never be evaluated as a formula.
 * - Ids never change after creation, because QR codes already printed point at them.
 */

export class ContentError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

type Tab = 'chapters' | 'points';
type Cells = Record<string, string>;

interface SheetRow {
  rowNumber: number;
  cells: Cells;
}

const LIMITS = { title: 150, description: 500, heading: 300, text: 10000, icon: 16, url: 2000, images: 20 };

// ---------- Sheet access ----------

function assertConfigured() {
  if (!SHEET_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
    throw new ContentError(
      'Google Sheets is not configured, so content cannot be saved. Set the Google environment variables.',
      503
    );
  }
}

function colLetter(index: number): string {
  let n = index;
  let s = '';
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}

async function readTab(tab: Tab): Promise<{ headers: string[]; rows: SheetRow[] }> {
  assertConfigured();
  const res = await getSheetsClient().spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${tab}!A:Z`,
  });
  const values = (res.data.values || []) as string[][];
  if (values.length === 0) throw new ContentError(`The "${tab}" tab has no header row.`, 500);

  const headers = values[0].map(h => String(h).trim().toLowerCase());
  const rows: SheetRow[] = [];
  values.slice(1).forEach((row, i) => {
    if (row.every(c => !String(c ?? '').trim())) return; // skip blank rows
    const cells: Cells = {};
    headers.forEach((h, c) => {
      cells[h] = String(row[c] ?? '').trim();
    });
    rows.push({ rowNumber: i + 2, cells });
  });
  return { headers, rows };
}

/** Builds a full row aligned to the sheet's headers, keeping any cells we don't manage. */
function toRowValues(headers: string[], existing: Cells, updates: Cells, tab: Tab): (string | number)[] {
  const merged: Cells = { ...existing, ...updates };
  for (const [key, value] of Object.entries(updates)) {
    if (headers.includes(key)) continue;
    // `active` is optional (blank = visible); anything else missing is a setup problem
    if (key === 'active' && value.toUpperCase() === 'TRUE') continue;
    if (value === '') continue;
    throw new ContentError(`The "${tab}" tab has no "${key}" column. Add it to the header row first.`, 500);
  }
  return headers.map(h => {
    const v = merged[h] ?? '';
    return h === 'order' && v !== '' && !Number.isNaN(Number(v)) ? Number(v) : v;
  });
}

async function appendRow(tab: Tab, headers: string[], cells: Cells) {
  await getSheetsClient().spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${tab}!A:A`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [toRowValues(headers, {}, cells, tab)] },
  });
}

async function updateRow(tab: Tab, headers: string[], row: SheetRow, updates: Cells) {
  const last = colLetter(headers.length - 1);
  await getSheetsClient().spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${tab}!A${row.rowNumber}:${last}${row.rowNumber}`,
    valueInputOption: 'RAW',
    requestBody: { values: [toRowValues(headers, row.cells, updates, tab)] },
  });
}

// ---------- Mapping between sheet cells and typed objects ----------

function perLang(cells: Cells, prefix: string): LangStrings {
  return Object.fromEntries(LANGUAGES.map(l => [l.code, cells[`${prefix}_${l.code}`] ?? ''])) as LangStrings;
}

function langCells(prefix: string, values: LangStrings): Cells {
  return Object.fromEntries(LANGUAGES.map(l => [`${prefix}_${l.code}`, values[l.code] ?? '']));
}

function toChapter(r: SheetRow): AdminChapter {
  return {
    id: r.cells.chapter_id,
    order: Number(r.cells.order) || 0,
    active: isActive(r.cells.active),
    icon: r.cells.icon || '',
    titles: perLang(r.cells, 'title'),
    descriptions: perLang(r.cells, 'description'),
  };
}

function toPoint(r: SheetRow): AdminPoint {
  return {
    id: r.cells.point_id,
    chapterId: r.cells.chapter_id,
    order: Number(r.cells.order) || 0,
    active: isActive(r.cells.active),
    headings: perLang(r.cells, 'heading'),
    texts: perLang(r.cells, 'text'),
    imageUrls: (r.cells.image_urls || '').split(/[\n,]+/).map(s => s.trim()).filter(Boolean),
    videoUrls: perLang(r.cells, 'video_url'),
  };
}

const byOrder = <T extends { order: number }>(a: T, b: T) => a.order - b.order;

// ---------- Validation ----------

function cleanLangStrings(value: unknown, max: number, label: string): LangStrings {
  const out = {} as LangStrings;
  for (const { code } of LANGUAGES) {
    const raw = (value as Record<string, unknown> | undefined)?.[code];
    const s = typeof raw === 'string' ? raw.trim() : '';
    if (s.length > max) throw new ContentError(`${label} (${code.toUpperCase()}) is too long (max ${max} characters).`);
    out[code] = s;
  }
  return out;
}

function langName(code: Lang) {
  return LANGUAGES.find(l => l.code === code)?.english ?? code;
}

export function cleanChapterInput(body: unknown): ChapterInput {
  const b = (body ?? {}) as Record<string, unknown>;
  const titles = cleanLangStrings(b.titles, LIMITS.title, 'Title');
  if (!LANGUAGES.some(l => titles[l.code])) throw new ContentError('Enter a title in at least one language.');
  const icon = typeof b.icon === 'string' ? b.icon.trim() : '';
  if (icon.length > LIMITS.icon) throw new ContentError('Icon should be a single emoji.');
  return {
    icon,
    titles,
    descriptions: cleanLangStrings(b.descriptions, LIMITS.description, 'Description'),
    active: b.active !== false,
  };
}

export function cleanPointInput(body: unknown): PointInput {
  const b = (body ?? {}) as Record<string, unknown>;
  const chapterId = typeof b.chapterId === 'string' ? b.chapterId.trim() : '';
  const headings = cleanLangStrings(b.headings, LIMITS.heading, 'Heading');
  if (!LANGUAGES.some(l => headings[l.code])) throw new ContentError('Enter a heading in at least one language.');

  const videoUrls = cleanLangStrings(b.videoUrls, LIMITS.url, 'Video link');
  for (const { code } of LANGUAGES) {
    if (videoUrls[code] && !extractYouTubeId(videoUrls[code])) {
      throw new ContentError(`The ${langName(code)} video link is not a valid YouTube link.`);
    }
  }

  const rawImages = Array.isArray(b.imageUrls) ? b.imageUrls : [];
  const imageUrls = rawImages.map(u => (typeof u === 'string' ? u.trim() : '')).filter(Boolean);
  if (imageUrls.length > LIMITS.images) throw new ContentError(`A point can have at most ${LIMITS.images} images.`);
  for (const url of imageUrls) {
    if (!/^https?:\/\//i.test(url)) throw new ContentError(`Image link must start with http:// or https:// (${url.slice(0, 40)}…).`);
    if (/[\s,]/.test(url)) throw new ContentError('Image links cannot contain spaces or commas. Encode them or use another link.');
    if (url.length > LIMITS.url) throw new ContentError('An image link is too long.');
  }

  return {
    chapterId,
    headings,
    texts: cleanLangStrings(b.texts, LIMITS.text, 'Text'),
    imageUrls,
    videoUrls,
    active: b.active !== false,
  };
}

// ---------- Ids ----------

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

function uniqueId(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

// ---------- Public API ----------

/** True when Google Sheets isn't configured: the editor can be previewed but nothing can be saved. */
export function isDemoMode(): boolean {
  return !SHEET_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
}

function demoContent(): AdminContent {
  const f = fallbackGuide as { chapters: Record<string, string | number>[]; points: Record<string, string | number>[] };
  const asRow = (r: Record<string, string | number>, i: number): SheetRow => ({
    rowNumber: i + 2,
    cells: Object.fromEntries(Object.entries(r).map(([k, v]) => [k, String(v)])),
  });
  return {
    chapters: f.chapters.map(asRow).map(toChapter).sort(byOrder),
    points: f.points.map(asRow).map(toPoint).sort(byOrder),
  };
}

export async function getAdminContent(): Promise<AdminContent> {
  if (isDemoMode()) return demoContent();
  const [chapters, points] = await Promise.all([readTab('chapters'), readTab('points')]);
  return {
    chapters: chapters.rows.filter(r => r.cells.chapter_id).map(toChapter).sort(byOrder),
    points: points.rows.filter(r => r.cells.point_id).map(toPoint).sort(byOrder),
  };
}

export async function createChapter(input: ChapterInput): Promise<AdminChapter> {
  const { headers, rows } = await readTab('chapters');
  const taken = new Set(rows.map(r => r.cells.chapter_id));
  // Prefer an English-based id; fall back to a numbered one for Gujarati/Hindi-only titles
  const base = slugify(input.titles.en) || `chapter-${rows.length + 1}`;
  const id = uniqueId(base, taken);
  const order = Math.max(0, ...rows.map(r => Number(r.cells.order) || 0)) + 1;

  const cells: Cells = {
    chapter_id: id,
    order: String(order),
    active: input.active ? 'TRUE' : 'FALSE',
    icon: input.icon,
    ...langCells('title', input.titles),
    ...langCells('description', input.descriptions),
  };
  await appendRow('chapters', headers, cells);
  invalidateGuideCache();
  return { id, order, ...input };
}

export async function updateChapter(id: string, input: ChapterInput): Promise<void> {
  const { headers, rows } = await readTab('chapters');
  const row = rows.find(r => r.cells.chapter_id === id);
  if (!row) throw new ContentError('Chapter not found.', 404);

  await updateRow('chapters', headers, row, {
    active: input.active ? 'TRUE' : 'FALSE',
    icon: input.icon,
    ...langCells('title', input.titles),
    ...langCells('description', input.descriptions),
  });
  invalidateGuideCache();
}

export async function createPoint(input: PointInput): Promise<AdminPoint> {
  const [chapters, points] = await Promise.all([readTab('chapters'), readTab('points')]);
  if (!chapters.rows.some(r => r.cells.chapter_id === input.chapterId)) {
    throw new ContentError('Choose a chapter for this point.');
  }

  const taken = new Set(points.rows.map(r => r.cells.point_id));
  const inChapter = points.rows.filter(r => r.cells.chapter_id === input.chapterId);
  const id = uniqueId(`${input.chapterId}-${inChapter.length + 1}`, taken);
  const order = Math.max(0, ...inChapter.map(r => Number(r.cells.order) || 0)) + 1;

  const cells: Cells = {
    point_id: id,
    chapter_id: input.chapterId,
    order: String(order),
    active: input.active ? 'TRUE' : 'FALSE',
    image_urls: input.imageUrls.join('\n'),
    ...langCells('heading', input.headings),
    ...langCells('text', input.texts),
    ...langCells('video_url', input.videoUrls),
  };
  await appendRow('points', points.headers, cells);
  invalidateGuideCache();
  return { id, order, ...input };
}

export async function updatePoint(id: string, input: PointInput): Promise<void> {
  const { headers, rows } = await readTab('points');
  const row = rows.find(r => r.cells.point_id === id);
  if (!row) throw new ContentError('Point not found.', 404);

  // The chapter a point belongs to is fixed after creation (its links and QR codes include it)
  await updateRow('points', headers, row, {
    active: input.active ? 'TRUE' : 'FALSE',
    image_urls: input.imageUrls.join('\n'),
    ...langCells('heading', input.headings),
    ...langCells('text', input.texts),
    ...langCells('video_url', input.videoUrls),
  });
  invalidateGuideCache();
}

export async function setActive(kind: 'chapter' | 'point', id: string, active: boolean): Promise<void> {
  const tab: Tab = kind === 'chapter' ? 'chapters' : 'points';
  const idKey = kind === 'chapter' ? 'chapter_id' : 'point_id';
  const { headers, rows } = await readTab(tab);
  const row = rows.find(r => r.cells[idKey] === id);
  if (!row) throw new ContentError(`${kind === 'chapter' ? 'Chapter' : 'Point'} not found.`, 404);

  await updateRow(tab, headers, row, { active: active ? 'TRUE' : 'FALSE' });
  invalidateGuideCache();
}

/**
 * Moves an item one step up or down among its siblings (all chapters, or the points of its chapter),
 * then renumbers the siblings 1..n so order values stay clean even if the sheet had gaps or ties.
 */
export async function moveItem(kind: 'chapter' | 'point', id: string, direction: 'up' | 'down'): Promise<void> {
  const tab: Tab = kind === 'chapter' ? 'chapters' : 'points';
  const idKey = kind === 'chapter' ? 'chapter_id' : 'point_id';
  const { headers, rows } = await readTab(tab);

  const target = rows.find(r => r.cells[idKey] === id);
  if (!target) throw new ContentError(`${kind === 'chapter' ? 'Chapter' : 'Point'} not found.`, 404);

  const siblings = rows
    .filter(r => r.cells[idKey] && (kind === 'chapter' || r.cells.chapter_id === target.cells.chapter_id))
    .sort((a, b) => (Number(a.cells.order) || 0) - (Number(b.cells.order) || 0) || a.rowNumber - b.rowNumber);

  const from = siblings.findIndex(r => r.cells[idKey] === id);
  const to = direction === 'up' ? from - 1 : from + 1;
  if (to < 0 || to >= siblings.length) return; // already at the edge

  [siblings[from], siblings[to]] = [siblings[to], siblings[from]];

  const orderCol = headers.indexOf('order');
  if (orderCol === -1) throw new ContentError(`The "${tab}" tab has no "order" column.`, 500);

  const data = siblings
    .map((r, i) => ({ r, n: i + 1 }))
    .filter(({ r, n }) => Number(r.cells.order) !== n)
    .map(({ r, n }) => ({ range: `${tab}!${colLetter(orderCol)}${r.rowNumber}`, values: [[n]] }));

  if (data.length > 0) {
    await getSheetsClient().spreadsheets.values.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: { valueInputOption: 'RAW', data },
    });
  }
  invalidateGuideCache();
}
