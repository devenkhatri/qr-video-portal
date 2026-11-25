import type { Lang } from './languages';

/** Small UI vocabulary for the guidebook screens. Content itself comes from the Sheet. */
interface UiStrings {
  guidebook: string;
  chooseLanguage: string;
  chooseLanguageHint: string;
  chapters: string;
  chaptersHint: string;
  language: string;
  point: string;
  points: string;
  loading: string;
  backToChapters: string;
  chapterNotFound: string;
  noPoints: string;
  nextChapter: string;
  openChapter: string;
  startReading: string;
  inThisChapter: string;
  previousPoint: string;
  nextPoint: string;
  backToChapter: string;
  chapterComplete: string;
  hasVideo: string;
  hasImages: string;
  pointNotFound: string;
  progress: string;
  qrCode: string;
  welcomeSub: string;
  insideTitle: string;
  continueReading: string;
  continueHint: string;
  resume: string;
  completed: string;
  textSize: string;
  smaller: string;
  larger: string;
  disclaimer: string;
  adminLogin: string;
  enlarge: string;
  close: string;
  skipToContent: string;
  switchLanguage: string;
  allRead: string;
}

export const STRINGS: Record<Lang, UiStrings> = {
  gu: {
    guidebook: 'માર્ગદર્શિકા',
    chooseLanguage: 'તમારી ભાષા પસંદ કરો',
    chooseLanguageHint: 'Choose your language · अपनी भाषा चुनें',
    chapters: 'પ્રકરણો',
    chaptersHint: 'વાંચવા માટે કોઈ પ્રકરણ પસંદ કરો',
    language: 'ભાષા',
    point: 'મુદ્દો',
    points: 'મુદ્દા',
    loading: 'લોડ થઈ રહ્યું છે…',
    backToChapters: 'પ્રકરણો પર પાછા જાઓ',
    chapterNotFound: 'પ્રકરણ મળ્યું નથી',
    noPoints: 'આ પ્રકરણમાં હજી કોઈ માહિતી ઉમેરાઈ નથી.',
    nextChapter: 'આગળનું પ્રકરણ',
    openChapter: 'ખોલો',
    startReading: 'વાંચવાનું શરૂ કરો',
    inThisChapter: 'આ પ્રકરણમાં',
    previousPoint: 'પાછળનો મુદ્દો',
    nextPoint: 'આગળનો મુદ્દો',
    backToChapter: 'પ્રકરણ પર પાછા જાઓ',
    chapterComplete: 'તમે આ પ્રકરણ પૂરું કર્યું',
    hasVideo: 'વિડિયો',
    hasImages: 'ચિત્રો',
    pointNotFound: 'મુદ્દો મળ્યો નથી',
    progress: 'પ્રગતિ',
    qrCode: 'QR કોડ',
    welcomeSub: 'કેન્સરની સંભાળ વિશે સરળ, વિશ્વસનીય માહિતી — તમારી પોતાની ભાષામાં.',
    insideTitle: 'અંદર શું છે',
    continueReading: 'વાંચન ચાલુ રાખો',
    continueHint: 'જ્યાંથી છોડ્યું હતું ત્યાંથી આગળ વધો',
    resume: 'ચાલુ રાખો',
    completed: 'પૂર્ણ',
    textSize: 'અક્ષરનું કદ',
    smaller: 'અક્ષર નાના કરો',
    larger: 'અક્ષર મોટા કરો',
    disclaimer: 'આ માહિતી સામાન્ય જાણકારી માટે છે અને ડૉક્ટરની સલાહનો વિકલ્પ નથી. તમારી સારવાર અંગેના નિર્ણયો માટે હંમેશા તમારા ડૉક્ટરની સલાહ લો.',
    adminLogin: 'એડમિન લોગિન',
    enlarge: 'મોટું કરવા દબાવો',
    close: 'બંધ કરો',
    skipToContent: 'મુખ્ય સામગ્રી પર જાઓ',
    switchLanguage: 'ભાષા બદલો',
    allRead: 'બધા મુદ્દા વાંચ્યા',
  },
  hi: {
    guidebook: 'मार्गदर्शिका',
    chooseLanguage: 'अपनी भाषा चुनें',
    chooseLanguageHint: 'Choose your language · તમારી ભાષા પસંદ કરો',
    chapters: 'अध्याय',
    chaptersHint: 'पढ़ने के लिए कोई अध्याय चुनें',
    language: 'भाषा',
    point: 'बिंदु',
    points: 'बिंदु',
    loading: 'लोड हो रहा है…',
    backToChapters: 'अध्यायों पर वापस जाएँ',
    chapterNotFound: 'अध्याय नहीं मिला',
    noPoints: 'इस अध्याय में अभी कोई जानकारी नहीं जोड़ी गई है।',
    nextChapter: 'अगला अध्याय',
    openChapter: 'खोलें',
    startReading: 'पढ़ना शुरू करें',
    inThisChapter: 'इस अध्याय में',
    previousPoint: 'पिछला बिंदु',
    nextPoint: 'अगला बिंदु',
    backToChapter: 'अध्याय पर वापस जाएँ',
    chapterComplete: 'आपने यह अध्याय पूरा कर लिया',
    hasVideo: 'वीडियो',
    hasImages: 'चित्र',
    pointNotFound: 'बिंदु नहीं मिला',
    progress: 'प्रगति',
    qrCode: 'QR कोड',
    welcomeSub: 'कैंसर की देखभाल के बारे में सरल, भरोसेमंद जानकारी — आपकी अपनी भाषा में।',
    insideTitle: 'अंदर क्या है',
    continueReading: 'पढ़ना जारी रखें',
    continueHint: 'जहाँ छोड़ा था, वहीं से आगे बढ़ें',
    resume: 'जारी रखें',
    completed: 'पूरा',
    textSize: 'अक्षर का आकार',
    smaller: 'अक्षर छोटे करें',
    larger: 'अक्षर बड़े करें',
    disclaimer: 'यह जानकारी सामान्य जागरूकता के लिए है और डॉक्टर की सलाह का विकल्प नहीं है। अपने इलाज से जुड़े निर्णयों के लिए हमेशा अपने डॉक्टर से परामर्श करें।',
    adminLogin: 'एडमिन लॉगिन',
    enlarge: 'बड़ा करने के लिए दबाएँ',
    close: 'बंद करें',
    skipToContent: 'मुख्य सामग्री पर जाएँ',
    switchLanguage: 'भाषा बदलें',
    allRead: 'सभी बिंदु पढ़ लिए',
  },
  en: {
    guidebook: 'Guidebook',
    chooseLanguage: 'Choose your language',
    chooseLanguageHint: 'તમારી ભાષા પસંદ કરો · अपनी भाषा चुनें',
    chapters: 'Chapters',
    chaptersHint: 'Pick a chapter to start reading',
    language: 'Language',
    point: 'point',
    points: 'points',
    loading: 'Loading…',
    backToChapters: 'Back to chapters',
    chapterNotFound: 'Chapter not found',
    noPoints: 'No content has been added to this chapter yet.',
    nextChapter: 'Next chapter',
    openChapter: 'Open',
    startReading: 'Start reading',
    inThisChapter: 'In this chapter',
    previousPoint: 'Previous',
    nextPoint: 'Next',
    backToChapter: 'Back to chapter',
    chapterComplete: 'You have finished this chapter',
    hasVideo: 'Video',
    hasImages: 'Images',
    pointNotFound: 'Point not found',
    progress: 'Progress',
    qrCode: 'QR code',
    welcomeSub: 'Simple, trustworthy information about cancer care, in your own language.',
    insideTitle: "What's inside",
    continueReading: 'Continue reading',
    continueHint: 'Pick up where you left off',
    resume: 'Continue',
    completed: 'Done',
    textSize: 'Text size',
    smaller: 'Make text smaller',
    larger: 'Make text larger',
    disclaimer: 'This information is for general awareness and is not a substitute for medical advice. Always speak to your doctor about decisions regarding your treatment.',
    adminLogin: 'Admin login',
    enlarge: 'Tap to enlarge',
    close: 'Close',
    skipToContent: 'Skip to content',
    switchLanguage: 'Change language',
    allRead: 'You have read every point',
  },
};
