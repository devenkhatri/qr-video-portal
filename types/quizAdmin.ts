import type { Lang } from '@/lib/languages';
import type { OptionKey } from '@/types/guide';

/** One question in one language, exactly as stored in the `quiz` tab (including hidden ones). */
export interface AdminQuestion {
  id: string;
  lang: Lang;
  question: string;
  options: Record<OptionKey, string>;
  correct: OptionKey;
  explanation: string;
  active: boolean;
}

export interface QuizCounts {
  /** point id -> number of questions (visible + hidden) */
  [pointId: string]: number;
}
