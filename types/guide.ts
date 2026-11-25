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
}

/** Lightweight point reference used for previous/next navigation. */
export interface PointRef {
  id: string;
  heading: string;
}
