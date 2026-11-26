import type { Lang } from '@/lib/languages';

export type { Lang };

/** Raw, all-language chapter as stored in the sheet. */
export interface RawChapter {
  id: string;
  order: number;
  titles: Partial<Record<Lang, string>>;
  descriptions: Partial<Record<Lang, string>>;
  icon: string;
}

/** Raw, all-language point as stored in the sheet. */
export interface RawPoint {
  id: string;
  chapterId: string;
  order: number;
  headings: Partial<Record<Lang, string>>;
  texts: Partial<Record<Lang, string>>;
  images: string[];
  videos: Partial<Record<Lang, string>>; // YouTube IDs per language
}

export type OptionKey = 'a' | 'b' | 'c' | 'd';

/** Raw multiple-choice question: one entry per language, linked by `id`. */
export interface RawQuestion {
  id: string;
  pointId: string;
  order: number;
  lang: Lang;
  question: string;
  /** Options that have text, in a-d order. */
  options: { key: OptionKey; text: string }[];
  correct: OptionKey;
  explanation: string;
}

/** Multiple-choice question resolved for a single language. */
export type Question = Omit<RawQuestion, 'pointId' | 'lang'>;

/** Chapter resolved for a single language. */
export interface Chapter {
  id: string;
  order: number;
  title: string;
  description: string;
  icon: string;
  pointCount: number;
  /** Ids of the visible points, used to show reading progress on this device. */
  pointIds: string[];
}

/** Point resolved for a single language. */
export interface Point {
  id: string;
  order: number;
  heading: string;
  text: string;
  images: string[];
  youtubeId?: string;
  questions: Question[];
}

/** Lightweight point reference used for previous/next navigation. */
export interface PointRef {
  id: string;
  heading: string;
}
