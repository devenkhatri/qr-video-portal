import type { Lang } from './languages';

/**
 * Registration form copy. Only the *labels* are translated: the values that are stored in the Sheet
 * (gender, role) stay in English so analytics keep grouping people consistently across languages.
 */
export const USER_TYPES = [
  'Cancer Patient',
  'Relative of Patient',
  'Normal Person',
  'ASHA',
  'Nurse - Coordinator',
  'CHO',
  'Non-cancer Doctor',
  'Oncologist',
  'Other',
] as const;

export const GENDERS = ['Male', 'Female', 'Other'] as const;

interface RegStrings {
  welcome: string;
  mobileSubtitle: string;
  mobileLabel: string;
  mobileInvalid: string;
  verifyFail: string;
  verifying: string;
  continue: string;
  welcomeBack: (name: string) => string;
  starting: string;
  privacy: string;
  step: string;
  title2: string;
  sub2: string;
  change: string;
  personal: string;
  location: string;
  role: string;
  fullName: string;
  namePh: string;
  age: string;
  agePh: string;
  gender: string;
  genders: Record<(typeof GENDERS)[number], string>;
  email: string;
  optional: string;
  country: string;
  state: string;
  district: string;
  districtPh: string;
  registeringAs: string;
  selectCategory: string;
  specify: string;
  describe: string;
  submit: string;
  submitting: string;
  privacy2: string;
  userTypes: Record<(typeof USER_TYPES)[number], string>;
  errors: { name: string; age: string; gender: string; district: string; userType: string; other: string; generic: string };
}

export const REG: Record<Lang, RegStrings> = {
  gu: {
    welcome: 'સ્વાગત છે',
    mobileSubtitle: 'વાંચવાનું શરૂ કરવા માટે તમારો મોબાઇલ નંબર દાખલ કરો.',
    mobileLabel: 'મોબાઇલ નંબર',
    mobileInvalid: 'કૃપા કરીને 10 અંકનો માન્ય મોબાઇલ નંબર દાખલ કરો.',
    verifyFail: 'નંબર ચકાસી શકાયો નથી. તમારું ઇન્ટરનેટ તપાસીને ફરી પ્રયાસ કરો.',
    verifying: 'ચકાસી રહ્યા છીએ…',
    continue: 'આગળ વધો',
    welcomeBack: n => (n ? `ફરી સ્વાગત છે, ${n}! તમારી માર્ગદર્શિકા ખુલી રહી છે…` : 'ફરી સ્વાગત છે! તમારી માર્ગદર્શિકા ખુલી રહી છે…'),
    starting: 'શરૂ કરી રહ્યા છીએ…',
    privacy: 'તમારો મોબાઇલ નંબર ફક્ત તમારી ઓળખ માટે વપરાય છે. કોઈ પાસવર્ડ કે OTP જરૂરી નથી.',
    step: 'પગલું 2 / 2 • ટૂંકી માહિતી',
    title2: 'ટૂંકી નોંધણી',
    sub2: 'તમારી પહોંચ પૂર્ણ કરવા થોડી માહિતી ભરો. ફક્ત એક મિનિટ લાગશે.',
    change: 'બદલો',
    personal: 'વ્યક્તિગત માહિતી',
    location: 'સ્થળ અને સંપર્ક',
    role: 'તમારી ભૂમિકા',
    fullName: 'પૂરું નામ',
    namePh: 'દા.ત. રાજેશ પટેલ',
    age: 'ઉંમર',
    agePh: 'દા.ત. 35',
    gender: 'જાતિ',
    genders: { Male: 'પુરુષ', Female: 'સ્ત્રી', Other: 'અન્ય' },
    email: 'ઇમેઇલ',
    optional: '(વૈકલ્પિક)',
    country: 'દેશ',
    state: 'રાજ્ય',
    district: 'જિલ્લો',
    districtPh: 'દા.ત. અમદાવાદ, સુરત, રાજકોટ',
    registeringAs: 'હું નોંધણી કરું છું',
    selectCategory: 'તમારી શ્રેણી પસંદ કરો',
    specify: 'કૃપા કરીને તમારી ભૂમિકા જણાવો',
    describe: 'તમારી ભૂમિકા લખો',
    submit: 'વાંચવાનું શરૂ કરો',
    submitting: 'નોંધણી થઈ રહી છે…',
    privacy2: 'તમારી માહિતી ખાનગી રહે છે અને ફક્ત શૈક્ષણિક આંકડા માટે વપરાય છે.',
    userTypes: {
      'Cancer Patient': 'કેન્સરના દર્દી',
      'Relative of Patient': 'દર્દીના સંબંધી',
      'Normal Person': 'સામાન્ય વ્યક્તિ',
      ASHA: 'આશા',
      'Nurse - Coordinator': 'નર્સ - સંયોજક',
      CHO: 'CHO (કોમ્યુનિટી હેલ્થ ઓફિસર)',
      'Non-cancer Doctor': 'કેન્સર સિવાયના ડૉક્ટર',
      Oncologist: 'ઓન્કોલોજિસ્ટ',
      Other: 'અન્ય',
    },
    errors: {
      name: 'કૃપા કરીને તમારું નામ દાખલ કરો.',
      age: 'કૃપા કરીને માન્ય ઉંમર દાખલ કરો.',
      gender: 'કૃપા કરીને તમારી જાતિ પસંદ કરો.',
      district: 'કૃપા કરીને તમારો જિલ્લો દાખલ કરો.',
      userType: 'કૃપા કરીને જણાવો કે તમે કોણ છો.',
      other: 'કૃપા કરીને તમારી ભૂમિકા જણાવો.',
      generic: 'કંઈક ખોટું થયું. કૃપા કરીને ફરી પ્રયાસ કરો.',
    },
  },
  hi: {
    welcome: 'स्वागत है',
    mobileSubtitle: 'पढ़ना शुरू करने के लिए अपना मोबाइल नंबर दर्ज करें।',
    mobileLabel: 'मोबाइल नंबर',
    mobileInvalid: 'कृपया 10 अंकों का मान्य मोबाइल नंबर दर्ज करें।',
    verifyFail: 'नंबर की जाँच नहीं हो सकी। कृपया अपना इंटरनेट जाँचकर फिर कोशिश करें।',
    verifying: 'जाँच हो रही है…',
    continue: 'आगे बढ़ें',
    welcomeBack: n => (n ? `फिर से स्वागत है, ${n}! आपकी मार्गदर्शिका खुल रही है…` : 'फिर से स्वागत है! आपकी मार्गदर्शिका खुल रही है…'),
    starting: 'शुरू हो रहा है…',
    privacy: 'आपका मोबाइल नंबर केवल आपकी पहचान के लिए उपयोग होता है। कोई पासवर्ड या OTP नहीं चाहिए।',
    step: 'चरण 2 / 2 • संक्षिप्त जानकारी',
    title2: 'संक्षिप्त पंजीकरण',
    sub2: 'अपनी पहुँच पूरी करने के लिए कुछ जानकारी भरें। इसमें केवल एक मिनट लगेगा।',
    change: 'बदलें',
    personal: 'व्यक्तिगत जानकारी',
    location: 'स्थान और संपर्क',
    role: 'आपकी भूमिका',
    fullName: 'पूरा नाम',
    namePh: 'जैसे राजेश पटेल',
    age: 'आयु',
    agePh: 'जैसे 35',
    gender: 'लिंग',
    genders: { Male: 'पुरुष', Female: 'महिला', Other: 'अन्य' },
    email: 'ईमेल',
    optional: '(वैकल्पिक)',
    country: 'देश',
    state: 'राज्य',
    district: 'ज़िला',
    districtPh: 'जैसे अहमदाबाद, सूरत, राजकोट',
    registeringAs: 'मैं पंजीकरण कर रहा/रही हूँ',
    selectCategory: 'अपनी श्रेणी चुनें',
    specify: 'कृपया अपनी भूमिका बताएँ',
    describe: 'अपनी भूमिका लिखें',
    submit: 'पढ़ना शुरू करें',
    submitting: 'पंजीकरण हो रहा है…',
    privacy2: 'आपकी जानकारी निजी रखी जाती है और केवल शैक्षिक आँकड़ों के लिए उपयोग होती है।',
    userTypes: {
      'Cancer Patient': 'कैंसर रोगी',
      'Relative of Patient': 'रोगी के रिश्तेदार',
      'Normal Person': 'आम व्यक्ति',
      ASHA: 'आशा',
      'Nurse - Coordinator': 'नर्स - समन्वयक',
      CHO: 'CHO (सामुदायिक स्वास्थ्य अधिकारी)',
      'Non-cancer Doctor': 'कैंसर के अलावा अन्य डॉक्टर',
      Oncologist: 'ऑन्कोलॉजिस्ट',
      Other: 'अन्य',
    },
    errors: {
      name: 'कृपया अपना नाम दर्ज करें।',
      age: 'कृपया मान्य आयु दर्ज करें।',
      gender: 'कृपया अपना लिंग चुनें।',
      district: 'कृपया अपना ज़िला दर्ज करें।',
      userType: 'कृपया बताएँ कि आप कौन हैं।',
      other: 'कृपया अपनी भूमिका बताएँ।',
      generic: 'कुछ गड़बड़ हो गई। कृपया फिर कोशिश करें।',
    },
  },
  en: {
    welcome: 'Welcome',
    mobileSubtitle: 'Enter your mobile number to start reading.',
    mobileLabel: 'Mobile number',
    mobileInvalid: 'Please enter a valid 10-digit mobile number.',
    verifyFail: 'Could not verify the number. Please check your connection and try again.',
    verifying: 'Verifying…',
    continue: 'Continue',
    welcomeBack: n => (n ? `Welcome back, ${n}! Opening your guidebook…` : 'Welcome back! Opening your guidebook…'),
    starting: 'Starting…',
    privacy: 'Your mobile number is only used to recognise you. No password or OTP needed.',
    step: 'Step 2 of 2 • Quick profile',
    title2: 'Quick registration',
    sub2: 'Please fill in a few details to complete your access. It only takes a minute.',
    change: 'Change',
    personal: 'About you',
    location: 'Location & contact',
    role: 'Your role',
    fullName: 'Full name',
    namePh: 'e.g. Rajesh Patel',
    age: 'Age',
    agePh: 'e.g. 35',
    gender: 'Gender',
    genders: { Male: 'Male', Female: 'Female', Other: 'Other' },
    email: 'Email',
    optional: '(optional)',
    country: 'Country',
    state: 'State',
    district: 'District',
    districtPh: 'e.g. Ahmedabad, Surat, Rajkot',
    registeringAs: 'I am registering as',
    selectCategory: 'Select your category',
    specify: 'Please specify your role',
    describe: 'Describe your role',
    submit: 'Start reading',
    submitting: 'Registering…',
    privacy2: 'Your information is kept private and used only for educational statistics.',
    userTypes: {
      'Cancer Patient': 'Cancer patient',
      'Relative of Patient': 'Relative of a patient',
      'Normal Person': 'General public',
      ASHA: 'ASHA worker',
      'Nurse - Coordinator': 'Nurse / coordinator',
      CHO: 'CHO (Community Health Officer)',
      'Non-cancer Doctor': 'Doctor (non-cancer)',
      Oncologist: 'Oncologist',
      Other: 'Other',
    },
    errors: {
      name: 'Please enter your name.',
      age: 'Please enter a valid age.',
      gender: 'Please select your gender.',
      district: 'Please enter your district.',
      userType: 'Please tell us who you are.',
      other: 'Please specify your role.',
      generic: 'Something went wrong. Please try again.',
    },
  },
};
