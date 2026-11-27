import type { Lang } from './languages';

/** Share-dialog copy, following the page language. Brand name stays in English. */
export const SHARE: Record<
  Lang,
  { share: string; shareVia: string; message: (title: string) => string; emailSubject: string; instagramCopied: string; failed: string }
> = {
  gu: {
    share: 'શેર કરો',
    shareVia: 'આના દ્વારા શેર કરો',
    message: title => `${title}: Community Oncology પર વાંચો`,
    emailSubject: 'Community Oncology',
    instagramCopied: 'લિંક કૉપિ થઈ. Instagram માં પેસ્ટ કરો.',
    failed: 'શેર કરી શકાયું નહીં',
  },
  hi: {
    share: 'साझा करें',
    shareVia: 'इसके माध्यम से साझा करें',
    message: title => `${title}: Community Oncology पर पढ़ें`,
    emailSubject: 'Community Oncology',
    instagramCopied: 'लिंक कॉपी हो गया। Instagram में पेस्ट करें।',
    failed: 'साझा नहीं किया जा सका',
  },
  en: {
    share: 'Share',
    shareVia: 'Share via',
    message: title => `Read “${title}” on Community Oncology`,
    emailSubject: 'Community Oncology',
    instagramCopied: 'Link copied. Paste it in Instagram.',
    failed: 'Could not share',
  },
};
