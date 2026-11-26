/**
 * Homepage copy, taken from "Community Oncology - For Homepage.docx".
 * Kept in one place so it can be edited (or translated) without touching the layout.
 */
export const HOME = {
  eyebrow: 'Community Oncology',
  title: 'Education & Support for Everyone, Anywhere',
  tagline: 'Capacity Building Program to Bridge Gaps in Cancer Care',
  helpline: { label: 'Cancer Helpline', number: '+91 9099902211', tel: '+919099902211' },

  stats: [
    { value: '8', label: 'years of experience' },
    { value: '65,000+', label: 'cancer patients supported' },
    { value: '10,000+', label: 'health workers educated' },
    { value: '1,00,000+', label: 'normal persons screened' },
    { value: '3', label: 'districts adopted' },
    { value: '10+', label: 'hospitals supported' },
  ],

  audiences: [
    {
      icon: '💙',
      title: 'Cancer patients & relatives',
      program: 'Patient education & support',
      text: 'Understand every practical aspect of the treatment journey and support yourself with confidence through a long, uncertain and difficult phase of life. Needy patients also get personalised help through our helpline and weekly tele-support.',
      accent: '#4F9CF9',
    },
    {
      icon: '🔍',
      title: 'Normal person',
      program: 'Awareness & self-screening',
      text: 'Learn the common signs of cancer and evaluate your own risk with a simple 10-minute self-test on your mobile.',
      accent: '#2ECC71',
    },
    {
      icon: '🧑‍⚕️',
      title: 'Primary health worker',
      program: 'Diagnosis & supportive care',
      text: 'Three structured levels that help you master community oncology: prevention, detection, treatment support, rehabilitation and supportive care. Learn on your own or through seminars, and earn a certificate.',
      accent: '#F39C12',
    },
    {
      icon: '🏥',
      title: 'Oncologists & cancer hospitals',
      program: 'Patient connect programme',
      text: 'Set up a personalised support programme for your patients and improve care. We train your local staff and provide the material. We have no access to your patient data: the programme runs at your hospital, with us as back-end support.',
      accent: '#7C8CF8',
    },
    {
      icon: '🏛️',
      title: 'Government & NGO',
      program: 'District cancer control',
      text: 'A structured, modular district programme that uses existing infrastructure, has fixed costs and can reach thousands of patients. It can scale to state and national level and build a comprehensive cancer registry.',
      accent: '#9B59B6',
    },
  ],

  highlightsTitle: 'Program highlights',
  highlights: [
    'Designed by oncologists, so the content is authentic',
    'Multiple local languages, easy for everyone to understand',
    'Self-learn and self-help: simple, structured information',
    'Every aspect of cancer support: self-testing, diagnosis, surgery, radiotherapy, chemotherapy, rehabilitation and palliation (end-of-life care)',
    'Support for all types of cancer',
    'Cancer-specific issues: diet, pain, tracheostomy, colostomy, lymphedema, emotional well-being and more',
    'Overview of treatment protocols for common cancers',
    'Text, images and videos for each of over 100 points covering every aspect of supportive care',
    'Weekly SMS with education content',
    'Downloadable, printable PDF brochure for day-to-day use',
  ],

  supportedBy: [
    'Harikrushna Cancer Foundation, Mehsana',
    'Shashwat Oncocare LLP',
    'Trivedi Oncodigital LLP',
  ],
} as const;
