export const LANGUAGES = [
  { code: 'gu', label: 'ગુજરાતી', english: 'Gujarati' },
  { code: 'hi', label: 'हिन्दी', english: 'Hindi' },
  { code: 'en', label: 'English', english: 'English' },
] as const;

export type Lang = (typeof LANGUAGES)[number]['code'];
export const DEFAULT_LANG: Lang = 'gu';

export function isLang(v: unknown): v is Lang {
  return LANGUAGES.some(l => l.code === v);
}

export function resolveLang(v: string | undefined): Lang {
  return isLang(v) ? v : DEFAULT_LANG;
}
