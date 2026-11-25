import { getSheetsClient, SHEET_ID, RANGES } from './sheets';
import { extractYouTubeId } from './youtube';
import { LANGUAGES, Lang } from './languages';
import { normalizeImageUrl } from './imageUrl';
import fallbackGuide from '@/data/guide.json';
import type { Chapter, Point, PointRef, RawChapter, RawPoint } from '@/types/guide';

type SheetRow = Record<string, string>;

interface GuideData {
  chapters: RawChapter[];
  points: RawPoint[];
}

// 60s in-memory cache to stay under Google Sheets API rate limits
let cache: GuideData | null = null;
let lastFetch = 0;
const CACHE_TTL_MS = 60 * 1000;

export function invalidateGuideCache() {
  cache = null;
  lastFetch = 0;
}

/** Turns a sheet range (header row + data rows) into objects keyed by lower-cased header. */
function rowsToObjects(values: string[][] | null | undefined): SheetRow[] {
  if (!values || values.length < 2) return [];
  const headers = values[0].map(h => String(h).trim().toLowerCase());
  return values.slice(1).map(row => {
    const obj: SheetRow = {};
    headers.forEach((h, i) => {
      obj[h] = String(row[i] ?? '').trim();
    });
    return obj;
  });
}

function perLang(row: SheetRow, prefix: string): Partial<Record<Lang, string>> {
  const out: Partial<Record<Lang, string>> = {};
  for (const { code } of LANGUAGES) {
    const v = row[`${prefix}_${code}`];
    if (v) out[code] = v;
  }
  return out;
}

function parseImages(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map(s => s.trim())
    .filter(Boolean)
    .map(normalizeImageUrl);
}

function parseVideos(row: SheetRow): Partial<Record<Lang, string>> {
  const out: Partial<Record<Lang, string>> = {};
  for (const [lang, value] of Object.entries(perLang(row, 'video_url')) as [Lang, string][]) {
    const id = extractYouTubeId(value);
    if (id) out[lang] = id;
  }
  return out;
}

function toOrder(v: string, fallback: number): number {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

/** A blank `active` cell means visible; FALSE / no / 0 hides the row. */
export function isActive(value: string | undefined): boolean {
  return !['false', 'no', '0'].includes((value ?? '').trim().toLowerCase());
}

function buildChapters(rows: SheetRow[]): RawChapter[] {
  return rows
    .filter(r => r.chapter_id && isActive(r.active))
    .map((r, i) => ({
      id: r.chapter_id,
      order: toOrder(r.order, i + 1),
      titles: perLang(r, 'title'),
      descriptions: perLang(r, 'description'),
      icon: r.icon || '',
    }))
    .sort((a, b) => a.order - b.order);
}

function buildPoints(rows: SheetRow[]): RawPoint[] {
  return rows
    .filter(r => r.point_id && r.chapter_id && isActive(r.active))
    .map((r, i) => ({
      id: r.point_id,
      chapterId: r.chapter_id,
      order: toOrder(r.order, i + 1),
      headings: perLang(r, 'heading'),
      texts: perLang(r, 'text'),
      images: parseImages(r.image_urls || ''),
      videos: parseVideos(r),
    }))
    .sort((a, b) => a.order - b.order);
}

function loadFallback(): GuideData {
  const f = fallbackGuide as { chapters: Record<string, string | number>[]; points: Record<string, string | number>[] };
  const asRows = (list: Record<string, string | number>[]): SheetRow[] =>
    list.map(item => Object.fromEntries(Object.entries(item).map(([k, v]) => [k, String(v)])));
  return {
    chapters: buildChapters(asRows(f.chapters)),
    points: buildPoints(asRows(f.points)),
  };
}

async function getGuideData(): Promise<GuideData> {
  const now = Date.now();
  if (cache && now - lastFetch < CACHE_TTL_MS) return cache;

  // Demo mode: no Sheets credentials configured
  if (!SHEET_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
    return loadFallback();
  }

  try {
    const sheets = getSheetsClient();
    const [chaptersRes, pointsRes] = await Promise.all([
      sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: RANGES.chapters }),
      sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: RANGES.points }),
    ]);

    const data: GuideData = {
      chapters: buildChapters(rowsToObjects(chaptersRes.data.values as string[][])),
      points: buildPoints(rowsToObjects(pointsRes.data.values as string[][])),
    };

    if (data.chapters.length === 0) {
      console.warn('[guide] "chapters" sheet is empty; using fallback');
      return loadFallback();
    }

    cache = data;
    lastFetch = now;
    return data;
  } catch (err) {
    console.error('[guide] Failed to read chapters/points from Google Sheets:', err);
    return cache || loadFallback();
  }
}

/** Picks the requested language, otherwise the first language that has a value. */
function pick(values: Partial<Record<Lang, string>>, lang: Lang): string {
  if (values[lang]) return values[lang]!;
  for (const { code } of LANGUAGES) {
    if (values[code]) return values[code]!;
  }
  return '';
}

/** Languages that have at least one chapter title in the sheet. */
export async function getAvailableLanguages(): Promise<Lang[]> {
  const { chapters } = await getGuideData();
  return LANGUAGES.map(l => l.code).filter(code => chapters.some(c => c.titles[code]));
}

function toChapter(c: RawChapter, points: RawPoint[], lang: Lang): Chapter {
  return {
    id: c.id,
    order: c.order,
    title: pick(c.titles, lang) || c.id,
    description: pick(c.descriptions, lang),
    icon: c.icon,
    pointCount: points.filter(p => p.chapterId === c.id).length,
    pointIds: points.filter(p => p.chapterId === c.id).map(p => p.id),
  };
}

function toPoint(p: RawPoint, lang: Lang): Point {
  return {
    id: p.id,
    order: p.order,
    heading: pick(p.headings, lang),
    text: pick(p.texts, lang),
    images: p.images,
    // Videos are intentionally not cross-language: no video beats the wrong-language video
    youtubeId: p.videos[lang],
  };
}

export async function getChapters(lang: Lang): Promise<Chapter[]> {
  const { chapters, points } = await getGuideData();
  return chapters.map(c => toChapter(c, points, lang));
}

export async function getChapterWithPoints(
  chapterId: string,
  lang: Lang
): Promise<{ chapter: Chapter; points: Point[]; next: Chapter | null } | null> {
  const { chapters, points } = await getGuideData();
  const index = chapters.findIndex(c => c.id === chapterId);
  if (index === -1) return null;

  // Chapters and points are already sorted by `order`
  const nextRaw = chapters[index + 1];
  return {
    chapter: toChapter(chapters[index], points, lang),
    points: points.filter(p => p.chapterId === chapterId).map(p => toPoint(p, lang)),
    next: nextRaw ? toChapter(nextRaw, points, lang) : null,
  };
}

/** Everything a single point page needs: the point, its position in the chapter, and neighbours. */
export async function getPointPage(
  chapterId: string,
  pointId: string,
  lang: Lang
): Promise<{
  chapter: Chapter;
  point: Point;
  index: number;
  total: number;
  prev: PointRef | null;
  next: PointRef | null;
  nextChapter: Chapter | null;
} | null> {
  const data = await getChapterWithPoints(chapterId, lang);
  if (!data) return null;

  const index = data.points.findIndex(p => p.id === pointId);
  if (index === -1) return null;

  const ref = (p: Point | undefined): PointRef | null => (p ? { id: p.id, heading: p.heading } : null);
  return {
    chapter: data.chapter,
    point: data.points[index],
    index,
    total: data.points.length,
    prev: ref(data.points[index - 1]),
    next: ref(data.points[index + 1]),
    nextChapter: data.next,
  };
}

/** Maps every point id to its chapter id (used to roll point views up to chapters in admin stats). */
export async function getPointChapterMap(): Promise<Record<string, string>> {
  const { points } = await getGuideData();
  return Object.fromEntries(points.map(p => [p.id, p.chapterId]));
}

/** Admin-facing summary of the guide: English-first titles and which point belongs to which chapter. */
export interface GuideIndex {
  chapters: { id: string; order: number; title: string; pointIds: string[] }[];
  points: Record<string, { chapterId: string; heading: string; order: number }>;
}

export async function getGuideIndex(): Promise<GuideIndex> {
  const { chapters, points } = await getGuideData();
  return {
    chapters: chapters.map(c => ({
      id: c.id,
      order: c.order,
      title: pick(c.titles, 'en') || c.id,
      pointIds: points.filter(p => p.chapterId === c.id).map(p => p.id),
    })),
    points: Object.fromEntries(
      points.map(p => [p.id, { chapterId: p.chapterId, heading: pick(p.headings, 'en'), order: p.order }])
    ),
  };
}
