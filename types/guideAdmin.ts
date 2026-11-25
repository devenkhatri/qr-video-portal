import type { Lang } from '@/lib/languages';

/** One string per language, e.g. a chapter title in gu / hi / en. */
export type LangStrings = Record<Lang, string>;

/** A chapter exactly as stored in the sheet, including hidden ones. */
export interface AdminChapter {
  id: string;
  order: number;
  active: boolean;
  icon: string;
  titles: LangStrings;
  descriptions: LangStrings;
}

/** A point exactly as stored in the sheet, including hidden ones. */
export interface AdminPoint {
  id: string;
  chapterId: string;
  order: number;
  active: boolean;
  headings: LangStrings;
  texts: LangStrings;
  imageUrls: string[];
  /** Raw YouTube links per language (any URL form or an 11-character id). */
  videoUrls: LangStrings;
}

/** Editable chapter fields. The id and order are managed by the app. */
export interface ChapterInput {
  icon: string;
  titles: LangStrings;
  descriptions: LangStrings;
  active: boolean;
}

/** Editable point fields. The id and order are managed by the app. */
export interface PointInput {
  chapterId: string;
  headings: LangStrings;
  texts: LangStrings;
  imageUrls: string[];
  videoUrls: LangStrings;
  active: boolean;
}

export interface AdminContent {
  chapters: AdminChapter[];
  points: AdminPoint[];
  /** True when Google Sheets isn't configured (read-only sample content). */
  isDemoData?: boolean;
}
